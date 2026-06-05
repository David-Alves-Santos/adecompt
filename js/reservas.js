// ========== RESERVAR / MINHAS RESERVAS ==========
import { state } from './state.js';
import { getCarts, getDevices, getReservations, toast, todayStr, isAdmin } from './helpers.js';
import { navigate } from './routing.js';

export function renderReservar(c) {
  const carts = getCarts();
  const today = todayStr();

  c.innerHTML = `
    <div class="fade-in max-w-6xl mx-auto">
      <h2 class="text-xl font-bold mb-1 flex items-center gap-2"><i data-lucide="calendar-plus" style="width:22px;height:22px;color:#3b82f6"></i> Reservar Equipamento</h2>
      <p class="text-slate-400 text-sm mb-6">Selecione o carrinho, data e horários desejados</p>

      ${carts.length === 0 ? `<div class="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400"><i data-lucide="inbox" style="width:40px;height:40px;margin:0 auto 12px;color:#475569"></i><p>Nenhum carrinho cadastrado ainda.</p>${isAdmin() ? `<button data-action="navigate" data-view="carrinhos" class="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition">+ Cadastrar primeiro carrinho</button>` : '<p class="text-xs mt-1">Peça ao administrador para cadastrar os carrinhos.</p>'}</div>` : `
      <div class="grid gap-4 sm:grid-cols-2 mb-6">
        <div>
          <label class="block text-sm font-medium text-slate-300 mb-1">Carrinho</label>
          <select id="sel-cart" onchange="updateDeviceGrid()" class="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white">
            <option value="">Selecione um carrinho</option>
            ${carts.map(ct => `<option value="${ct.__backendId}">${ct.cart_name} — ${ct.floor} (${ct.device_type})</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-300 mb-1">Data</label>
          <input type="date" id="sel-date" value="${today}" min="${today}" onchange="updateDeviceGrid()" class="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white">
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-300 mb-2">Horários</label>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-6" id="period-checks">
          ${state.PERIODS.map((p, i) => `
            <label class="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg cursor-pointer hover:border-blue-500 transition text-xs">
              <input type="checkbox" value="${p}" class="period-cb accent-blue-500" onchange="updateDeviceGrid()"> <span>${p}</span>
            </label>
          `).join('')}
        </div>
      </div>

        <div id="device-grid-section" class="hidden">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-semibold text-slate-300">Dispositivos</h3>
          <div class="flex items-center gap-4 text-xs text-slate-400">
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-blue-500 inline-block"></span> Disponível</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-red-500 inline-block"></span> Em uso</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-slate-600 inline-block"></span> Não cadastrado</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-emerald-500 inline-block"></span> Selecionado</span>
          </div>
        </div>
        <div id="device-grid" class="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 mb-6"></div>
        <button id="confirm-reservation-btn" data-action="confirm-reservation" class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition" style="opacity:0.4;pointer-events:none">Confirmar Reserva</button>
      </div>
      `}
    </div>
  `;
}

export function updateDeviceGrid() {
  const cartId = document.getElementById('sel-cart')?.value;
  const date = document.getElementById('sel-date')?.value;
  const checkedPeriods = [...document.querySelectorAll('.period-cb:checked')].map(cb => cb.value);
  const section = document.getElementById('device-grid-section');
  const grid = document.getElementById('device-grid');

  if (!cartId || !date || checkedPeriods.length === 0) {
    if (section) section.classList.add('hidden');
    return;
  }
  section.classList.remove('hidden');
  state.selectedDevices.clear();

  const cart = getCarts().find(ct => ct.__backendId === cartId);
  if (!cart) return;

  const cartDevices = getDevices().filter(d => String(d.cart_id) === String(cartId));
  const registeredDeviceNumbers = new Set(cartDevices.map(d => parseInt(d.device_number)));

  const reservations = getReservations().filter(r =>
    r.cart_name === cart.cart_name && r.date === date && checkedPeriods.includes(r.period) && r.status === 'active'
  );
  const reservedDevices = new Set(reservations.map(r => parseInt(r.device_number)));

  let html = '';
  for (let i = 1; i <= 40; i++) {
    const isRegistered = registeredDeviceNumbers.has(i);
    const reserved = reservedDevices.has(i);
    const icon = cart.device_type === 'Tablet' ? 'tablet' : 'laptop';

    let status, bgColor, borderColor, textColor, clickable;
    if (!isRegistered) {
      status = 'notregistered';
      bgColor = 'bg-slate-700/30';
      borderColor = 'border-slate-600';
      textColor = 'text-slate-500';
      clickable = false;
    } else if (reserved) {
      status = 'reserved';
      bgColor = 'bg-red-500/20';
      borderColor = 'border-red-500/50';
      textColor = 'text-red-400';
      clickable = false;
    } else {
      status = 'available';
      bgColor = 'bg-blue-500/20';
      borderColor = 'border-blue-500/50 hover:border-blue-400';
      textColor = 'text-blue-400';
      clickable = true;
    }

    html += `
      <div class="device-card rounded-xl p-2 text-center border-2 ${bgColor} ${borderColor} ${clickable ? 'cursor-pointer' : 'cursor-not-allowed'}"
           data-device="${i}" data-status="${status}" data-action="toggle-device">
        <i data-lucide="${icon}" style="width:20px;height:20px;margin:0 auto;color:${status === 'notregistered' ? '#78909c' : status === 'reserved' ? '#ef4444' : '#3b82f6'}"></i>
        <div class="device-num-label text-xs mt-1 font-medium ${textColor}">#${i}</div>
        ${status === 'notregistered' ? `<div class="text-xs text-slate-500">não cadastrado</div>` : status === 'reserved' ? `<div class="text-xs text-red-300 truncate" title="${reservations.find(r => parseInt(r.device_number) === i)?.reserved_by || ''}">${(reservations.find(r => parseInt(r.device_number) === i)?.reserved_by || '').split(' ')[0]}</div>` : ''}
      </div>
    `;
  }
  grid.innerHTML = html;
  window.lucide?.createIcons();
  updateConfirmBtn();
}

export function toggleDevice(el, num, status) {
  const currentStatus = el.getAttribute('data-status');
  if (currentStatus !== 'available') return;

  if (state.selectedDevices.has(num)) {
    state.selectedDevices.delete(num);
    el.className = 'device-card rounded-xl p-2 text-center border-2 bg-blue-500/20 border-blue-500/50 hover:border-blue-400 cursor-pointer';
    const icon = el.querySelector('i, svg');
    if (icon) icon.style.color = '#3b82f6';
    const textEl = el.querySelector('.device-num-label');
    if (textEl) {
      textEl.classList.remove('text-emerald-400');
      textEl.classList.add('text-blue-400');
    }
  } else {
    state.selectedDevices.add(num);
    el.className = 'device-card rounded-xl p-2 text-center border-2 bg-emerald-500/20 border-emerald-500 cursor-pointer';
    const icon = el.querySelector('i, svg');
    if (icon) icon.style.color = '#10b981';
    const textEl = el.querySelector('.device-num-label');
    if (textEl) {
      textEl.classList.remove('text-blue-400');
      textEl.classList.add('text-emerald-400');
    }
  }
  updateConfirmBtn();
}

export function updateConfirmBtn() {
  const btn = document.getElementById('confirm-reservation-btn');
  if (btn) {
    const shouldEnable = state.selectedDevices.size > 0;
    if (shouldEnable) {
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
      btn.style.backgroundColor = '#2563eb';
      btn.style.cursor = 'pointer';
      btn.onmouseover = () => { btn.style.backgroundColor = '#1d4ed8'; };
      btn.onmouseout = () => { btn.style.backgroundColor = '#2563eb'; };
    } else {
      btn.style.opacity = '0.4';
      btn.style.pointerEvents = 'none';
      btn.style.backgroundColor = '#475569';
      btn.style.cursor = 'not-allowed';
      btn.onmouseover = null;
      btn.onmouseout = null;
    }
  }
}

export function showConfirmationModal(cartId, date, periods, cart) {
  if (!cart || periods.length === 0 || state.selectedDevices.size === 0) return;

  const totalReservations = periods.length * state.selectedDevices.size;
  const dateObj = new Date(date + 'T12:00:00');
  const formattedDate = dateObj.toLocaleDateString('pt-BR');

  const modal = document.createElement('div');
  modal.id = 'confirmation-modal';
  modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 fade-in';
  modal.innerHTML = `
    <div class="bg-slate-800 border border-slate-700 rounded-2xl max-w-sm w-full p-6 fade-in">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
          <i data-lucide="alert-circle" style="width:20px;height:20px;color:#3b82f6"></i>
        </div>
        <h3 class="font-bold text-white text-lg">Confirmar Reserva?</h3>
      </div>

      <div class="bg-slate-700/30 border border-slate-600 rounded-xl p-4 mb-6 space-y-2">
        <div class="flex justify-between text-sm">
          <span class="text-slate-400">Carrinho:</span>
          <span class="text-white font-medium">${cart.cart_name}</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-slate-400">Data:</span>
          <span class="text-white font-medium">${formattedDate}</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-slate-400">Dispositivos:</span>
          <span class="text-blue-400 font-medium">${[...state.selectedDevices].sort((a, b) => a - b).map(d => '#' + d).join(', ')}</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-slate-400">Horários:</span>
          <span class="text-white font-medium">${periods.length} período(s)</span>
        </div>
        <div class="border-t border-slate-600 pt-2 mt-2">
          <div class="flex justify-between text-sm font-semibold">
            <span class="text-slate-300">Total de Reservas:</span>
            <span class="text-emerald-400">${totalReservations}</span>
          </div>
        </div>
      </div>

      <p class="text-sm text-slate-400 mb-6">Você deseja prosseguir com esta reserva?</p>

      <div class="flex gap-3">
        <button class="modal-cancel-btn flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition">
          Cancelar
        </button>
        <button class="modal-confirm-btn flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition flex items-center justify-center gap-2">
          <i data-lucide="check" style="width:16px;height:16px"></i> Confirmar
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  window.lucide?.createIcons();

  const cancelBtn = modal.querySelector('.modal-cancel-btn');
  const confirmBtn = modal.querySelector('.modal-confirm-btn');

  cancelBtn.onclick = (e) => {
    e.stopPropagation();
    modal.remove();
    state.isLoading = false;
  };

  confirmBtn.onclick = (e) => {
    e.stopPropagation();
    modal.remove();
    proceedWithReservation(cartId, date, periods, cart);
  };

  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.remove();
      state.isLoading = false;
    }
  };
}

