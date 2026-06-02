# Briefing RooCode — ADECOMPT v2 — Análise Completa

## Contexto
Sistema web escolar de reserva de computadores. Stack: HTML/CSS/JS vanilla + Tailwind CDN + Lucide Icons + Supabase. Toda a lógica está em `js/script.js` (~2405 linhas) e `index.html`. O sistema tem dois modos: **Supabase mode** (`isSupabaseMode() === true`) e **Legacy mode** (fallback Express).

---

## 🔴 BUGS CRÍTICOS (quebram o sistema)

---

### BUG 1 — `renderRelatorio` não existe

**Arquivo:** `js/script.js`  
**Localização:** linha 508 chama `renderRelatorio(c)` dentro de `renderCurrentView()`, mas a função nunca foi definida em nenhum lugar do arquivo.

**Impacto:** Clicar em "Relatórios" no menu lateral lança `ReferenceError: renderRelatorio is not defined` e quebra toda a renderização da view. A tela fica em branco e nenhuma outra navegação funciona até recarregar a página.

**O que implementar:** Criar a função `renderRelatorio(c)` completa. Com base no que o sistema já tem (reservas, carrinhos, usuários), a função deve exibir:

```javascript
function renderRelatorio(c) {
  const reservations = getReservations();
  const users = getUsers();
  const carts = getCarts();
  
  // Mês atual para filtro padrão
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7); // "2026-06"
  
  // Filtrar pelo mês selecionado (usar selectedRelatorioMonth ou mês atual)
  const month = window.selectedRelatorioMonth || currentMonth;
  const monthRes = reservations.filter(r => r.date && r.date.startsWith(month));
  
  // Estatísticas
  const totalRes = monthRes.length;
  const activeProfs = new Set(monthRes.map(r => r.reserved_email)).size;
  const cartsUsed = new Set(monthRes.map(r => r.cart_name)).size;
  
  // Uso por horário
  const byPeriod = {};
  monthRes.forEach(r => { byPeriod[r.period] = (byPeriod[r.period] || 0) + 1; });
  
  // Top professores
  const byProf = {};
  monthRes.forEach(r => { byProf[r.reserved_by] = (byProf[r.reserved_by] || 0) + 1; });
  const topProfs = Object.entries(byProf).sort((a,b) => b[1]-a[1]).slice(0, 5);
  
  // Uso por carrinho
  const byCart = {};
  monthRes.forEach(r => { byCart[r.cart_name] = (byCart[r.cart_name] || 0) + 1; });
  
  // Gerar lista de meses disponíveis (dos últimos 6 meses)
  const months = Array.from({length: 6}, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return d.toISOString().slice(0, 7);
  });
  
  c.innerHTML = `
    <div class="fade-in max-w-5xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-xl font-bold flex items-center gap-2">
            <i data-lucide="bar-chart-2" style="width:22px;height:22px;color:#3b82f6"></i> Relatórios
          </h2>
          <p class="text-slate-400 text-sm">Análise de uso do sistema</p>
        </div>
        <div class="flex gap-2 items-center">
          <select id="relatorio-month" onchange="changeRelatorioMonth(this.value)" 
            class="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white">
            ${months.map(m => {
              const [y, mo] = m.split('-');
              const label = new Date(y, mo-1, 1).toLocaleDateString('pt-BR', {month:'long', year:'numeric'});
              return `<option value="${m}" ${m === month ? 'selected' : ''}>${label}</option>`;
            }).join('')}
          </select>
          <button onclick="exportCSV('${month}')" 
            class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition flex items-center gap-2">
            <i data-lucide="download" style="width:16px;height:16px"></i> Exportar CSV
          </button>
        </div>
      </div>
      
      <!-- Cards de resumo -->
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
        <!-- Uso por Horário -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 class="font-semibold text-white mb-3 text-sm">Uso por Horário</h3>
          ${Object.keys(byPeriod).length === 0 ? '<p class="text-slate-500 text-sm">Sem dados.</p>' :
            Object.entries(byPeriod).sort((a,b)=>b[1]-a[1]).map(([period, count]) => {
              const pct = Math.round((count / totalRes) * 100);
              return `
                <div class="mb-2">
                  <div class="flex justify-between text-xs mb-1">
                    <span class="text-slate-300 truncate">${period}</span>
                    <span class="text-slate-400 ml-2">${count}</span>
                  </div>
                  <div class="w-full bg-slate-800 rounded-full h-1.5">
                    <div class="bg-blue-500 h-1.5 rounded-full" style="width:${pct}%"></div>
                  </div>
                </div>`;
            }).join('')}
        </div>
        
        <!-- Top Professores -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 class="font-semibold text-white mb-3 text-sm">Top Professores</h3>
          ${topProfs.length === 0 ? '<p class="text-slate-500 text-sm">Sem dados.</p>' :
            topProfs.map(([name, count], i) => `
              <div class="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                <span class="text-sm text-slate-300">${i+1}. ${name}</span>
                <span class="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">${count} reservas</span>
              </div>
            `).join('')}
        </div>
      </div>
      
      <!-- Uso por Carrinho -->
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 class="font-semibold text-white mb-3 text-sm">Uso por Carrinho</h3>
        ${Object.keys(byCart).length === 0 ? '<p class="text-slate-500 text-sm">Sem dados.</p>' :
          Object.entries(byCart).sort((a,b)=>b[1]-a[1]).map(([cart, count]) => {
            const pct = Math.round((count / totalRes) * 100);
            return `
              <div class="mb-2">
                <div class="flex justify-between text-xs mb-1">
                  <span class="text-slate-300">${cart}</span>
                  <span class="text-slate-400">${count} reservas (${pct}%)</span>
                </div>
                <div class="w-full bg-slate-800 rounded-full h-1.5">
                  <div class="bg-emerald-500 h-1.5 rounded-full" style="width:${pct}%"></div>
                </div>
              </div>`;
          }).join('')}
      </div>
    </div>
  `;
  lucide.createIcons();
}

// Variável de estado para o mês selecionado no relatório
window.selectedRelatorioMonth = null;

function changeRelatorioMonth(month) {
  window.selectedRelatorioMonth = month;
  renderCurrentView();
}

function exportCSV(month) {
  const reservations = getReservations().filter(r => r.date && r.date.startsWith(month));
  if (reservations.length === 0) { toast('Nenhum dado para exportar.', 'error'); return; }
  
  const headers = ['Data', 'Período', 'Carrinho', 'Andar', 'Dispositivo', 'Patrimônio', 'Marca', 'Professor', 'E-mail', 'Status'];
  const rows = reservations.map(r => [
    r.date, r.period, r.cart_name, r.floor, '#'+r.device_number,
    r.device_serial || '', r.device_brand || '', r.reserved_by, r.reserved_email, r.status
  ]);
  
  const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reservas-${month}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast('CSV exportado com sucesso!');
}
```

