// ========== ADMIN: MONITORAMENTO ==========
import { state } from './state.js';
import { getCarts, getReservations, todayStr } from './helpers.js';
import { renderCurrentView } from './routing.js';

export function renderMonitor(c) {
  const today = todayStr();
  const carts = getCarts();
  const todayRes = getReservations().filter(r => r.date === today && r.status === 'active');

  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  let currentPeriod = '';
  for (const period of state.PERIODS) {
    const m = period.match(/\((\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})\)/);
    if (!m) continue;
    const startMins = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
    const endMins = parseInt(m[3], 10) * 60 + parseInt(m[4], 10);
    if (mins >= startMins && mins < endMins) {
      currentPeriod = period;
      break;
    }
  }

  const validSelected = state.selectedMonitorPeriod && state.PERIODS.includes(state.selectedMonitorPeriod)
    ? state.selectedMonitorPeriod : null;
  const displayPeriod = validSelected || currentPeriod;
  const isLive = !!currentPeriod && displayPeriod === currentPeriod;

  function shortLabel(p) {
    if (p.startsWith('Intervalo')) return 'Int.';
    const m = p.match(/^(\d+)/);
    return m ? m[1] + 'º' : p.slice(0, 4);
  }
  function timeRange(p) {
    const m = p.match(/\((\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\)/);
    return m ? m[1] + '–' + m[2] : '';
  }

  const resByPeriod = {};
  todayRes.forEach(r => { resByPeriod[r.period] = (resByPeriod[r.period] || 0) + 1; });

  const timelineHtml = state.PERIODS.map((p, i) => {
    const isCurrent = p === currentPeriod;
    const isSelected = p === displayPeriod;
    const isInterval = p.startsWith('Intervalo');
    const count = resByPeriod[p] || 0;

    if (isInterval) {
      return `
        <div class="flex-shrink-0 flex flex-col items-center justify-center px-2 py-2 text-slate-500 select-none" title="${p}">
          <span class="text-[10px] uppercase tracking-wider">int.</span>
          <span class="text-[10px] text-slate-600">${timeRange(p)}</span>
        </div>`;
    }

    const baseCls = 'flex-shrink-0 flex flex-col items-center px-3 py-1.5 rounded-lg transition cursor-pointer border min-w-[62px]';
    let cls = 'border-slate-700 bg-slate-800/40 text-slate-300 hover:bg-slate-700/60';
    if (isSelected && isCurrent) {
      cls = 'border-emerald-400 bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/60';
    } else if (isSelected) {
      cls = 'border-blue-400 bg-blue-500/20 text-blue-100 ring-1 ring-blue-400/60';
    } else if (isCurrent) {
      cls = 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20';
    }

    const dot = count > 0
      ? `<span class="mt-0.5 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : (isCurrent ? 'bg-emerald-300' : 'bg-blue-400')}"></span>`
      : '<span class="mt-0.5 w-1.5 h-1.5"></span>';

    return `
      <button data-action="set-monitor-period" data-index="${i}" class="${baseCls} ${cls}" title="${p}${count ? ' — ' + count + ' reserva(s)' : ''}">
        <span class="font-semibold text-xs leading-tight">${shortLabel(p)}</span>
        <span class="text-[10px] opacity-70 leading-tight">${timeRange(p)}</span>
        ${dot}
      </button>`;
  }).join('');

  c.innerHTML = `
    <div class="fade-in max-w-6xl mx-auto">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-xl font-bold flex items-center gap-2"><i data-lucide="activity" style="width:22px;height:22px;color:#3b82f6"></i> Monitoramento em Tempo Real</h2>
          <p class="text-slate-400 text-sm">
            ${new Date().toLocaleDateString('pt-BR')}
            ${displayPeriod ? '— ' + displayPeriod : ''}
            ${displayPeriod ? (isLive
              ? '<span class="ml-2 text-[10px] uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">Agora</span>'
              : '<span class="ml-2 text-[10px] uppercase tracking-wider bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">Pré-visualização</span>'
            ) : ''}
          </p>
        </div>
        <span class="flex items-center gap-1 text-xs text-emerald-400"><span class="w-2 h-2 rounded-full bg-emerald-400 pulse-dot inline-block"></span> Online</span>
      </div>

      <!-- TIMELINE: mapa do dia inteiro -->
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-3 mb-6">
        <div class="flex items-center justify-between mb-2 px-1 flex-wrap gap-2">
          <span class="text-xs text-slate-400 font-medium">Mapa do dia — clique em uma aula para visualizar a ocupação</span>
          ${!isLive && currentPeriod ? '<button data-action="monitor-go-live" class="text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-3 py-1 rounded-lg flex items-center gap-1 transition"><i data-lucide="radio" style="width:12px;height:12px"></i> Voltar para Agora</button>' : ''}
        </div>
        <div class="flex items-stretch gap-1.5 overflow-x-auto pb-1">
          ${timelineHtml}
        </div>
        <div class="flex items-center gap-3 text-[10px] text-slate-500 mt-2 px-1 flex-wrap">
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-emerald-500/40 border border-emerald-400"></span> aula atual</span>
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-blue-500/40 border border-blue-400"></span> selecionado</span>
          <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-blue-400"></span> tem reservas</span>
        </div>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div class="stat-card border border-slate-800 rounded-xl p-4">
          <p class="text-xs text-slate-400">Total Reservas Hoje</p>
          <p class="text-2xl font-bold text-white">${todayRes.length}</p>
        </div>
        <div class="stat-card border border-slate-800 rounded-xl p-4">
          <p class="text-xs text-slate-400">Carrinhos Ativos</p>
          <p class="text-2xl font-bold text-white">${new Set(todayRes.map(r => r.cart_name)).size}/${carts.length}</p>
        </div>
        <div class="stat-card border border-slate-800 rounded-xl p-4">
          <p class="text-xs text-slate-400">${isLive ? 'Dispositivos em Uso' : 'Reservas no período'}</p>
          <p class="text-2xl font-bold text-white">${displayPeriod ? todayRes.filter(r => r.period === displayPeriod).length : 0}</p>
        </div>
        <div class="stat-card border border-slate-800 rounded-xl p-4">
          <p class="text-xs text-slate-400">Professores</p>
          <p class="text-2xl font-bold text-white">${new Set(todayRes.map(r => r.reserved_email)).size}</p>
        </div>
      </div>

      ${carts.map(ct => {
        const cartRes = todayRes.filter(r => r.cart_name === ct.cart_name && (displayPeriod ? r.period === displayPeriod : true));
        const reservedNums = new Set(cartRes.map(r => r.device_number));
        return `
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-semibold text-white">${ct.cart_name} <span class="text-slate-400 text-xs font-normal">${ct.floor} — ${ct.device_type}</span></h3>
            <span class="text-xs text-slate-400">${reservedNums.size}/40 ${isLive ? 'em uso' : 'reservados'}</span>
          </div>
          <div class="grid grid-cols-8 sm:grid-cols-10 gap-1">
            ${Array.from({ length: 40 }, (_, i) => i + 1).map(n => {
              const res = cartRes.find(r => parseInt(r.device_number) === n);
              return `<button data-action="show-device-schedule" data-cart="${ct.cart_name}" data-device="${n}" class="rounded-lg p-1 text-center text-xs cursor-pointer transition ${res ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30' : 'bg-blue-500/10 text-blue-400/60 border border-slate-800 hover:bg-blue-500/20 hover:text-blue-300'}" title="Ver agenda — ${ct.device_type} #${n}">${n}</button>`;
            }).join('')}
          </div>
          ${cartRes.length > 0 ? `
          <div class="mt-3 border-t border-slate-800 pt-3">
            <p class="text-xs text-slate-400 mb-2">${isLive ? 'Em uso agora:' : 'Reservas neste período:'}</p>
            <div class="space-y-1">
              ${[...new Set(cartRes.map(r => r.reserved_email))].map(email => {
                const userRes = cartRes.filter(r => r.reserved_email === email);
                return `<div class="flex items-center justify-between text-xs bg-slate-800/50 rounded-lg px-3 py-2">
                  <span class="text-white">${userRes[0].reserved_by}</span>
                  <span class="text-slate-400">Dispositivos: ${userRes.map(r => '#' + r.device_number).join(', ')}</span>
                </div>`;
              }).join('')}
            </div>
          </div>` : ''}
        </div>`;
      }).join('')}
    </div>
  `;
}

