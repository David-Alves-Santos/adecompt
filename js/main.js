// ========== MAIN ENTRY POINT ==========
import { state } from './state.js';
import { registerView, renderCurrentView } from './routing.js';
import {
  loadSession, showMainApp, saveSession, isSupabaseMode,
  tryRestoreSupabaseSession, setupPasswordRecoveryListener,
  showResetPasswordForm
} from './auth.js';
import { checkExpiringReservations } from './helpers.js';
import { renderReservar, renderMinhas } from './reservas.js';
import { renderHorarios } from './horarios.js';
import { renderCarrinhos } from './carrinhos.js';
import { renderUsuarios } from './usuarios.js';
import { renderMonitor } from './monitor.js';
import { renderGerenciar } from './gerenciar.js';
import { renderRelatorio } from './relatorio.js';
import './events.js'; // side effect: attaches delegation handler

// Register all views
registerView('reservar', renderReservar);
registerView('minhas', renderMinhas);
registerView('horarios', renderHorarios);
registerView('carrinhos', renderCarrinhos);
registerView('usuarios', renderUsuarios);
registerView('monitor', renderMonitor);
registerView('gerenciar', renderGerenciar);
registerView('relatorio', renderRelatorio);

const defaultConfig = {
  app_title: 'Reserva de Computadores',
  school_name: 'Sistema de Reservas Escolar',
  background_color: '#0f172a',
  surface_color: '#1e293b',
  text_color: '#f1f5f9',
  primary_color: '#3b82f6',
  secondary_color: '#475569'
};

// dataHandler
const dataHandler = {
  onDataChanged(data) {
    state.allData = data;
    // Load periods from config if exists
    const configRecord = data.find(d => d.config_key === 'school_periods');
    if (configRecord && configRecord.periods_json) {
      try {
        state.PERIODS = JSON.parse(configRecord.periods_json);
      } catch (e) {
        console.error('Error parsing periods:', e);
      }
    }
    // Auto-restore session from localStorage after data loads.
    // No fluxo de recuperação de senha não fazemos auto-login: o usuário
    // precisa ver a tela de nova senha primeiro.
    if (!state.currentUser && !state.isRecoveryFlow) {
      if (loadSession()) {
        showMainApp();
        return;
      }
    }
    if (state.currentUser && !state.isFormOpen) renderCurrentView();
    // Check for expiring reservations
    checkExpiringReservations();
  }
};

// elementSdk init
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
      { get: () => config.background_color || defaultConfig.background_color, set: v => { config.background_color = v; window.elementSdk.setConfig({ background_color: v }); } },
      { get: () => config.surface_color || defaultConfig.surface_color, set: v => { config.surface_color = v; window.elementSdk.setConfig({ surface_color: v }); } },
      { get: () => config.text_color || defaultConfig.text_color, set: v => { config.text_color = v; window.elementSdk.setConfig({ text_color: v }); } },
      { get: () => config.primary_color || defaultConfig.primary_color, set: v => { config.primary_color = v; window.elementSdk.setConfig({ primary_color: v }); } },
      { get: () => config.secondary_color || defaultConfig.secondary_color, set: v => { config.secondary_color = v; window.elementSdk.setConfig({ secondary_color: v }); } }
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

// initApp
async function initApp() {
  // Inicializar ícones Lucide na tela de login imediatamente
  window.lucide?.createIcons();

  // Detecta o retorno do link de recuperação de senha ANTES de restaurar a
  // sessão. O link traz "type=recovery" no hash da URL; se não tratarmos aqui,
  // o detectSessionInUrl criaria uma sessão válida e o usuário entraria direto
  // no app em vez de redefinir a senha.
  if (window.location.hash && window.location.hash.includes('type=recovery')) {
    state.isRecoveryFlow = true;
  }

  const r = await window.dataSdk.init(dataHandler);
  if (!r.isOk) { console.error('SDK init failed'); }

  // Listener para o evento PASSWORD_RECOVERY do Supabase (Supabase mode).
  if (isSupabaseMode()) {
    setupPasswordRecoveryListener();
  }

  if (state.isRecoveryFlow) {
    // Mostrar a tela de nova senha; não restaurar sessão nem entrar no app.
    showResetPasswordForm();
  } else {
    // Try to restore Supabase session after data is loaded
    const supabaseSession = await tryRestoreSupabaseSession();
    if (supabaseSession) {
      showMainApp();
    }
  }

  // Check expiring reservations every 30 seconds
  setInterval(checkExpiringReservations, 30000);
}
initApp();

document.addEventListener('DOMContentLoaded', () => { window.lucide?.createIcons(); });
