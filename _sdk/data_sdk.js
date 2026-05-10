/**
 * ADECOMPT - Data SDK
 *
 * Provides a unified data layer for the frontend.
 * In Express mode (legacy): communicates with /api/data endpoints
 * In Supabase mode  (new):  communicates with Supabase PostgreSQL via REST + Realtime
 *
 * The mode is auto-detected based on whether the Supabase client is configured.
 *
 * === OPTIMIZATIONS (2025-05) ===
 * - _supabaseCreate/Update/Delete now apply changes locally instead of re-fetching all tables
 * - New createBatch(records) performs a single INSERT for multiple reservations
 * - Realtime events apply only the affected record instead of full re-fetch
 * - Local write tracking prevents duplicate processing from Realtime echo
 * - beginBatch()/endBatch() suppress intermediate re-renders during multi-step operations
 */

// ========== HELPERS ==========

/** Map a database record to the legacy allData format (with __backendId) */
function mapToAllDataFormat(record, typeName, idField = 'id') {
  const mapped = { ...record };
  mapped.__backendId = String(record[idField]);
  mapped.type = typeName;
  // Remove UUID field to keep the legacy format clean
  if (idField !== '__backendId') {
    const keys = ['id', 'cart_id', 'device_id'];
    keys.forEach(k => { if (k in mapped && k !== '__backendId') delete mapped[k]; });
  }
  return mapped;
}

/** Parse numeric IDs for backward compatibility */
function toLegacyId(uuid) {
  // UUIDs are long; we keep the full UUID as string for __backendId
  return String(uuid);
}

// ========== DATA HANDLER ==========

let _dataHandler = null;
let pollingInterval = null;
let realtimeChannel = null;

/** Counter to suppress notifyDataChanged during batch operations */
let _batchCount = 0;

/** Counter to track local writes and avoid duplicate Realtime processing */
let _localWriteCount = 0;
let _lastLocalWritePayload = null;

function notifyDataChanged() {
  // Skip notifications during batch operations
  if (_batchCount > 0) return;
  if (_dataHandler && typeof _dataHandler.onDataChanged === 'function') {
    _dataHandler.onDataChanged(allData);
  }
}

/**
 * Mark that the next Realtime event with this payload was originated locally
 * and should be ignored.
 */
function markLocalWrite(payloadKey) {
  _localWriteCount++;
  _lastLocalWritePayload = payloadKey;
}

/**
 * Check and consume a local write mark. Returns true if this event
 * was produced by a local write and should be skipped.
 */
function consumeLocalWrite(payloadKey) {
  if (_localWriteCount > 0 && _lastLocalWritePayload === payloadKey) {
    _localWriteCount--;
    if (_localWriteCount === 0) _lastLocalWritePayload = null;
    return true;
  }
  // Cleanup stale counter if mismatched
  if (_localWriteCount > 0) _localWriteCount--;
  return false;
}

/**
 * Apply a single changed record locally in allData.
 * Handles insert, update, and delete operations.
 */
function _applyChangeLocally(record, operation) {
  if (operation === 'INSERT') {
    // Remove any existing record with same __backendId (avoid duplicates)
    const existingIdx = allData.findIndex(d => d.__backendId === record.__backendId);
    if (existingIdx !== -1) {
      allData[existingIdx] = record;
    } else {
      allData.push(record);
    }
  } else if (operation === 'UPDATE') {
    const idx = allData.findIndex(d => d.__backendId === record.__backendId);
    if (idx !== -1) {
      allData[idx] = { ...allData[idx], ...record };
    } else {
      allData.push(record);
    }
  } else if (operation === 'DELETE') {
    const idx = allData.findIndex(d => d.__backendId === record.__backendId);
    if (idx !== -1) allData.splice(idx, 1);
  }
}

// ========== SUPABASE MODE ==========

let _supa = null;

function isSupabaseMode() {
  return _supa !== null;
}

/**
 * Initialize Supabase client.
 * Falls back to Express mode gracefully if Supabase is not available.
 */