export function setMonitorPeriodByIndex(i) {
  const p = state.PERIODS[i];
  if (!p) return;
  state.selectedMonitorPeriod = p;
  renderCurrentView();
}

export function monitorGoLive() {
  state.selectedMonitorPeriod = null;
  renderCurrentView();
}

export function showDeviceSchedule(cartName, deviceNum) {
  const today = todayStr();
  const allRes = getReservations().filter(r =>
    r.date === today &&
    r.status === 'active' &&
    r.cart_name === cartName &&
    parseInt(r.device_number) === deviceNum
  );

  const resByPeriod = {};
  allRes.forEach(r => { resByPeriod[r.period] = r; });

  const periodsHtml = state.PERIODS.map(p => {
    if (p.startsWith('Intervalo')) {
      return `<div class="text-[10px] text-slate-600 uppercase tracking-wider py-1 px-2">${p}</div>`;
    }
    const res = resByPeriod[p];
    return `
      <div class="flex items-center justify-between rounded-lg px-3 py-2 ${res ? 'bg-red-500/10 border border-red-500/20' : 'bg-slate-800/50 border border-slate-700/50'}">
        <span class="text-xs text-slate-300">${p}</span>
        ${res
          ? `<span class="text-xs text-red-300 font-medium" title="${res.reserved_by}">${res.reserved_by.split(' ')[0]}</span>`
          : `<span class="text-xs text-emerald-400">Livre</span>`
        }
      </div>`;
  }).join('');

  const existing = document.getElementById('device-schedule-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'device-schedule-modal';
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
  modal.innerHTML = `
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" data-action="close-device-modal"></div>
    <div class="relative bg-slate-900 border border-slate-700 rounded-2xl p-5 w-full max-w-sm shadow-2xl">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="font-bold text-white">Computador #${deviceNum}</h3>
          <p class="text-xs text-slate-400">${cartName} — agenda do dia</p>
        </div>
        <button data-action="close-device-modal" class="text-slate-400 hover:text-white transition">
          <i data-lucide="x" style="width:18px;height:18px"></i>
        </button>
      </div>
      <div class="space-y-1.5 max-h-80 overflow-y-auto pr-1">
        ${periodsHtml}
      </div>
      <div class="flex items-center gap-3 mt-4 text-[10px] text-slate-500">
        <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-red-500/30 border border-red-500/40"></span> reservado</span>
        <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-slate-800 border border-slate-700"></span> livre</span>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  window.lucide?.createIcons();
}

export function closeDeviceModal() {
  const m = document.getElementById('device-schedule-modal');
  if (m) m.remove();
}
