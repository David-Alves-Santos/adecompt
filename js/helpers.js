// ========== HELPERS ==========
import { state } from './state.js';

export function getUsers() { return state.allData.filter(d => d.type === 'user'); }
export function getCarts() { return state.allData.filter(d => d.type === 'cart'); }
export function getDevices() { return state.allData.filter(d => d.type === 'device'); }
export function getReservations() { return state.allData.filter(d => d.type === 'reservation'); }

export function toast(msg, type = 'success') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  const colorClass = type === 'success' ? 'bg-emerald-600' : type === 'warning' ? 'bg-amber-500' : 'bg-red-500';
  t.className = `toast px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${colorClass} text-white`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), type === 'warning' ? 4500 : 3000);
}

export function todayStr() { return new Date().toISOString().split('T')[0]; }

export function isAdmin() {
  return state.currentUser && state.currentUser.role === 'admin';
}

export function checkExpiringReservations() {
  const now = new Date();
  const reservations = getReservations().filter(r => r.status === 'active' && r.date === todayStr());

  reservations.forEach(res => {
    const timeMatch = res.period.match(/\((\d{2}):(\d{2})-(\d{2}):(\d{2})\)/);
    if (!timeMatch) return;

    const [_, startH, startM, endH, endM] = timeMatch.map(Number);
    const endTime = new Date();
    endTime.setHours(endH, endM, 0, 0);
    const fiveMinBefore = new Date(endTime.getTime() - 5 * 60000);

    if (now >= fiveMinBefore && now < endTime) {
      const user = getUsers().find(u => u.email === res.reserved_email);
      if (user && user.phone && !res.notification_sent) {
        sendExpirationNotification(user, res);
      }
    }
  });
}

export async function sendExpirationNotification(user, reservation) {
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

  toast(`Notificação enviada para ${user.name}`);
  console.log('📲 Notification:', message);
}