function initSupabase() {
  try {
    const client = getSupabaseClient();
    if (!client) return false;
    _supa = client;
    return true;
  } catch (e) {
    console.warn('⚠️ Supabase not available, falling back to Express API mode.', e.message);
    return false;
  }
}

/**
 * Fetch all data from Supabase tables and merge into a single allData array.
 */
async function fetchAllSupabaseData() {
  if (!_supa) return [];
  const result = [];

  try {
    // 1. Fetch carts
    const { data: carts, error: cartsErr } = await _supa.from('carts').select('*');
    if (cartsErr) throw cartsErr;
    (carts || []).forEach(c => {
      result.push(mapToAllDataFormat({ ...c, cart_id: String(c.id) }, 'cart'));
    });

    // 2. Fetch devices
    const { data: devices, error: devsErr } = await _supa.from('devices').select('*');
    if (devsErr) throw devsErr;
    (devices || []).forEach(d => {
      const mapped = mapToAllDataFormat({
        ...d,
        device_id: String(d.id),
        cart_id: String(d.cart_id)
      }, 'device');
      // mapToAllDataFormat deleta cart_id para "limpar" UUIDs, mas devices precisam
      // de cart_id como referência relacional — sem ele, toda filtragem por carrinho
      // (grid de devices, duplicate-check, visão admin) retorna vazio/falha.
      mapped.cart_id = String(d.cart_id);
      result.push(mapped);
    });

    // 3. Fetch reservations
    const { data: reservations, error: resErr } = await _supa.from('reservations').select('*');
    if (resErr) throw resErr;
    (reservations || []).forEach(r => {
      result.push(mapToAllDataFormat({
        ...r,
        notification_sent: r.notification_sent ? 'true' : ''
      }, 'reservation'));
    });

    // 4. Fetch user profiles (NOT from Auth — from public.profiles)
    const { data: profiles, error: profErr } = await _supa.from('profiles').select('*');
    if (profErr) throw profErr;
    (profiles || []).forEach(p => {
      result.push(mapToAllDataFormat({
        ...p,
        password: '' // passwords are managed by Supabase Auth
      }, 'user'));
    });

    // 5. Fetch school periods config
    const { data: periods, error: perErr } = await _supa.from('school_periods').select('*');
    if (perErr) throw perErr;
    (periods || []).forEach(p => {
      result.push(mapToAllDataFormat({
        ...p,
        config_key: 'school_periods',
        periods_json: typeof p.periods_json === 'string'
          ? p.periods_json
          : JSON.stringify(p.periods_json)
      }, 'config'));
    });

  } catch (error) {
    console.error('❌ Error fetching data from Supabase:', error.message);
  }

  return result;
}

/**
 * Subscribe to Supabase Realtime changes.
 * Now applies only the affected record locally instead of re-fetching all tables.
 */
function subscribeRealtime() {
  if (!_supa) return;

  // Unsubscribe previous channel if exists
  if (realtimeChannel) {
    _supa.removeChannel(realtimeChannel);
  }

  realtimeChannel = _supa.channel('adempt-realtime')
    .on('postgres_changes',
      { event: '*', schema: 'public' },
      async (payload) => {
        // Skip events originated by our own local writes to avoid double-processing
        if (consumeLocalWrite(payload.event_type + ':' + (payload.new?.id || payload.old?.id || ''))) {
          return;
        }

        // Apply only the affected record locally
        _applyRealtimeEvent(payload);
        notifyDataChanged();
      }
    )
    .subscribe((status) => {
      console.log('🔄 Supabase Realtime status:', status);
    });
}

/**
 * Apply a single Realtime payload to allData without re-fetching everything.
 */
