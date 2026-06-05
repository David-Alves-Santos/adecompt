// ========== ADMIN: USUARIOS ==========
import { state } from './state.js';
import { getUsers, toast, sdkCall } from './helpers.js';
import { navigate } from './routing.js';
import { isSupabaseMode } from './auth.js';

export function renderUsuarios(c) {
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
        <button data-action="show-user-form" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition flex items-center gap-1">
          <i data-lucide="plus" style="width:16px;height:16px"></i> Novo
        </button>
      </div>
      <div id="user-form-area"></div>
      <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div class="grid grid-cols-6 gap-2 px-4 py-2 text-xs font-medium text-slate-400 border-b border-slate-800">
          <span>Nome</span><span>E-mail</span><span>Telefone</span><span>Perfil</span><span>Status</span><span></span>
        </div>
        ${users.length === 0 ? '<div class="p-6 text-center text-slate-400 text-sm">Nenhum usuário cadastrado.</div>' : ''}
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
              <button data-action="edit-user" data-id="${u.__backendId}" class="p-2 text-amber-400 hover:bg-amber-500/20 rounded-lg transition" title="Editar usuário">
                <i data-lucide="pencil" style="width:16px;height:16px"></i>
              </button>
              <button data-action="toggle-user-status" data-id="${u.__backendId}" data-active="${isActive}" class="p-2 ${isActive ? 'text-amber-400 hover:bg-amber-500/20' : 'text-emerald-400 hover:bg-emerald-500/20'} rounded-lg transition" title="${isActive ? 'Desativar' : 'Ativar'}">
                <i data-lucide="${isActive ? 'power-off' : 'power'}" style="width:16px;height:16px"></i>
              </button>
            </span>
          </div>
        `;
        }).join('')}
      </div>
      <p class="text-xs text-slate-500 mt-3">* Use o ícone de energia para desativar/ativar usuários sem perder histórico</p>
    </div>
  `;
}

