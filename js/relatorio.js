// ========== ADMIN: RELATÓRIOS ==========
import { state } from './state.js';
import { getReservations, toast } from './helpers.js';
import { renderCurrentView } from './routing.js';

export function changeRelatorioMonth(month) {
  state.selectedRelatorioMonth = month;
  renderCurrentView();
}

export function exportCSV(month) {
  const reservations = getReservations().filter(r => r.date && r.date.startsWith(month));
  if (reservations.length === 0) { toast('Nenhum dado para exportar.', 'error'); return; }
  const headers = ['Data', 'Período', 'Carrinho', 'Andar', 'Dispositivo', 'Patrimônio', 'Marca', 'Professor', 'E-mail', 'Status'];
  const rows = reservations.map(r => [
    r.date, r.period, r.cart_name, r.floor, '#' + r.device_number,
    r.device_serial || '', r.device_brand || '', r.reserved_by, r.reserved_email, r.status
  ]);
  const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `reservas-${month}.csv`; a.click();
  URL.revokeObjectURL(url);
  toast('CSV exportado com sucesso!');
}

export function renderRelatorio(c) {
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const month = state.selectedRelatorioMonth || currentMonth;
  const monthRes = getReservations().filter(r => r.date && r.date.startsWith(month));

  const totalRes = monthRes.length;
  const activeProfs = new Set(monthRes.map(r => r.reserved_email)).size;
  const cartsUsed = new Set(monthRes.map(r => r.cart_name)).size;

  const byPeriod = {};
  monthRes.forEach(r => { byPeriod[r.period] = (byPeriod[r.period] || 0) + 1; });

  const byProf = {};
  monthRes.forEach(r => { byProf[r.reserved_by] = (byProf[r.reserved_by] || 0) + 1; });
  const topProfs = Object.entries(byProf).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const byCart = {};
  monthRes.forEach(r => { byCart[r.cart_name] = (byCart[r.cart_name] || 0) + 1; });

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return d.toISOString().slice(0, 7);
  });

  c.innerHTML = `
    <div class="fade-in max-w-5xl mx-auto">
      <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 class="text-xl font-bold flex items-center gap-2">
            <i data-lucide="bar-chart-2" style="width:22px;height:22px;color:#3b82f6"></i> Relatórios
          </h2>
          <p class="text-slate-400 text-sm">Análise de uso do sistema</p>
        </div>
        <div class="flex gap-2 items-center">
          <select onchange="changeRelatorioMonth(this.value)"
            class="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white">
            ${months.map(m => {
              const [y, mo] = m.split('-');
              const label = new Date(y, mo - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
              return `<option value="${m}" ${m === month ? 'selected' : ''}>${label}</option>`;
            }).join('')}
          </select>
          <button data-action="export-csv" data-month="${month}"
            class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition flex items-center gap-2">
            <i data-lucide="download" style="width:16px;height:16px"></i> Exportar CSV
          </button>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-4 mb-6">
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p class="text-xs text-slate-400">Reservas no Mês</p>
          <p class="text-3xl font-bold text-white mt-1">${totalRes}</p>
        </div>
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p class="text-xs text-slate-400">Professores Ativos</p>
          <p class="text-3xl font-bold text-white mt-1">${activeProfs}</p>
        </div>
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p class="text-xs text-slate-400">Carrinhos Utilizados</p>
          <p class="text-3xl font-bold text-white mt-1">${cartsUsed}</p>
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 mb-4">
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 class="font-semibold text-white mb-3 text-sm">Uso por Horário</h3>
          ${Object.keys(byPeriod).length === 0 ? '<p class="text-slate-500 text-sm">Sem dados.</p>' :
            Object.entries(byPeriod).sort((a, b) => b[1] - a[1]).map(([period, count]) => {
              const pct = totalRes > 0 ? Math.round((count / totalRes) * 100) : 0;
              return `<div class="mb-2">
                <div class="flex justify-between text-xs mb-1">
                  <span class="text-slate-300 truncate pr-2">${period}</span>
                  <span class="text-slate-400 flex-shrink-0">${count}</span>
                </div>
                <div class="w-full bg-slate-800 rounded-full h-1.5">
                  <div class="bg-blue-500 h-1.5 rounded-full" style="width:${pct}%"></div>
                </div>
              </div>`;
            }).join('')}
        </div>
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 class="font-semibold text-white mb-3 text-sm">Top Professores</h3>
          ${topProfs.length === 0 ? '<p class="text-slate-500 text-sm">Sem dados.</p>' :
            topProfs.map(([name, count], i) => `
              <div class="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                <span class="text-sm text-slate-300">${i + 1}. ${name}</span>
                <span class="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">${count} reservas</span>
              </div>
            `).join('')}
        </div>
      </div>

      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 class="font-semibold text-white mb-3 text-sm">Uso por Carrinho</h3>
        ${Object.keys(byCart).length === 0 ? '<p class="text-slate-500 text-sm">Sem dados.</p>' :
          Object.entries(byCart).sort((a, b) => b[1] - a[1]).map(([cart, count]) => {
            const pct = totalRes > 0 ? Math.round((count / totalRes) * 100) : 0;
            return `<div class="mb-2">
              <div class="flex justify-between text-xs mb-1">
                <span class="text-slate-300">${cart}</span>
                <span class="text-slate-400">${count} (${pct}%)</span>
              </div>
              <div class="w-full bg-slate-800 rounded-full h-1.5">
                <div class="bg-emerald-500 h-1.5 rounded-full" style="width:${pct}%"></div>
              </div>
            </div>`;
          }).join('')}
      </div>
    </div>
  `;
  window.lucide?.createIcons();
}