function _applyRealtimeEvent(payload) {
  const { eventType, new: newRecord, old: oldRecord } = payload;
  const table = payload.table; // e.g. 'reservations', 'devices', etc.

  // Map table name -> allData type
  const tableToType = {
    reservations: 'reservation',
    devices: 'device',
    carts: 'cart',
    profiles: 'user',
    school_periods: 'config'
  };
  const typeName = tableToType[table];
  if (!typeName) return; // unknown table, ignore

  let mappedRecord = null;

  if (eventType === 'INSERT' && newRecord) {
    mappedRecord = mapToAllDataFormat(
      mapRealtimeRecord(newRecord, table),
      typeName
    );
    _applyChangeLocally(mappedRecord, 'INSERT');
  } else if (eventType === 'UPDATE' && newRecord) {
    mappedRecord = mapToAllDataFormat(
      mapRealtimeRecord(newRecord, table),
      typeName
    );
    _applyChangeLocally(mappedRecord, 'UPDATE');
  } else if (eventType === 'DELETE' && oldRecord) {
    mappedRecord = {
      __backendId: String(oldRecord.id),
      type: typeName
    };
    _applyChangeLocally(mappedRecord, 'DELETE');
  }
}

/**
 * Map a raw Realtime record to the format expected by mapToAllDataFormat.
 */
function mapRealtimeRecord(record, table) {
  const r = { ...record };
  if (table === 'reservations') {
    r.notification_sent = r.notification_sent ? 'true' : '';
  }
  if (table === 'school_periods') {
    r.config_key = 'school_periods';
    r.periods_json = typeof r.periods_json === 'string'
      ? r.periods_json
      : JSON.stringify(r.periods_json);
  }
  if (table === 'devices') {
    // Preserve cart_id for relational integrity
    r.cart_id = String(r.cart_id);
    r.device_id = String(r.id);
  }
  if (table === 'carts') {
    r.cart_id = String(r.id);
  }
  if (table === 'profiles') {
    r.password = '';
  }
  return r;
}

// ========== EXPRESS (LEGACY) MODE ==========

let _previousData = null;

async function fetchLegacyData() {
  try {
    const response = await fetch('/api/data');
    if (!response.ok) {
      console.error('Erro ao buscar dados:', response.statusText);
      return;
    }
    const data = await response.json();
    const dataStr = JSON.stringify(data);
    const prevStr = JSON.stringify(_previousData);
    if (dataStr !== prevStr) {
      _previousData = data;
      allData = data;
      notifyDataChanged();
    }
  } catch (error) {
    console.error('Falha na comunicação com o servidor:', error);
  }
}

// ========== PUBLIC API ==========

