# Briefing para RooCode — Sistema de Reserva de Computadores

## Contexto do Projeto

Sistema web escolar de reserva de computadores. Stack: HTML/CSS/JS vanilla + Tailwind CDN + Lucide Icons + Supabase (modo primário) com fallback legacy (Express API). Toda a lógica está em **`js/script.js`** (~2368 linhas). A tela está em **`index.html`**. O sistema tem dois modos de operação: **Supabase mode** (`isSupabaseMode()` retorna `true`) e **Legacy mode** (fallback com Express API). Você deve tratar os dois modos em cada alteração.

---

## Mudança 1 — Carrinhos: adicionar botão de editar carrinho e editar dispositivo

### Problema
Na função `renderCarrinhos(c)` (linha ~1237), o cabeçalho de cada carrinho tem apenas o botão de excluir (`confirmDeleteCart`). A linha de cada dispositivo tem apenas o botão de excluir (`deleteDevice`). Não existe opção de edição.

### O que implementar

#### 1a. Editar nome/dados do carrinho

No bloco do cabeçalho do carrinho (dentro do `.map(ct => {...})`), adicionar um botão de lápis **ao lado** do botão de excluir existente:

```html
<button onclick="editCart('${ct.__backendId}')" class="p-2 text-amber-400 hover:bg-amber-500/20 rounded-lg transition" title="Editar carrinho">
  <i data-lucide="pencil" style="width:16px;height:16px"></i>
</button>
```

Criar a função `editCart(id)` que injeta um formulário inline dentro do `<div class="bg-slate-900 ...">` do carrinho (substituir o cabeçalho do card pelo formulário, ou injetar antes do conteúdo — escolha o mais limpo). O formulário deve ter os campos:
- Nome do Carrinho (input text, valor atual: `ct.cart_name`)
- Andar / Local (input text, valor atual: `ct.floor`)
- Tipo de Dispositivo (select Notebook/Tablet, valor atual: `ct.device_type`)
- Botões: "Salvar" e "Cancelar"

Criar a função `updateCart(id)` que:
1. Lê os valores do formulário
2. Valida que nome e andar não estão vazios
3. Chama `window.dataSdk.update({ ...cartRecord, cart_name: novoNome, floor: novoAndar, device_type: novoTipo })`
4. Em caso de sucesso: `toast('Carrinho atualizado!')` e re-renderiza a view com `navigate('carrinhos')`
5. Em caso de erro: `toast('Erro ao atualizar.', 'error')`

**Atenção:** O objeto `cartRecord` deve vir de `allData.find(d => d.__backendId === id)` — não construir um objeto do zero, pois o SDK precisa de todos os campos originais para o update funcionar corretamente.

#### 1b. Editar dados de dispositivo

Na linha de cada dispositivo (`cartDevices.map(dev => ...)`), adicionar um botão de lápis **ao lado** do botão de excluir existente no `<span class="text-right">`:

```html
<button onclick="editDevice('${dev.__backendId}')" class="p-1 text-amber-400 hover:bg-amber-500/20 rounded transition" title="Editar dispositivo">
  <i data-lucide="pencil" style="width:14px;height:14px"></i>
</button>
```

Criar a função `editDevice(id)` que substitui a linha do dispositivo por um formulário inline com os campos:
- Posição (select 1-40, valor atual: `dev.device_number`)
- Nº Patrimônio (input text, valor atual: `dev.device_serial`)
- Marca (select Positivo/Samsung/Lenovo/Outro, valor atual: `dev.device_brand`)
- Modelo (input text, valor atual: `dev.device_type` — note: o campo "modelo" é salvo em `device_type` para dispositivos, não confundir com o `device_type` do carrinho)
- Botões: "Salvar" e "Cancelar"

Criar a função `updateDevice(id)` que:
1. Lê os valores do formulário
2. Valida campos obrigatórios (posição, patrimônio, marca)
3. Verifica se a nova posição já existe em outro dispositivo do mesmo carrinho (exceto o próprio): `getDevices().find(d => String(d.cart_id) === String(dev.cart_id) && parseInt(d.device_number) === parseInt(novaPos) && d.__backendId !== id)`
4. Chama `window.dataSdk.update({ ...deviceRecord, device_number: novaPos, device_serial: novoSerial, device_brand: novaMarca, device_type: novoModelo })`
5. Em caso de sucesso: `toast('Dispositivo atualizado!')` + `navigate('carrinhos')`
6. Em caso de erro: `toast('Erro ao atualizar.', 'error')`