export async function proceedWithReservation(cartId, date, periods, cart) {
  if (!state.isLoading) state.isLoading = true;

  if (!cart || periods.length === 0 || state.selectedDevices.size === 0) {
    state.isLoading = false;
    toast('Dados inválidos para criar reserva.', 'error');
    return;
  }

  const btn = document.getElementById('confirm-reservation-btn');
  if (btn) {
    btn.style.pointerEvents = 'none';
    btn.style.opacity = '0.4';
    btn.innerHTML = '<i data-lucide="loader" style="width:16px;height:16px;margin-right:8px"></i> Processando...';
  }

  const reservations = [];
  for (const period of periods) {
    for (const devNum of state.selectedDevices) {
      reservations.push({
        type: 'reservation',
        cart_name: cart.cart_name || '',
        cart_id: cartId || '',
        floor: cart.floor || '',
        device_type: cart.device_type || '',
        device_number: String(devNum),
        device_brand: '',
        device_serial: '',
        reserved_by: state.currentUser.name || '',
        reserved_email: state.currentUser.email || '',
        date: date || '',
        period: period || '',
        status: 'active',
        notification_sent: ''
      });
    }
  }

  window.dataSdk.beginBatch();

  let successCount = 0;
  let errorCount = 0;

  try {
    const result = await window.dataSdk.createBatch(reservations);
    if (result.isOk) {
      successCount = result.count || 0;
    } else {
      errorCount = reservations.length;
    }
  } catch (err) {
    console.error('Erro no processo:', err);
    errorCount = reservations.length;
  }

  window.dataSdk.endBatch();

  state.isLoading = false;

  if (btn) {
    btn.style.pointerEvents = 'auto';
    btn.style.opacity = '1';
    btn.innerHTML = 'Confirmar Reserva';
  }

  if (successCount > 0) {
    if (errorCount === 0) {
      toast(`✅ ${successCount} reserva(s) criada(s) com sucesso!`);
    } else {
      toast(`⚠️ ${successCount} reserva(s) criada(s), mas ${errorCount} falharam. Verifique conflitos.`, 'warning');
    }
    state.selectedDevices.clear();

    const cartIdEl = document.getElementById('sel-cart');
    const dateEl = document.getElementById('sel-date');
    if (cartIdEl) cartIdEl.value = '';
    if (dateEl) dateEl.value = todayStr();
    const periodCheckboxes = document.querySelectorAll('.period-cb');
    periodCheckboxes.forEach(cb => cb.checked = false);

    updateDeviceGrid();

    navigate('minhas');
  } else {
    toast('❌ Erro ao criar reservas. Tente novamente.', 'error');
  }
}

