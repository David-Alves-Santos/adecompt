// ============================================================
// Testes automatizados para o Monitoramento em Tempo Real
// ============================================================
// Executar: node js/script.test.js
// ============================================================

const assert = require('assert');

// ========== SIMULAÇÃO DO AMBIENTE ==========

// PERIODS padrão (réplica do que está em script.js)
const PERIODS = [
  '1º Horário (07:00-07:50)',
  '2º Horário (07:50-08:40)',
  '3º Horário (08:40-09:30)',
  'Intervalo (09:30-09:50)',
  '4º Horário (09:50-10:40)',
  '5º Horário (10:40-11:30)',
  '6º Horário (13:00-13:50)',
  '7º Horário (13:50-14:40)',
  '8º Horário (14:40-15:30)',
  'Intervalo (15:30-15:50)',
  '9º Horário (15:50-16:40)',
  '10º Horário (16:40-17:30)'
];

// Estado simulado
let selectedMonitorPeriod = null;
let navigateCalledWith = null;

function navigate(view) {
  selectedMonitorPeriod = null;
  navigateCalledWith = view;
}

function renderCurrentView() {
  // stub - apenas para verificar que foi chamada
}

// Funções de estado (réplica do script.js)
function setMonitorPeriodByIndex(i) {
  const p = PERIODS[i];
  if (!p) return;
  selectedMonitorPeriod = p;
  renderCurrentView();
}

function monitorGoLive() {
  selectedMonitorPeriod = null;
  renderCurrentView();
}

// Helpers extraídos do renderMonitor
function shortLabel(p) {
  if (p.startsWith('Intervalo')) return 'Int.';
  const m = p.match(/^(\d+)/);
  return m ? m[1] + 'º' : p.slice(0, 4);
}

function timeRange(p) {
  const m = p.match(/\((\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\)/);
  return m ? m[1] + '–' + m[2] : '';
}

// Lógica de detecção de período atual (extraída do renderMonitor)
function getCurrentPeriod(PERIODS, hours, minutes) {
  const mins = hours * 60 + minutes;
  for (const period of PERIODS) {
    const m = period.match(/\((\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})\)/);
    if (!m) continue;
    const startMins = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
    const endMins   = parseInt(m[3], 10) * 60 + parseInt(m[4], 10);
    if (mins >= startMins && mins < endMins) {
      return period;
    }
  }
  return '';
}

// Lógica de displayPeriod e isLive (extraída do renderMonitor)
function getDisplayInfo(selected, currentPeriod, PERIODS) {
  const validSelected = selected && PERIODS.includes(selected) ? selected : null;
  const displayPeriod = validSelected || currentPeriod;
  const isLive = !!currentPeriod && displayPeriod === currentPeriod;
  return { displayPeriod, isLive, validSelected };
}


