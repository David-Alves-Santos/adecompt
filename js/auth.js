// ========== AUTH ==========
import { state } from './state.js';
import { getUsers } from './helpers.js';
import { buildNav, renderCurrentView } from './routing.js';

export function isSupabaseMode() {
  return typeof getSupabaseClient === 'function' && getSupabaseClient() !== null;
}

export async function tryRestoreSupabaseSession() {
  if (!isSupabaseMode()) return false;
  try {
    const supabase = getSupabaseClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) return false;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profile) {
      state.currentUser = {
        name: profile.name,
        email: profile.email,
        role: profile.role,
        __backendId: profile.id
      };
      const existing = state.allData.find(d => d.__backendId === profile.id && d.type === 'user');
      if (!existing) {
        state.allData.push({
          ...profile,
          __backendId: profile.id,
          type: 'user',
          password: '',
          cart_name: '', floor: '', device_type: '', device_number: 0,
          reserved_by: '', reserved_email: '', date: '', period: '', status: '',
          device_brand: '', device_serial: '', cart_id: ''
        });
      }
      return true;
    }
  } catch (e) {
    console.warn('Supabase session restore failed:', e.message);
  }
  return false;
}

export function saveSession() {
  if (state.currentUser) {
    localStorage.setItem('adelaide_session', JSON.stringify(state.currentUser));
  }
}

export function loadSession() {
  try {
    const saved = localStorage.getItem('adelaide_session');
    if (saved) {
      const user = JSON.parse(saved);
      if (user.email === 'admin@escola.com') {
        state.currentUser = user;
        return true;
      }
      const found = getUsers().find(u => u.email === user.email && u.user_status !== 'inativo');
      if (found) {
        state.currentUser = { name: found.name, email: found.email, role: found.role, __backendId: found.__backendId };
        return true;
      }
    }
  } catch (e) {
    console.error('Erro ao carregar sessão:', e);
  }
  return false;
}

export function clearSession() {
  localStorage.removeItem('adelaide_session');
  if (isSupabaseMode()) {
    const supabase = getSupabaseClient();
    supabase.auth.signOut().catch(() => {});
  }
}

export function togglePasswordVisibility() {
  const input = document.getElementById('login-pass');
  const icon = document.getElementById('pass-eye-icon');
  if (input.type === 'password') {
    input.type = 'text';
    if (icon) {
      icon.setAttribute('data-lucide', 'eye-off');
      window.lucide?.createIcons();
    }
  } else {
    input.type = 'password';
    if (icon) {
      icon.setAttribute('data-lucide', 'eye');
      window.lucide?.createIcons();
    }
  }
}

export async function handleLogin() {
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const pass = document.getElementById('login-pass').value;
  const errEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');

  if (!email || !pass) { errEl.textContent = 'Preencha todos os campos'; errEl.classList.remove('hidden'); return; }

  btn.disabled = true;
  btn.textContent = 'Entrando...';
  btn.style.opacity = '0.7';
  errEl.classList.add('hidden');

  function restoreBtn() {
    btn.disabled = false;
    btn.textContent = 'Entrar';
    btn.style.opacity = '1';
  }

  if (isSupabaseMode()) {
    const supabase = getSupabaseClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email,
      password: pass
    });

    if (authError) {
      if (email === 'admin@escola.com' && pass === 'admin123') {
        const { error: signUpError, data: signUpData } = await supabase.auth.signUp({
          email: 'admin@escola.com',
          password: 'admin123',
          options: { data: { name: 'Administrador', role: 'admin' } }
        });

        if (!signUpError) {
          const autoConfirmed = signUpData?.user?.identities && signUpData.user.identities.length > 0;

          if (autoConfirmed) {
            await supabase
              .from('profiles')
              .update({ name: 'Administrador', role: 'admin', user_status: 'ativo' })
              .eq('email', 'admin@escola.com');

            const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
              email: 'admin@escola.com',
              password: 'admin123'
            });
            if (!retryError && retryData) {
              state.currentUser = { name: 'Administrador', email: 'admin@escola.com', role: 'admin', __backendId: retryData.user.id };
              saveSession();
              showMainApp();
              return;
            }
          } else {
            errEl.innerHTML = '✅ Admin criado! <strong>Desative a confirmação de e-mail</strong> no Supabase: Authentication > Settings > "Confirm email" = OFF, ou confirme o e-mail manualmente em Authentication > Users.';
            errEl.className = 'text-xs text-emerald-400';
            errEl.classList.remove('hidden');
            return;
          }
        }

        errEl.textContent = '⚠️ Não foi possível criar o admin automaticamente. Crie o usuário em Authentication > Users (email: admin@escola.com, senha: admin123) e depois execute no SQL Editor: update public.profiles set role = \'admin\' where email = \'admin@escola.com\';';
        errEl.classList.remove('hidden');
        return;
      }
      errEl.textContent = 'E-mail ou senha incorretos';
      errEl.classList.remove('hidden');
      console.error('Supabase auth error:', authError.message);
      restoreBtn();
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      errEl.textContent = 'Erro ao carregar perfil do usuário.';
      errEl.classList.remove('hidden');
      console.error('Profile fetch error:', profileError?.message);
      restoreBtn();
      return;
    }

    if (profile.user_status === 'inativo') {
      errEl.textContent = 'Este usuário foi desativado. Contate o administrador.';
      errEl.classList.remove('hidden');
      restoreBtn();
      return;
    }

    state.currentUser = { name: profile.name, email: profile.email, role: profile.role, __backendId: profile.id };
    saveSession();
    showMainApp();
    return;
  }

  if (email === 'admin@escola.com' && pass === 'admin123') {
    state.currentUser = { name: 'Administrador', email: 'admin@escola.com', role: 'admin' };
    saveSession();
    showMainApp();
    return;
  }

  const user = getUsers().find(u => u.email === email && u.password === pass);
  if (!user) { errEl.textContent = 'E-mail ou senha incorretos'; errEl.classList.remove('hidden'); restoreBtn(); return; }

  if (user.user_status === 'inativo') {
    errEl.textContent = 'Este usuário foi desativado. Contate o administrador.';
    errEl.classList.remove('hidden');
    restoreBtn();
    return;
  }

  state.currentUser = { name: user.name, email: user.email, role: user.role, __backendId: user.__backendId };
  saveSession();
  showMainApp();
}