**Também adicionar** `window.selectedRelatorioMonth = null;` junto às outras variáveis de estado no topo do arquivo (próximo à linha 1, seção `STATE`). E ao navegar para outra tela (função `navigate()`), resetar: `window.selectedRelatorioMonth = null;`.

---

### BUG 2 — `toast()` não trata tipo `'warning'`

**Arquivo:** `js/script.js`, linha 97–105  
**Problema:** A função `toast` só tem dois estilos: `'success'` (verde) e qualquer outra coisa (vermelho). Mas o código chama `toast('...', 'warning')` em 3 lugares — todos mostram como vermelho de erro, o que confunde o usuário.

**Correção:**
```javascript
function toast(msg, type='success') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  const colorClass = type === 'success' ? 'bg-emerald-600' 
                   : type === 'warning' ? 'bg-amber-500'
                   : 'bg-red-500';
  t.className = `toast px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${colorClass} text-white`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 4000); // warning dura um pouco mais
}
```

---

### BUG 3 — `deleteDevice` exclui sem confirmação

**Arquivo:** `js/script.js`, linha 1334 (botão na `renderCarrinhos`) e linha 1658 (função `deleteDevice`)  
**Problema:** O botão de excluir dispositivo chama `deleteDevice()` diretamente, sem nenhum modal de confirmação. Já o botão de excluir carrinho tem um modal robusto que exige digitar o nome. A exclusão de dispositivo é irreversível e inconsistente.

