# Brief: corrigir UX do painel "Monitoramento em Tempo Real"

## 1. Contexto do projeto

Sistema web de **Reserva de Computadores** para uso escolar (vanilla JS + HTML, sem framework). O código vive em um arquivo único: `js/script.js`. A renderização é toda feita por funções `renderXxx(c)` que injetam HTML em `#main-content` via `innerHTML`. O fluxo padrão de re-render é chamar `renderCurrentView()`.

## 2. O bug (problema de UX)

A tela **"Monitoramento em Tempo Real"** (função `renderMonitor` em `js/script.js`) hoje só mostra a aula que está acontecendo agora — o período é calculado a partir do relógio do sistema:

```js
const now = new Date();
const mins = now.getHours() * 60 + now.getMinutes();
let currentPeriod = '';
for (const period of PERIODS) {
  const m = period.match(/\((\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})\)/);
  if (!m) continue;
  const startMins = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  const endMins   = parseInt(m[3], 10) * 60 + parseInt(m[4], 10);
  if (mins >= startMins && mins < endMins) {
    currentPeriod = period;
    break;
  }
}
```

E o filtro das reservas exibidas é cravado nessa única variável:

```js
const cartRes = todayRes.filter(r =>
  r.cart_name === ct.cart_name &&
  (currentPeriod ? r.period === currentPeriod : true)
);
```

**Consequência:** o administrador não consegue ver quem reservou na 8ª aula enquanto está vendo o monitor às 13:30 (que está na 6ª aula). Não há seletor, dropdown, botões de avançar/voltar nem qualquer mecanismo na tela — a interface é estática, presa ao `Date()`. Para um painel administrativo escolar, precisa-se de uma **visão preditiva do dia inteiro**.

## 3. Solução desejada (nível completo)

Uma **timeline horizontal** no topo do painel com **chips/abas** representando cada período do dia. Comportamento:

- A aula atual (segundo o relógio) deve ser destacada em **verde** — sempre, mesmo quando outra está selecionada.
- A aula selecionada (quando diferente da atual) deve ficar em **azul** com um anel (`ring`).
- Chips com reservas existentes no dia devem ter um **pontinho indicador** abaixo.
- Períodos do tipo "Intervalo" devem aparecer como **separadores visuais não clicáveis** (não recebem reservas).
- Clicar em uma chip filtra o painel inteiro (cards de carrinho, estatísticas e listas de "em uso") para mostrar a ocupação daquela aula.
- Um botão **"Voltar para Agora"** aparece quando o usuário não está vendo o tempo real.
- O cabeçalho mostra um badge `[AGORA]` (verde) quando ao vivo ou `[PRÉ-VISUALIZAÇÃO]` (azul) quando navegando.
- Stat cards e labels adaptativos: "Dispositivos em Uso" vira "Reservas no período"; "Em uso agora:" vira "Reservas neste período:".
- Ao trocar de aba e voltar, o painel sempre reinicia em modo ao vivo.
- A timeline deve ter `overflow-x-auto` para responsividade mobile.

## 4. Passo a passo da implementação

O arquivo a editar é `js/script.js`. As três mudanças abaixo são tudo o que é necessário.

### Passo 4.1 — Adicionar estado global

No bloco `// ========== STATE ==========` no topo do arquivo (por volta da linha 1–6), adicionar uma nova variável após `let isFormOpen = false;`:

```js
// Período selecionado na tela de Monitoramento. `null` = seguir o relógio (modo "ao vivo").
let selectedMonitorPeriod = null;
```

### Passo 4.2 — Resetar a seleção ao navegar

Localizar a função `navigate(view)` (atualmente algo como):

```js
function navigate(view) {
  currentView = view;
  buildNav();
  renderCurrentView();
}
```

Substituir por:

```js
function navigate(view) {
  // Ao trocar de aba, sempre voltamos o Monitoramento ao modo "ao vivo".
  // Assim o usuário não fica preso a um período antigo se sair e voltar à tela.
  selectedMonitorPeriod = null;
  currentView = view;
  buildNav();
  renderCurrentView();
}
```

### Passo 4.3 — Substituir a função `renderMonitor` inteira e adicionar dois helpers

Localizar a função `function renderMonitor(c) { ... }` e **substituir tudo, do `function renderMonitor` até o `}` final**, pelo bloco abaixo (que já inclui os dois helpers `setMonitorPeriodByIndex` e `monitorGoLive`):

```js
function renderMonitor(c) {
  const today = todayStr();
  const carts = getCarts();
  const todayRes = getReservations().filter(r => r.date === today && r.status === 'active');


  // Figure out current period — derived dynamically from PERIODS strings
  // so it stays correct when the school customizes its schedule via the
  // "Horários" admin panel. Each period label is expected to contain a
  // (HH:MM-HH:MM) range; periods without that pattern are skipped.
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  let currentPeriod = '';
  for (const period of PERIODS) {
    const m = period.match(/\((\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})\)/);
    if (!m) continue;
    const startMins = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
    const endMins   = parseInt(m[3], 10) * 60 + parseInt(m[4], 10);
    if (mins >= startMins && mins < endMins) {
      currentPeriod = period;
      break;
    }
  }

  // Período exibido — segue o relógio se o usuário não escolheu outro.
  // Se o período selecionado não existir mais (ex: admin removeu horários),
  // fazemos fallback gracioso para o período atual.
  const validSelected = selectedMonitorPeriod && PERIODS.includes(selectedMonitorPeriod)
    ? selectedMonitorPeriod : null;
  const displayPeriod = validSelected || currentPeriod;
  const isLive = !!currentPeriod && displayPeriod === currentPeriod;

  // Helpers visuais p/ chips da timeline.
  function shortLabel(p) {
    if (p.startsWith('Intervalo')) return 'Int.';
    const m = p.match(/^(\d+)/);
    return m ? m[1] + 'º' : p.slice(0, 4);
  }
  function timeRange(p) {
    const m = p.match(/\((\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\)/);
    return m ? m[1] + '–' + m[2] : '';
  }

  // Contagem de reservas por período (para o pontinho indicador nos chips).
  const resByPeriod = {};
  todayRes.forEach(r => { resByPeriod[r.period] = (resByPeriod[r.period] || 0) + 1; });

  // Timeline horizontal — uma "chip" por período no dia.
  const timelineHtml = PERIODS.map((p, i) => {
    const isCurrent = p === currentPeriod;
    const isSelected = p === displayPeriod;
    const isInterval = p.startsWith('Intervalo');
    const count = resByPeriod[p] || 0;

    if (isInterval) {
      // Intervalos: separador visual, não clicáveis (não recebem reservas na prática).
      return `
        <div class="flex-shrink-0 flex flex-col items-center justify-center px-2 py-2 text-slate-500 select-none" title="${p}">
          <span class="text-[10px] uppercase tracking-wider">int.</span>
          <span class="text-[10px] text-slate-600">${timeRange(p)}</span>
        </div>`;
    }

    const baseCls = 'flex-shrink-0 flex flex-col items-center px-3 py-1.5 rounded-lg transition cursor-pointer border min-w-[62px]';
    let cls = 'border-slate-700 bg-slate-800/40 text-slate-300 hover:bg-slate-700/60';
    if (isSelected && isCurrent) {
      cls = 'border-emerald-400 bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/60';
    } else if (isSelected) {
      cls = 'border-blue-400 bg-blue-500/20 text-blue-100 ring-1 ring-blue-400/60';
    } else if (isCurrent) {
      cls = 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20';
    }

    const dot = count > 0
      ? `<span class="mt-0.5 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : (isCurrent ? 'bg-emerald-300' : 'bg-blue-400')}"></span>`
      : '<span class="mt-0.5 w-1.5 h-1.5"></span>';

    return `
      <button onclick="setMonitorPeriodByIndex(${i})" class="${baseCls} ${cls}" title="${p}${count?' — '+count+' reserva(s)':''}">
        <span class="font-semibold text-xs leading-tight">${shortLabel(p)}</span>
        <span class="text-[10px] opacity-70 leading-tight">${timeRange(p)}</span>
        ${dot}
      </button>`;
  }).join('');


  c.innerHTML = `
    <div class="fade-in max-w-6xl mx-auto">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-xl font-bold flex items-center gap-2"><i data-lucide="activity" style="width:22px;height:22px;color:#3b82f6"></i> Monitoramento em Tempo Real</h2>
          <p class="text-slate-400 text-sm">
            ${new Date().toLocaleDateString('pt-BR')}
            ${displayPeriod ? '— '+displayPeriod : ''}
            ${displayPeriod ? (isLive
                ? '<span class="ml-2 text-[10px] uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">Agora</span>'
                : '<span class="ml-2 text-[10px] uppercase tracking-wider bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">Pré-visualização</span>'
              ) : ''}
          </p>
        </div>
        <span class="flex items-center gap-1 text-xs text-emerald-400"><span class="w-2 h-2 rounded-full bg-emerald-400 pulse-dot inline-block"></span> Online</span>
      </div>

      <!-- TIMELINE: mapa do dia inteiro -->
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-3 mb-6">
        <div class="flex items-center justify-between mb-2 px-1 flex-wrap gap-2">
          <span class="text-xs text-slate-400 font-medium">Mapa do dia — clique em uma aula para visualizar a ocupação</span>
          ${!isLive && currentPeriod ? '<button onclick="monitorGoLive()" class="text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-3 py-1 rounded-lg flex items-center gap-1 transition"><i data-lucide="radio" style="width:12px;height:12px"></i> Voltar para Agora</button>' : ''}
        </div>
        <div class="flex items-stretch gap-1.5 overflow-x-auto pb-1">
          ${timelineHtml}
        </div>
        <div class="flex items-center gap-3 text-[10px] text-slate-500 mt-2 px-1 flex-wrap">
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-emerald-500/40 border border-emerald-400"></span> aula atual</span>
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-blue-500/40 border border-blue-400"></span> selecionado</span>
          <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-blue-400"></span> tem reservas</span>
        </div>
      </div>


      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div class="stat-card border border-slate-800 rounded-xl p-4">
          <p class="text-xs text-slate-400">Total Reservas Hoje</p>
          <p class="text-2xl font-bold text-white">${todayRes.length}</p>
        </div>
        <div class="stat-card border border-slate-800 rounded-xl p-4">
          <p class="text-xs text-slate-400">Carrinhos Ativos</p>
          <p class="text-2xl font-bold text-white">${new Set(todayRes.map(r=>r.cart_name)).size}/${carts.length}</p>
        </div>
        <div class="stat-card border border-slate-800 rounded-xl p-4">
          <p class="text-xs text-slate-400">${isLive ? 'Dispositivos em Uso' : 'Reservas no período'}</p>
          <p class="text-2xl font-bold text-white">${displayPeriod ? todayRes.filter(r=>r.period===displayPeriod).length : 0}</p>
        </div>
        <div class="stat-card border border-slate-800 rounded-xl p-4">
          <p class="text-xs text-slate-400">Professores</p>
          <p class="text-2xl font-bold text-white">${new Set(todayRes.map(r=>r.reserved_email)).size}</p>
        </div>
      </div>


      ${carts.map(ct => {
        const cartRes = todayRes.filter(r => r.cart_name === ct.cart_name && (displayPeriod ? r.period === displayPeriod : true));
        const reservedNums = new Set(cartRes.map(r => r.device_number));
        return `
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-semibold text-white">${ct.cart_name} <span class="text-slate-400 text-xs font-normal">${ct.floor} — ${ct.device_type}</span></h3>
            <span class="text-xs text-slate-400">${reservedNums.size}/40 ${isLive ? 'em uso' : 'reservados'}</span>
          </div>
          <div class="grid grid-cols-8 sm:grid-cols-10 gap-1">
            ${Array.from({length:40},(_,i)=>i+1).map(n => {
              const res = cartRes.find(r=>r.device_number===n);
              return `<div class="rounded-lg p-1 text-center text-xs ${res?'bg-red-500/20 text-red-400 border border-red-500/30':'bg-blue-500/10 text-blue-400/60 border border-slate-800'}" title="${res?res.reserved_by+' — '+res.period:ct.device_type+' #'+n+' disponível'}">${n}</div>`;
            }).join('')}
          </div>
          ${cartRes.length > 0 ? `
          <div class="mt-3 border-t border-slate-800 pt-3">
            <p class="text-xs text-slate-400 mb-2">${isLive ? 'Em uso agora:' : 'Reservas neste período:'}</p>
            <div class="space-y-1">
              ${[...new Set(cartRes.map(r=>r.reserved_email))].map(email => {
                const userRes = cartRes.filter(r=>r.reserved_email===email);
                return `<div class="flex items-center justify-between text-xs bg-slate-800/50 rounded-lg px-3 py-2">
                  <span class="text-white">${userRes[0].reserved_by}</span>
                  <span class="text-slate-400">Dispositivos: ${userRes.map(r=>'#'+r.device_number).join(', ')}</span>
                </div>`;
              }).join('')}
            </div>
          </div>` : ''}
        </div>`;
      }).join('')}
    </div>
  `;
}


// Trocar o período exibido no Monitoramento. Usamos índice em PERIODS p/
// evitar problemas de escape no `onclick` (os rótulos contêm parênteses).
function setMonitorPeriodByIndex(i) {
  const p = PERIODS[i];
  if (!p) return;
  selectedMonitorPeriod = p;
  renderCurrentView();
}

// Voltar ao modo "tempo real": volta a seguir o relógio.
function monitorGoLive() {
  selectedMonitorPeriod = null;
  renderCurrentView();
}
```