export function showMainApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('main-app').style.display = 'block';
  document.getElementById('user-name').textContent = state.currentUser.name;
  document.getElementById('user-role').textContent = state.currentUser.role === 'admin' ? 'Administrador' : 'Professor';
  buildNav();
  renderCurrentView();
  window.lucide?.createIcons();
}

export function logout() {
  state.currentUser = null;
  state.currentView = 'reservar';
  clearSession();
  document.getElementById('main-app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('login-email').value = '';
  document.getElementById('login-pass').value = '';
  document.getElementById('login-error').classList.add('hidden');
}

export function showForgotPassword() {
  document.getElementById('forgot-password-panel').classList.remove('hidden');
  document.getElementById('forgot-email').value = document.getElementById('login-email').value;
  document.getElementById('forgot-message').classList.add('hidden');
  document.getElementById('forgot-email').focus();
}

export function hideForgotPassword() {
  document.getElementById('forgot-password-panel').classList.add('hidden');
  document.getElementById('forgot-message').classList.add('hidden');
}

export function setupPasswordRecoveryListener() {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      state.isRecoveryFlow = true;
      showResetPasswordForm();
    }
  });
}

export function showResetPasswordForm() {
  const loginScreen = document.getElementById('login-screen');
  const mainApp = document.getElementById('main-app');
  if (loginScreen) loginScreen.style.display = 'none';
  if (mainApp) mainApp.style.display = 'none';

  let panel = document.getElementById('reset-password-screen');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'reset-password-screen';
    panel.className = 'h-full w-full flex items-center justify-center p-4';
    panel.style.background = 'linear-gradient(135deg,#0f172a 0%,#1e293b 50%,#0f172a 100%)';
    panel.innerHTML = `
      <div class="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 fade-in">
        <h1 class="text-2xl font-bold text-white mb-1">Nova senha</h1>
        <p class="text-slate-400 text-sm mb-4">Defina sua nova senha de acesso.</p>
        <label class="block text-xs text-slate-400 mb-1">Nova senha</label>
        <input id="reset-pass" type="password" placeholder="••••••••" class="w-full px-4 py-3 mb-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500">
        <label class="block text-xs text-slate-400 mb-1">Confirmar nova senha</label>
        <input id="reset-pass2" type="password" placeholder="••••••••" class="w-full px-4 py-3 mb-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500">
        <div id="reset-message" class="text-xs hidden mb-2"></div>
        <button id="reset-btn" data-action="submit-new-password" class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition">Salvar nova senha</button>
      </div>`;
    document.getElementById('app').appendChild(panel);
  }
  panel.style.display = 'flex';
}

export async function submitNewPassword() {
  const p1 = document.getElementById('reset-pass').value;
  const p2 = document.getElementById('reset-pass2').value;
  const msg = document.getElementById('reset-message');
  const show = (text, cls) => {
    msg.textContent = text;
    msg.className = 'text-xs mb-2 ' + cls;
    msg.classList.remove('hidden');
  };

  if (!p1 || p1.length < 6) { show('A senha deve ter ao menos 6 caracteres.', 'text-red-400'); return; }
  if (p1 !== p2) { show('As senhas não coincidem.', 'text-red-400'); return; }

  const btn = document.getElementById('reset-btn');
  btn.disabled = true;
  btn.textContent = 'Salvando...';

  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.updateUser({ password: p1 });
    if (error) {
      show('Erro ao salvar: ' + error.message, 'text-red-400');
      btn.disabled = false;
      btn.textContent = 'Salvar nova senha';
      return;
    }
    show('✅ Senha alterada! Redirecionando para o login...', 'text-emerald-400');
    await supabase.auth.signOut();
    state.isRecoveryFlow = false;
    setTimeout(() => {
      window.location.replace(window.location.origin + window.location.pathname);
    }, 1500);
  } catch (e) {
    console.error('Erro submitNewPassword:', e);
    show('Erro ao alterar a senha. Tente novamente.', 'text-red-400');
    btn.disabled = false;
    btn.textContent = 'Salvar nova senha';
  }
}

export async function handleForgotPassword() {
  const email = document.getElementById('forgot-email').value.trim().toLowerCase();
  const msgEl = document.getElementById('forgot-message');

  if (!email) {
    msgEl.textContent = 'Digite um e-mail válido.';
    msgEl.className = 'text-xs text-red-400';
    msgEl.classList.remove('hidden');
    return;
  }

  if (isSupabaseMode()) {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname
    });
    if (error) {
      msgEl.textContent = 'Erro ao enviar e-mail. Verifique o endereço e tente novamente.';
      msgEl.className = 'text-xs text-red-400';
    } else {
      msgEl.textContent = '✅ Link enviado! Verifique sua caixa de entrada (e o spam).';
      msgEl.className = 'text-xs text-emerald-400';
    }
  } else {
    msgEl.textContent = 'Contate o administrador da escola para redefinir sua senha.';
    msgEl.className = 'text-xs text-amber-400';
  }

  msgEl.classList.remove('hidden');
}