**Correção:** Criar função `confirmDeleteDevice(id)` semelhante ao padrão do carrinho (sem necessidade de digitar o nome, mas com um modal simples de confirmação):

```javascript
function confirmDeleteDevice(id) {
  const dev = getDevices().find(d => d.__backendId === id);
  if (!dev) return;
  
  const existing = document.getElementById('delete-device-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'delete-device-modal';
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
  modal.innerHTML = `
    <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
    <div class="relative bg-slate-900 border border-red-500/40 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
          <i data-lucide="triangle-alert" style="width:20px;height:20px;color:#ef4444"></i>
        </div>
        <div>
          <h3 class="font-bold text-white">Excluir dispositivo?</h3>
          <p class="text-xs text-slate-400">Posição #${dev.device_number} — ${dev.device_brand} ${dev.device_type || ''}</p>
        </div>
      </div>
      <p class="text-sm text-slate-300 mb-5">Esta ação não pode ser desfeita. O dispositivo será removido do carrinho permanentemente.</p>
      <div class="flex gap-3">
        <button onclick="document.getElementById('delete-device-modal').remove()"
          class="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition">
          Cancelar
        </button>
        <button onclick="document.getElementById('delete-device-modal').remove(); deleteDevice('${id}')"
          class="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition">
          Excluir
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  lucide.createIcons();
}
```

E na `renderCarrinhos`, trocar o `onclick` do botão de excluir dispositivo de `deleteDevice` para `confirmDeleteDevice`:
```html
<!-- linha ~1334: ANTES -->
<button onclick="deleteDevice('${dev.__backendId}')">

<!-- DEPOIS -->
<button onclick="confirmDeleteDevice('${dev.__backendId}')">
```

---

## 🟠 PROBLEMAS DE SEGURANÇA

---

### SEGURANÇA 1 — Credenciais padrão expostas na tela

**Arquivo:** `js/script.js`, linha 1729  
**Problema:** O rodapé da tela Usuários exibe publicamente: `"Admin padrão: admin@escola.com / admin123"`. Qualquer usuário logado (professores incluídos) vê essas credenciais.

**Correção:** Remover completamente essa linha de texto:
```javascript
// REMOVER esta linha do renderUsuarios():
<p class="text-xs text-slate-500 mt-3">* Admin padrão: admin@escola.com / admin123 | Use o ícone de energia para desativar/ativar usuários sem perder histórico</p>

// SUBSTITUIR por:
<p class="text-xs text-slate-500 mt-3">Use o ícone de energia para desativar/ativar usuários sem perder histórico.</p>
```

---

## 🟡 MELHORIAS DE UX

---

### MELHORIA 1 — Tela Reservar vazia: atalho para admin

**Arquivo:** `js/script.js`, função `renderReservar(c)`  
**Problema:** Quando não há carrinhos cadastrados, a tela mostra apenas "Peça ao administrador para cadastrar os carrinhos." O admin vê a mesma mensagem e não tem atalho.

**Correção:** No bloco de `carts.length === 0`, exibir botão de atalho apenas para admin:
```javascript
// Trocar:
'<div class="..."><i ...></i><p>Nenhum carrinho cadastrado ainda.</p><p class="text-xs mt-1">Peça ao administrador para cadastrar os carrinhos.</p></div>'

