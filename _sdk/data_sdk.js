/**
 * ADECOMPT - Data SDK
 *
 * Provides a unified data layer for the frontend.
 * In Express mode (legacy): communicates with /api/data endpoints
 * In Supabase mode  (new):  communicates with Supabase PostgreSQL via REST + Realtime
 *
 * The mode is auto-detected based on whether the Supabase client is configured.
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

let dataHandler = null;
let allData = [];
let pollingInterval = null;
let realtimeChannel = null;

function notifyDataChanged() {
  if (dataHandler && typeof dataHandler.onDataChanged === 'function') {
    dataHandler.onDataChanged(allData);
  }
}

// ========== SUPABASE MODE ==========

let supabase = null;

function isSupabaseMode() {
  return supabase !== null;
}

/**
 * Initialize Supabase client.
 * Falls back to Express mode gracefully if Supabase is not available.
 */
function initSupabase() {
  try {
    const client = getSupabaseClient();
    if (!client) return false;
    supabase = client;
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
  if (!supabase) return [];
  const result = [];

  try {
    // 1. Fetch carts
    const { data: carts, error: cartsErr } = await supabase.from('carts').select('*');
    if (cartsErr) throw cartsErr;
    (carts || []).forEach(c => {
      result.push(mapToAllDataFormat({ ...c, cart_id: String(c.id) }, 'cart'));
    });

    // 2. Fetch devices
    const { data: devices, error: devsErr } = await supabase.from('devices').select('*');
    if (devsErr) throw devsErr;
    (devices || []).forEach(d => {
      result.push(mapToAllDataFormat({
        ...d,
        device_id: String(d.id),
        cart_id: String(d.cart_id)
      }, 'device'));
    });

    // 3. Fetch reservations
    const { data: reservations, error: resErr } = await supabase.from('reservations').select('*');
    if (resErr) throw resErr;
    (reservations || []).forEach(r => {
      result.push(mapToAllDataFormat({
        ...r,
        notification_sent: r.notification_sent ? 'true' : ''
      }, 'reservation'));
    });

    // 4. Fetch user profiles (NOT from Auth — from public.profiles)
    const { data: profiles, error: profErr } = await supabase.from('profiles').select('*');
    if (profErr) throw profErr;
    (profiles || []).forEach(p => {
      result.push(mapToAllDataFormat({
        ...p,
        password: '' // passwords are managed by Supabase Auth
      }, 'user'));
    });

    // 5. Fetch school periods config
    const { data: periods, error: perErr } = await supabase.from('school_periods').select('*');
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
 */
function subscribeRealtime() {
  if (!supabase) return;

  // Unsubscribe previous channel if exists
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
  }

  realtimeChannel = supabase.channel('adempt-realtime')
    .on('postgres_changes',
      { event: '*', schema: 'public' },
      async () => {
        // Re-fetch all data on any change
        allData = await fetchAllSupabaseData();
        notifyDataChanged();
      }
    )
    .subscribe((status) => {
      console.log('🔄 Supabase Realtime status:', status);
    });
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
    dataHandler = handler;

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
          result = await supabase.from('carts').insert({
            cart_name: cart_name || '',
            floor: floor || '',
            device_type: device_type || ''
          }).select().single();
          break;
        }
        case 'device': {
          // Need to find the cart UUID from __backendId
          const cartRec = allData.find(d => d.__backendId === record.cart_id && d.type === 'cart');
          const cartUuid = cartRec ? cartRec.id || record.cart_id : record.cart_id;
          result = await supabase.from('devices').insert({
            cart_id: cartUuid,
            device_number: parseInt(record.device_number) || 0,
            device_serial: record.device_serial || '',
            device_brand: record.device_brand || '',
            device_type: record.device_type || ''
          }).select().single();
          break;
        }
        case 'reservation': {
          result = await supabase.from('reservations').insert({
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
            const { data: existing } = await supabase.from('school_periods').select('id').limit(1);
            if (existing && existing.length > 0) {
              // Update existing
              result = await supabase.from('school_periods')
                .update({
                  periods_json: JSON.parse(record.periods_json || '[]'),
                  updated_at: new Date().toISOString()
                })
                .eq('id', existing[0].id)
                .select().single();
            } else {
              // Insert new
              result = await supabase.from('school_periods').insert({
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

      // Re-fetch all data to keep state consistent
      allData = await fetchAllSupabaseData();
      notifyDataChanged();

      return { isOk: true, id: result?.data?.id || 'unknown' };
    } catch (error) {
      console.error('❌ Erro ao criar registro:', error.message);
      return { isOk: false, error: error.message };
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
          result = await supabase.from('profiles')
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
          result = await supabase.from('carts')
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
          result = await supabase.from('devices')
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
          result = await supabase.from('reservations')
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
            result = await supabase.from('school_periods')
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

      // Re-fetch all data
      allData = await fetchAllSupabaseData();
      notifyDataChanged();

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

      const { error } = await supabase.from(table).delete().eq('id', backendId);
      if (error) throw error;

      // Re-fetch all data
      allData = await fetchAllSupabaseData();
      notifyDataChanged();

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