## 5. Notas técnicas importantes

- **Por que passar índice em vez do texto do período no `onclick`?** Os rótulos em `PERIODS` contêm parênteses e podem conter aspas/caracteres especiais. Passar o índice (`setMonitorPeriodByIndex(${i})`) evita problemas de escape no HTML inline.

- **`renderCurrentView()` já chama `lucide.createIcons()` no final.** Não precisa chamar dentro de `renderMonitor`. O ícone novo `radio` (no botão "Voltar para Agora") será renderizado automaticamente.

- **Fallback gracioso:** se um admin remover um período do `PERIODS` enquanto alguém estava com ele selecionado, a verificação `PERIODS.includes(selectedMonitorPeriod)` faz o painel voltar suavemente ao período atual em vez de quebrar.

- **`onDataChanged` (refresh automático de dados) chama `renderCurrentView()`.** Como `selectedMonitorPeriod` é estado global preservado entre renders, a seleção do usuário **não** é perdida quando chegam dados novos do backend — apenas quando ele troca de aba.

## 6. Validação

Depois de aplicar, rodar:

```bash
node --check js/script.js
```

Esperado: nenhum erro.

**Teste manual:**
1. Criar uma reserva para uma aula futura (ex: 8ª aula) hoje.
2. Ir ao painel Monitoramento. Verificar que a aula atual aparece em verde com badge `[AGORA]`.
3. Clicar na chip "8º" — o cabeçalho deve mudar para `[PRÉ-VISUALIZAÇÃO]`, o card do carrinho deve mostrar o dispositivo reservado, e o botão "Voltar para Agora" deve aparecer.
4. Clicar em "Voltar para Agora" — tudo volta ao estado original.
5. Trocar de aba (ex: Reservar) e voltar a Monitoramento — deve estar em modo ao vivo novamente.