---

## Mudança 2 — Usuários: corrigir editar/inativar e trocar senha

### Problema A — Editar usuário não atualiza a senha (Supabase mode)

A função `updateUser(id)` (linha ~1801) atualiza o objeto via `window.dataSdk.update()`, que escreve na tabela `profiles` do Supabase. Isso funciona para nome, email, telefone, perfil e status. **Mas não altera a senha no Supabase Auth**, pois senhas ficam em `auth.users`, não em `profiles`.

#### Solução para troca de senha em Supabase mode

No formulário de edição (`editUser`), o campo senha deve ser ajustado:

1. **Renomear o label** de "Senha" para "Nova Senha (opcional)" e deixar o campo **vazio** por padrão (não preencher com `user.password`, que em Supabase mode está vazio/undefined de qualquer forma)
2. Adicionar `placeholder="Deixe em branco para não alterar"`

Na função `updateUser(id)`:
- Se o campo senha estiver **em branco**: salvar normalmente sem alterar senha
- Se o campo senha estiver **preenchido** e `isSupabaseMode()`:
  - Chamar o endpoint de reset via email: `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })` 
  - **OU** — preferível se o projeto tiver service role — `supabase.auth.admin.updateUserById(id, { password: novaPass })`
  - Como não sabemos se o service role está disponível, usar a abordagem mais segura: mostrar um toast de aviso informando que em modo Supabase a senha deve ser redefinida pelo próprio usuário via e-mail, e não salvar a senha. Toast: `toast('⚠️ Para alterar senhas, use a opção "Esqueci minha senha" na tela de login.', 'warning')`
- Se o campo senha estiver **preenchido** e `!isSupabaseMode()` (legacy mode): salvar normalmente via `dataSdk.update()` com o campo `password`

**Remover** a validação `if (!name || !email || !pass)` — trocar por `if (!name || !email)` (senha não é mais obrigatória no edit)

### Problema B — Inativar/ativar usuário com erro

A função `toggleUserStatus(id, isCurrentlyActive)` (linha ~1768) já está implementada e parece correta conceitualmente. Se estiver com erro, provavelmente é porque `window.dataSdk.update()` em Supabase mode não está conseguindo atualizar o campo `user_status` na tabela `profiles`.

**Verificar e corrigir:**

1. Logar o retorno do `dataSdk.update()` no console para identificar o erro real
2. Se o dataSdk em Supabase mode não suportar update de perfis, implementar fallback direto:

```javascript
if (isSupabaseMode()) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('profiles')
    .update({ user_status: newStatus })
    .eq('id', id);
  if (error) { toast('Erro ao atualizar status.', 'error'); return; }
} else {
  const r = await window.dataSdk.update(updatedUser);
  if (!r.isOk) { toast('Erro ao atualizar status.', 'error'); return; }
}
```

3. Aplicar o mesmo padrão na função `updateUser(id)` para garantir que os campos de perfil salvem corretamente em Supabase mode

---

## Mudança 3 — Tela de login: adicionar "Esqueci minha senha"

### Localização
Arquivo `index.html`, dentro do bloco `#login-screen`, logo após o botão "Entrar" e antes/depois do `<p>Primeiro acesso?...</p>`.

### O que adicionar no HTML (index.html)

Substituir o parágrafo atual:
```html
<p class="text-center text-slate-500 text-xs mt-2">Primeiro acesso? Cadastre-se pelo administrador</p>
```