// Por:
`<div class="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
  <i data-lucide="inbox" style="width:40px;height:40px;margin:0 auto 12px;color:#475569"></i>
  <p>Nenhum carrinho cadastrado ainda.</p>
  ${isAdmin() ? `<button onclick="navigate('carrinhos')" class="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-xl transition">Cadastrar primeiro carrinho</button>` : '<p class="text-xs mt-1">Peça ao administrador para cadastrar os carrinhos.</p>'}
</div>`
```

---

### MELHORIA 2 — Minhas Reservas: mostrar histórico

**Arquivo:** `js/script.js`, função `renderMinhas(c)`  
**Problema:** `renderMinhas` filtra apenas `status === 'active'`. Reservas finalizadas (status `'completed'`) e passadas por data não aparecem. O professor não consegue ver seu histórico.

**Correção:** Adicionar abas "Ativas" e "Histórico":
- Aba **Ativas**: filtro atual (`status === 'active'`)
- Aba **Histórico**: `status === 'completed'` OU (`status === 'active'` AND `date < today`) — reservas passadas

Usar uma variável de estado `window.minhasTab = 'ativas'` e dois botões de aba no topo da tela. Reservas no histórico não devem ter botões de Finalizar/Cancelar.

---

### MELHORIA 3 — Modal de confirmação de reserva: listar períodos

**Arquivo:** `js/script.js`, função `showConfirmationModal()`  
**Problema:** O modal mostra `"${periods.length} período(s)"` mas não lista quais são. O professor não consegue revisar o que está confirmando.

**Correção:** Substituir a linha dos horários no modal:
```javascript
// ANTES:
<span class="text-white font-medium">${periods.length} período(s)</span>

// DEPOIS:
<span class="text-white font-medium text-right text-xs">${periods.join('<br>')}</span>
```

---

### MELHORIA 4 — Monitoramento: contagem real de dispositivos

**Arquivo:** `js/script.js`, função `renderMonitor(c)`  
**Problema:** O card de cada carrinho mostra `"${reservedNums.size}/40"` fixo como se todo carrinho tivesse 40 dispositivos, mas o número real de dispositivos cadastrados pode ser menor.

**Correção:** Usar o número real de dispositivos cadastrados do carrinho:
```javascript
// ANTES:
const reservedNums = new Set(cartRes.map(r => r.device_number));
// ...mostra: ${reservedNums.size}/40

// DEPOIS:
const cartDevices = getDevices().filter(d => String(d.cart_id) === String(ct.__backendId));
const totalDevices = cartDevices.length || 40;
const reservedNums = new Set(cartRes.map(r => r.device_number));
// ...mostra: ${reservedNums.size}/${totalDevices}
```

---

### MELHORIA 5 — Horários: campos estruturados com time pickers

**Arquivo:** `js/script.js`, função `renderHorarios(c)` e `addNewPeriod()`  
**Problema:** O campo de horário é um input de texto livre. O usuário deve digitar no formato exato `"1º Horário (07:00-07:50)"`. Se errar, o sistema de monitoramento quebra silenciosamente.

**Correção:** Substituir o `<input type="text">` por campos estruturados em cada linha de horário:
- Campo de nome livre (ex: "1º Horário", "Intervalo")  
- Input `type="time"` para hora início  
- Input `type="time"` para hora fim  

A função `saveHorarios()` deve montar a string no formato correto: `"${nome} (${inicio}-${fim})"` antes de salvar, eliminando erros de digitação.

---

### MELHORIA 6 — Relatórios: navegar redefine o mês selecionado

**Arquivo:** `js/script.js`, função `navigate()`  
**Problema:** A variável `window.selectedRelatorioMonth` (criada no BUG 1) deve ser resetada para `null` ao sair da tela de Relatórios, assim o mês atual é sempre o padrão ao entrar.

**Correção:** Adicionar no início de `navigate()`:
```javascript
function navigate(view) {
  if (view !== 'relatorio') window.selectedRelatorioMonth = null;
  selectedMonitorPeriod = null;
  // ... resto existente
}
```

---

## 📋 RESUMO — ORDEM DE IMPLEMENTAÇÃO

| Prioridade | Item | Arquivo | Tipo |
|---|---|---|---|
| 🔴 P1 | Criar `renderRelatorio()` + `exportCSV()` + `changeRelatorioMonth()` | script.js | Bug crítico |
| 🔴 P1 | Corrigir `toast()` para suportar `'warning'` (amber) | script.js | Bug |
| 🔴 P1 | Criar `confirmDeleteDevice()` + substituir chamada no botão | script.js | Bug |
| 🟠 P2 | Remover credenciais `admin123` do rodapé de Usuários | script.js | Segurança |
| 🟡 P3 | Botão atalho "Cadastrar primeiro carrinho" para admin | script.js | UX |
| 🟡 P3 | Minhas Reservas: adicionar aba Histórico | script.js | UX |
| 🟡 P3 | Modal de reserva: listar nomes dos períodos | script.js | UX |
| 🟡 P4 | Monitoramento: usar contagem real de dispositivos | script.js | UX |
| 🟡 P4 | Horários: campos estruturados com time pickers | script.js | UX |
| 🟡 P4 | `navigate()`: resetar mês do relatório ao sair | script.js | UX |

---

---

## 🔍 ACHADOS DA NAVEGAÇÃO NO SITE (https://adecompt.pages.dev)

---

### OBSERVAÇÃO 1 — Ícone da tela de login ausente (deploy pendente)

O ícone do monitor no topo da tela de login está sem renderizar (quadrado azul vazio). O fix já foi aplicado no código (`lucide.createIcons()` adicionado na `initApp()`), mas **aguarda novo deploy** para entrar em produção.

---

### OBSERVAÇÃO 2 — Botão de login sem feedback visual durante processamento

**Arquivo:** `js/script.js`, função `handleLogin()` e `index.html` (botão `#login-btn`)  
**Problema:** Ao clicar em "Entrar", o botão não muda de estado enquanto a autenticação Supabase está sendo processada. O usuário não sabe se o sistema está carregando ou travado. Em conexões lentas, isso gera cliques repetidos.

