// ========== ROUTING ==========
import { state } from './state.js';
import { isAdmin } from './helpers.js';

const _views = {};

export function registerView(name, fn) {
  _views[name] = fn;
}

export function renderCurrentView() {
  const c = document.getElementById('main-content');
  const fn = _views[state.currentView];
  if (fn) fn(c);
  window.lucide?.createIcons();
}

export function navigate(view) {
  state.selectedMonitorPeriod = null;
  state.currentView = view;
  buildNav();
  renderCurrentView();
}

export function buildNav() {
  const nav = document.getElementById('nav-links');
  const admin = state.currentUser.role === 'admin';
  let links = [
    { id: 'reservar', icon: 'calendar-plus', label: 'Reservar' },
    { id: 'minhas', icon: 'bookmark', label: 'Minhas Reservas' }
  ];
  if (admin) {
    links.push(
      { id: 'horarios', icon: 'clock', label: 'Horários' },
      { id: 'carrinhos', icon: 'hard-drive', label: 'Carrinhos' },
      { id: 'usuarios', icon: 'users', label: 'Usuários' },
      { id: 'monitor', icon: 'activity', label: 'Monitoramento' },
      { id: 'gerenciar', icon: 'shield-check', label: 'Gerenciar Reservas' },
      { id: 'relatorio', icon: 'bar-chart-2', label: 'Relatórios' }
    );
  }
  nav.innerHTML = links.map(l => `
    <button data-action="navigate" data-view="${l.id}" class="sidebar-link w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 ${state.currentView === l.id ? 'active' : ''}" data-nav="${l.id}">
      <i data-lucide="${l.icon}" style="width:16px;height:16px"></i> ${l.label}
    </button>
  `).join('');
  window.lucide?.createIcons();
}

export function toggleSidebar() {
  const s = document.getElementById('sidebar');
  s.classList.toggle('hidden');
}