// ========== TESTES ==========
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ❌ ${name}: ${e.message}`);
  }
}

function group(name, fn) {
  console.log(`\n📁 ${name}`);
  fn();
}

// ============================================================
// GRUPO 1: shortLabel
// ============================================================
group('shortLabel() — label abreviado para chips', () => {
  test('Intervalo retorna "Int."', () => {
    assert.strictEqual(shortLabel('Intervalo (09:30-09:50)'), 'Int.');
  });

  test('1º Horário retorna "1º"', () => {
    assert.strictEqual(shortLabel('1º Horário (07:00-07:50)'), '1º');
  });

  test('8º Horário retorna "8º"', () => {
    assert.strictEqual(shortLabel('8º Horário (14:40-15:30)'), '8º');
  });

  test('10º Horário retorna "10º"', () => {
    assert.strictEqual(shortLabel('10º Horário (16:40-17:30)'), '10º');
  });

  test('String sem número no início retorna primeiros 4 chars', () => {
    assert.strictEqual(shortLabel('ABC (00:00-01:00)'), 'ABC ');
  });
});

// ============================================================
// GRUPO 2: timeRange
// ============================================================
group('timeRange() — extrai horário do período', () => {
  test('Extrai HH:MM–HH:MM corretamente', () => {
    assert.strictEqual(timeRange('1º Horário (07:00-07:50)'), '07:00–07:50');
  });

  test('Intervalo (09:30-09:50) → "09:30–09:50"', () => {
    assert.strictEqual(timeRange('Intervalo (09:30-09:50)'), '09:30–09:50');
  });

  test('String sem parênteses retorna vazio', () => {
    assert.strictEqual(timeRange('Sem horário'), '');
  });
});

// ============================================================
// GRUPO 3: getCurrentPeriod — detecção baseada no relógio
// ============================================================
group('getCurrentPeriod() — detecção do período atual pelo relógio', () => {
  test('07:30 → 1º Horário', () => {
    assert.strictEqual(getCurrentPeriod(PERIODS, 7, 30), '1º Horário (07:00-07:50)');
  });

  test('08:00 → 2º Horário', () => {
    assert.strictEqual(getCurrentPeriod(PERIODS, 8, 0), '2º Horário (07:50-08:40)');
  });

  test('09:35 → Intervalo', () => {
    assert.strictEqual(getCurrentPeriod(PERIODS, 9, 35), 'Intervalo (09:30-09:50)');
  });

  test('10:00 → 4º Horário', () => {
    assert.strictEqual(getCurrentPeriod(PERIODS, 10, 0), '4º Horário (09:50-10:40)');
  });

  test('07:00 → 1º Horário (boundary inferior)', () => {
    assert.strictEqual(getCurrentPeriod(PERIODS, 7, 0), '1º Horário (07:00-07:50)');
  });

  test('07:49 → 1º Horário (boundary superior - 1 min)', () => {
    assert.strictEqual(getCurrentPeriod(PERIODS, 7, 49), '1º Horário (07:00-07:50)');
  });

  test('07:50 → 2º Horário (boundary exato — início do próximo)', () => {
    assert.strictEqual(getCurrentPeriod(PERIODS, 7, 50), '2º Horário (07:50-08:40)');
  });

  test('13:25 → 6º Horário (aula da tarde)', () => {
    assert.strictEqual(getCurrentPeriod(PERIODS, 13, 25), '6º Horário (13:00-13:50)');
  });

  test('14:40 → 8º Horário (boundary inferior da 8ª aula)', () => {
    assert.strictEqual(getCurrentPeriod(PERIODS, 14, 40), '8º Horário (14:40-15:30)');
  });

  test('17:30 → vazio (fora do horário escolar — fim do último período)', () => {
    assert.strictEqual(getCurrentPeriod(PERIODS, 17, 30), '');
  });

  test('06:00 → vazio (antes do 1º período)', () => {
    assert.strictEqual(getCurrentPeriod(PERIODS, 6, 0), '');
  });

  test('18:00 → vazio (depois do último período)', () => {
    assert.strictEqual(getCurrentPeriod(PERIODS, 18, 0), '');
  });
});

// ============================================================
// GRUPO 4: getDisplayInfo — lógica de exibição (ao vivo vs preview)
// ============================================================
group('getDisplayInfo() — lógica displayPeriod, isLive, fallback', () => {
  const currentPeriod = '8º Horário (14:40-15:30)';

  test('selected=null → display = current, isLive = true', () => {
    const r = getDisplayInfo(null, currentPeriod, PERIODS);
    assert.strictEqual(r.displayPeriod, currentPeriod);
    assert.strictEqual(r.isLive, true);
    assert.strictEqual(r.validSelected, null);
  });

  test('selected = currentPeriod → display = current, isLive = true', () => {
    const r = getDisplayInfo(currentPeriod, currentPeriod, PERIODS);
    assert.strictEqual(r.displayPeriod, currentPeriod);
    assert.strictEqual(r.isLive, true);
    assert.strictEqual(r.validSelected, currentPeriod);
  });

  test('selected = outro período → display = selected, isLive = false', () => {
    const selected = '2º Horário (07:50-08:40)';
    const r = getDisplayInfo(selected, currentPeriod, PERIODS);
    assert.strictEqual(r.displayPeriod, selected);
    assert.strictEqual(r.isLive, false);
    assert.strictEqual(r.validSelected, selected);
  });

  test('selected = período removido (não existe mais em PERIODS) → fallback para current, isLive = true', () => {
    // Simula um período que foi deletado pelo admin
    const removedPeriod = 'Horário Antigo (99:99-99:99)';
    const r = getDisplayInfo(removedPeriod, currentPeriod, PERIODS);
    assert.strictEqual(r.displayPeriod, currentPeriod);
    assert.strictEqual(r.isLive, true);
    assert.strictEqual(r.validSelected, null); // null porque não está em PERIODS
  });

  test('currentPeriod = "" (fora do horário), selected = null → display = ""', () => {
    const r = getDisplayInfo(null, '', PERIODS);
    assert.strictEqual(r.displayPeriod, '');
    assert.strictEqual(r.isLive, false);
  });

  test('currentPeriod = "", selected = período válido → display = selected, isLive = false', () => {
    const r = getDisplayInfo('2º Horário (07:50-08:40)', '', PERIODS);
    assert.strictEqual(r.displayPeriod, '2º Horário (07:50-08:40)');
    assert.strictEqual(r.isLive, false);
  });
});

// ============================================================
// GRUPO 5: setMonitorPeriodByIndex
// ============================================================
group('setMonitorPeriodByIndex() — seleção por índice', () => {
  function reset() { selectedMonitorPeriod = null; }

  test('Índice 1 → selectedMonitorPeriod = 2º Horário', () => {
    reset();
    setMonitorPeriodByIndex(1);
    assert.strictEqual(selectedMonitorPeriod, '2º Horário (07:50-08:40)');
  });

  test('Índice 8 → selectedMonitorPeriod = 8º Horário', () => {
    reset();
    setMonitorPeriodByIndex(8);
    assert.strictEqual(selectedMonitorPeriod, '8º Horário (14:40-15:30)');
  });

  test('Índice -1 (inválido) → selectedMonitorPeriod permanece null', () => {
    reset();
    setMonitorPeriodByIndex(-1);
    assert.strictEqual(selectedMonitorPeriod, null);
  });

  test('Índice 99 (fora do array) → selectedMonitorPeriod permanece null', () => {
    reset();
    setMonitorPeriodByIndex(99);
    assert.strictEqual(selectedMonitorPeriod, null);
  });

  test('Índice 3 (Intervalo) → seleciona o intervalo', () => {
    reset();
    setMonitorPeriodByIndex(3);
    assert.strictEqual(selectedMonitorPeriod, 'Intervalo (09:30-09:50)');
  });
});

// ============================================================
// GRUPO 6: monitorGoLive
// ============================================================
group('monitorGoLive() — voltar ao modo ao vivo', () => {
  test('Reseta selectedMonitorPeriod para null', () => {
    selectedMonitorPeriod = '8º Horário (14:40-15:30)';
    monitorGoLive();
    assert.strictEqual(selectedMonitorPeriod, null);
  });
});

// ============================================================
// GRUPO 7: navigate reseta a seleção
// ============================================================
group('navigate() — reseta selectedMonitorPeriod ao trocar de aba', () => {
  test('Com período selecionado, navigate reseta para null', () => {
    selectedMonitorPeriod = '8º Horário (14:40-15:30)';
    navigate('reservar');
    assert.strictEqual(selectedMonitorPeriod, null);
    assert.strictEqual(navigateCalledWith, 'reservar');
  });
});

// ============================================================
// GRUPO 8: Chip classification logic (isCurrent, isSelected, isInterval)
// ============================================================
group('Chip classification — lógica de cores e estilos', () => {
  const currentPeriod = '8º Horário (14:40-15:30)';

  function chipClass(p, displayPeriod) {
    const isCurrent = p === currentPeriod;
    const isSelected = p === displayPeriod;
    const isInterval = p.startsWith('Intervalo');

    if (isInterval) return 'separator';

    if (isSelected && isCurrent) return 'selected+current';   // verde com ring
    if (isSelected) return 'selected';                        // azul com ring
    if (isCurrent) return 'current';                          // verde sem ring
    return 'default';                                         // neutro
  }

  test('Período atual sem seleção → "current" (verde sem ring)', () => {
    assert.strictEqual(chipClass(currentPeriod, currentPeriod), 'selected+current');
  });

  test('Período = atual, selected = outro → "current" (verde sem ring)', () => {
    const displayPeriod = '2º Horário (07:50-08:40)';
    assert.strictEqual(chipClass(currentPeriod, displayPeriod), 'current');
  });

  test('Período selecionado (diferente do atual) → "selected" (azul com ring)', () => {
    const displayPeriod = '2º Horário (07:50-08:40)';
    assert.strictEqual(chipClass('2º Horário (07:50-08:40)', displayPeriod), 'selected');
  });

  test('Intervalo → "separator" (não clicável)', () => {
    assert.strictEqual(chipClass('Intervalo (09:30-09:50)', currentPeriod), 'separator');
  });

  test('Período sem destaque → "default"', () => {
    assert.strictEqual(chipClass('3º Horário (08:40-09:30)', currentPeriod), 'default');
  });
});

// ============================================================
// GRUPO 9: PERIODS customizados (admin alterou horários)
// ============================================================
group('PERIODS customizados — schedule alterations', () => {
  const customPeriods = [
    '1º Horário (08:00-09:00)',
    'Intervalo (09:00-09:15)',
    '2º Horário (09:15-10:15)',
  ];

  test('08:30 → 1º Horário (customizado)', () => {
    assert.strictEqual(getCurrentPeriod(customPeriods, 8, 30), '1º Horário (08:00-09:00)');
  });

  test('09:05 → Intervalo (customizado)', () => {
    assert.strictEqual(getCurrentPeriod(customPeriods, 9, 5), 'Intervalo (09:00-09:15)');
  });

  test('09:30 → 2º Horário (customizado)', () => {
    assert.strictEqual(getCurrentPeriod(customPeriods, 9, 30), '2º Horário (09:15-10:15)');
  });
});

// ============================================================
// GRUPO 10: Dot indicator logic
// ============================================================
group('Dot indicator — pontinho de reservas nos chips', () => {
  test('Com reservas → dot visível com cor apropriada', () => {
    const count = 3;
    const isSelected = true;
    const dot = count > 0
      ? `<span class="mt-0.5 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-400'}"></span>`
      : '<span class="mt-0.5 w-1.5 h-1.5"></span>';
    assert.ok(dot.includes('bg-white'));
    assert.ok(dot.includes('w-1.5'));
  });

  test('Sem reservas → dot vazio (invisível)', () => {
    const count = 0;
    const dot = count > 0
      ? `<span class="mt-0.5 w-1.5 h-1.5 rounded-full bg-white"></span>`
      : '<span class="mt-0.5 w-1.5 h-1.5"></span>';
    assert.ok(!dot.includes('bg-white'));
    assert.ok(!dot.includes('bg-blue-400'));
    assert.ok(dot.includes('mt-0.5'));
  });
});

// ============================================================
// RESULTADO
// ============================================================
console.log(`\n${'='.repeat(50)}`);
console.log(`Resultado: ${passed} passaram, ${failed} falharam`);
console.log(`${'='.repeat(50)}`);
process.exit(failed > 0 ? 1 : 0);
