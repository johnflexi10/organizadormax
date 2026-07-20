/* ==========================================================================
   ORGANIZAMAX 3D - GERENCIADOR DE ARMAZENAMENTO (LOCAL STORAGE)
   ========================================================================== */

const STORAGE_KEYS = {
  TRANSACTIONS: 'organizamax_transactions_v1',
  BILLS: 'organizamax_bills_v1',
  WISHLIST: 'organizamax_wishlist_v1',
  ACTIVITIES: 'organizamax_activities_v1',
  GOALS: 'organizamax_goals_v1',
  APPOINTMENTS: 'organizamax_appointments_v1',
  LEGO_PIECES: 'organizamax_lego_v1',
  STREAK: 'organizamax_streak_v1',
  LAST_RESET: 'organizamax_last_reset_v1'
};

// Dados Iniciais de Demonstração (Seed Data)
const INITIAL_DATA = {
  TRANSACTIONS: [
    { id: 'tx-1', type: 'receita', description: 'Saldo Inicial / Dinheiro em Caixa', amount: 4800.00, date: getFormattedDate(0), category: 'Trabalho' },
    { id: 'tx-2', type: 'despesa', description: 'Supermercado Mensal', amount: 850.00, date: getFormattedDate(-2), category: 'Alimentação' },
    { id: 'tx-3', type: 'despesa', description: 'Conta de Energia & Luz', amount: 210.50, date: getFormattedDate(-5), category: 'Moradia' },
    { id: 'tx-4', type: 'receita', description: 'Projeto Freelance UX', amount: 1200.00, date: getFormattedDate(-1), category: 'Trabalho' }
  ],
  BILLS: [
    { id: 'bill-1', title: 'Aluguel do Imóvel', amount: 1200.00, dueDate: getFormattedDate(5), category: 'Moradia', status: 'pendente' },
    { id: 'bill-2', title: 'Fatura Cartão de Crédito', amount: 450.00, dueDate: getFormattedDate(2), category: 'Cartão', status: 'pendente' },
    { id: 'bill-3', title: 'Internet Fibra 500MB', amount: 120.00, dueDate: getFormattedDate(-1), category: 'Serviços', status: 'pendente' }
  ],
  WISHLIST: [
    { id: 'w-1', title: 'Fone Bluetooth Noise Cancelling', price: 650.00, necessity: 'Útil', icon: '🎧', purchased: false },
    { id: 'w-2', title: 'Cadeira Ergonômica 3D', price: 1450.00, necessity: 'Essencial', icon: '🪑', purchased: false },
    { id: 'w-3', title: 'Jogo de Videogame Lançamento', price: 350.00, necessity: 'Supérfluo', icon: '🎮', purchased: false }
  ],
  ACTIVITIES: [
    { id: 'act-1', title: 'Finalizar Relatório de Desempenho', dueDate: getFormattedDate(0), effort: 'Médio (1h)', category: 'Trabalho', status: 'pendente' },
    { id: 'act-2', title: 'Revisar conteúdo de estudos', dueDate: getFormattedDate(1), effort: 'Rápido (15 min)', category: 'Estudo', status: 'pendente' },
    { id: 'act-3', title: 'Organizar pasta de documentos antigos', dueDate: getFormattedDate(-2), effort: 'Longo (+2h)', category: 'Pessoal', status: 'pendente' }
  ],
  GOALS: [
    { id: 'g-1', title: 'Beber 2L de Água (8 Copos)', icon: '💧', totalSteps: 8, currentSteps: 4, completed: false },
    { id: 'g-2', title: 'Fazer 30min de Exercício', icon: '🏃', totalSteps: 1, currentSteps: 0, completed: false },
    { id: 'g-3', title: 'Ler 20 páginas de um Livro (5 Blocos)', icon: '📖', totalSteps: 5, currentSteps: 2, completed: false },
    { id: 'g-4', title: 'Meditar por 10 minutos', icon: '🧘', totalSteps: 1, currentSteps: 1, completed: true },
    { id: 'g-5', title: 'Estudar ou codificar por 1 hora', icon: '🧠', totalSteps: 1, currentSteps: 0, completed: false }
  ],
  APPOINTMENTS: [
    { id: 'app-1', title: 'Reunião de Alinhamento Semanal', date: getFormattedDate(0), time: '14:30', location: 'Google Meet', type: 'Trabalho' },
    { id: 'app-2', title: 'Consulta de Rotina Médica', date: getFormattedDate(2), time: '09:00', location: 'Clínica Vida', type: 'Saúde' },
    { id: 'app-3', title: 'Jantar com Amigos', date: getFormattedDate(4), time: '20:00', location: 'Restaurante Central', type: 'Social' }
  ],
  LEGO_PIECES: [
    { id: 'lego-1', title: 'Edição de Vídeo Canal', stage: 'execucao', date: getFormattedDate(2), notes: 'Cortar cenas iniciais, colocar vinheta 3D e ajustar áudio.', color: 'indigo', targetMinutes: 60, elapsedSeconds: 900, activeTimer: false, pinned: true },
    { id: 'lego-2', title: 'Roteiro de Novo Conteúdo', stage: 'ideias', date: getFormattedDate(5), notes: 'Ideias de tópicos para tutoriais e tutoriais rápidos.', color: 'amber', targetMinutes: 45, elapsedSeconds: 0, activeTimer: false, pinned: false },
    { id: 'lego-3', title: 'Revisão de Capa / Thumbnail', stage: 'revisao', date: getFormattedDate(1), notes: 'Ajustar contraste e texto de destaque na imagem.', color: 'rose', targetMinutes: 30, elapsedSeconds: 0, activeTimer: false, pinned: false },
    { id: 'lego-4', title: 'Publicação no Canal', stage: 'concluido', date: getFormattedDate(-1), notes: 'Vídeo publicado e compartilhado nas redes.', color: 'emerald', targetMinutes: 20, elapsedSeconds: 1200, activeTimer: false, pinned: false }
  ]
};

