// ========== ADMIN: CARRINHOS ==========
import { state } from './state.js';
import { getCarts, getDevices, toast } from './helpers.js';
import { navigate } from './routing.js';

export function renderCarrinhos(c) {
  const carts = getCarts();
  const devices = getDevices();
  c.innerHTML = `
    <div class="fade-in max-w-5xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-xl font-bold flex items-center gap-2"><i data-lucide="hard-drive" style="width:22px;height:22px;color:#3b82f6"></i> Carrinhos</h2>
          <p class="text-slate-400 text-sm">Gerencie os carrinhos e dispositivos</p>
        </div>
        <button data-action="show-cart-form" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition flex items-center gap-1">
          <i data-lucide="plus" style="width:16px;height:16px"></i> Novo Carrinho
        </button>
      </div>
      <div id="cart-form-area"></div>

      <div class="space-y-4">
        ${carts.length === 0 ? '<div class="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400"><p>Nenhum carrinho cadastrado.</p></div>' : ''}
        ${carts.map(ct => {
          const cartDevices = devices.filter(d => d.cart_id === ct.__backendId);
          return `
          <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5" id="cart-card-${ct.__backendId}">
            <div class="flex items-center justify-between mb-4 cart-header">
              <div>
                <h3 class="font-semibold text-white">${ct.cart_name}</h3>
                <p class="text-sm text-slate-400">${ct.floor} — ${ct.device_type} (${cartDevices.length} dispositivos)</p>
              </div>
              <div class="flex gap-2">
                <button data-action="show-add-device-form" data-id="${ct.__backendId}" class="px-3 py-1 text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg transition flex items-center gap-1">
                  <i data-lucide="plus" style="width:12px;height:12px"></i> Adicionar Dispositivo
                </button>
                <button data-action="edit-cart" data-id="${ct.__backendId}" class="p-2 text-amber-400 hover:bg-amber-500/20 rounded-lg transition" title="Editar carrinho">
                  <i data-lucide="pencil" style="width:16px;height:16px"></i>
                </button>
                <button data-action="confirm-delete-cart" data-id="${ct.__backendId}" class="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition">
                  <i data-lucide="trash-2" style="width:16px;height:16px"></i>
                </button>
              </div>
            </div>

            <div id="add-device-form-${ct.__backendId}"></div>

            ${cartDevices.length === 0 ? '<div class="text-sm text-slate-500 italic">Nenhum dispositivo cadastrado neste carrinho.</div>' : `
            <div class="grid gap-2 max-h-60 overflow-y-auto">
              <div class="grid grid-cols-6 gap-2 text-xs font-medium text-slate-400 px-2 py-1">
                <span>Posição</span>
                <span>Nº Patrimônio</span>
                <span>Marca</span>
                <span class="col-span-2">Modelo</span>
                <span class="text-right">Ação</span>
              </div>
              ${cartDevices.map(dev => `
                <div class="grid grid-cols-6 gap-2 items-center text-sm bg-slate-800/50 rounded-lg px-3 py-2" id="device-row-${dev.__backendId}">
                  <span class="text-blue-400 font-medium">#${dev.device_number}</span>
                  <span class="text-white font-medium">${dev.device_serial || '-'}</span>
                  <span class="text-blue-400">${dev.device_brand}</span>
                  <span class="col-span-2 text-slate-300">${dev.device_type || '-'}</span>
                  <span class="text-right flex items-center justify-end gap-1">
                    <button data-action="edit-device" data-id="${dev.__backendId}" class="p-1 text-amber-400 hover:bg-amber-500/20 rounded transition" title="Editar dispositivo">
                      <i data-lucide="pencil" style="width:14px;height:14px"></i>
                    </button>
                    <button data-action="confirm-delete-device" data-id="${dev.__backendId}" class="p-1 text-red-400 hover:bg-red-500/20 rounded transition">
                      <i data-lucide="trash-2" style="width:14px;height:14px"></i>
                    </button>
                  </span>
                </div>
              `).join('')}
            </div>
            `}
          </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

export function editCart(id) {
  const ct = getCarts().find(c => c.__backendId === id);
  if (!ct) return;

  const cartCard = document.querySelector(`#cart-card-${CSS.escape(id)} .cart-header`);
  if (!cartCard) return;

  cartCard.innerHTML = `
    <div class="w-full">
      <div class="grid gap-3 sm:grid-cols-3 mb-3">
        <div>
          <label class="block text-xs text-slate-400 mb-1">Nome do Carrinho</label>
          <input id="edit-cart-name-${id}" value="${ct.cart_name}" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white">
        </div>
        <div>
          <label class="block text-xs text-slate-400 mb-1">Andar / Local</label>
          <input id="edit-cart-floor-${id}" value="${ct.floor}" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white">
        </div>
        <div>
          <label class="block text-xs text-slate-400 mb-1">Tipo de Dispositivo</label>
          <select id="edit-cart-type-${id}" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white">
            <option value="Notebook" ${ct.device_type === 'Notebook' ? 'selected' : ''}>Notebook</option>
            <option value="Tablet" ${ct.device_type === 'Tablet' ? 'selected' : ''}>Tablet</option>
          </select>
        </div>
      </div>
      <div class="flex gap-2">
        <button data-action="update-cart" data-id="${id}" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition">Salvar</button>
        <button data-action="cancel-edit-cart" data-id="${id}" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition">Cancelar</button>
      </div>
    </div>
  `;
  window.lucide?.createIcons();
}

export function cancelEditCart(id) {
  navigate('carrinhos');
}

export async function updateCart(id) {
  const ct = getCarts().find(c => c.__backendId === id);
  if (!ct) return;

  const novoNome = document.getElementById(`edit-cart-name-${id}`).value.trim();
  const novoAndar = document.getElementById(`edit-cart-floor-${id}`).value.trim();
  const novoTipo = document.getElementById(`edit-cart-type-${id}`).value;

  if (!novoNome || !novoAndar) {
    toast('Preencha todos os campos.', 'error');
    return;
  }

  const cartRecord = state.allData.find(d => d.__backendId === id);
  if (!cartRecord) return;

  const r = await window.dataSdk.update({
    ...cartRecord,
    cart_name: novoNome,
    floor: novoAndar,
    device_type: novoTipo
  });
  if (r.isOk) {
    toast('Carrinho atualizado!');
    navigate('carrinhos');
  } else {
    toast('Erro ao atualizar.', 'error');
  }
}

export function editDevice(id) {
  const dev = getDevices().find(d => d.__backendId === id);
  if (!dev) return;

  const deviceRow = document.querySelector(`#device-row-${CSS.escape(id)}`);
  if (!deviceRow) return;

  deviceRow.innerHTML = `
    <div class="col-span-6 grid grid-cols-6 gap-2 items-center text-sm bg-slate-700/50 rounded-lg px-3 py-2">
      <div>
        <select id="edit-dev-number-${id}" class="w-full px-2 py-1 bg-slate-800 border border-slate-600 rounded text-xs text-white">
          ${Array.from({ length: 40 }, (_, i) => i + 1).map(n => `<option value="${n}" ${parseInt(dev.device_number) === n ? 'selected' : ''}>#${n}</option>`).join('')}
        </select>
      </div>
      <div>
        <input id="edit-dev-serial-${id}" value="${dev.device_serial || ''}" class="w-full px-2 py-1 bg-slate-800 border border-slate-600 rounded text-xs text-white">
      </div>
      <div>
        <select id="edit-dev-brand-${id}" class="w-full px-2 py-1 bg-slate-800 border border-slate-600 rounded text-xs text-white">
          <option value="Positivo" ${dev.device_brand === 'Positivo' ? 'selected' : ''}>Positivo</option>
          <option value="Samsung" ${dev.device_brand === 'Samsung' ? 'selected' : ''}>Samsung</option>
          <option value="Lenovo" ${dev.device_brand === 'Lenovo' ? 'selected' : ''}>Lenovo</option>
          <option value="Outro" ${dev.device_brand === 'Outro' ? 'selected' : ''}>Outro</option>
        </select>
      </div>
      <div class="col-span-2">
        <input id="edit-dev-model-${id}" value="${dev.device_type || ''}" class="w-full px-2 py-1 bg-slate-800 border border-slate-600 rounded text-xs text-white">
      </div>
      <div class="text-right flex items-center justify-end gap-1">
        <button data-action="update-device" data-id="${id}" class="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded transition font-medium">Salvar</button>
        <button data-action="cancel-edit-device" data-id="${id}" class="px-2 py-1 bg-slate-600 hover:bg-slate-500 text-white text-xs rounded transition">Cancelar</button>
      </div>
    </div>
  `;
  window.lucide?.createIcons();
}

export function cancelEditDevice(id) {
  navigate('carrinhos');
}

export async function updateDevice(id) {
  const dev = getDevices().find(d => d.__backendId === id);
  if (!dev) return;

  const novaPos = document.getElementById(`edit-dev-number-${id}`).value;
  const novoSerial = document.getElementById(`edit-dev-serial-${id}`).value.trim();
  const novaMarca = document.getElementById(`edit-dev-brand-${id}`).value;
  const novoModelo = document.getElementById(`edit-dev-model-${id}`).value.trim();

  if (!novaPos || !novoSerial || !novaMarca) {
    toast('Preencha os campos obrigatórios.', 'error');
    return;
  }

  const posConflict = getDevices().find(d =>
    String(d.cart_id) === String(dev.cart_id) &&
    parseInt(d.device_number) === parseInt(novaPos) &&
    d.__backendId !== id
  );
  if (posConflict) {
    toast('❌ Esta posição já está ocupada neste carrinho.', 'error');
    return;
  }

  const deviceRecord = state.allData.find(d => d.__backendId === id);
  if (!deviceRecord) return;

  const r = await window.dataSdk.update({
    ...deviceRecord,
    device_number: parseInt(novaPos),
    device_serial: novoSerial,
    device_brand: novaMarca,
    device_type: novoModelo
  });
  if (r.isOk) {
    toast('Dispositivo atualizado!');
    navigate('carrinhos');
  } else {
    toast('Erro ao atualizar.', 'error');
  }
}

export function showCartForm() {
  state.isFormOpen = true;
  const area = document.getElementById('cart-form-area');
  area.innerHTML = `
    <div class="bg-slate-800 border border-slate-700 rounded-2xl p-5 mb-6 fade-in">
      <h3 class="font-semibold text-white mb-3">Novo Carrinho</h3>
      <div class="grid gap-3 sm:grid-cols-3">
        <div>
          <label class="block text-xs text-slate-400 mb-1">Nome do Carrinho</label>
          <input id="new-cart-name" placeholder="Ex: Carrinho A" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white">
        </div>
        <div>
          <label class="block text-xs text-slate-400 mb-1">Andar / Local</label>
          <input id="new-cart-floor" placeholder="Ex: 2º Andar" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white">
        </div>
        <div>
          <label class="block text-xs text-slate-400 mb-1">Tipo de Dispositivo</label>
          <select id="new-cart-type" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white">
            <option>Notebook</option>
            <option>Tablet</option>
          </select>
        </div>
      </div>
      <div class="flex gap-2 mt-4">
        <button data-action="save-cart" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition">Salvar</button>
        <button data-action="cancel-cart-form" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition">Cancelar</button>
      </div>
    </div>
  `;
  window.lucide?.createIcons();
}

export function showAddDeviceForm(cartId) {
  const area = document.getElementById(`add-device-form-${cartId}`);
  area.innerHTML = `
    <div class="bg-slate-700/50 border border-slate-600 rounded-xl p-3 mb-3 fade-in">
      <div class="grid gap-2 sm:grid-cols-5 mb-2">
        <div>
          <label class="block text-xs text-slate-300 mb-1">Posição (1-40)</label>
          <select id="new-dev-number-${cartId}" class="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-xs text-white">
            <option value="">Selecionar...</option>
            ${Array.from({ length: 40 }, (_, i) => i + 1).map(n => `<option value="${n}">#${n}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-xs text-slate-300 mb-1">Nº Patrimônio</label>
          <input id="new-dev-serial-${cartId}" placeholder="Ex: 12345" class="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-xs text-white">
        </div>
        <div>
          <label class="block text-xs text-slate-300 mb-1">Marca</label>
          <select id="new-dev-brand-${cartId}" class="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-xs text-white">
            <option value="Positivo">Positivo</option>
            <option value="Samsung">Samsung</option>
            <option value="Lenovo">Lenovo</option>
            <option value="Outro">Outro</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-slate-300 mb-1">Modelo</label>
          <input id="new-dev-model-${cartId}" placeholder="Ex: V14" class="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-xs text-white">
        </div>
        <div class="flex items-end gap-2">
          <button data-action="save-device" data-id="${cartId}" class="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg transition font-medium">Adicionar</button>
          <button data-action="cancel-add-device" data-id="${cartId}" class="px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white text-xs rounded-lg transition">Cancelar</button>
        </div>
      </div>
    </div>
  `;
  window.lucide?.createIcons();
}

export async function saveCart() {
  const name = document.getElementById('new-cart-name').value.trim();
  const floor = document.getElementById('new-cart-floor').value.trim();
  const dtype = document.getElementById('new-cart-type').value;
  if (!name || !floor) { toast('Preencha todos os campos.', 'error'); return; }
  if (state.allData.length >= 999) { toast('Limite de registros atingido.', 'error'); return; }

  const r = await window.dataSdk.create({
    type: 'cart', cart_name: name, floor: floor, device_type: dtype,
    name: '', email: '', password: '', role: '', device_number: 0, device_brand: '', device_serial: '', cart_id: '',
    reserved_by: '', reserved_email: '', date: '', period: '', status: '', created_at: new Date().toISOString()
  });
  if (r.isOk) { toast('Carrinho cadastrado!'); state.isFormOpen = false; document.getElementById('cart-form-area').innerHTML = ''; }
  else toast('Erro ao salvar.', 'error');
}

export async function saveDevice(cartId) {
  const deviceNumber = document.getElementById(`new-dev-number-${cartId}`).value.trim();
  const serial = document.getElementById(`new-dev-serial-${cartId}`).value.trim();
  const brand = document.getElementById(`new-dev-brand-${cartId}`).value;
  const model = document.getElementById(`new-dev-model-${cartId}`).value.trim();

  if (!deviceNumber || !serial || !brand) { toast('Preencha os campos obrigatórios.', 'error'); return; }
  const parsedNum = parseInt(deviceNumber);
  if (isNaN(parsedNum) || parsedNum < 1 || parsedNum > 40) {
    toast('❌ Número do dispositivo deve ser entre 1 e 40.', 'error'); return;
  }
  if (state.allData.length >= 999) { toast('Limite de registros atingido.', 'error'); return; }

  const existingDevice = getDevices().find(d => String(d.cart_id) === String(cartId) && parseInt(d.device_number) === parseInt(deviceNumber));
  if (existingDevice) { toast(`Posição #${deviceNumber} já está cadastrada neste carrinho.`, 'error'); return; }

  const r = await window.dataSdk.create({
    type: 'device', cart_id: cartId, device_number: deviceNumber, device_serial: serial, device_brand: brand, device_type: model,
    name: '', email: '', password: '', role: '', cart_name: '', floor: '',
    reserved_by: '', reserved_email: '', date: '', period: '', status: '', created_at: new Date().toISOString()
  });
  if (r.isOk) { toast('Dispositivo adicionado na posição #' + deviceNumber + '!'); document.getElementById(`add-device-form-${cartId}`).innerHTML = ''; }
  else toast('Erro ao salvar.', 'error');
}

export function confirmDeleteCart(id) {
  const ct = getCarts().find(c => c.__backendId === id);
  if (!ct) return;
  const existing = document.getElementById('delete-cart-modal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'delete-cart-modal';
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
  modal.innerHTML = `
    <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
    <div class="relative bg-slate-900 border border-red-500/40 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
          <i data-lucide="triangle-alert" style="width:20px;height:20px;color:#ef4444"></i>
        </div>
        <div>
          <h3 class="font-bold text-white">Excluir carrinho?</h3>
          <p class="text-xs text-slate-400">${ct.cart_name}</p>
        </div>
      </div>
      <p class="text-sm text-slate-300 mb-1">Todos os <strong>dispositivos</strong> e <strong>reservas</strong> deste carrinho serão apagados permanentemente.</p>
      <p class="text-sm text-slate-400 mb-4">Para confirmar, digite o nome do carrinho:</p>
      <input id="delete-cart-input" type="text" placeholder="${ct.cart_name}"
        class="w-full px-3 py-2 mb-4 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500/60">
      <div class="flex gap-3">
        <button data-action="close-modal" data-modal="delete-cart-modal"
          class="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition">
          Cancelar
        </button>
        <button id="delete-cart-confirm-btn" disabled
          class="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg transition opacity-40 cursor-not-allowed">
          Excluir
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  window.lucide?.createIcons();
  const input = document.getElementById('delete-cart-input');
  const confirmBtn = document.getElementById('delete-cart-confirm-btn');
  input.focus();
  input.addEventListener('input', () => {
    const match = input.value.trim() === ct.cart_name;
    confirmBtn.disabled = !match;
    confirmBtn.className = `flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg transition ${match ? 'hover:bg-red-700 opacity-100 cursor-pointer' : 'opacity-40 cursor-not-allowed'}`;
  });
  confirmBtn.addEventListener('click', () => {
    modal.remove();
    deleteCart(id);
  });
}

export async function deleteCart(id) {
  const rec = state.allData.find(d => d.__backendId === id);
  if (rec) {
    const result = await window.dataSdk.delete(rec);
    if (result.isOk) { toast('Carrinho removido.'); }
    else { toast('❌ Erro ao remover carrinho.', 'error'); }
  }
}

export function confirmDeleteDevice(id) {
  const dev = getDevices().find(d => d.__backendId === id);
  if (!dev) return;
  const existing = document.getElementById('delete-device-modal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'delete-device-modal';
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
  modal.innerHTML = `
    <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
    <div class="relative bg-slate-900 border border-red-500/40 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
          <i data-lucide="triangle-alert" style="width:20px;height:20px;color:#ef4444"></i>
        </div>
        <div>
          <h3 class="font-bold text-white">Excluir dispositivo?</h3>
          <p class="text-xs text-slate-400">Posição #${dev.device_number} — ${dev.device_brand} ${dev.device_type || ''}</p>
        </div>
      </div>
      <p class="text-sm text-slate-300 mb-5">Esta ação não pode ser desfeita.</p>
      <div class="flex gap-3">
        <button data-action="close-modal" data-modal="delete-device-modal"
          class="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition">
          Cancelar
        </button>
        <button data-action="do-delete-device" data-id="${id}"
          class="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition">
          Excluir
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  window.lucide?.createIcons();
}

export async function deleteDevice(id) {
  const rec = state.allData.find(d => d.__backendId === id);
  if (rec) {
    const result = await window.dataSdk.delete(rec);
    if (result.isOk) { toast('Dispositivo removido.'); }
    else { toast('❌ Erro ao remover dispositivo.', 'error'); }
  }
}