Por:
```html
<div class="flex flex-col items-center gap-1 mt-2">
  <button onclick="showForgotPassword()" class="text-blue-400 hover:text-blue-300 text-xs underline transition">Esqueci minha senha</button>
  <p class="text-slate-500 text-xs">Primeiro acesso? Cadastre-se pelo administrador</p>
</div>

<!-- Painel de recuperação de senha (oculto por padrão) -->
<div id="forgot-password-panel" class="hidden mt-4 p-4 bg-slate-800 border border-slate-700 rounded-xl space-y-3">
  <p class="text-sm text-slate-300 font-medium">Recuperar senha</p>
  <p class="text-xs text-slate-400">Digite seu e-mail para receber um link de redefinição.</p>
  <input id="forgot-email" type="email" placeholder="seu@email.com" 
    class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500">
  <div id="forgot-message" class="text-xs hidden"></div>
  <div class="flex gap-2">
    <button onclick="handleForgotPassword()" 
      class="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition">
      Enviar link
    </button>
    <button onclick="hideForgotPassword()" 
      class="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition">
      Cancelar
    </button>
  </div>
</div>
```

### O que adicionar no JS (js/script.js)

Adicionar as três funções próximas ao bloco de login (`handleLogin`, `logout`):

```javascript
function showForgotPassword() {
  document.getElementById('forgot-password-panel').classList.remove('hidden');
  document.getElementById('forgot-email').value = document.getElementById('login-email').value;
  document.getElementById('forgot-message').classList.add('hidden');
  document.getElementById('forgot-email').focus();
}

function hideForgotPassword() {
  document.getElementById('forgot-password-panel').classList.add('hidden');
  document.getElementById('forgot-message').classList.add('hidden');
}

async function handleForgotPassword() {
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
    // Legacy mode: sem suporte a reset automático
    msgEl.textContent = 'Contate o administrador da escola para redefinir sua senha.';
    msgEl.className = 'text-xs text-amber-400';
  }

  msgEl.classList.remove('hidden');
}
```

---

## Resumo das funções a criar/modificar

| Arquivo | Função | Ação |
|---|---|---|
| `js/script.js` | `renderCarrinhos()` | Adicionar botão editar no card do carrinho e na linha do dispositivo |
| `js/script.js` | `editCart(id)` | **Nova** — exibe formulário inline de edição do carrinho |
| `js/script.js` | `updateCart(id)` | **Nova** — salva alterações do carrinho via dataSdk.update |
| `js/script.js` | `editDevice(id)` | **Nova** — exibe formulário inline de edição do dispositivo |
| `js/script.js` | `updateDevice(id)` | **Nova** — salva alterações do dispositivo via dataSdk.update |
| `js/script.js` | `editUser()` (template HTML) | Campo senha: opcional, placeholder "Deixe em branco para não alterar" |
| `js/script.js` | `updateUser(id)` | Corrigir validação (senha opcional); tratar Supabase mode para senha; verificar update de profile diretamente via supabase client se dataSdk.update falhar |
| `js/script.js` | `toggleUserStatus(id, isActive)` | Adicionar fallback com chamada direta ao Supabase se dataSdk falhar |
| `js/script.js` | `showForgotPassword()` | **Nova** |
| `js/script.js` | `hideForgotPassword()` | **Nova** |
| `js/script.js` | `handleForgotPassword()` | **Nova** — usa `supabase.auth.resetPasswordForEmail` em Supabase mode |
| `index.html` | Bloco `#login-screen` | Adicionar link "Esqueci minha senha" e painel `#forgot-password-panel` |

## Notas importantes para o RooCode

- **Não criar novos arquivos** — todas as mudanças vão em `js/script.js` e `index.html`
- **Padrão visual**: seguir o estilo dark existente (bg-slate-900, text-amber-400 para editar, text-red-400 para excluir, bg-blue-600 para salvar)
- **Sempre chamar `lucide.createIcons()`** após injetar HTML com ícones Lucide
- **Sempre testar os dois caminhos**: `isSupabaseMode() === true` e `isSupabaseMode() === false`
- **`allData.find(d => d.__backendId === id)`** é a forma correta de buscar um registro para update/delete — nunca construir o objeto do zero
- O campo `device_type` em registros de dispositivo (`type === 'device'`) guarda o **modelo** (ex: "Positivo Tec"), não o tipo de dispositivo. O tipo de dispositivo do carrinho fica no registro `type === 'cart'`. Não confundir.