export function confirmReservation() {
  if (state.isLoading) return;

  const cartIdEl = document.getElementById('sel-cart');
  const dateEl = document.getElementById('sel-date');

  if (!cartIdEl || !dateEl) {
    toast('Formulário não encontrado.', 'error');
    return;
  }

  const cartId = cartIdEl.value;
  const date = dateEl.value;
  const periods = [...document.querySelectorAll('.period-cb:checked')].map(cb => cb.value);
  const cart = getCarts().find(ct => ct.__backendId === cartId);

  if (!cartId) { toast('Selecione um carrinho.', 'error'); return; }
  if (!cart) { toast('Carrinho não encontrado.', 'error'); return; }
  if (!date) { toast('Selecione uma data.', 'error'); return; }
  if (periods.length === 0) { toast('Selecione pelo menos um horário.', 'error'); return; }
  if (state.selectedDevices.size === 0) { toast('Selecione pelo menos um dispositivo.', 'error'); return; }

  const totalNew = periods.length * state.selectedDevices.size;
  if (state.allData.length + totalNew > 999) {
    toast('Limite de registros atingido. Exclua reservas antigas.', 'error');
    return;
  }

  state.isLoading = true;

  showConfirmationModal(cartId, date, periods, cart);
}

export function renderMinhas(c) {
  const mine = getReservations().filter(r => r.reserved_email === state.currentUser.email && r.status === 'active');
  const grouped = {};
  mine.forEach(r => {
    const key = `${r.date}|${r.cart_name}`;
    if (!grouped[key]) grouped[key] = { date: r.date, cart: r.cart_name, floor: r.floor, type: r.device_type, periods: new Set(), devices: new Set(), records: [] };
    grouped[key].periods.add(r.period);
    grouped[key].devices.add(r.device_number);
    grouped[key].records.push(r);
  });

  c.innerHTML = `
    <div class="fade-in max-w-4xl mx-auto">
      <h2 class="text-xl font-bold mb-1 flex items-center gap-2"><i data-lucide="bookmark" style="width:22px;height:22px;color:#3b82f6"></i> Minhas Reservas</h2>
      <p class="text-slate-400 text-sm mb-6">Suas reservas ativas</p>
      ${Object.keys(grouped).length === 0 ? '<div class="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400"><p>Nenhuma reserva ativa.</p></div>' :
      Object.values(grouped).map(g => `
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-4">
          <div class="flex items-center justify-between mb-3">
            <div>
              <h3 class="font-semibold text-white">${g.cart} <span class="text-slate-400 text-xs font-normal">${g.floor}</span></h3>
              <p class="text-sm text-slate-400">${new Date(g.date + 'T12:00:00').toLocaleDateString('pt-BR')} — ${g.type}</p>
            </div>
            <div class="flex gap-2">
              <button data-action="show-finalize-modal" data-ids="${g.records.map(r => r.__backendId).join(',')}" class="px-3 py-1 text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg transition flex items-center gap-1">
                <i data-lucide="check" style="width:12px;height:12px"></i> Finalizar
              </button>
              <button data-action="cancel-group" data-ids="${g.records.map(r => r.__backendId).join(',')}" class="px-3 py-1 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition">Cancelar</button>
            </div>
          </div>
          <div class="text-xs text-slate-400 mb-1">Dispositivos: ${[...g.devices].sort((a, b) => a - b).map(d => '#' + d).join(', ')}</div>
          <div class="text-xs text-slate-400">Horários: ${[...g.periods].join(', ')}</div>
        </div>
      `).join('')}
    </div>
  `;
}

