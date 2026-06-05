// ========== STATE ==========
export const state = {
  allData: [],
  currentUser: null,
  currentView: 'reservar',
  isLoading: false,
  isFormOpen: false,
  selectedMonitorPeriod: null,
  isRecoveryFlow: false,
  selectedDevices: new Set(),
  selectedRelatorioMonth: null,
  PERIODS: [
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
  ],
};
