// ========== STATE ==========
let allData = [];
let currentUser = null;
let currentView = 'reservar';
let isLoading = false;
let isFormOpen = false;


let PERIODS = [
  '1º Horário (07:00-07:50)',
  '2º Horário (07:50-08:40)',
  '3º Horário (08:40-09:30)',
  'Intervalo (09:30-09:50)',
  '4º Horário (09:50-10:40)',
  '5º Horário (10:40-11:30)',
  '6º Horário (13:00-13:50)',
  '7º Horário (13:50-14:40)',
  '8º Horário (14:40-15:30)',
  'Intervalo (15:30-15:50)',
  '9º Horário (15:50-16:40)',
  '10º Horário (16:40-17:30)'
];


const defaultConfig = {
  app_title: 'Reserva de Computadores',
  school_name: 'Sistema de Reservas Escolar',
  background_color: '#0f172a',
  surface_color: '#1e293b',
  text_color: '#f1f5f9',
  primary_color: '#3b82f6',
  secondary_color: '#475569'
};


// ========== HELPERS ==========
function getUsers() { return allData.filter(d => d.type === 'user'); }
function getCarts() { return allData.filter(d => d.type === 'cart'); }
function getDevices() { return allData.filter(d => d.type === 'device'); }
function getReservations() { return allData.filter(d => d.type === 'reservation'); }


function toast(msg, type='success') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${type==='success'?'bg-emerald-600':'bg-red-500'} text-white`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}


function todayStr() { return new Date().toISOString().split('T')[0]; }


// ========== DATA SDK ==========
const dataHandler = {
  onDataChanged(data) {
    allData = data;
    // Load periods from config if exists
    const configRecord = data.find(d => d.config_key === 'school_periods');
    if (configRecord && configRecord.periods_json) {
      try {
        PERIODS = JSON.parse(configRecord.periods_json);
      } catch (e) {
        console.error('Error parsing periods:', e);
      }
    }
    // Auto-restore session from localStorage after data loads
    if (!currentUser) {
      if (loadSession()) {
        showMainApp();
        return;
      }
    }
    if (currentUser && !isFormOpen) renderCurrentView();
    // Check for expiring reservations
    checkExpiringReservations();
  }
};


function checkExpiringReservations() {
  const now = new Date();
  const reservations = getReservations().filter(r => r.status === 'active' && r.date === todayStr());
  
  reservations.forEach(res => {
    // Parse period time
    const timeMatch = res.period.match(/\((\d{2}):(\d{2})-(\d{2}):(\d{2})\)/);
    if (!timeMatch) return;
    
    const [_, startH, startM, endH, endM] = timeMatch.map(Number);
    const endTime = new Date();
    endTime.setHours(endH, endM, 0, 0);
    const fiveMinBefore = new Date(endTime.getTime() - 5 * 60000);
    
    // Check if we're within 5 minutes before end time
    if (now >= fiveMinBefore && now < endTime) {
      const user = getUsers().find(u => u.email === res.reserved_email);
      if (user && user.phone && !res.notification_sent) {
        sendExpirationNotification(user, res);
      }
    }
  });
}


async function sendExpirationNotification(user, reservation) {
  // Mark notification as sent to avoid duplicate sends
  const updatedRes = { ...reservation, notification_sent: 'true' };
  await window.dataSdk.update(updatedRes);
  
  const appUrl = window.location.href.split('?')[0].split('#')[0];
  const message = `
Olá ${user.name}! ⏰


Faltam 5 minutos para expirar sua reserva:
📱 Dispositivo: #${reservation.device_number}
🗂️ Carrinho: ${reservation.cart_name}
⏱️ Período: ${reservation.period}


Escolha uma ação:
✅ Renovar: ${appUrl}#renovar=${reservation.__backendId}
❌ Devolver: ${appUrl}#devolver=${reservation.__backendId}