window.dataSdk = {
  /**
   * Initialize the SDK.
   * @param {Object} handler - Object with onDataChanged callback
   * @returns {Promise<{isOk: boolean}>}
   */
  async init(handler) {
    _dataHandler = handler;

    // Try Supabase first; fall back to Express API
    const hasSupabase = initSupabase();

    if (hasSupabase) {
      console.log('🚀 Data SDK (Supabase Mode)');
      allData = await fetchAllSupabaseData();
      notifyDataChanged();
      // Subscribe to realtime changes (no more polling!)
      subscribeRealtime();
    } else {
      console.log('🚀 Data SDK (Express API Mode - Legacy)');
      await this.fetchData();
      // Fallback polling every 5s
      pollingInterval = setInterval(() => this.fetchData(), 5000);
    }

    return { isOk: true };
  },

  /**
   * Fetch all data (used by legacy polling fallback).
   */
  async fetchData() {
    if (isSupabaseMode()) {
      allData = await fetchAllSupabaseData();
      notifyDataChanged();
    } else {
      await fetchLegacyData();
    }
  },

  /**
   * Begin a batch operation — suppresses notifyDataChanged until endBatch().
   * Use around multi-step operations to avoid intermediate re-renders.
   */
  beginBatch() {
    _batchCount++;
  },

  /**
   * End a batch operation — re-enables notifyDataChanged and triggers one notification.
   */
  endBatch() {
    if (_batchCount > 0) _batchCount--;
    if (_batchCount === 0) {
      notifyDataChanged();
    }
  },

  /**
   * Create a new record.
   * @param {Object} record - The record to create (with a `type` field)
   * @returns {Promise<{isOk: boolean, id?: string}>}
   */
  async create(record) {
    if (isSupabaseMode()) {
      return this._supabaseCreate(record);
    }
    return this._legacyCreate(record);
  },

  /**
   * Create multiple records in a single batch operation.
   * @param {Array<Object>} records - Array of records to create (all must have same `type`)
   * @returns {Promise<{isOk: boolean, count?: number, ids?: string[], error?: string}>}
   */
  async createBatch(records) {
    if (!records || records.length === 0) return { isOk: true, count: 0 };
    if (isSupabaseMode()) {
      return this._supabaseCreateBatch(records);
    }
    return this._legacyCreateBatch(records);
  },

  /**
   * Update an existing record.
   * @param {Object} record - The full record with __backendId
   * @returns {Promise<{isOk: boolean}>}
   */
  async update(record) {
    if (isSupabaseMode()) {
      return this._supabaseUpdate(record);
    }
    return this._legacyUpdate(record);
  },

  /**
   * Delete a record.
   * @param {Object} record - The record to delete (must have __backendId)
   * @returns {Promise<{isOk: boolean}>}
   */
  async delete(record) {
    if (isSupabaseMode()) {
      return this._supabaseDelete(record);
    }
    return this._legacyDelete(record);
  },

  // ========== SUPABASE CRUD ==========

  async _supabaseCreate(record) {
    try {
      const type = record.type;
      let result;

      switch (type) {
        case 'cart': {
          const { cart_name, floor, device_type } = record;
          result = await _supa.from('carts').insert({
            cart_name: cart_name || '',
            floor: floor || '',
            device_type: device_type || ''
          }).select().single();
          break;
        }
        case 'device': {
          // Validar device_number antes do insert: a constraint do banco exige 1–40.
          // parseInt('') retorna NaN → || 0 daria 0, violando a constraint silenciosamente.
          const deviceNum = parseInt(record.device_number);
          if (!deviceNum || deviceNum < 1 || deviceNum > 40) {
            return { isOk: false, error: `Número do dispositivo inválido (${record.device_number}). Deve ser um inteiro entre 1 e 40.` };
          }
          // record.cart_id já é o __backendId (UUID) do carrinho vindo do script.
          // cartRec.id é deletado por mapToAllDataFormat; usar __backendId como UUID.
          const cartRec = allData.find(d => d.__backendId === record.cart_id && d.type === 'cart');
          const cartUuid = cartRec ? cartRec.__backendId : record.cart_id;
          result = await _supa.from('devices').insert({
            cart_id: cartUuid,
            device_number: deviceNum,
            device_serial: record.device_serial || '',
            device_brand: record.device_brand || '',
            device_type: record.device_type || ''
          }).select().single();
          break;
        }
        case 'reservation': {
          result = await _supa.from('reservations').insert({
            cart_name: record.cart_name || '',
            cart_id: record.cart_id || '',
            floor: record.floor || '',
            device_type: record.device_type || '',
            device_number: String(record.device_number || ''),
            device_brand: record.device_brand || '',
            device_serial: record.device_serial || '',
            reserved_by: record.reserved_by || '',
            reserved_email: record.reserved_email || '',
            date: record.date || '',
            period: record.period || '',
            status: record.status || 'active',
            notification_sent: record.notification_sent === 'true'
          }).select().single();
          break;
        }
        case 'config': {
          if (record.config_key === 'school_periods') {
            // Check if config already exists
            const { data: existing } = await _supa.from('school_periods').select('id').limit(1);
            if (existing && existing.length > 0) {
              // Update existing
              result = await _supa.from('school_periods')
                .update({
                  periods_json: JSON.parse(record.periods_json || '[]'),
                  updated_at: new Date().toISOString()
                })
                .eq('id', existing[0].id)
                .select().single();
            } else {
              // Insert new
              result = await _supa.from('school_periods').insert({
                periods_json: JSON.parse(record.periods_json || '[]')
              }).select().single();
            }
          }
          break;
        }
        default:
          return { isOk: false, error: `Unknown record type: ${type}` };
      }

      if (result && result.error) throw result.error;

      // Apply change locally instead of re-fetching all tables
      // This eliminates the full re-fetch + re-render on every single CRUD
      const newId = result?.data?.id || 'unknown';
      const mapped = mapToAllDataFormat(
        mapRealtimeRecord(result.data, type === 'reservation' ? 'reservations'
          : type === 'cart' ? 'carts'
          : type === 'device' ? 'devices'
          : type === 'user' ? 'profiles'
          : type === 'config' ? 'school_periods'
          : type),
        type
      );
      // Mark this as a local write so Realtime doesn't double-process it
      markLocalWrite('INSERT:' + newId);
      _applyChangeLocally(mapped, 'INSERT');

      // Only notify if not in batch mode
      if (_batchCount === 0) notifyDataChanged();

      return { isOk: true, id: String(newId) };
    } catch (error) {
      console.error('❌ Erro ao criar registro:', error.message);
      return { isOk: false, error: error.message };
    }
  },

  /**
   * Insert multiple records in a single Supabase call.
   * Much faster than N sequential create() calls (1 round-trip instead of N).
   */
  async _supabaseCreateBatch(records) {
    try {
      if (!records || records.length === 0) return { isOk: true, count: 0 };

      const type = records[0].type;
      if (type !== 'reservation') {
        // Fall back to sequential for non-reservation types
        let successCount = 0;
        const ids = [];
        for (const rec of records) {
          const r = await this._supabaseCreate(rec);
          if (r.isOk) { successCount++; if (r.id) ids.push(r.id); }
        }
        return { isOk: successCount > 0, count: successCount, ids };
      }

      // Batch insert reservations
      const rows = records.map(r => ({
        cart_name: r.cart_name || '',
        cart_id: r.cart_id || '',
        floor: r.floor || '',
        device_type: r.device_type || '',
        device_number: String(r.device_number || ''),
        device_brand: r.device_brand || '',
        device_serial: r.device_serial || '',
        reserved_by: r.reserved_by || '',
        reserved_email: r.reserved_email || '',
        date: r.date || '',
        period: r.period || '',
        status: r.status || 'active',
        notification_sent: r.notification_sent === 'true'
      }));

      const { data, error } = await _supa.from('reservations')
        .insert(rows)
        .select();

      if (error) throw error;

      // Apply all new records locally
      const createdRecords = data || [];
      const ids = [];
      for (const row of createdRecords) {
        const mapped = mapToAllDataFormat({
          ...row,
          notification_sent: row.notification_sent ? 'true' : ''
        }, 'reservation');
        ids.push(String(row.id));
        markLocalWrite('INSERT:' + row.id);
        _applyChangeLocally(mapped, 'INSERT');
      }

      if (_batchCount === 0) notifyDataChanged();

      return { isOk: true, count: createdRecords.length, ids };
    } catch (error) {
      console.error('❌ Erro ao criar reservas em lote:', error.message);
      return { isOk: false, count: 0, error: error.message };
    }
  },

  async _supabaseUpdate(record) {
    try {
      const type = record.type;
      const backendId = record.__backendId;
      let result;

      switch (type) {
        case 'user': {
          // Update profile (not password — that's managed by Auth)
          result = await _supa.from('profiles')
            .update({
              name: record.name,
              email: record.email,
              role: record.role,
              phone: record.phone || '',
              user_status: record.user_status || 'ativo'
            })
            .eq('id', backendId)
            .select().single();
          break;
        }
        case 'cart': {
          result = await _supa.from('carts')
            .update({
              cart_name: record.cart_name,
              floor: record.floor,
              device_type: record.device_type
            })
            .eq('id', backendId)
            .select().single();
          break;
        }
        case 'device': {
          result = await _supa.from('devices')
            .update({
              device_number: parseInt(record.device_number),
              device_serial: record.device_serial,
              device_brand: record.device_brand,
              device_type: record.device_type
            })
            .eq('id', backendId)
            .select().single();
          break;
        }
        case 'reservation': {
          result = await _supa.from('reservations')
            .update({
              status: record.status || 'active',
              notification_sent: record.notification_sent === 'true'
            })
            .eq('id', backendId)
            .select().single();
          break;
        }
        case 'config': {
          if (record.config_key === 'school_periods') {
            result = await _supa.from('school_periods')
              .update({
                periods_json: JSON.parse(record.periods_json || '[]'),
                updated_at: new Date().toISOString()
              })
              .eq('id', backendId)
              .select().single();
          }
          break;
        }
        default:
          return { isOk: false, error: `Unknown record type: ${type}` };
      }

      if (result && result.error) throw result.error;

      // Apply change locally instead of re-fetching all tables
      const updatedRecord = { ...record };
      if (result && result.data) {
        // Merge any server-side changes (e.g. updated_at timestamps)
        Object.keys(result.data).forEach(k => {
          if (k !== 'id') updatedRecord[k] = result.data[k];
        });
      }
      markLocalWrite('UPDATE:' + backendId);
      _applyChangeLocally(updatedRecord, 'UPDATE');

      if (_batchCount === 0) notifyDataChanged();

      return { isOk: true };
    } catch (error) {
      console.error('❌ Erro ao atualizar registro:', error.message);
      return { isOk: false, error: error.message };
    }
  },

  async _supabaseDelete(record) {
    try {
      const type = record.type;
      const backendId = record.__backendId;
      let table;

      switch (type) {
        case 'user':   table = 'profiles'; break;
        case 'cart':   table = 'carts'; break;
        case 'device': table = 'devices'; break;
        case 'reservation': table = 'reservations'; break;
        case 'config': table = 'school_periods'; break;
        default:
          return { isOk: false, error: `Unknown record type: ${type}` };
      }

      const { error } = await _supa.from(table).delete().eq('id', backendId);
      if (error) throw error;

      // Apply deletion locally instead of re-fetching all tables
      markLocalWrite('DELETE:' + backendId);
      _applyChangeLocally({ __backendId: backendId, type }, 'DELETE');

      if (_batchCount === 0) notifyDataChanged();

      return { isOk: true };
    } catch (error) {
      console.error('❌ Erro ao excluir registro:', error.message);
      return { isOk: false, error: error.message };
    }
  },

  // ========== EXPRESS (LEGACY) CRUD ==========

  async _legacyCreate(record) {
    try {
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
      if (!response.ok) return { isOk: false, error: `HTTP error! status: ${response.status}` };
      const result = await response.json();
      await this.fetchData();
      return { isOk: true, id: result.id };
    } catch (error) {
      return { isOk: false, error: error.message };
    }
  },

  /**
   * Batch create in legacy mode via sequential calls + single re-fetch at end.
   */
  async _legacyCreateBatch(records) {
    if (!records || records.length === 0) return { isOk: true, count: 0 };
    let successCount = 0;
    const ids = [];
    for (const rec of records) {
      const r = await this._legacyCreate(rec);
      if (r.isOk) { successCount++; if (r.id) ids.push(r.id); }
    }
    // Single re-fetch at the end instead of one per create
    await this.fetchData();
    return { isOk: successCount > 0, count: successCount, ids };
  },

  async _legacyUpdate(record) {
    try {
      const response = await fetch(`/api/data/${record.__backendId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
      if (!response.ok) return { isOk: false, error: `HTTP error! status: ${response.status}` };
      const result = await response.json();
      await this.fetchData();
      return result;
    } catch (error) {
      return { isOk: false, error: error.message };
    }
  },

  async _legacyDelete(record) {
    try {
      const response = await fetch(`/api/data/${record.__backendId}`, { method: 'DELETE' });
      if (!response.ok) return { isOk: false, error: `HTTP error! status: ${response.status}` };
      const result = await response.json();
      await this.fetchData();
      return result;
    } catch (error) {
      return { isOk: false, error: error.message };
    }
  }
};
