// ========== ADMIN: HORÁRIOS ==========
import { state } from './state.js';
import { toast } from './helpers.js';
import { navigate } from './routing.js';

export function renderHorarios(c) {
  const configRecord = state.allData.find(d => d.config_key === 'school_periods');
  const currentPeriods = configRecord && configRecord.periods_json ? JSON.parse(configRecord.periods_json) : state.PERIODS;

  c.innerHTML = `
    <div class="fade-in max-w-4xl mx-auto">
      <div class="mb-6">
        <h2 class="text-xl font-bold flex items-center gap-2"><i data-lucide="clock" style="width:22px;height:22px;color:#3b82f6"></i> Configurar Horários da Escola</h2>
        <p class="text-slate-400 text-sm">Customize os horários de aula e intervalos</p>
      </div>

      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div id="periods-editor" class="space-y-3 mb-6 max-h-96 overflow-y-auto">
          ${currentPeriods.map((period, idx) => `
            <div class="flex items-end gap-2 bg-slate-800/50 p-3 rounded-lg">
              <div class="flex-1">
                <label class="block text-xs text-slate-400 mb-1">Horário ${idx + 1}</label>
                <input type="text" value="${period}" data-idx="${idx}" class="period-input w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500">
              </div>
              <button data-action="remove-period" data-idx="${idx}" class="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition">
                <i data-lucide="trash-2" style="width:16px;height:16px"></i>
              </button>
            </div>
          `).join('')}
        </div>

        <button data-action="add-new-period" class="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition mb-4 flex items-center justify-center gap-2">
          <i data-lucide="plus" style="width:16px;height:16px"></i> Adicionar Horário
        </button>

        <div class="border-t border-slate-700 pt-4 flex gap-2">
          <button data-action="save-horarios" class="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2">
            <i data-lucide="save" style="width:16px;height:16px"></i> Salvar Alterações
          </button>
          <button data-action="reset-horarios" class="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition">
            Resetar
          </button>
        </div>
      </div>

      <div class="mt-6 bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        <p class="text-xs text-slate-400 mb-2"><i data-lucide="info" style="width:14px;height:14px;display:inline;margin-right:6px"></i> Exemplo de formato:</p>
        <div class="text-xs text-slate-300 space-y-1">
          <p>✓ 1º Horário (07:00-07:50)</p>
          <p>✓ Intervalo (09:30-09:50)</p>
          <p>✓ 6º Horário (13:00-13:50)</p>
        </div>
      </div>
    </div>
  `;
  window.lucide?.createIcons();
}

export function addNewPeriod() {
  const editor = document.getElementById('periods-editor');
  const newIdx = document.querySelectorAll('.period-input').length;
  const div = document.createElement('div');
  div.className = 'flex items-end gap-2 bg-slate-800/50 p-3 rounded-lg fade-in';
  div.innerHTML = `
    <div class="flex-1">
      <label class="block text-xs text-slate-400 mb-1">Horário ${newIdx + 1}</label>
      <input type="text" data-idx="${newIdx}" placeholder="Ex: Horário (HH:MM-HH:MM)" class="period-input w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500" autofocus>
    </div>
    <button data-action="remove-new-period" class="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition">
      <i data-lucide="trash-2" style="width:16px;height:16px"></i>
    </button>
  `;
  editor.appendChild(div);
  window.lucide?.createIcons();
  div.querySelector('input').focus();
}

export function removePeriod(idx) {
  const inputs = document.querySelectorAll('.period-input');
  inputs[idx].parentElement.parentElement.remove();
}

export async function saveHorarios() {
  if (state.isLoading) return;
  state.isLoading = true;

  const inputs = document.querySelectorAll('.period-input');
  const newPeriods = Array.from(inputs).map(i => i.value.trim()).filter(v => v);

  if (newPeriods.length === 0) {
    state.isLoading = false;
    toast('Adicione pelo menos um horário.', 'error');
    return;
  }

  const periodFormat = /\(\d{2}:\d{2}-\d{2}:\d{2}\)/;
  const invalids = newPeriods.filter(p => !periodFormat.test(p));
  if (invalids.length > 0) {
    state.isLoading = false;
    toast(`❌ Formato inválido: "${invalids[0]}". Use: Nome (HH:MM-HH:MM)`, 'error');
    return;
  }

  const existingConfig = state.allData.find(d => d.config_key === 'school_periods');

  if (existingConfig) {
    const result = await window.dataSdk.update({
      ...existingConfig,
      periods_json: JSON.stringify(newPeriods)
    });
    state.isLoading = false;
    if (result.isOk) {
      state.PERIODS = newPeriods;
      toast('Horários atualizados com sucesso!');
    } else {
      toast('Erro ao salvar horários.', 'error');
    }
  } else {
    if (state.allData.length >= 999) {
      state.isLoading = false;
      toast('Limite de registros atingido.', 'error');
      return;
    }
    const result = await window.dataSdk.create({
      type: 'config',
      config_key: 'school_periods',
      periods_json: JSON.stringify(newPeriods),
      name: '', email: '', password: '', role: '', floor: '', cart_name: '',
      device_type: '', device_number: 0, device_brand: '', device_serial: '',
      cart_id: '', reserved_by: '', reserved_email: '', date: '',
      period: '', status: '', created_at: new Date().toISOString()
    });
    state.isLoading = false;
    if (result.isOk) {
      state.PERIODS = newPeriods;
      toast('Horários salvos com sucesso!');
    } else {
      toast('Erro ao salvar horários.', 'error');
    }
  }
}

export async function resetHorarios() {
  const defaultPeriods = [
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

  const existingConfig = state.allData.find(d => d.config_key === 'school_periods');

  if (existingConfig) {
    await window.dataSdk.delete(existingConfig);
  }

  state.PERIODS = defaultPeriods;
  toast('Horários resetados para o padrão.');
  navigate('horarios');
}