**Correção:** No início de `handleLogin()`, desabilitar o botão e mostrar "Entrando...". Ao final (sucesso ou erro), restaurar:

```javascript
async function handleLogin() {
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const pass = document.getElementById('login-pass').value;
  const errEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');

  if (!email || !pass) { errEl.textContent='Preencha todos os campos'; errEl.classList.remove('hidden'); return; }

  // Mostrar estado de carregamento
  btn.disabled = true;
  btn.textContent = 'Entrando...';
  btn.style.opacity = '0.7';
  errEl.classList.add('hidden');

  // ... resto do código de autenticação ...

  // Ao final (em todos os caminhos de erro), restaurar o botão:
  btn.disabled = false;
  btn.textContent = 'Entrar';
  btn.style.opacity = '1';
}
```

Certificar que o botão é restaurado em TODOS os caminhos: erro Supabase, perfil não encontrado, usuário inativo, erro legacy.

---

### OBSERVAÇÃO 3 — Credenciais legado `admin@escola.com/admin123` não funcionam em produção

**Problema:** Em produção o site usa Supabase auth. As credenciais `admin@escola.com / admin123` são um fallback apenas para o modo legado (Express). Mas o código mantém a lógica do fallback ativa e as credenciais hardcoded são exibidas no rodapé de Usuários (já endereçado na SEGURANÇA 1 acima). Além disso, se um usuário tenta fazer login com essas credenciais no modo Supabase, Supabase retorna erro e exibe "E-mail ou senha incorretos" — sem indicar que o problema é o modo de operação.

**Correção:** Remover completamente o bloco de login legado admin hardcoded (linhas ~360-367 do `handleLogin`):
```javascript
// REMOVER este bloco inteiro:
if (email === 'admin@escola.com' && pass === 'admin123') {
  currentUser = { name:'Administrador', email:'admin@escola.com', role:'admin' };
  saveSession();
  showMainApp();
  return;
}
```
Este código só é alcançado em `!isSupabaseMode()`, e manter credenciais hardcoded em código-fonte é má prática de segurança.

---

## Notas para o RooCode

- **Não criar novos arquivos** — todas as mudanças vão em `js/script.js` (e nenhuma em `index.html` desta vez)
- **Padrão visual**: dark theme — `bg-slate-900/800`, barras de progresso `bg-blue-500` / `bg-emerald-500`, botões `bg-blue-600`
- **Sempre chamar `lucide.createIcons()`** ao final de qualquer função que injeta HTML com ícones
- **`isAdmin()`** retorna `currentUser && currentUser.role === 'admin'` — usar para lógica condicional
- **`isSupabaseMode()`** deve ser verificado em qualquer interação com auth ou profiles
- Variáveis de estado globais ficam no topo do arquivo junto com `let allData`, `let currentUser`, etc.