export function showUserForm() {
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
        <button data-action="save-user" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition">Salvar</button>
        <button data-action="clear-user-form" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition">Cancelar</button>
      </div>
    </div>
  `;
  window.lucide?.createIcons();
}

export async function saveUser() {
  const name = document.getElementById('new-user-name').value.trim();
  const email = document.getElementById('new-user-email').value.trim().toLowerCase();
  const phone = document.getElementById('new-user-phone').value.trim();
  const pass = document.getElementById('new-user-pass').value;
  const role = document.getElementById('new-user-role').value;
  if (!name || !email || !pass) { toast('Preencha todos os campos.', 'error'); return; }
  if (getUsers().find(u => u.email === email)) { toast('E-mail já cadastrado.', 'error'); return; }
  if (state.allData.length >= 999) { toast('Limite de registros atingido.', 'error'); return; }

  if (isSupabaseMode()) {
    try {
      const supabase = getSupabaseClient();

      const { data: { session: adminSession } } = await supabase.auth.getSession();
      const adminAccessToken = adminSession?.access_token || null;
      const adminRefreshToken = adminSession?.refresh_token || null;

      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: pass,
        options: {
          data: {
            name: name,
            role: role,
            phone: phone || ''
          }
        }
      });

      if (error) {
        console.error('Supabase Auth signUp error:', error);
        toast('❌ Erro ao criar usuário: ' + error.message, 'error');
        return;
      }

      const needsConfirmation = data?.user && !data?.session;
      if (needsConfirmation) {
        toast('⚠️ Usuário criado, mas precisa confirmar o e-mail antes de acessar o sistema.', 'warning');
      }

      if (adminAccessToken && adminRefreshToken) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user?.email !== adminSession?.user?.email) {
          await supabase.auth.setSession({
            access_token: adminAccessToken,
            refresh_token: adminRefreshToken
          });
        }
      }

      if (!needsConfirmation) toast('✅ Usuário cadastrado com sucesso!');
      document.getElementById('user-form-area').innerHTML = '';
      navigate('usuarios');
    } catch (err) {
      console.error('Erro ao salvar usuário (Supabase):', err);
      toast('❌ Erro ao salvar usuário.', 'error');
    }
    return;
  }

  try {
    const r = await window.dataSdk.create({
      type: 'user', name, email, password: pass, role, phone, user_status: 'ativo',
      cart_name: '', floor: '', device_type: '', device_number: 0, reserved_by: '', reserved_email: '', date: '', period: '', status: '', created_at: new Date().toISOString(), device_brand: '', device_serial: '', cart_id: ''
    });
    if (r.isOk) {
      toast('✅ Usuário cadastrado com sucesso!');
      document.getElementById('user-form-area').innerHTML = '';
      navigate('usuarios');
    } else {
      toast('❌ Erro ao salvar usuário.', 'error');
    }
  } catch (err) {
    console.error('Erro ao salvar usuário:', err);
    toast('❌ Erro ao salvar usuário.', 'error');
  }
}

export async function deleteUser(id) {
  const rec = state.allData.find(d => d.__backendId === id);
  if (rec) await sdkCall(() => window.dataSdk.delete(rec), 'Usuário removido permanentemente.', '❌ Erro ao remover usuário.');
}

export async function toggleUserStatus(id, isCurrentlyActive) {
  const user = getUsers().find(u => u.__backendId === id);
  if (!user) return;

  const newStatus = isCurrentlyActive ? 'inativo' : 'ativo';

  const updatedUser = { ...user, user_status: newStatus };
  const r = await sdkCall(() => window.dataSdk.update(updatedUser), null, 'Erro ao atualizar status.');
  if (r.isOk) {
    const msg = newStatus === 'ativo' ? 'Usuário reativado!' : 'Usuário desativado! (histórico preservado)';
    toast(msg);
    navigate('usuarios');
  }
}

export function editUser(id) {
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
          <label class="block text-xs text-slate-400 mb-1">Nova Senha <span class="text-slate-500">(opcional)</span></label>
          <input id="edit-user-pass" type="text" value="" placeholder="Deixe em branco para não alterar" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white">
        </div>
        <div>
          <label class="block text-xs text-slate-400 mb-1">Perfil</label>
          <select id="edit-user-role" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white">
            <option value="professor" ${user.role === 'professor' ? 'selected' : ''}>Professor</option>
            <option value="coordenador" ${user.role === 'coordenador' ? 'selected' : ''}>Coordenador</option>
            <option value="vice-diretor" ${user.role === 'vice-diretor' ? 'selected' : ''}>Vice-Diretor</option>
            <option value="diretor" ${user.role === 'diretor' ? 'selected' : ''}>Diretor</option>
            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Administrador</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-slate-400 mb-1">Status</label>
          <select id="edit-user-status" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white">
            <option value="ativo" ${user.user_status === 'ativo' || !user.user_status ? 'selected' : ''}>Ativo</option>
            <option value="inativo" ${user.user_status === 'inativo' ? 'selected' : ''}>Inativo</option>
          </select>
        </div>
      </div>
      <div class="flex gap-2 mt-4">
        <button data-action="update-user" data-id="${id}" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition">Salvar Alterações</button>
        <button data-action="clear-user-form" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition">Cancelar</button>
      </div>
    </div>
  `;
  window.lucide?.createIcons();
}

export async function updateUser(id) {
  const user = getUsers().find(u => u.__backendId === id);
  if (!user) return;

  const name = document.getElementById('edit-user-name').value.trim();
  const email = document.getElementById('edit-user-email').value.trim().toLowerCase();
  const phone = document.getElementById('edit-user-phone').value.trim();
  const pass = document.getElementById('edit-user-pass').value;
  const role = document.getElementById('edit-user-role').value;
  const status = document.getElementById('edit-user-status').value;

  if (!name || !email) {
    toast('Preencha os campos obrigatórios.', 'error');
    return;
  }

  const existingEmail = getUsers().find(u => u.email === email && u.__backendId !== id);
  if (existingEmail) {
    toast('E-mail já cadastrado por outro usuário.', 'error');
    return;
  }

  const updatedUser = {
    ...user,
    name,
    email,
    phone,
    role,
    user_status: status
  };
  if (pass && !isSupabaseMode()) {
    updatedUser.password = pass;
  }

  const r = await sdkCall(() => window.dataSdk.update(updatedUser), null, 'Erro ao atualizar.');
  if (!r.isOk) return;

  if (pass && isSupabaseMode()) {
    toast('⚠️ Para alterar senhas, use a opção "Esqueci minha senha" na tela de login.', 'warning');
  } else {
    toast('Usuário atualizado com sucesso!');
  }
  document.getElementById('user-form-area').innerHTML = '';
  navigate('usuarios');
}