Acesse o app para gerenciar suas reservas!
  `.trim();


  // Show in-app notification
  toast(`Notificação enviada para ${user.name}`);
  
  // In a real app, this would send via WhatsApp/SMS API
  // For now, we'll show the message in console as demo
  console.log('📲 Notification:', message);
}


// ========== SESSÃO PERSISTENTE (localStorage) ==========
function saveSession() {
  if (currentUser) {
    localStorage.setItem('adelaide_session', JSON.stringify(currentUser));
  }
}

function loadSession() {
  try {
    const saved = localStorage.getItem('adelaide_session');
    if (saved) {
      const user = JSON.parse(saved);
      if (user.email === 'admin@escola.com') {
        currentUser = user;
        return true;
      }
      const found = getUsers().find(u => u.email === user.email && u.user_status !== 'inativo');
      if (found) {
        currentUser = { name: found.name, email: found.email, role: found.role, __backendId: found.__backendId };
        return true;
      }
    }
  } catch (e) {
    console.error('Erro ao carregar sessão:', e);
  }
  return false;
}

function clearSession() {
  localStorage.removeItem('adelaide_session');
}


async function initApp() {
  const r = await window.dataSdk.init(dataHandler);
  if (!r.isOk) { console.error('SDK init failed'); }
  
  // Check expiring reservations every 30 seconds
  setInterval(checkExpiringReservations, 30000);
}
initApp();


// ========== ELEMENT SDK ==========
window.elementSdk.init({
  defaultConfig,
  onConfigChange: async (config) => {
    const t = config.app_title || defaultConfig.app_title;
    const s = config.school_name || defaultConfig.school_name;
    const el1 = document.getElementById('login-title');
    if (el1) el1.textContent = t;
    const el2 = document.getElementById('login-school');
    if (el2) el2.textContent = s;
    const el3 = document.getElementById('sidebar-title');
    if (el3) el3.textContent = t;


    document.body.style.backgroundColor = config.background_color || defaultConfig.background_color;
  },
  mapToCapabilities: (config) => ({
    recolorables: [
      { get: () => config.background_color || defaultConfig.background_color, set: v => { config.background_color = v; window.elementSdk.setConfig({background_color:v}); }},
      { get: () => config.surface_color || defaultConfig.surface_color, set: v => { config.surface_color = v; window.elementSdk.setConfig({surface_color:v}); }},
      { get: () => config.text_color || defaultConfig.text_color, set: v => { config.text_color = v; window.elementSdk.setConfig({text_color:v}); }},
      { get: () => config.primary_color || defaultConfig.primary_color, set: v => { config.primary_color = v; window.elementSdk.setConfig({primary_color:v}); }},
      { get: () => config.secondary_color || defaultConfig.secondary_color, set: v => { config.secondary_color = v; window.elementSdk.setConfig({secondary_color:v}); }}
    ],
    borderables: [],
    fontEditable: undefined,
    fontSizeable: undefined
  }),
  mapToEditPanelValues: (config) => new Map([
    ['app_title', config.app_title || defaultConfig.app_title],
    ['school_name', config.school_name || defaultConfig.school_name]
  ])
});


// ========== AUTH ==========
function togglePasswordVisibility() {
  const input = document.getElementById('login-pass');
  const icon = document.getElementById('pass-eye-icon');
  if (input.type === 'password') {
    input.type = 'text';
    if (icon) {
      icon.setAttribute('data-lucide', 'eye-off');
      lucide.createIcons();
    }
  } else {
    input.type = 'password';
    if (icon) {
      icon.setAttribute('data-lucide', 'eye');
      lucide.createIcons();
    }
  }
}


function handleLogin() {
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const pass = document.getElementById('login-pass').value;
  const errEl = document.getElementById('login-error');


  if (!email || !pass) { errEl.textContent='Preencha todos os campos'; errEl.classList.remove('hidden'); return; }


  // Default admin
  if (email === 'admin@escola.com' && pass === 'admin123') {
    currentUser = { name:'Administrador', email:'admin@escola.com', role:'admin' };
    saveSession();
    showMainApp();
    return;
  }


  const user = getUsers().find(u => u.email === email && u.password === pass);
  if (!user) { errEl.textContent='E-mail ou senha incorretos'; errEl.classList.remove('hidden'); return; }


  // Check if user is inactive
  if (user.user_status === 'inativo') {
    errEl.textContent='Este usuário foi desativado. Contate o administrador.';
    errEl.classList.remove('hidden');
    return;
  }


  currentUser = { name: user.name, email: user.email, role: user.role, __backendId: user.__backendId };
  saveSession();
  showMainApp();
}


function isAdmin() {
  return currentUser && currentUser.role === 'admin';
}


function showMainApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('main-app').style.display = 'block';
  document.getElementById('user-name').textContent = currentUser.name;
  document.getElementById('user-role').textContent = currentUser.role === 'admin' ? 'Administrador' : 'Professor';
  buildNav();
  renderCurrentView();
  lucide.createIcons();
}


function logout() {
  currentUser = null;
  currentView = 'reservar';
  clearSession();
  document.getElementById('main-app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('login-email').value = '';
  document.getElementById('login-pass').value = '';
  document.getElementById('login-error').classList.add('hidden');
}


// ========== NAVIGATION ==========
function buildNav() {
  const nav = document.getElementById('nav-links');
  const isAdmin = currentUser.role === 'admin';
  let links = [
    { id:'reservar', icon:'calendar-plus', label:'Reservar' },
    { id:'minhas', icon:'bookmark', label:'Minhas Reservas' }
  ];
  if (isAdmin) {
    links.push(
      { id:'horarios', icon:'clock', label:'Horários' },
      { id:'carrinhos', icon:'hard-drive', label:'Carrinhos' },
      { id:'usuarios', icon:'users', label:'Usuários' },
      { id:'monitor', icon:'activity', label:'Monitoramento' },
      { id:'gerenciar', icon:'shield-check', label:'Gerenciar Reservas' },
      { id:'relatorio', icon:'bar-chart-2', label:'Relatórios' }
    );
  }
  nav.innerHTML = links.map(l => `
    <button onclick="navigate('${l.id}')" class="sidebar-link w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 ${currentView===l.id?'active':''}" data-nav="${l.id}">
      <i data-lucide="${l.icon}" style="width:16px;height:16px"></i> ${l.label}
    </button>
  `).join('');
  lucide.createIcons();
}


function navigate(view) {
  currentView = view;
  buildNav();
  renderCurrentView();
}


function renderCurrentView() {
  const c = document.getElementById('main-content');
  switch(currentView) {
    case 'reservar': renderReservar(c); break;
    case 'minhas': renderMinhas(c); break;
    case 'horarios': renderHorarios(c); break;
    case 'carrinhos': renderCarrinhos(c); break;
    case 'usuarios': renderUsuarios(c); break;
    case 'monitor': renderMonitor(c); break;
    case 'gerenciar': renderGerenciar(c); break;
    case 'relatorio': renderRelatorio(c); break;
  }
  lucide.createIcons();
}


function toggleSidebar() {
  const s = document.getElementById('sidebar');
  s.classList.toggle('hidden');
}


// ========== RESERVAR ==========
function renderReservar(c) {
  const carts = getCarts();
  const today = todayStr();


  c.innerHTML = `
    <div class="fade-in max-w-6xl mx-auto">
      <h2 class="text-xl font-bold mb-1 flex items-center gap-2"><i data-lucide="calendar-plus" style="width:22px;height:22px;color:#3b82f6"></i> Reservar Equipamento</h2>
      <p class="text-slate-400 text-sm mb-6">Selecione o carrinho, data e horários desejados</p>


      ${carts.length === 0 ? '<div class="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400"><i data-lucide="inbox" style="width:40px;height:40px;margin:0 auto 12px;color:#475569"></i><p>Nenhum carrinho cadastrado ainda.</p><p class="text-xs mt-1">Peça ao administrador para cadastrar os carrinhos.</p></div>' : `
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
          ${PERIODS.map((p,i) => `
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
        <button id="confirm-reservation-btn" onclick="confirmReservation()" class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition" style="opacity:0.4;pointer-events:none">Confirmar Reserva</button>
      </div>
      `}
    </div>
  `;
}


let selectedDevices = new Set();


