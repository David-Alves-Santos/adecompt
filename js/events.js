// ========== EVENT DELEGATION ==========
import { state } from './state.js';
import { navigate, toggleSidebar } from './routing.js';
import {
  togglePasswordVisibility, handleLogin, showForgotPassword, handleForgotPassword,
  hideForgotPassword, logout, submitNewPassword
} from './auth.js';
import {
  confirmReservation, toggleDevice, showFinalizeModal, cancelGroup, updateDeviceGrid
} from './reservas.js';
import { addNewPeriod, removePeriod, saveHorarios, resetHorarios } from './horarios.js';
import {
  showCartForm, showAddDeviceForm, editCart, confirmDeleteCart, editDevice,
  confirmDeleteDevice, deleteDevice, updateCart, cancelEditCart, updateDevice,
  cancelEditDevice, saveCart, saveDevice, deleteCart
} from './carrinhos.js';
import {
  showUserForm, editUser, toggleUserStatus, saveUser, updateUser
} from './usuarios.js';
import {
  setMonitorPeriodByIndex, monitorGoLive, showDeviceSchedule, closeDeviceModal
} from './monitor.js';
import { adminCancelReservation } from './gerenciar.js';
import { exportCSV, changeRelatorioMonth } from './relatorio.js';

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const { action, id, ids, view, idx, index, cart, device, modal, month, active } = btn.dataset;
  const map = {
    'navigate':                     () => navigate(view),
    'confirm-reservation':          () => confirmReservation(),
    'toggle-device':                () => toggleDevice(btn, parseInt(btn.dataset.device), btn.dataset.status),
    'show-finalize-modal':          () => showFinalizeModal(ids),
    'cancel-group':                 () => cancelGroup(ids),
    'remove-period':                () => removePeriod(parseInt(idx)),
    'remove-new-period':            () => btn.parentElement.remove(),
    'add-new-period':               () => addNewPeriod(),
    'save-horarios':                () => saveHorarios(),
    'reset-horarios':               () => resetHorarios(),
    'show-cart-form':               () => showCartForm(),
    'show-add-device-form':         () => showAddDeviceForm(id),
    'edit-cart':                    () => editCart(id),
    'confirm-delete-cart':          () => confirmDeleteCart(id),
    'edit-device':                  () => editDevice(id),
    'confirm-delete-device':        () => confirmDeleteDevice(id),
    'do-delete-device':             () => { document.getElementById('delete-device-modal')?.remove(); deleteDevice(id); },
    'update-cart':                  () => updateCart(id),
    'cancel-edit-cart':             () => cancelEditCart(id),
    'update-device':                () => updateDevice(id),
    'cancel-edit-device':           () => cancelEditDevice(id),
    'save-cart':                    () => saveCart(),
    'cancel-cart-form':             () => { state.isFormOpen = false; document.getElementById('cart-form-area').innerHTML = ''; },
    'save-device':                  () => saveDevice(id),
    'cancel-add-device':            () => { document.getElementById(`add-device-form-${id}`).innerHTML = ''; },
    'show-user-form':               () => showUserForm(),
    'edit-user':                    () => editUser(id),
    'toggle-user-status':           () => toggleUserStatus(id, active === 'true'),
    'save-user':                    () => saveUser(),
    'clear-user-form':              () => { document.getElementById('user-form-area').innerHTML = ''; },
    'update-user':                  () => updateUser(id),
    'set-monitor-period':           () => setMonitorPeriodByIndex(parseInt(index)),
    'monitor-go-live':              () => monitorGoLive(),
    'show-device-schedule':         () => showDeviceSchedule(cart, parseInt(device)),
    'close-device-modal':           () => closeDeviceModal(),
    'admin-cancel-reservation':     () => adminCancelReservation(ids),
    'export-csv':                   () => exportCSV(month),
    'submit-new-password':          () => submitNewPassword(),
    'close-modal':                  () => { const m = document.getElementById(modal); if (m) m.remove(); },
    'toggle-password-visibility':   () => togglePasswordVisibility(),
    'handle-login':                 () => handleLogin(),
    'show-forgot-password':         () => showForgotPassword(),
    'handle-forgot-password':       () => handleForgotPassword(),
    'hide-forgot-password':         () => hideForgotPassword(),
    'logout':                       () => logout(),
    'toggle-sidebar':               () => toggleSidebar(),
  };
  if (map[action]) map[action]();
});