// Auxiliar de Data
function getFormattedDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Métodos do Storage Manager
const StorageManager = {
  get(key, defaultVal = []) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultVal;
    } catch (e) {
      console.error(`Erro ao carregar chave ${key}:`, e);
      return defaultVal;
    }
  },

  set(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.error(`Erro ao salvar chave ${key}:`, e);
    }
  },

  init() {
    if (!localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) {
      this.set(STORAGE_KEYS.TRANSACTIONS, INITIAL_DATA.TRANSACTIONS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.BILLS)) {
      this.set(STORAGE_KEYS.BILLS, INITIAL_DATA.BILLS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.WISHLIST)) {
      this.set(STORAGE_KEYS.WISHLIST, INITIAL_DATA.WISHLIST);
    }
    if (!localStorage.getItem(STORAGE_KEYS.ACTIVITIES)) {
      this.set(STORAGE_KEYS.ACTIVITIES, INITIAL_DATA.ACTIVITIES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.GOALS)) {
      this.set(STORAGE_KEYS.GOALS, INITIAL_DATA.GOALS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.APPOINTMENTS)) {
      this.set(STORAGE_KEYS.APPOINTMENTS, INITIAL_DATA.APPOINTMENTS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.LEGO_PIECES)) {
      this.set(STORAGE_KEYS.LEGO_PIECES, INITIAL_DATA.LEGO_PIECES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.STREAK)) {
      this.set(STORAGE_KEYS.STREAK, 1);
    }

    const today = getFormattedDate(0);
    const lastReset = localStorage.getItem(STORAGE_KEYS.LAST_RESET);
    if (lastReset !== today) {
      const goals = this.get(STORAGE_KEYS.GOALS);
      const updatedGoals = goals.map(g => ({ ...g, currentSteps: 0, completed: false }));
      this.set(STORAGE_KEYS.GOALS, updatedGoals);
      localStorage.setItem(STORAGE_KEYS.LAST_RESET, today);
    }
  }
};

StorageManager.init();