function updateDeviceGrid() {
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
  selectedDevices.clear();


  const cart = getCarts().find(ct => ct.__backendId === cartId);
  if (!cart) return;


  // Get all devices registered for this cart
  // Use String() coercion to avoid type mismatch between SDK id types
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
    
    // Status: notregistered (gray), reserved (red), available (blue)
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
           data-device="${i}" data-status="${status}" onclick="toggleDevice(this, ${i}, '${status}')">
        <i data-lucide="${icon}" style="width:20px;height:20px;margin:0 auto;color:${status==='notregistered'?'#78909c':status==='reserved'?'#ef4444':'#3b82f6'}"></i>
        <div class="device-num-label text-xs mt-1 font-medium ${textColor}">#${i}</div>
        ${status === 'notregistered' ? `<div class="text-xs text-slate-500">não cadastrado</div>` : status === 'reserved' ? `<div class="text-xs text-red-300 truncate" title="${reservations.find(r=>parseInt(r.device_number)===i)?.reserved_by||''}">${(reservations.find(r=>parseInt(r.device_number)===i)?.reserved_by||'').split(' ')[0]}</div>` : ''}
      </div>
    `;
  }
  grid.innerHTML = html;
  lucide.createIcons();
  updateConfirmBtn();
}


function toggleDevice(el, num, status) {
  // Lê o status do atributo data — mais confiável que o parâmetro fixo do onclick
  const currentStatus = el.getAttribute('data-status');
  if (currentStatus !== 'available') return;

  if (selectedDevices.has(num)) {
    selectedDevices.delete(num);
    el.className = 'device-card rounded-xl p-2 text-center border-2 bg-blue-500/20 border-blue-500/50 hover:border-blue-400 cursor-pointer';
    // lucide substitui <i> por <svg>, então buscamos os dois
    const icon = el.querySelector('i, svg');
    if (icon) icon.style.color = '#3b82f6';
    const textEl = el.querySelector('.device-num-label');
    if (textEl) {
      textEl.classList.remove('text-emerald-400');
      textEl.classList.add('text-blue-400');
    }
  } else {
    selectedDevices.add(num);
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


function updateConfirmBtn() {
  const btn = document.getElementById('confirm-reservation-btn');
  if (btn) {
    const shouldEnable = selectedDevices.size > 0;
    // Nunca usar btn.disabled — bloqueia o onclick mesmo com pointerEvents 'auto'
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


function showConfirmationModal(cartId, date, periods, cart) {
  if (!cart || periods.length === 0 || selectedDevices.size === 0) return;


  const totalReservations = periods.length * selectedDevices.size;
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
          <span class="text-blue-400 font-medium">${[...selectedDevices].sort((a,b)=>a-b).map(d=>'#'+d).join(', ')}</span>
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
  lucide.createIcons();
  
  const cancelBtn = modal.querySelector('.modal-cancel-btn');
  const confirmBtn = modal.querySelector('.modal-confirm-btn');
  
  cancelBtn.onclick = (e) => {
    e.stopPropagation();
    modal.remove();
  };
  
  confirmBtn.onclick = (e) => {
    e.stopPropagation();
    modal.remove();
    proceedWithReservation(cartId, date, periods, cart);
  };
  
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  };
}


async function proceedWithReservation(cartId, date, periods, cart) {
  if (isLoading) return;
  isLoading = true;


  if (!cart || periods.length === 0 || selectedDevices.size === 0) {
    isLoading = false;
    toast('Dados inválidos para criar reserva.', 'error');
    return;
  }


  const btn = document.getElementById('confirm-reservation-btn');
  if (btn) {
    btn.style.pointerEvents = 'none';
    btn.style.opacity = '0.4';
    btn.innerHTML = '<i data-lucide="loader" style="width:16px;height:16px;margin-right:8px"></i> Processando...';
  }


  let successCount = 0;
  let errorCount = 0;
  
  try {
    for (const period of periods) {
      for (const devNum of selectedDevices) {
        const reservation = {
          type: 'reservation',
          cart_name: cart.cart_name || '',
          cart_id: cartId || '',
          floor: cart.floor || '',
          device_type: cart.device_type || '',
          device_number: String(devNum),
          device_brand: '',
          device_serial: '',
          reserved_by: currentUser.name || '',
          reserved_email: currentUser.email || '',
          date: date || '',
          period: period || '',
          status: 'active',
          created_at: new Date().toISOString(),
          notification_sent: '',
          name: '',
          email: '',
          password: '',
          role: '',
          phone: '',
          user_status: ''
        };
        
        const result = await window.dataSdk.create(reservation);
        if (result.isOk) {
          successCount++;
        } else {
          errorCount++;
          console.error('Erro ao criar reserva:', result.error);
        }
      }
    }
  } catch (err) {
    console.error('Erro no processo:', err);
    errorCount++;
  }


  isLoading = false;
  
  if (btn) {
    btn.style.pointerEvents = 'auto';
    btn.style.opacity = '1';
    btn.innerHTML = 'Confirmar Reserva';
  }
  
  if (successCount > 0) {
    toast(`✅ ${successCount} reserva(s) criada(s) com sucesso!`);
    selectedDevices.clear();
    
    // Reset form
    const cartIdEl = document.getElementById('sel-cart');
    const dateEl = document.getElementById('sel-date');
    if (cartIdEl) cartIdEl.value = '';
    if (dateEl) dateEl.value = todayStr();
    const periodCheckboxes = document.querySelectorAll('.period-cb');
    periodCheckboxes.forEach(cb => cb.checked = false);
    
    updateDeviceGrid();
    
    // Navigate to "Minhas Reservas" after delay
    setTimeout(() => navigate('minhas'), 1500);
  } else {
    toast('❌ Erro ao criar reservas. Tente novamente.', 'error');
  }
}


function confirmReservation() {
  if (isLoading) return;
  
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


  // Validation
  if (!cartId) { toast('Selecione um carrinho.', 'error'); return; }
  if (!cart) { toast('Carrinho não encontrado.', 'error'); return; }
  if (!date) { toast('Selecione uma data.', 'error'); return; }
  if (periods.length === 0) { toast('Selecione pelo menos um horário.', 'error'); return; }
  if (selectedDevices.size === 0) { toast('Selecione pelo menos um dispositivo.', 'error'); return; }


  // Check limit
  const totalNew = periods.length * selectedDevices.size;
  if (allData.length + totalNew > 999) {
    toast('Limite de registros atingido. Exclua reservas antigas.', 'error');
    return;
  }


  // Show confirmation modal
  showConfirmationModal(cartId, date, periods, cart);
}


// ========== MINHAS RESERVAS ==========
function renderMinhas(c) {
  const mine = getReservations().filter(r => r.reserved_email === currentUser.email && r.status === 'active');
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
              <p class="text-sm text-slate-400">${new Date(g.date+'T12:00:00').toLocaleDateString('pt-BR')} — ${g.type}</p>
            </div>
            <div class="flex gap-2">
              <button onclick="showFinalizeModal('${g.records.map(r=>r.__backendId).join(',')}')" class="px-3 py-1 text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg transition flex items-center gap-1">
                <i data-lucide="check" style="width:12px;height:12px"></i> Finalizar
              </button>
              <button onclick="cancelGroup('${g.records.map(r=>r.__backendId).join(',')}')" class="px-3 py-1 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition">Cancelar</button>
            </div>
          </div>
          <div class="text-xs text-slate-400 mb-1">Dispositivos: ${[...g.devices].sort((a,b)=>a-b).map(d=>'#'+d).join(', ')}</div>
          <div class="text-xs text-slate-400">Horários: ${[...g.periods].join(', ')}</div>
        </div>
      `).join('')}
    </div>
  `;
}


async function cancelGroup(ids) {
  if (isLoading) return;
  isLoading = true;
  const arr = ids.split(',');
  for (const id of arr) {
    const rec = allData.find(d => d.__backendId === id);
    if (rec) await window.dataSdk.delete(rec);
  }
  isLoading = false;
  toast('Reserva cancelada.');
}


function showFinalizeModal(ids) {
  if (isLoading) return;
  
  const arr = ids.split(',');
  const records = arr.map(id => allData.find(d => d.__backendId === id)).filter(r => r);
  
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
  lucide.createIcons();
  
  const cancelBtn = modal.querySelector('.modal-cancel-btn');
  const finalizeBtn = modal.querySelector('.modal-finalize-btn');
  
  cancelBtn.onclick = (e) => {
    e.stopPropagation();
    modal.remove();
  };
  
  finalizeBtn.onclick = async (e) => {
    e.stopPropagation();
    modal.remove();
    
    isLoading = true;
    for (const id of arr) {
      const rec = allData.find(d => d.__backendId === id);
      if (rec) {
        const updated = { ...rec, status: 'completed' };
        await window.dataSdk.update(updated);
      }
    }
    isLoading = false;
    toast('✅ Reserva finalizada com sucesso!');
    setTimeout(() => navigate('minhas'), 1000);
  };
  
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  };
}


// ========== ADMIN: HORÁRIOS ==========
function renderHorarios(c) {
  const configRecord = allData.find(d => d.config_key === 'school_periods');
  const currentPeriods = configRecord && configRecord.periods_json ? JSON.parse(configRecord.periods_json) : PERIODS;
  
  c.innerHTML = `
    <div class="fade-in max-w-4xl mx-auto">
      <div class="mb-6">
        <h2 class="text-xl font-bold flex items-center gap-2"><i data-lucide="clock" style="width:22px;height:22px;color:#3b82f6"></i> Configurar Horários da Escola</h2>
        <p class="text-slate-400 text-sm">Customize os horários de aula e intervalos</p>
      </div>


      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div id="periods-editor" class="space-y-3 mb-6 max-h-96 overflow-y-auto">
          ${currentPeriods.map((period, idx) => `
            <div class="flex items-end gap-2 bg-slate-800/50 p-3 rounded-lg">
              <div class="flex-1">
                <label class="block text-xs text-slate-400 mb-1">Horário ${idx + 1}</label>
                <input type="text" value="${period}" data-idx="${idx}" class="period-input w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500">
              </div>
              <button onclick="removePeriod(${idx})" class="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition">
                <i data-lucide="trash-2" style="width:16px;height:16px"></i>
              </button>
            </div>
          `).join('')}
        </div>


        <button onclick="addNewPeriod()" class="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition mb-4 flex items-center justify-center gap-2">
          <i data-lucide="plus" style="width:16px;height:16px"></i> Adicionar Horário
        </button>


        <div class="border-t border-slate-700 pt-4 flex gap-2">
          <button onclick="saveHorarios()" class="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2">
            <i data-lucide="save" style="width:16px;height:16px"></i> Salvar Alterações
          </button>
          <button onclick="resetHorarios()" class="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition">
            Resetar
          </button>
        </div>
      </div>


      <div class="mt-6 bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        <p class="text-xs text-slate-400 mb-2"><i data-lucide="info" style="width:14px;height:14px;display:inline;margin-right:6px"></i> Exemplo de formato:</p>
        <div class="text-xs text-slate-300 space-y-1">
          <p>✓ 1º Horário (07:00-07:50)</p>
          <p>✓ Intervalo (09:30-09:50)</p>
          <p>✓ 6º Horário (13:00-13:50)</p>
        </div>
      </div>
    </div>
  `;
  lucide.createIcons();
}


function addNewPeriod() {
  const editor = document.getElementById('periods-editor');
  const newIdx = document.querySelectorAll('.period-input').length;
  const div = document.createElement('div');
  div.className = 'flex items-end gap-2 bg-slate-800/50 p-3 rounded-lg fade-in';
  div.innerHTML = `
    <div class="flex-1">
      <label class="block text-xs text-slate-400 mb-1">Horário ${newIdx + 1}</label>
      <input type="text" data-idx="${newIdx}" placeholder="Ex: Horário (HH:MM-HH:MM)" class="period-input w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500" autofocus>
    </div>
    <button onclick="this.parentElement.remove()" class="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition">
      <i data-lucide="trash-2" style="width:16px;height:16px"></i>
    </button>
  `;
  editor.appendChild(div);
  lucide.createIcons();
  div.querySelector('input').focus();
}


function removePeriod(idx) {
  const inputs = document.querySelectorAll('.period-input');
  inputs[idx].parentElement.parentElement.remove();
}


async function saveHorarios() {
  const inputs = document.querySelectorAll('.period-input');
  const newPeriods = Array.from(inputs).map(i => i.value.trim()).filter(v => v);
  
  if (newPeriods.length === 0) {
    toast('Adicione pelo menos um horário.', 'error');
    return;
  }


  const existingConfig = allData.find(d => d.config_key === 'school_periods');
  
  if (existingConfig) {
    const result = await window.dataSdk.update({
      ...existingConfig,
      periods_json: JSON.stringify(newPeriods)
    });
    if (result.isOk) {
      PERIODS = newPeriods;
      toast('Horários atualizados com sucesso!');
    } else {
      toast('Erro ao salvar horários.', 'error');
    }
  } else {
    if (allData.length >= 999) {
      toast('Limite de registros atingido.', 'error');
      return;
    }
    const result = await window.dataSdk.create({
      type: 'config',
      config_key: 'school_periods',
      periods_json: JSON.stringify(newPeriods),
      name: '', email: '', password: '', role: '', floor: '', cart_name: '',
      device_type: '', device_number: 0, device_brand: '', device_serial: '',
      cart_id: '', reserved_by: '', reserved_email: '', date: '',
      period: '', status: '', created_at: new Date().toISOString()
    });
    if (result.isOk) {
      PERIODS = newPeriods;
      toast('Horários salvos com sucesso!');
    } else {
      toast('Erro ao salvar horários.', 'error');
    }
  }
}


async function resetHorarios() {
  const defaultPeriods = [
    '1º Horário (07:00-07:50)',
    '2º Horário (07:50-08:40)',
    '3º Horário (08:40-09:30)',
    'Intervalo (09:30-09:50)',
    '4º Horário (09:50-10:40)',
    '5º Horário (10:40-11:30)',
    '6º Horário (13:00-13:50)',
    '7º Horário (13:50-14:40)',
    '8º Horário (14:40-15:30)',
    'Intervalo (15:30-15:50)',
    '9º Horário (15:50-16:40)',
    '10º Horário (16:40-17:30)'
  ];


  const existingConfig = allData.find(d => d.config_key === 'school_periods');
  
  if (existingConfig) {
    await window.dataSdk.delete(existingConfig);
  }
  
  PERIODS = defaultPeriods;
  toast('Horários resetados para o padrão.');
  navigate('horarios');
}
function renderCarrinhos(c) {
  const carts = getCarts();
  const devices = getDevices();
  c.innerHTML = `
    <div class="fade-in max-w-5xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-xl font-bold flex items-center gap-2"><i data-lucide="hard-drive" style="width:22px;height:22px;color:#3b82f6"></i> Carrinhos</h2>
          <p class="text-slate-400 text-sm">Gerencie os carrinhos e dispositivos</p>
        </div>
        <button onclick="showCartForm()" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition flex items-center gap-1">
          <i data-lucide="plus" style="width:16px;height:16px"></i> Novo Carrinho
        </button>
      </div>
      <div id="cart-form-area"></div>
      
      <div class="space-y-4">
        ${carts.length===0?'<div class="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400"><p>Nenhum carrinho cadastrado.</p></div>':''}
        ${carts.map(ct => {
          const cartDevices = devices.filter(d => d.cart_id === ct.__backendId);
          return `
          <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="font-semibold text-white">${ct.cart_name}</h3>
                <p class="text-sm text-slate-400">${ct.floor} — ${ct.device_type} (${cartDevices.length} dispositivos)</p>
              </div>
              <div class="flex gap-2">
                <button onclick="showAddDeviceForm('${ct.__backendId}')" class="px-3 py-1 text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg transition flex items-center gap-1">
                  <i data-lucide="plus" style="width:12px;height:12px"></i> Adicionar Dispositivo
                </button>
                <button onclick="deleteCart('${ct.__backendId}')" class="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition">
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
                <div class="grid grid-cols-6 gap-2 items-center text-sm bg-slate-800/50 rounded-lg px-3 py-2">
                  <span class="text-blue-400 font-medium">#${dev.device_number}</span>
                  <span class="text-white font-medium">${dev.device_serial || '-'}</span>
                  <span class="text-blue-400">${dev.device_brand}</span>
                  <span class="col-span-2 text-slate-300">${dev.device_type || '-'}</span>
                  <span class="text-right">
                    <button onclick="deleteDevice('${dev.__backendId}')" class="p-1 text-red-400 hover:bg-red-500/20 rounded transition">
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


function showCartForm() {
  isFormOpen = true;
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
        <button onclick="saveCart()" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition">Salvar</button>
        <button onclick="isFormOpen = false; document.getElementById('cart-form-area').innerHTML=''" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition">Cancelar</button>
      </div>
    </div>
  `;
  lucide.createIcons();
}


function showAddDeviceForm(cartId) {
  const area = document.getElementById(`add-device-form-${cartId}`);
  area.innerHTML = `
    <div class="bg-slate-700/50 border border-slate-600 rounded-xl p-3 mb-3 fade-in">
      <div class="grid gap-2 sm:grid-cols-5 mb-2">
        <div>
          <label class="block text-xs text-slate-300 mb-1">Posição (1-40)</label>
          <select id="new-dev-number-${cartId}" class="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-xs text-white">
            <option value="">Selecionar...</option>
            ${Array.from({length:40},(_,i)=>i+1).map(n=>`<option value="${n}">#${n}</option>`).join('')}
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
          <button onclick="saveDevice('${cartId}')" class="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg transition font-medium">Adicionar</button>
          <button onclick="document.getElementById('add-device-form-${cartId}').innerHTML=''" class="px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white text-xs rounded-lg transition">Cancelar</button>
        </div>
      </div>
    </div>
  `;
  lucide.createIcons();
}


async function saveCart() {
  const name = document.getElementById('new-cart-name').value.trim();
  const floor = document.getElementById('new-cart-floor').value.trim();
  const dtype = document.getElementById('new-cart-type').value;
  if (!name || !floor) { toast('Preencha todos os campos.','error'); return; }
  if (allData.length >= 999) { toast('Limite de registros atingido.','error'); return; }


  const r = await window.dataSdk.create({
    type:'cart', cart_name:name, floor:floor, device_type:dtype,
    name:'', email:'', password:'', role:'', device_number:0, device_brand:'', device_serial:'', cart_id:'',
    reserved_by:'', reserved_email:'', date:'', period:'', status:'', created_at:new Date().toISOString()
  });
  if (r.isOk) { toast('Carrinho cadastrado!'); isFormOpen = false; document.getElementById('cart-form-area').innerHTML=''; }
  else toast('Erro ao salvar.','error');
}


async function saveDevice(cartId) {
  const deviceNumber = document.getElementById(`new-dev-number-${cartId}`).value.trim();
  const serial = document.getElementById(`new-dev-serial-${cartId}`).value.trim();
  const brand = document.getElementById(`new-dev-brand-${cartId}`).value;
  const model = document.getElementById(`new-dev-model-${cartId}`).value.trim();
  
  if (!deviceNumber || !serial || !brand) { toast('Preencha os campos obrigatórios.','error'); return; }
  if (allData.length >= 999) { toast('Limite de registros atingido.','error'); return; }


  // Check if device number already exists in this cart
  const existingDevice = getDevices().find(d => String(d.cart_id) === String(cartId) && d.device_number === deviceNumber);
  if (existingDevice) { toast(`Posição #${deviceNumber} já está cadastrada neste carrinho.`,'error'); return; }


  const r = await window.dataSdk.create({
    type:'device', cart_id:cartId, device_number:deviceNumber, device_serial:serial, device_brand:brand, device_type:model,
    name:'', email:'', password:'', role:'', cart_name:'', floor:'',
    reserved_by:'', reserved_email:'', date:'', period:'', status:'', created_at:new Date().toISOString()
  });
  if (r.isOk) { toast('Dispositivo adicionado na posição #'+deviceNumber+'!'); document.getElementById(`add-device-form-${cartId}`).innerHTML=''; }
  else toast('Erro ao salvar.','error');
}


async function deleteCart(id) {
  const rec = allData.find(d => d.__backendId === id);
  if (rec) { await window.dataSdk.delete(rec); toast('Carrinho removido.'); }
}


async function deleteDevice(id) {
  const rec = allData.find(d => d.__backendId === id);
  if (rec) { await window.dataSdk.delete(rec); toast('Dispositivo removido.'); }
}


// ========== ADMIN: USUARIOS ==========
function renderUsuarios(c) {
  // Se o formulário estiver aberto, não redesenhe a tela para evitar fechá-lo.
  const formArea = document.getElementById('user-form-area');
  if (formArea && formArea.innerHTML.trim() !== '') {
    return;
  }
  const users = getUsers();
  const roleColors = {
    'professor': 'bg-blue-500/20 text-blue-400',
    'coordenador': 'bg-purple-500/20 text-purple-400',
    'vice-diretor': 'bg-amber-500/20 text-amber-400',
    'diretor': 'bg-red-500/20 text-red-400',
    'admin': 'bg-emerald-500/20 text-emerald-400'
  };
  const roleLabels = {
    'professor': 'Professor',
    'coordenador': 'Coordenador',
    'vice-diretor': 'Vice-Diretor',
    'diretor': 'Diretor',
    'admin': 'Administrador'
  };
  c.innerHTML = `
    <div class="fade-in max-w-6xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-xl font-bold flex items-center gap-2"><i data-lucide="users" style="width:22px;height:22px;color:#3b82f6"></i> Usuários</h2>
          <p class="text-slate-400 text-sm">Gerencie usuários, perfis e contatos</p>
        </div>
        <button onclick="showUserForm()" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition flex items-center gap-1">
          <i data-lucide="plus" style="width:16px;height:16px"></i> Novo
        </button>
      </div>
      <div id="user-form-area"></div>
      <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div class="grid grid-cols-6 gap-2 px-4 py-2 text-xs font-medium text-slate-400 border-b border-slate-800">
          <span>Nome</span><span>E-mail</span><span>Telefone</span><span>Perfil</span><span>Status</span><span></span>
        </div>
        ${users.length===0?'<div class="p-6 text-center text-slate-400 text-sm">Nenhum usuário cadastrado.</div>':''}
        ${users.map(u => {
          const isActive = u.user_status !== 'inativo';
          return `
          <div class="grid grid-cols-6 gap-2 px-4 py-3 border-b border-slate-800/50 items-center text-sm ${!isActive ? 'opacity-60' : ''}">
            <span class="text-white truncate">${u.name}</span>
            <span class="text-slate-400 truncate text-xs">${u.email}</span>
            <span class="text-slate-400 text-xs">${u.phone || '-'}</span>
            <span><span class="px-2 py-0.5 rounded-full text-xs ${roleColors[u.role] || 'bg-slate-700/20 text-slate-400'}">${roleLabels[u.role] || u.role}</span></span>
            <span><span class="px-2 py-0.5 rounded-full text-xs ${isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}">${isActive ? 'Ativo' : 'Inativo'}</span></span>
            <span class="text-right flex items-center justify-end gap-1">
              <button onclick="editUser('${u.__backendId}')" class="p-2 text-amber-400 hover:bg-amber-500/20 rounded-lg transition" title="Editar usuário">
                <i data-lucide="pencil" style="width:16px;height:16px"></i>
              </button>
              <button onclick="toggleUserStatus('${u.__backendId}', ${isActive})" class="p-2 ${isActive ? 'text-amber-400 hover:bg-amber-500/20' : 'text-emerald-400 hover:bg-emerald-500/20'} rounded-lg transition" title="${isActive ? 'Desativar' : 'Ativar'}">
                <i data-lucide="${isActive ? 'power-off' : 'power'}" style="width:16px;height:16px"></i>
              </button>
            </span>
          </div>
        `;
        }).join('')}
      </div>
      <p class="text-xs text-slate-500 mt-3">* Admin padrão: admin@escola.com / admin123 | Use o ícone de energia para desativar/ativar usuários sem perder histórico</p>
    </div>
  `;
}


function showUserForm() {
  const area = document.getElementById('user-form-area');
  area.innerHTML = `
    <div class="bg-slate-800 border border-slate-700 rounded-2xl p-5 mb-6 fade-in">
      <h3 class="font-semibold text-white mb-3">Novo Usuário</h3>
      <div class="grid gap-3 sm:grid-cols-2">
        <div>
          <label class="block text-xs text-slate-400 mb-1">Nome Completo</label>
          <input id="new-user-name" placeholder="Nome do usuário" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white">
        </div>
        <div>
          <label class="block text-xs text-slate-400 mb-1">E-mail</label>
          <input id="new-user-email" type="email" placeholder="email@escola.com" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white">
        </div>
        <div>
          <label class="block text-xs text-slate-400 mb-1">Telefone</label>
          <input id="new-user-phone" type="tel" placeholder="(11) 99999-9999" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white">
        </div>
        <div>
          <label class="block text-xs text-slate-400 mb-1">Senha</label>
          <input id="new-user-pass" type="text" placeholder="Senha inicial" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white">
        </div>
        <div>
          <label class="block text-xs text-slate-400 mb-1">Perfil</label>
          <select id="new-user-role" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white">
            <option value="professor">Professor</option>
            <option value="coordenador">Coordenador</option>
            <option value="vice-diretor">Vice-Diretor</option>
            <option value="diretor">Diretor</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
      </div>
      <div class="flex gap-2 mt-4">
        <button onclick="saveUser()" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition">Salvar</button>
        <button onclick="document.getElementById('user-form-area').innerHTML=''" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition">Cancelar</button>
      </div>
    </div>
  `;
  lucide.createIcons();
}


async function saveUser() {
  const name = document.getElementById('new-user-name').value.trim();
  const email = document.getElementById('new-user-email').value.trim().toLowerCase();
  const phone = document.getElementById('new-user-phone').value.trim();
  const pass = document.getElementById('new-user-pass').value;
  const role = document.getElementById('new-user-role').value;
  if (!name||!email||!pass) { toast('Preencha todos os campos.','error'); return; }
  if (getUsers().find(u=>u.email===email)) { toast('E-mail já cadastrado.','error'); return; }
  if (allData.length >= 999) { toast('Limite de registros atingido.','error'); return; }


  try {
    const r = await window.dataSdk.create({
      type:'user', name, email, password:pass, role, phone, user_status:'ativo',
      cart_name:'', floor:'', device_type:'', device_number:0, reserved_by:'', reserved_email:'', date:'', period:'', status:'', created_at:new Date().toISOString(), device_brand:'', device_serial:'', cart_id:''
    });
    if (r.isOk) {
      toast('✅ Usuário cadastrado com sucesso!');
      document.getElementById('user-form-area').innerHTML='';
      navigate('usuarios');
    } else {
      toast('❌ Erro ao salvar usuário.','error');
    }
  } catch (err) {
    console.error('Erro ao salvar usuário:', err);
    toast('❌ Erro ao salvar usuário.','error');
  }
}


async function deleteUser(id) {
  const rec = allData.find(d => d.__backendId === id);
  if (rec) { await window.dataSdk.delete(rec); toast('Usuário removido permanentemente.'); }
}


async function toggleUserStatus(id, isCurrentlyActive) {
  const user = getUsers().find(u => u.__backendId === id);
  if (!user) return;
  
  const newStatus = isCurrentlyActive ? 'inativo' : 'ativo';
  const updatedUser = {
    ...user,
    user_status: newStatus
  };


  const r = await window.dataSdk.update(updatedUser);
  if (r.isOk) {
    const msg = newStatus === 'ativo' ? 'Usuário reativado!' : 'Usuário desativado! (histórico preservado)';
    toast(msg);
    navigate('usuarios');
  } else {
    toast('Erro ao atualizar status.','error');
  }
}


function editUser(id) {
  const user = getUsers().find(u => u.__backendId === id);
  if (!user) return;
  
  const area = document.getElementById('user-form-area');
  area.innerHTML = `
    <div class="bg-slate-800 border border-slate-700 rounded-2xl p-5 mb-6 fade-in">
      <h3 class="font-semibold text-white mb-3">Editar Usuário</h3>
      <div class="grid gap-3 sm:grid-cols-2">
        <div>
          <label class="block text-xs text-slate-400 mb-1">Nome Completo</label>
          <input id="edit-user-name" value="${user.name}" placeholder="Nome do usuário" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white">
        </div>
        <div>
          <label class="block text-xs text-slate-400 mb-1">E-mail</label>
          <input id="edit-user-email" type="email" value="${user.email}" placeholder="email@escola.com" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white">
        </div>
        <div>
          <label class="block text-xs text-slate-400 mb-1">Telefone</label>
          <input id="edit-user-phone" type="tel" value="${user.phone || ''}" placeholder="(11) 99999-9999" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white">
        </div>
        <div>
          <label class="block text-xs text-slate-400 mb-1">Senha</label>
          <input id="edit-user-pass" type="text" value="${user.password}" placeholder="Senha" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white">
        </div>
        <div>
          <label class="block text-xs text-slate-400 mb-1">Perfil</label>
          <select id="edit-user-role" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white">
            <option value="professor" ${user.role==='professor'?'selected':''}>Professor</option>
            <option value="coordenador" ${user.role==='coordenador'?'selected':''}>Coordenador</option>
            <option value="vice-diretor" ${user.role==='vice-diretor'?'selected':''}>Vice-Diretor</option>
            <option value="diretor" ${user.role==='diretor'?'selected':''}>Diretor</option>
            <option value="admin" ${user.role==='admin'?'selected':''}>Administrador</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-slate-400 mb-1">Status</label>
          <select id="edit-user-status" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white">
            <option value="ativo" ${user.user_status==='ativo' || !user.user_status ? 'selected':''}>Ativo</option>
            <option value="inativo" ${user.user_status==='inativo'?'selected':''}>Inativo</option>
          </select>
        </div>
      </div>
      <div class="flex gap-2 mt-4">
        <button onclick="updateUser('${id}')" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition">Salvar Alterações</button>
        <button onclick="document.getElementById('user-form-area').innerHTML=''" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition">Cancelar</button>
      </div>
    </div>
  `;
  lucide.createIcons();
}


async function updateUser(id) {
  const user = getUsers().find(u => u.__backendId === id);
  if (!user) return;


  const name = document.getElementById('edit-user-name').value.trim();
  const email = document.getElementById('edit-user-email').value.trim().toLowerCase();
  const phone = document.getElementById('edit-user-phone').value.trim();
  const pass = document.getElementById('edit-user-pass').value;
  const role = document.getElementById('edit-user-role').value;
  const status = document.getElementById('edit-user-status').value;


  if (!name || !email || !pass) { 
    toast('Preencha todos os campos.','error'); 
    return; 
  }


  // Check if email already exists for another user
  const existingEmail = getUsers().find(u => u.email === email && u.__backendId !== id);
  if (existingEmail) { 
    toast('E-mail já cadastrado por outro usuário.','error'); 
    return; 
  }


  const updatedUser = {
    ...user,
    name,
    email,
    phone,
    password: pass,
    role,
    user_status: status
  };


  const r = await window.dataSdk.update(updatedUser);
  if (r.isOk) {
    toast('Usuário atualizado com sucesso!');
    document.getElementById('user-form-area').innerHTML = '';
    navigate('usuarios');
  } else {
    toast('Erro ao atualizar.','error');
  }
}


// ========== ADMIN: MONITORAMENTO ==========
function renderMonitor(c) {
  const today = todayStr();
  const carts = getCarts();
  const todayRes = getReservations().filter(r => r.date === today && r.status === 'active');


  // Figure out current period
  const now = new Date();
  const h = now.getHours(), m = now.getMinutes();
  const mins = h * 60 + m;
  let currentPeriod = '';
  const timemap = [
    [420,470],[470,520],[520,570],[570,590],[590,640],[640,690],
    [780,830],[830,880],[880,930],[930,950],[950,1000],[1000,1050]
  ];
  timemap.forEach((t,i) => { if (mins >= t[0] && mins < t[1]) currentPeriod = PERIODS[i]; });


  c.innerHTML = `
    <div class="fade-in max-w-6xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-xl font-bold flex items-center gap-2"><i data-lucide="activity" style="width:22px;height:22px;color:#3b82f6"></i> Monitoramento em Tempo Real</h2>
          <p class="text-slate-400 text-sm">${new Date().toLocaleDateString('pt-BR')} ${currentPeriod ? '— '+currentPeriod : ''}</p>
        </div>
        <span class="flex items-center gap-1 text-xs text-emerald-400"><span class="w-2 h-2 rounded-full bg-emerald-400 pulse-dot inline-block"></span> Online</span>
      </div>


      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div class="stat-card border border-slate-800 rounded-xl p-4">
          <p class="text-xs text-slate-400">Total Reservas Hoje</p>
          <p class="text-2xl font-bold text-white">${todayRes.length}</p>
        </div>
        <div class="stat-card border border-slate-800 rounded-xl p-4">
          <p class="text-xs text-slate-400">Carrinhos Ativos</p>
          <p class="text-2xl font-bold text-white">${new Set(todayRes.map(r=>r.cart_name)).size}/${carts.length}</p>
        </div>
        <div class="stat-card border border-slate-800 rounded-xl p-4">
          <p class="text-xs text-slate-400">Dispositivos em Uso</p>
          <p class="text-2xl font-bold text-white">${currentPeriod ? todayRes.filter(r=>r.period===currentPeriod).length : 0}</p>
        </div>
        <div class="stat-card border border-slate-800 rounded-xl p-4">
          <p class="text-xs text-slate-400">Professores</p>
          <p class="text-2xl font-bold text-white">${new Set(todayRes.map(r=>r.reserved_email)).size}</p>
        </div>
      </div>


      ${carts.map(ct => {
        const cartRes = todayRes.filter(r => r.cart_name === ct.cart_name && (currentPeriod ? r.period === currentPeriod : true));
        const reservedNums = new Set(cartRes.map(r => r.device_number));
        return `
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-semibold text-white">${ct.cart_name} <span class="text-slate-400 text-xs font-normal">${ct.floor} — ${ct.device_type}</span></h3>
            <span class="text-xs text-slate-400">${reservedNums.size}/40 em uso</span>
          </div>
          <div class="grid grid-cols-8 sm:grid-cols-10 gap-1">
            ${Array.from({length:40},(_,i)=>i+1).map(n => {
              const res = cartRes.find(r=>r.device_number===n);
              return `<div class="rounded-lg p-1 text-center text-xs ${res?'bg-red-500/20 text-red-400 border border-red-500/30':'bg-blue-500/10 text-blue-400/60 border border-slate-800'}" title="${res?res.reserved_by+' — '+res.period:ct.device_type+' #'+n+' disponível'}">${n}</div>`;
            }).join('')}
          </div>
          ${cartRes.length > 0 ? `
          <div class="mt-3 border-t border-slate-800 pt-3">
            <p class="text-xs text-slate-400 mb-2">Em uso agora:</p>
            <div class="space-y-1">
              ${[...new Set(cartRes.map(r=>r.reserved_email))].map(email => {
                const userRes = cartRes.filter(r=>r.reserved_email===email);
                return `<div class="flex items-center justify-between text-xs bg-slate-800/50 rounded-lg px-3 py-2">
                  <span class="text-white">${userRes[0].reserved_by}</span>
                  <span class="text-slate-400">Dispositivos: ${userRes.map(r=>'#'+r.device_number).join(', ')}</span>
                </div>`;
              }).join('')}
            </div>
          </div>` : ''}
        </div>`;
      }).join('')}
    </div>
  `;
}


// ========== ADMIN: GERENCIAR RESERVAS ==========
function renderGerenciar(c) {
  const reservations = getReservations().filter(r => r.status === 'active');
  const today = todayStr();

  // Group by date+cart+user for better readability
  // Separate today vs future vs past
  const past = reservations.filter(r => r.date < today).sort((a,b) => b.date.localeCompare(a.date));
  const todayRes = reservations.filter(r => r.date === today);
  const future = reservations.filter(r => r.date > today).sort((a,b) => a.date.localeCompare(b.date));

  function groupReservations(list) {
    const groups = {};
    list.forEach(r => {
      const key = `${r.date}|${r.cart_name}|${r.reserved_email}`;
      if (!groups[key]) groups[key] = { date: r.date, cart: r.cart_name, floor: r.floor, user: r.reserved_by, email: r.reserved_email, devices: new Set(), periods: new Set(), ids: [] };
      groups[key].devices.add(r.device_number);
      groups[key].periods.add(r.period);
      groups[key].ids.push(r.__backendId);
    });
    return Object.values(groups);
  }

  function renderGroup(groups, emptyMsg) {
    if (groups.length === 0) return `<p class="text-sm text-slate-500 italic px-2">${emptyMsg}</p>`;
    return groups.map(g => {
      const dateObj = new Date(g.date + 'T12:00:00');
      const dateStr = dateObj.toLocaleDateString('pt-BR');
      const isPast = g.date < today;
      return `
        <div class="flex items-center justify-between bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-3 gap-3">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-white text-sm font-medium truncate">${g.user}</span>
              ${isPast ? '<span class="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">Vencida</span>' : ''}
            </div>
            <div class="text-xs text-slate-400 mt-0.5">${g.cart} · ${g.floor} · ${dateStr}</div>
            <div class="text-xs text-slate-500 mt-0.5">
              Disp: ${[...g.devices].sort((a,b)=>a-b).map(d=>'#'+d).join(', ')} &nbsp;·&nbsp; ${g.periods.size} período(s)
            </div>
          </div>
          <div class="flex gap-2 flex-shrink-0">
            <button onclick="adminFinalizeReservation('${g.ids.join(',')}')"
              class="px-3 py-1.5 text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg transition flex items-center gap-1">
              <i data-lucide="check" style="width:12px;height:12px"></i> Liberar
            </button>
            <button onclick="adminCancelReservation('${g.ids.join(',')}')"
              class="px-3 py-1.5 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition flex items-center gap-1">
              <i data-lucide="trash-2" style="width:12px;height:12px"></i> Excluir
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  c.innerHTML = `
    <div class="fade-in max-w-4xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-xl font-bold flex items-center gap-2">
            <i data-lucide="shield-check" style="width:22px;height:22px;color:#3b82f6"></i> Gerenciar Reservas
          </h2>
          <p class="text-slate-400 text-sm">Visualize e libere reservas de todos os usuários</p>
        </div>
        <span class="text-xs bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded-full font-medium">${reservations.length} ativa(s)</span>
      </div>

      <div class="space-y-6">
        <!-- VENCIDAS -->
        ${past.length > 0 ? `
        <div class="bg-slate-900 border border-amber-500/30 rounded-2xl p-5">
          <h3 class="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
            <i data-lucide="alert-triangle" style="width:16px;height:16px"></i>
            Reservas Vencidas (${past.length} registro(s)) — dispositivos ainda não devolvidos
          </h3>
          <div class="space-y-2">${renderGroup(groupReservations(past), '')}</div>
        </div>` : ''}

        <!-- HOJE -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 class="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <i data-lucide="calendar" style="width:16px;height:16px;color:#3b82f6"></i>
            Hoje — ${new Date().toLocaleDateString('pt-BR')}
          </h3>
          <div class="space-y-2">${renderGroup(groupReservations(todayRes), 'Nenhuma reserva para hoje.')}</div>
        </div>

        <!-- FUTURAS -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 class="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <i data-lucide="calendar-clock" style="width:16px;height:16px;color:#8b5cf6"></i>
            Próximas reservas
          </h3>
          <div class="space-y-2">${renderGroup(groupReservations(future), 'Nenhuma reserva futura.')}</div>
        </div>
      </div>
    </div>
  `;
  lucide.createIcons();
}

async function adminFinalizeReservation(idsStr) {
  if (isLoading) return;
  isLoading = true;
  const ids = idsStr.split(',');
  for (const id of ids) {
    const rec = allData.find(d => d.__backendId === id);
    if (rec) await window.dataSdk.update({ ...rec, status: 'completed' });
  }
  isLoading = false;
  toast('✅ Dispositivos liberados com sucesso!');
  navigate('gerenciar');
}

async function adminCancelReservation(idsStr) {
  if (isLoading) return;
  isLoading = true;
  const ids = idsStr.split(',');
  for (const id of ids) {
    const rec = allData.find(d => d.__backendId === id);
    if (rec) await window.dataSdk.delete(rec);
  }
  isLoading = false;
  toast('Reserva excluída.');
  navigate('gerenciar');
}

// ========== ADMIN: RELATÓRIO ==========
function renderRelatorio(c) {
  const reservations = getReservations();
  const today = todayStr();


  // Stats
  const thisMonth = reservations.filter(r => r.date && r.date.substring(0,7) === today.substring(0,7));
  const byUser = {};
  thisMonth.forEach(r => { byUser[r.reserved_email] = (byUser[r.reserved_email]||0)+1; });
  const byCart = {};
  thisMonth.forEach(r => { byCart[r.cart_name] = (byCart[r.cart_name]||0)+1; });
  const byPeriod = {};
  thisMonth.forEach(r => { byPeriod[r.period] = (byPeriod[r.period]||0)+1; });


  const topUsers = Object.entries(byUser).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const topCarts = Object.entries(byCart).sort((a,b)=>b[1]-a[1]);
  const topPeriods = Object.entries(byPeriod).sort((a,b)=>b[1]-a[1]);


  const maxPeriod = topPeriods.length > 0 ? topPeriods[0][1] : 1;


  c.innerHTML = `
    <div class="fade-in max-w-5xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-xl font-bold flex items-center gap-2"><i data-lucide="bar-chart-2" style="width:22px;height:22px;color:#3b82f6"></i> Relatórios</h2>
          <p class="text-slate-400 text-sm">Dados do mês atual</p>
        </div>
        <button onclick="exportCSV()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition flex items-center gap-1">
          <i data-lucide="download" style="width:16px;height:16px"></i> Exportar CSV
        </button>
      </div>


      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div class="stat-card border border-slate-800 rounded-xl p-4">
          <p class="text-xs text-slate-400">Reservas no Mês</p>
          <p class="text-2xl font-bold text-white">${thisMonth.length}</p>
        </div>
        <div class="stat-card border border-slate-800 rounded-xl p-4">
          <p class="text-xs text-slate-400">Professores Ativos</p>
          <p class="text-2xl font-bold text-white">${Object.keys(byUser).length}</p>
        </div>
        <div class="stat-card border border-slate-800 rounded-xl p-4">
          <p class="text-xs text-slate-400">Carrinhos Utilizados</p>
          <p class="text-2xl font-bold text-white">${Object.keys(byCart).length}</p>
        </div>
      </div>


      <div class="grid gap-4 md:grid-cols-2 mb-6">
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 class="font-semibold text-white text-sm mb-3">Uso por Horário</h3>
          <div class="space-y-2">
            ${topPeriods.map(([p,count]) => `
              <div class="flex items-center gap-2">
                <span class="text-xs text-slate-400 w-40 truncate flex-shrink-0">${p.split('(')[0].trim()}</span>
                <div class="flex-1 bg-slate-800 rounded-full h-4 overflow-hidden">
                  <div class="bg-blue-500 h-full rounded-full" style="width:${(count/maxPeriod)*100}%"></div>
                </div>
                <span class="text-xs text-slate-300 w-8 text-right">${count}</span>
              </div>
            `).join('')}
            ${topPeriods.length===0?'<p class="text-sm text-slate-500">Sem dados.</p>':''}
          </div>
        </div>
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 class="font-semibold text-white text-sm mb-3">Top Professores</h3>
          <div class="space-y-2">
            ${topUsers.map(([email,count],i) => {
              const res = thisMonth.find(r=>r.reserved_email===email);
              return `<div class="flex items-center justify-between text-sm bg-slate-800/50 rounded-lg px-3 py-2">
                <span class="text-white"><span class="text-slate-500 mr-2">${i+1}.</span>${res?.reserved_by||email}</span>
                <span class="text-blue-400 text-xs font-medium">${count} reservas</span>
              </div>`;
            }).join('')}
            ${topUsers.length===0?'<p class="text-sm text-slate-500">Sem dados.</p>':''}
          </div>
        </div>
      </div>


      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 class="font-semibold text-white text-sm mb-3">Uso por Carrinho</h3>
        <div class="grid gap-3 sm:grid-cols-2">
          ${topCarts.map(([name,count]) => `
            <div class="flex items-center justify-between bg-slate-800/50 rounded-lg px-4 py-3">
              <span class="text-white text-sm">${name}</span>
              <span class="text-blue-400 text-sm font-medium">${count} reservas</span>
            </div>
          `).join('')}
          ${topCarts.length===0?'<p class="text-sm text-slate-500 col-span-2 text-center">Sem dados.</p>':''}
        </div>
      </div>
    </div>
  `;
}


function exportCSV() {
  const reservations = getReservations();
  if (reservations.length === 0) { toast('Sem dados para exportar.','error'); return; }
  let csv = 'Data,Carrinho,Andar,Tipo,Dispositivo,Professor,Email,Horário,Status\n';
  reservations.forEach(r => {
    csv += `${r.date},"${r.cart_name}","${r.floor}",${r.device_type},${r.device_number},"${r.reserved_by}",${r.reserved_email},"${r.period}",${r.status}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'relatorio_reservas.csv'; a.click();
  URL.revokeObjectURL(url);
  toast('Relatório exportado!');
}


// Init icons
document.addEventListener('DOMContentLoaded', () => { lucide.createIcons(); });
tailwind.config={theme:{extend:{}}}