export async function cancelGroup(ids) {
  if (state.isLoading) return;
  state.isLoading = true;
  const arr = ids.split(',');
  window.dataSdk.beginBatch();
  let hasError = false;
  for (const id of arr) {
    const rec = state.allData.find(d => d.__backendId === id);
    if (rec) {
      const result = await window.dataSdk.delete(rec);
      if (!result.isOk) hasError = true;
    }
  }
  window.dataSdk.endBatch();
  state.isLoading = false;
  if (hasError) {
    toast('⚠️ Erro ao cancelar uma ou mais reservas.', 'error');
  } else {
    toast('Reserva cancelada.');
  }
}

export function showFinalizeModal(ids) {
  if (state.isLoading) return;

  const arr = ids.split(',');
  const records = arr.map(id => state.allData.find(d => d.__backendId === id)).filter(r => r);

  if (records.length === 0) {
    toast('Nenhuma reserva encontrada.', 'error');
    return;
  }

  const modal = document.createElement('div');
  modal.id = 'finalize-modal';
  modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 fade-in';
  modal.innerHTML = `
    <div class="bg-slate-800 border border-slate-700 rounded-2xl max-w-sm w-full p-6 fade-in">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <i data-lucide="check-circle" style="width:20px;height:20px;color:#10b981"></i>
        </div>
        <h3 class="font-bold text-white text-lg">Finalizar Reserva?</h3>
      </div>

      <div class="bg-slate-700/30 border border-slate-600 rounded-xl p-4 mb-6 space-y-2">
        <p class="text-sm text-slate-300">Você deseja finalizar esta reserva? Os dispositivos serão liberados para outros professores.</p>
        <div class="border-t border-slate-600 pt-2 mt-2">
          <div class="text-xs text-slate-400">
            <p><strong>Total de dispositivos:</strong> ${records.length}</p>
            <p><strong>Carrinho:</strong> ${records[0].cart_name}</p>
            <p><strong>Data:</strong> ${new Date(records[0].date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
      </div>

      <p class="text-sm text-slate-400 mb-6">Esta ação não pode ser desfeita.</p>

      <div class="flex gap-3">
        <button class="modal-cancel-btn flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition">
          Cancelar
        </button>
        <button class="modal-finalize-btn flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition flex items-center justify-center gap-2">
          <i data-lucide="check" style="width:16px;height:16px"></i> Finalizar
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  window.lucide?.createIcons();

  const cancelBtn = modal.querySelector('.modal-cancel-btn');
  const finalizeBtn = modal.querySelector('.modal-finalize-btn');

  cancelBtn.onclick = (e) => {
    e.stopPropagation();
    modal.remove();
  };

  finalizeBtn.onclick = async (e) => {
    e.stopPropagation();
    modal.remove();

    state.isLoading = true;
    window.dataSdk.beginBatch();
    for (const id of arr) {
      const rec = state.allData.find(d => d.__backendId === id);
      if (rec) {
        const updated = { ...rec, status: 'completed' };
        await window.dataSdk.update(updated);
      }
    }
    window.dataSdk.endBatch();
    state.isLoading = false;
    toast('✅ Reserva finalizada com sucesso!');
    navigate('minhas');
  };

  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  };
}
