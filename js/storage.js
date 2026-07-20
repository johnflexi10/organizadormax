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

// Dados Iniciais Zerados (Carro 0km - Sem simulações)
const INITIAL_DATA = {
  TRANSACTIONS: [],
  BILLS: [],
  WISHLIST: [],
  ACTIVITIES: [],
  GOALS: [],
  APPOINTMENTS: [],
  LEGO_PIECES: []
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

  resetToZeroKM() {
    Object.keys(STORAGE_KEYS).forEach(k => {
      localStorage.removeItem(STORAGE_KEYS[k]);
    });
    this.init(true);
  },

  init(forceClean = false) {
    if (forceClean) {
      this.set(STORAGE_KEYS.TRANSACTIONS, INITIAL_DATA.TRANSACTIONS);
      this.set(STORAGE_KEYS.BILLS, INITIAL_DATA.BILLS);
      this.set(STORAGE_KEYS.WISHLIST, INITIAL_DATA.WISHLIST);
      this.set(STORAGE_KEYS.ACTIVITIES, INITIAL_DATA.ACTIVITIES);
      this.set(STORAGE_KEYS.GOALS, INITIAL_DATA.GOALS);
      this.set(STORAGE_KEYS.APPOINTMENTS, INITIAL_DATA.APPOINTMENTS);
      this.set(STORAGE_KEYS.LEGO_PIECES, INITIAL_DATA.LEGO_PIECES);
      this.set(STORAGE_KEYS.STREAK, 1);
      return;
    }

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
