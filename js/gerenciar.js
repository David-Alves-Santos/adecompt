// ========== ADMIN: GERENCIAR RESERVAS ==========
import { state } from './state.js';
import { getReservations, todayStr, toast } from './helpers.js';

export function renderGerenciar(c) {
  const reservations = getReservations().filter(r => r.status === 'active');
  const today = todayStr();
  const past = reservations.filter(r => r.date < today);
  const todayRes = reservations.filter(r => r.date === today);
  const future = reservations.filter(r => r.date > today);

  function groupReservations(list) {
    const groups = {};
    list.forEach(r => {
      const key = `${r.reserved_email}|${r.date}|${r.cart_name}`;
      if (!groups[key]) groups[key] = { name: r.reserved_by, email: r.reserved_email, date: r.date, cart: r.cart_name, floor: r.floor, periods: new Set(), devices: new Set(), ids: [] };
      groups[key].periods.add(r.period);
      groups[key].devices.add(r.device_number);
      groups[key].ids.push(r.__backendId);
    });
    return Object.values(groups);
  }

  function renderGroup(groups, emptyMsg) {
    if (groups.length === 0) return `<p class="text-sm text-slate-500 italic">${emptyMsg}</p>`;
    return groups.map(g => `
      <div class="flex items-center justify-between bg-slate-800/60 rounded-xl px-4 py-3 text-sm">
        <div>
          <p class="text-white font-medium">${g.name} <span class="text-slate-400 font-normal text-xs">${g.email}</span></p>
          <p class="text-xs text-slate-400">${new Date(g.date + 'T12:00:00').toLocaleDateString('pt-BR')} — ${g.cart} ${g.floor} — ${[...g.devices].sort().map(d => '#' + d).join(', ')}</p>
          <p class="text-xs text-slate-500">${[...g.periods].join(', ')}</p>
        </div>
        <button data-action="admin-cancel-reservation" data-ids="${g.ids.join(',')}"
          class="ml-3 px-3 py-1.5 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition flex-shrink-0">
          Cancelar
        </button>
      </div>
    `).join('');
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

      ${past.length > 0 ? `
      <div class="bg-slate-900 border border-amber-500/30 rounded-2xl p-5 mb-4">
        <h3 class="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
          <i data-lucide="alert-triangle" style="width:16px;height:16px"></i>
          Reservas Vencidas (${groupReservations(past).length}) — dispositivos ainda não devolvidos
        </h3>
        <div class="space-y-2">${renderGroup(groupReservations(past), '')}</div>
      </div>` : ''}

      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-4">
        <h3 class="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <i data-lucide="calendar" style="width:16px;height:16px;color:#3b82f6"></i>
          Hoje — ${new Date().toLocaleDateString('pt-BR')}
        </h3>
        <div class="space-y-2">${renderGroup(groupReservations(todayRes), 'Nenhuma reserva para hoje.')}</div>
      </div>

      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 class="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <i data-lucide="calendar-clock" style="width:16px;height:16px;color:#8b5cf6"></i>
          Próximas reservas
        </h3>
        <div class="space-y-2">${renderGroup(groupReservations(future), 'Nenhuma reserva futura.')}</div>
      </div>
    </div>
  `;
  window.lucide?.createIcons();
}

export async function adminCancelReservation(ids) {
  if (state.isLoading) return;
  state.isLoading = true;
  const arr = ids.split(',');
  window.dataSdk.beginBatch();
  let hasError = false;
  for (const id of arr) {
    const rec = state.allData.find(d => d.__backendId === id);
    if (rec) {
      try {
        const result = await window.dataSdk.delete(rec);
        if (!result.isOk) hasError = true;
      } catch { hasError = true; }
    }
  }
  window.dataSdk.endBatch();
  state.isLoading = false;
  if (hasError) toast('⚠️ Erro ao cancelar uma ou mais reservas.', 'warning');
  else toast('Reserva cancelada pelo administrador.');
}
