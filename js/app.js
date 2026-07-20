/* ==========================================================================
   ORGANIZAMAX 3D - CONTROLADOR PRINCIPAL DA APLICAÇÃO (APP.JS)
   ========================================================================== */

// Estado da Aplicação
let currentTab = 'financeiro';
let currentFinSubtab = 'transacoes';
let agendaFilter = 'upcoming';
let draggedLegoId = null;
let legoTimerInterval = null;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initDateDisplay();
  setupNavigation();
  renderAllModules();
  setupModalBackdrops();
  startGlobalLegoTimerTicker();
});

// --------------------------------------------------------------------------
// 0. SELEÇÃO DE TEMAS NEON 3D
// --------------------------------------------------------------------------
function initTheme() {
  const savedTheme = localStorage.getItem('organizamax_theme_v1') || 'midnight';
  changeAppTheme(savedTheme, false);
  const selector = document.getElementById('theme-selector');
  if (selector) selector.value = savedTheme;
}

function changeAppTheme(themeName, save = true) {
  document.documentElement.setAttribute('data-theme', themeName);
  if (save) {
    localStorage.setItem('organizamax_theme_v1', themeName);
  }
}

// Formatadores Úteis
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function formatSecondsToHMS(totalSeconds) {
  const secs = Math.max(0, Math.floor(totalSeconds || 0));
  const h = String(Math.floor(secs / 3600)).padStart(2, '0');
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function initDateDisplay() {
  const display = document.getElementById('current-date-display');
  if (display) {
    const options = { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' };
    const todayStr = new Date().toLocaleDateString('pt-BR', options);
    display.textContent = todayStr.charAt(0).toUpperCase() + todayStr.slice(1);
  }
}

// --------------------------------------------------------------------------
// 1. NAVEGAÇÃO ENTRE ABAS (SPA)
// --------------------------------------------------------------------------
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item, .bottom-nav-item');
  navItems.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabTarget = btn.getAttribute('data-tab');
      switchTab(tabTarget);
    });
  });
}

function switchTab(tabId) {
  currentTab = tabId;

  document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(btn => {
    if (btn.getAttribute('data-tab') === tabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.remove('active');
  });

  const activePane = document.getElementById(`tab-${tabId}`);
  if (activePane) {
    activePane.classList.add('active');
  }

  renderAllModules();
}

function switchFinSubtab(subtabId) {
  currentFinSubtab = subtabId;
  document.querySelectorAll('.fin-subtab-btn').forEach(btn => {
    if (btn.getAttribute('data-subtab') === subtabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  document.querySelectorAll('.fin-subpane').forEach(pane => {
    pane.classList.remove('active');
  });

  const activePane = document.getElementById(`fin-subpane-${subtabId}`);
  if (activePane) activePane.classList.add('active');
}

// Renderizador Global
function renderAllModules() {
  renderFinance();
  renderBills();
  renderWishlist();
  renderActivities();
  renderGoals();
  renderAppointments();
  renderLegoBoard();
  renderSmartAlerts();
  renderWeeklyReport();
}

// --------------------------------------------------------------------------
// 2. SISTEMA DE MODAIS & POPUPS
// --------------------------------------------------------------------------
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    const dateInputs = modal.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
      if (!input.value) input.value = getTodayString();
    });

    if (modalId === 'modal-saldo-inicial') {
      const currentIncome = getNetIncomeTotal();
      const valInput = document.getElementById('initial-balance-val');
      if (valInput) valInput.value = currentIncome > 0 ? currentIncome : '';
    }

    modal.classList.add('active');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
  }
}

function setupModalBackdrops() {
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        backdrop.classList.remove('active');
      }
    });
  });
}

function getNetIncomeTotal() {
  const transactions = StorageManager.get(STORAGE_KEYS.TRANSACTIONS, []);
  let income = 0;
  transactions.forEach(t => {
    if (t.type === 'receita') income += (parseFloat(t.amount) || 0);
  });
  return income;
}

// --------------------------------------------------------------------------
// 3. CENTRAL DE ALERTAS INTELIGENTES DO DIA (NO TOPO)
// --------------------------------------------------------------------------
function renderSmartAlerts() {
  const todayStr = getTodayString();
  const bills = StorageManager.get(STORAGE_KEYS.BILLS, []);
  const appointments = StorageManager.get(STORAGE_KEYS.APPOINTMENTS, []);
  const activities = StorageManager.get(STORAGE_KEYS.ACTIVITIES, []);
  const goals = StorageManager.get(STORAGE_KEYS.GOALS, []);

  const alerts = [];

  // Contas vencidas ou vencendo hoje
  bills.forEach(b => {
    if (b.status === 'pendente') {
      if (b.dueDate === todayStr) {
        alerts.push({ type: 'danger', icon: '🔴', text: `Conta vencendo hoje: <strong>${escapeHtml(b.title)}</strong> (${formatCurrency(b.amount)})` });
      } else if (b.dueDate < todayStr) {
        alerts.push({ type: 'danger', icon: '🚨', text: `Conta atrasada desde ${formatDate(b.dueDate)}: <strong>${escapeHtml(b.title)}</strong>` });
      }
    }
  });

  // Compromissos de Hoje
  appointments.forEach(app => {
    if (app.date === todayStr) {
      alerts.push({ type: 'warning', icon: '📅', text: `Compromisso Hoje às ${app.time}: <strong>${escapeHtml(app.title)}</strong>` });
    }
  });

  // Atividades Atrasadas
  activities.forEach(act => {
    if (act.status !== 'concluida' && act.dueDate && act.dueDate < todayStr) {
      alerts.push({ type: 'warning', icon: '⏳', text: `Atividade Atrasada: <strong>${escapeHtml(act.title)}</strong>` });
    }
  });

  // Metas do dia pendentes (água etc)
  const uncompletedGoals = goals.filter(g => !g.completed);
  if (uncompletedGoals.length > 0) {
    alerts.push({ type: 'info', icon: '💧', text: `Você tem ${uncompletedGoals.length} meta(s) diária(s) pendente(s) para completar hoje.` });
  }

  // Atualiza Banner do Topo
  const bannerText = document.getElementById('smart-alert-text');
  const badgeCount = document.getElementById('bell-alert-count');

  if (badgeCount) badgeCount.textContent = alerts.length;

  if (bannerText) {
    if (alerts.length === 0) {
      bannerText.innerHTML = '✨ Tudo em dia! Você não tem contas vencendo nem compromissos pendentes hoje.';
    } else {
      bannerText.innerHTML = `${alerts[0].icon} ${alerts[0].text} ${alerts.length > 1 ? `<em>(+${alerts.length - 1} outros alertas)</em>` : ''}`;
    }
  }

  // Preenche a lista dentro do Modal
  const modalList = document.getElementById('alerts-modal-list');
  if (modalList) {
    if (alerts.length === 0) {
      modalList.innerHTML = `
        <div class="empty-state" style="padding: 2rem 1rem;">
          <div class="empty-state-icon">🎉</div>
          <p>Nenhum alerta pendente! Suas contas, agenda e metas estão 100% atualizadas.</p>
        </div>
      `;
    } else {
      modalList.innerHTML = alerts.map(a => `
        <div class="alert-item-row">
          <span>${a.icon}</span>
          <div>${a.text}</div>
        </div>
      `).join('');
    }
  }
}

// --------------------------------------------------------------------------
// 4. BACKUP & EXPORTAÇÃO / IMPORTAÇÃO EM JSON (1 CLIQUE)
// --------------------------------------------------------------------------
function exportAppDataJSON() {
  const data = {};
  Object.keys(STORAGE_KEYS).forEach(k => {
    const keyName = STORAGE_KEYS[k];
    data[keyName] = StorageManager.get(keyName);
  });

  data['organizamax_theme_v1'] = localStorage.getItem('organizamax_theme_v1') || 'midnight';

  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `organizamax_backup_${getTodayString()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importAppDataJSON(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      let count = 0;
      Object.keys(data).forEach(k => {
        localStorage.setItem(k, JSON.stringify(data[k]));
        count++;
      });

      alert('✅ Backup restaurado com sucesso! Recarregando sistema...');
      window.location.reload();
    } catch (err) {
      alert('❌ Erro ao ler o arquivo JSON de backup. Certifique-se de escolher um arquivo válido.');
      console.error(err);
    }
  };
  reader.readAsText(file);
}

function resetAppToZeroKM() {
  if (confirm('🚗 Tem certeza de que deseja zerar todos os dados e iniciar seu sistema 100% limpo ("Carro 0km")?')) {
    StorageManager.resetToZeroKM();
    alert('✨ Sistema zerado com sucesso! Agora está 100% novo para você cadastrar seus dados.');
    window.location.reload();
  }
}

// --------------------------------------------------------------------------
// 5. RELATÓRIO DE DESEMPENHO SEMANAL & ANÁLISE GERAL
// --------------------------------------------------------------------------
function renderWeeklyReport() {
  const container = document.getElementById('weekly-report-content');
  if (!container) return;

  const transactions = StorageManager.get(STORAGE_KEYS.TRANSACTIONS, []);
  const goals = StorageManager.get(STORAGE_KEYS.GOALS, []);
  const streak = StorageManager.get(STORAGE_KEYS.STREAK, 1);
  const pieces = StorageManager.get(STORAGE_KEYS.LEGO_PIECES, []);
  const netBalance = getNetBalance();

  let incomeTotal = 0, expenseTotal = 0;
  transactions.forEach(t => {
    if (t.type === 'receita') incomeTotal += (parseFloat(t.amount) || 0);
    else expenseTotal += (parseFloat(t.amount) || 0);
  });

  const goalsCompleted = goals.filter(g => g.completed).length;
  let totalWorkSeconds = 0;
  pieces.forEach(p => totalWorkSeconds += (p.elapsedSeconds || 0));
  const workMinutes = Math.round(totalWorkSeconds / 60);

  container.innerHTML = `
    <div class="report-card-item">
      <div>
        <div class="budget-lbl">💵 Total Entradas em Caixa</div>
        <h4 class="green-text" style="font-size: 1.1rem; font-weight: 800;">${formatCurrency(incomeTotal)}</h4>
      </div>
      <div>
        <div class="budget-lbl">📉 Total Gastos Registrados</div>
        <h4 style="font-size: 1.1rem; font-weight: 800; color: var(--color-danger);">${formatCurrency(expenseTotal)}</h4>
      </div>
    </div>

    <div class="report-card-item">
      <div>
        <div class="budget-lbl">💳 Saldo Livre Atual</div>
        <h4 style="font-size: 1.1rem; font-weight: 800; color: var(--accent-cyan);">${formatCurrency(netBalance)}</h4>
      </div>
      <div>
        <div class="budget-lbl">🔥 Sequência de Foco (Streak)</div>
        <h4 style="font-size: 1.1rem; font-weight: 800; color: var(--color-warning);">${streak} dias seguidos</h4>
      </div>
    </div>

    <div class="report-card-item">
      <div>
        <div class="budget-lbl">🎯 Metas Diárias Batinas Hoje</div>
        <h4 style="font-size: 1.1rem; font-weight: 800; color: var(--color-success);">${goalsCompleted} de ${goals.length} concluídas</h4>
      </div>
      <div>
        <div class="budget-lbl">⏱️ Tempo de Trabalho Focado</div>
        <h4 style="font-size: 1.1rem; font-weight: 800; color: var(--primary);">${workMinutes} minutos</h4>
      </div>
    </div>
  `;
}

// --------------------------------------------------------------------------
// 6. MÓDULO 1: FINANCEIRO
// --------------------------------------------------------------------------
function handleSaveInitialBalance(e) {
  e.preventDefault();
  const val = parseFloat(document.getElementById('initial-balance-val').value);
  if (isNaN(val) || val < 0) return;

  let transactions = StorageManager.get(STORAGE_KEYS.TRANSACTIONS, []);
  transactions = transactions.filter(t => t.description !== 'Saldo Inicial / Dinheiro em Caixa');

  transactions.unshift({
    id: 'tx-init-' + Date.now(),
    type: 'receita',
    description: 'Saldo Inicial / Dinheiro em Caixa',
    amount: val,
    date: getTodayString(),
    category: 'Trabalho'
  });

  StorageManager.set(STORAGE_KEYS.TRANSACTIONS, transactions);
  closeModal('modal-saldo-inicial');
  renderAllModules();
}

function renderFinance() {
  const transactions = StorageManager.get(STORAGE_KEYS.TRANSACTIONS, []);
  const bills = StorageManager.get(STORAGE_KEYS.BILLS, []);
  const filterVal = document.getElementById('finance-filter')?.value || 'all';

  let incomeGreen = 0;
  let expenseTotal = 0;

  transactions.forEach(t => {
    const amt = parseFloat(t.amount) || 0;
    if (t.type === 'receita') incomeGreen += amt;
    else if (t.type === 'despesa') expenseTotal += amt;
  });

  let pendingBillsTotal = 0;
  let pendingCount = 0;
  bills.forEach(b => {
    if (b.status === 'pendente') {
      pendingBillsTotal += (parseFloat(b.amount) || 0);
      pendingCount++;
    }
  });

  const netBalance = incomeGreen - expenseTotal - pendingBillsTotal;

  document.getElementById('total-income').textContent = formatCurrency(incomeGreen);
  document.getElementById('total-bills-pending').textContent = formatCurrency(pendingBillsTotal);
  
  const balanceEl = document.getElementById('net-balance');
  balanceEl.textContent = formatCurrency(netBalance);

  const billsBadge = document.getElementById('bills-badge-count');
  if (billsBadge) billsBadge.textContent = pendingCount;

  const balanceCard = document.getElementById('balance-card');
  if (netBalance >= 0) {
    balanceCard.style.borderLeftColor = 'var(--accent-cyan)';
  } else {
    balanceCard.style.borderLeftColor = 'var(--color-danger)';
  }

  const wishBalanceEl = document.getElementById('wishlist-current-balance');
  if (wishBalanceEl) wishBalanceEl.textContent = formatCurrency(netBalance);

  const listContainer = document.getElementById('transaction-list');
  if (!listContainer) return;

  const filtered = transactions.filter(t => {
    if (filterVal === 'receita') return t.type === 'receita';
    if (filterVal === 'despesa') return t.type === 'despesa';
    return true;
  });

  if (filtered.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">💸</div>
        <p>Nenhuma transação encontrada nesta categoria.</p>
      </div>
    `;
    return;
  }

  listContainer.innerHTML = filtered.map(t => {
    const isIncome = t.type === 'receita';
    const sign = isIncome ? '+' : '-';
    const categoryIcon = getCategoryEmoji(t.category);

    return `
      <div class="tx-item-3d">
        <div class="tx-left">
          <div class="tx-icon-pill ${t.type}">
            ${categoryIcon}
          </div>
          <div class="tx-details">
            <span class="tx-title">${escapeHtml(t.description)}</span>
            <span class="tx-meta">${escapeHtml(t.category)} • ${formatDate(t.date)}</span>
          </div>
        </div>
        <div class="tx-right">
          <span class="tx-amount ${t.type}">${sign} ${formatCurrency(t.amount)}</span>
          <button class="btn-delete-icon" title="Excluir Transação" onclick="deleteTransaction('${t.id}')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function handleSaveTransaction(e) {
  e.preventDefault();
  const type = document.querySelector('input[name="tx-type"]:checked').value;
  const description = document.getElementById('tx-desc').value.trim();
  const amount = parseFloat(document.getElementById('tx-amount').value);
  const date = document.getElementById('tx-date').value;
  const category = document.getElementById('tx-category').value;

  if (!description || isNaN(amount) || !date) return;

  const transactions = StorageManager.get(STORAGE_KEYS.TRANSACTIONS, []);
  transactions.unshift({
    id: 'tx-' + Date.now(),
    type,
    description,
    amount,
    date,
    category
  });

  StorageManager.set(STORAGE_KEYS.TRANSACTIONS, transactions);
  document.getElementById('form-transacao').reset();
  closeModal('modal-transacao');
  renderAllModules();
}

function deleteTransaction(id) {
  let transactions = StorageManager.get(STORAGE_KEYS.TRANSACTIONS, []);
  transactions = transactions.filter(t => t.id !== id);
  StorageManager.set(STORAGE_KEYS.TRANSACTIONS, transactions);
  renderAllModules();
}

// CONTAS A PAGAR
function renderBills() {
  const bills = StorageManager.get(STORAGE_KEYS.BILLS, []);
  const filterVal = document.getElementById('bills-filter')?.value || 'all';
  const todayStr = getTodayString();
  const container = document.getElementById('bills-list');
  if (!container) return;

  const filtered = bills.filter(b => {
    if (filterVal === 'pendente') return b.status === 'pendente';
    if (filterVal === 'pago') return b.status === 'pago';
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📑</div>
        <p>Nenhuma conta a pagar encontrada neste filtro.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(b => {
    const isPaid = b.status === 'pago';
    const isOverdue = !isPaid && b.dueDate && b.dueDate < todayStr;
    
    let statusClass = isPaid ? 'paid' : (isOverdue ? 'overdue' : 'pending');
    let statusLabel = isPaid ? '🟢 Pago' : (isOverdue ? '🔴 Vencida' : '🟡 Pendente');

    return `
      <div class="bill-item-3d ${statusClass}">
        <div class="tx-left">
          <div class="bill-status-badge ${statusClass}">
            ${statusLabel}
          </div>
          <div class="tx-details">
            <span class="tx-title">${escapeHtml(b.title)}</span>
            <span class="tx-meta">Vencimento: ${formatDate(b.dueDate)} • Categoria: ${escapeHtml(b.category)}</span>
          </div>
        </div>
        <div class="tx-right">
          <span class="tx-amount despesa">${formatCurrency(b.amount)}</span>
          <button class="btn-secondary-3d" style="padding: 6px 12px; font-size: 0.8rem;" onclick="toggleBillStatus('${b.id}')">
            ${isPaid ? 'Desmarcar' : 'Dar Baixa ✓'}
          </button>
          <button class="btn-delete-icon" title="Excluir Conta" onclick="deleteBill('${b.id}')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function handleSaveBill(e) {
  e.preventDefault();
  const title = document.getElementById('bill-title').value.trim();
  const amount = parseFloat(document.getElementById('bill-amount').value);
  const dueDate = document.getElementById('bill-due').value;
  const category = document.getElementById('bill-category').value;

  if (!title || isNaN(amount) || !dueDate) return;

  const bills = StorageManager.get(STORAGE_KEYS.BILLS, []);
  bills.unshift({
    id: 'bill-' + Date.now(),
    title,
    amount,
    dueDate,
    category,
    status: 'pendente'
  });

  StorageManager.set(STORAGE_KEYS.BILLS, bills);
  document.getElementById('form-conta-pagar').reset();
  closeModal('modal-conta-pagar');
  renderAllModules();
}

function toggleBillStatus(id) {
  const bills = StorageManager.get(STORAGE_KEYS.BILLS, []);
  const bill = bills.find(b => b.id === id);
  if (bill) {
    bill.status = bill.status === 'pago' ? 'pendente' : 'pago';
    StorageManager.set(STORAGE_KEYS.BILLS, bills);
    renderAllModules();
  }
}

function deleteBill(id) {
  let bills = StorageManager.get(STORAGE_KEYS.BILLS, []);
  bills = bills.filter(b => b.id !== id);
  StorageManager.set(STORAGE_KEYS.BILLS, bills);
  renderAllModules();
}

// --------------------------------------------------------------------------
// 7. MÓDULO 2: DESEJOS VS ORÇAMENTO
// --------------------------------------------------------------------------
function getNetBalance() {
  const transactions = StorageManager.get(STORAGE_KEYS.TRANSACTIONS, []);
  const bills = StorageManager.get(STORAGE_KEYS.BILLS, []);
  let incomeGreen = 0, expenseTotal = 0, pendingBills = 0;

  transactions.forEach(t => {
    const amt = parseFloat(t.amount) || 0;
    if (t.type === 'receita') incomeGreen += amt;
    else if (t.type === 'despesa') expenseTotal += amt;
  });

  bills.forEach(b => {
    if (b.status === 'pendente') pendingBills += (parseFloat(b.amount) || 0);
  });

  return incomeGreen - expenseTotal - pendingBills;
}

function renderWishlist() {
  const wishes = StorageManager.get(STORAGE_KEYS.WISHLIST, []);
  const currentBalance = getNetBalance();
  const filterNecessity = document.getElementById('wishlist-filter-necessity')?.value || 'all';

  const grid = document.getElementById('wishlist-grid');
  if (!grid) return;

  let totalCostPlanned = 0;
  wishes.forEach(w => {
    if (!w.purchased) totalCostPlanned += (parseFloat(w.price) || 0);
  });

  document.getElementById('wishlist-current-balance').textContent = formatCurrency(currentBalance);
  document.getElementById('wishlist-total-cost').textContent = formatCurrency(totalCostPlanned);

  const diagEl = document.getElementById('wishlist-diagnosis');
  if (currentBalance <= 0) {
    diagEl.textContent = '🔴 Orçamento zerado. Evite compras até receber novas entradas.';
    diagEl.style.color = 'var(--color-danger)';
  } else if (currentBalance >= totalCostPlanned) {
    diagEl.textContent = '🟢 Excelente! Você tem dinheiro livre para cobrir todos os seus itens da sua lista.';
    diagEl.style.color = 'var(--color-success)';
  } else {
    diagEl.textContent = '🟡 Seu dinheiro cobre parte da lista. Dê prioridade aos itens Essenciais!';
    diagEl.style.color = 'var(--color-warning)';
  }

  const filtered = wishes.filter(w => {
    if (filterNecessity !== 'all') return (w.necessity || 'Útil') === filterNecessity;
    return true;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">🎁</div>
        <p>Nenhum item encontrado nesta categoria de necessidade.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(w => {
    const price = parseFloat(w.price) || 0;
    const isAffordable = currentBalance >= price;
    const necessity = w.necessity || 'Útil';

    let statusClass = 'over-budget';
    let statusText = '🔴 Fora do Orçamento';
    let adviceText = '';

    if (w.purchased) {
      statusClass = 'purchased';
      statusText = '💜 Comprado!';
      adviceText = 'Item adquirido e registrado no financeiro.';
    } else if (isAffordable) {
      if (necessity === 'Essencial') {
        statusClass = 'can-buy';
        statusText = '🟢 Pode Comprar Já!';
        adviceText = 'Dentro do saldo disponível e de alta necessidade.';
      } else if (necessity === 'Útil') {
        statusClass = 'can-buy';
        statusText = '🟢 Ao seu alcance!';
        adviceText = 'Dentro do orçamento. Avalie se é a hora certa.';
      } else {
        statusClass = 'wait';
        statusText = '🟡 Poupe Primeiro';
        adviceText = 'Dentro do saldo, mas é um item supérfluo. Cuidado ao gastar!';
      }
    } else {
      const diff = price - currentBalance;
      statusClass = 'over-budget';
      statusText = `🔴 Falta ${formatCurrency(diff)}`;
      adviceText = `Faltam ${formatCurrency(diff)} no seu saldo livre para este item.`;
    }

    const nClass = necessity.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    return `
      <div class="wish-card-3d">
        <div class="wish-header-badges">
          <div class="wish-badge-status ${statusClass}">
            ${statusText}
          </div>
          <span class="necessity-badge ${nClass}">
            ${necessity === 'Essencial' ? '🚨 Essencial' : (necessity === 'Útil' ? '⚡ Útil' : '☕ Supérfluo')}
          </span>
        </div>

        <div class="wish-main">
          <div class="wish-emoji">${w.icon || '🎁'}</div>
          <div class="wish-info">
            <h4>${escapeHtml(w.title)}</h4>
            <div class="wish-price">${formatCurrency(price)}</div>
          </div>
        </div>

        <div class="wish-advice">
          💡 ${adviceText}
        </div>

        <div class="wish-footer">
          <span class="priority-tag">Necessidade: ${escapeHtml(necessity)}</span>
          <div class="wish-actions">
            <button class="btn-secondary-3d" style="padding: 6px 12px; font-size: 0.8rem;" onclick="toggleWishPurchased('${w.id}')">
              ${w.purchased ? 'Desmarcar' : 'Comprar &amp; Abater 💳'}
            </button>
            <button class="btn-delete-icon" title="Excluir Desejo" onclick="deleteWish('${w.id}')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function handleSaveWish(e) {
  e.preventDefault();
  const title = document.getElementById('wish-title').value.trim();
  const price = parseFloat(document.getElementById('wish-price').value);
  const necessity = document.getElementById('wish-necessity').value;
  const icon = document.getElementById('wish-icon').value.trim() || '🎁';

  if (!title || isNaN(price)) return;

  const wishes = StorageManager.get(STORAGE_KEYS.WISHLIST, []);
  wishes.unshift({
    id: 'w-' + Date.now(),
    title,
    price,
    necessity,
    icon,
    purchased: false
  });

  StorageManager.set(STORAGE_KEYS.WISHLIST, wishes);
  document.getElementById('form-desejo').reset();
  closeModal('modal-desejo');
  renderAllModules();
}

function toggleWishPurchased(id) {
  const wishes = StorageManager.get(STORAGE_KEYS.WISHLIST, []);
  const wish = wishes.find(w => w.id === id);
  if (!wish) return;

  wish.purchased = !wish.purchased;

  let transactions = StorageManager.get(STORAGE_KEYS.TRANSACTIONS, []);
  const txDesc = `Compra: ${wish.title}`;

  if (wish.purchased) {
    transactions.unshift({
      id: 'tx-wish-' + wish.id,
      type: 'despesa',
      description: txDesc,
      amount: wish.price,
      date: getTodayString(),
      category: 'Lazer'
    });
  } else {
    transactions = transactions.filter(t => t.id !== 'tx-wish-' + wish.id && t.description !== txDesc);
  }

  StorageManager.set(STORAGE_KEYS.TRANSACTIONS, transactions);
  StorageManager.set(STORAGE_KEYS.WISHLIST, wishes);
  renderAllModules();
}

function deleteWish(id) {
  let wishes = StorageManager.get(STORAGE_KEYS.WISHLIST, []);
  let transactions = StorageManager.get(STORAGE_KEYS.TRANSACTIONS, []);
  
  wishes = wishes.filter(w => w.id !== id);
  transactions = transactions.filter(t => t.id !== 'tx-wish-' + id);
  
  StorageManager.set(STORAGE_KEYS.WISHLIST, wishes);
  StorageManager.set(STORAGE_KEYS.TRANSACTIONS, transactions);
  renderAllModules();
}

// --------------------------------------------------------------------------
// 8. MÓDULO 3: PROCRASTINAR
// --------------------------------------------------------------------------
function renderActivities() {
  const activities = StorageManager.get(STORAGE_KEYS.ACTIVITIES, []);
  const filterVal = document.getElementById('activity-filter')?.value || 'all';
  const todayStr = getTodayString();

  let pendingCount = 0;
  let overdueCount = 0;
  let completedCount = 0;

  activities.forEach(act => {
    if (act.status === 'concluida') {
      completedCount++;
    } else {
      pendingCount++;
      if (act.dueDate && act.dueDate < todayStr) {
        overdueCount++;
      }
    }
  });

  const statusTitle = document.getElementById('procrastination-status-title');
  const badge = document.getElementById('procrastination-badge');
  const meterBar = document.getElementById('meter-bar');
  const tip = document.getElementById('procrastination-tip');

  document.getElementById('stat-pending').textContent = pendingCount;
  document.getElementById('stat-overdue').textContent = overdueCount;
  document.getElementById('stat-completed').textContent = completedCount;

  if (overdueCount === 0) {
    statusTitle.textContent = '⚡ Foco Total! Você está sem pendências atrasadas.';
    badge.textContent = 'Modo Produtivo';
    badge.className = 'gauge-badge level-good';
    meterBar.style.width = '100%';
    meterBar.style.background = 'var(--color-success)';
    tip.textContent = 'Excelente! Mantenha a sequência e continue avançando no seu ritmo.';
  } else if (overdueCount === 1) {
    statusTitle.textContent = '⚠️ Atenção: Você possui 1 atividade acumulada!';
    badge.textContent = 'Atenção Requerida';
    badge.className = 'gauge-badge level-warn';
    meterBar.style.width = '55%';
    meterBar.style.background = 'var(--color-warning)';
    tip.textContent = 'Resolva a tarefa pendente logo para evitar acumular mais prazos.';
  } else {
    statusTitle.textContent = `🔴 Alerta de Procrastinação: ${overdueCount} atividades atrasadas!`;
    badge.textContent = 'Procrastinando';
    badge.className = 'gauge-badge level-alert';
    meterBar.style.width = '25%';
    meterBar.style.background = 'var(--color-danger)';
    tip.textContent = 'Cuidado! Escolha a tarefa mais rápida agora (15 min) e conclua para retomar o ritmo!';
  }

  const listContainer = document.getElementById('activity-list');
  if (!listContainer) return;

  const filtered = activities.filter(act => {
    const isOverdue = act.status !== 'concluida' && act.dueDate && act.dueDate < todayStr;
    if (filterVal === 'pendente') return act.status === 'pendente' && !isOverdue;
    if (filterVal === 'atrasada') return isOverdue;
    if (filterVal === 'concluida') return act.status === 'concluida';
    return true;
  });

  if (filtered.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🎯</div>
        <p>Nenhuma atividade encontrada neste filtro.</p>
      </div>
    `;
    return;
  }

  listContainer.innerHTML = filtered.map(act => {
    const isCompleted = act.status === 'concluida';
    const isOverdue = !isCompleted && act.dueDate && act.dueDate < todayStr;
    const cardClass = isCompleted ? 'concluida' : (isOverdue ? 'atrasada' : '');

    return `
      <div class="act-card-3d ${cardClass}">
        <div class="act-info">
          <span class="act-title">${escapeHtml(act.title)}</span>
          <div class="act-meta">
            <span class="tag-due ${isOverdue ? 'overdue' : ''}">
              📅 ${isOverdue ? 'ATRASADO - ' : ''}${formatDate(act.dueDate)}
            </span>
            <span>• Esforço: ${escapeHtml(act.effort)}</span>
            <span>• ${escapeHtml(act.category)}</span>
          </div>
        </div>
        <div class="wish-actions">
          <button class="btn-secondary-3d" style="padding: 6px 12px; font-size: 0.8rem;" onclick="toggleActivityStatus('${act.id}')">
            ${isCompleted ? 'Reabrir' : 'Concluir ✓'}
          </button>
          <button class="btn-delete-icon" title="Excluir Atividade" onclick="deleteActivity('${act.id}')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function handleSaveActivity(e) {
  e.preventDefault();
  const title = document.getElementById('act-title').value.trim();
  const dueDate = document.getElementById('act-due').value;
  const effort = document.getElementById('act-effort').value;
  const category = document.getElementById('act-category').value;

  if (!title || !dueDate) return;

  const activities = StorageManager.get(STORAGE_KEYS.ACTIVITIES, []);
  activities.unshift({
    id: 'act-' + Date.now(),
    title,
    dueDate,
    effort,
    category,
    status: 'pendente'
  });

  StorageManager.set(STORAGE_KEYS.ACTIVITIES, activities);
  document.getElementById('form-atividade').reset();
  closeModal('modal-atividade');
  renderActivities();
}

function toggleActivityStatus(id) {
  const activities = StorageManager.get(STORAGE_KEYS.ACTIVITIES, []);
  const act = activities.find(a => a.id === id);
  if (act) {
    act.status = act.status === 'concluida' ? 'pendente' : 'concluida';
    StorageManager.set(STORAGE_KEYS.ACTIVITIES, activities);
    renderActivities();
  }
}

function deleteActivity(id) {
  let activities = StorageManager.get(STORAGE_KEYS.ACTIVITIES, []);
  activities = activities.filter(a => a.id !== id);
  StorageManager.set(STORAGE_KEYS.ACTIVITIES, activities);
  renderActivities();
}

// --------------------------------------------------------------------------
// 9. MÓDULO 4: METAS DO DIA
// --------------------------------------------------------------------------
function renderGoals() {
  const goals = StorageManager.get(STORAGE_KEYS.GOALS, []);
  const streak = StorageManager.get(STORAGE_KEYS.STREAK, 1);
  const container = document.getElementById('goals-click-list');
  if (!container) return;

  const completedCount = goals.filter(g => g.completed).length;
  const totalCount = goals.length;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  document.getElementById('daily-goals-count').textContent = `${completedCount} de ${totalCount} concluídas`;
  document.getElementById('streak-count').textContent = streak;

  const fill = document.getElementById('daily-progress-fill');
  const text = document.getElementById('daily-progress-text');
  fill.style.width = `${percent}%`;
  text.textContent = `${percent}%`;

  if (goals.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">🎯</div>
        <p>Nenhuma meta para hoje. Adicione metas rápidas com 1 clique!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = goals.map(g => {
    const totalSteps = g.totalSteps || 1;
    const currentSteps = g.currentSteps || (g.completed ? totalSteps : 0);
    const isMultiStep = totalSteps > 1;

    let miniPillsHtml = '';
    if (isMultiStep) {
      let pills = [];
      for (let i = 1; i <= totalSteps; i++) {
        const isFilled = i <= currentSteps;
        pills.push(`
          <div class="mini-step-badge ${isFilled ? 'filled' : ''}" 
               title="Marcar até passo ${i}"
               onclick="event.stopPropagation(); setGoalStep('${g.id}', ${i})">
            ${i}
          </div>
        `);
      }
      miniPillsHtml = `
        <div class="mini-steps-row">
          <span style="font-size: 0.78rem; font-weight: 700; color: var(--color-text-muted);">
            Progresso: <strong>${currentSteps} / ${totalSteps}</strong>
          </span>
          <div class="mini-steps-pills">
            ${pills.join('')}
          </div>
          <button class="btn-step-plus" onclick="event.stopPropagation(); incrementGoalStep('${g.id}')">
            +1 Click 🥛
          </button>
        </div>
      `;
    }

    return `
      <div class="goal-item-3d ${g.completed ? 'completed' : ''}" onclick="toggleGoalClick('${g.id}')">
        <div class="goal-main-row">
          <div class="goal-left">
            <div class="goal-emoji">${g.icon || '📌'}</div>
            <div>
              <span class="goal-title">${escapeHtml(g.title)}</span>
              ${isMultiStep ? `<div style="font-size: 0.75rem; color: var(--color-text-muted);">${currentSteps} de ${totalSteps} etapas concluídas</div>` : ''}
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <div class="checkbox-3d">
              ${g.completed ? '✓' : ''}
            </div>
            <button class="btn-delete-icon" title="Excluir Meta" onclick="event.stopPropagation(); deleteGoal('${g.id}')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>

        ${miniPillsHtml}
      </div>
    `;
  }).join('');
}

function setGoalStep(id, stepNumber) {
  const goals = StorageManager.get(STORAGE_KEYS.GOALS, []);
  const goal = goals.find(g => g.id === id);
  if (!goal) return;

  const total = goal.totalSteps || 1;
  if (goal.currentSteps === stepNumber) {
    goal.currentSteps = stepNumber - 1;
  } else {
    goal.currentSteps = stepNumber;
  }

  goal.completed = goal.currentSteps >= total;
  StorageManager.set(STORAGE_KEYS.GOALS, goals);
  renderGoals();
}

function incrementGoalStep(id) {
  const goals = StorageManager.get(STORAGE_KEYS.GOALS, []);
  const goal = goals.find(g => g.id === id);
  if (!goal) return;

  const total = goal.totalSteps || 1;
  let current = goal.currentSteps || 0;
  
  current++;
  if (current > total) current = 0;

  goal.currentSteps = current;
  goal.completed = current >= total;

  StorageManager.set(STORAGE_KEYS.GOALS, goals);
  renderGoals();
}

function toggleGoalClick(id) {
  const goals = StorageManager.get(STORAGE_KEYS.GOALS, []);
  const goal = goals.find(g => g.id === id);
  if (goal) {
    goal.completed = !goal.completed;
    const total = goal.totalSteps || 1;
    goal.currentSteps = goal.completed ? total : 0;
    StorageManager.set(STORAGE_KEYS.GOALS, goals);
    renderGoals();
  }
}

function handleSaveGoal(e) {
  e.preventDefault();
  const title = document.getElementById('goal-title').value.trim();
  const icon = document.getElementById('goal-icon').value.trim() || '📌';
  const totalSteps = parseInt(document.getElementById('goal-steps').value) || 1;

  if (!title) return;

  const goals = StorageManager.get(STORAGE_KEYS.GOALS, []);
  goals.push({
    id: 'g-' + Date.now(),
    title,
    icon,
    totalSteps,
    currentSteps: 0,
    completed: false
  });

  StorageManager.set(STORAGE_KEYS.GOALS, goals);
  document.getElementById('form-meta').reset();
  closeModal('modal-meta');
  renderGoals();
}

function deleteGoal(id) {
  let goals = StorageManager.get(STORAGE_KEYS.GOALS, []);
  goals = goals.filter(g => g.id !== id);
  StorageManager.set(STORAGE_KEYS.GOALS, goals);
  renderGoals();
}

// --------------------------------------------------------------------------
// 10. MÓDULO 5: AGENDAMENTO
// --------------------------------------------------------------------------
function setAgendaFilter(filterType) {
  agendaFilter = filterType;
  document.querySelectorAll('.agenda-tab-btn').forEach(btn => {
    if (btn.getAttribute('data-filter') === filterType) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  renderAppointments();
}

function renderAppointments() {
  const appointments = StorageManager.get(STORAGE_KEYS.APPOINTMENTS, []);
  const container = document.getElementById('agenda-list');
  if (!container) return;

  const todayStr = getTodayString();

  appointments.sort((a, b) => {
    const da = `${a.date} ${a.time}`;
    const db = `${b.date} ${b.time}`;
    return da.localeCompare(db);
  });

  const filtered = appointments.filter(app => {
    if (agendaFilter === 'today') return app.date === todayStr;
    if (agendaFilter === 'upcoming') return app.date >= todayStr;
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📅</div>
        <p>Nenhum compromisso encontrado para este período.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(app => `
    <div class="app-card-3d">
      <div class="app-left">
        <div class="app-time-badge">
          <span class="app-time-hour">${app.time}</span>
          <span class="app-time-date">${formatDate(app.date)}</span>
        </div>
        <div class="app-info">
          <h4>${escapeHtml(app.title)}</h4>
          <div class="app-meta">
            ${app.location ? `<span>📍 ${escapeHtml(app.location)}</span>` : ''}
            <span class="app-type-tag">${escapeHtml(app.type)}</span>
          </div>
        </div>
      </div>
      <button class="btn-delete-icon" title="Excluir Compromisso" onclick="deleteAppointment('${app.id}')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
      </button>
    </div>
  `).join('');
}

function handleSaveAppointment(e) {
  e.preventDefault();
  const title = document.getElementById('app-title').value.trim();
  const date = document.getElementById('app-date').value;
  const time = document.getElementById('app-time').value;
  const location = document.getElementById('app-location').value.trim();
  const type = document.getElementById('app-type').value;

  if (!title || !date || !time) return;

  const appointments = StorageManager.get(STORAGE_KEYS.APPOINTMENTS, []);
  appointments.push({
    id: 'app-' + Date.now(),
    title,
    date,
    time,
    location,
    type
  });

  StorageManager.set(STORAGE_KEYS.APPOINTMENTS, appointments);
  document.getElementById('form-compromisso').reset();
  closeModal('modal-compromisso');
  renderAppointments();
}

function deleteAppointment(id) {
  let appointments = StorageManager.get(STORAGE_KEYS.APPOINTMENTS, []);
  appointments = appointments.filter(a => a.id !== id);
  StorageManager.set(STORAGE_KEYS.APPOINTMENTS, appointments);
  renderAppointments();
}

// --------------------------------------------------------------------------
// 11. MÓDULO 6: TRABALHO (CRONÔMETRO DE EXECUÇÃO & DESEMPENHO)
// --------------------------------------------------------------------------
const LEGO_STAGES = [
  { id: 'ideias', title: '💡 1. Ideias &amp; Roteiros' },
  { id: 'execucao', title: '🎬 2. Em Edição / Produção' },
  { id: 'revisao', title: '🔍 3. Revisão &amp; Ajustes' },
  { id: 'concluido', title: '✅ 4. Concluído / Postado' }
];

function startGlobalLegoTimerTicker() {
  if (legoTimerInterval) clearInterval(legoTimerInterval);

  legoTimerInterval = setInterval(() => {
    const pieces = StorageManager.get(STORAGE_KEYS.LEGO_PIECES, []);
    let activePiece = null;
    let updated = false;

    pieces.forEach(p => {
      if (p.activeTimer) {
        p.elapsedSeconds = (p.elapsedSeconds || 0) + 1;
        activePiece = p;
        updated = true;
      }
    });

    if (updated) {
      StorageManager.set(STORAGE_KEYS.LEGO_PIECES, pieces);
      updateLegoTimerDisplays(pieces, activePiece);
    }
  }, 1000);
}

function updateLegoTimerDisplays(pieces, activePiece) {
  const activeNameEl = document.getElementById('work-active-task-name');
  const activeTimerEl = document.getElementById('work-active-timer-display');
  const perfSummaryEl = document.getElementById('work-performance-summary');

  if (activeNameEl && activeTimerEl) {
    if (activePiece) {
      activeNameEl.textContent = `🟢 ${activePiece.title}`;
      activeTimerEl.textContent = formatSecondsToHMS(activePiece.elapsedSeconds);
    } else {
      activeNameEl.textContent = 'Nenhum no momento';
      activeTimerEl.textContent = '00:00:00';
    }
  }

  if (perfSummaryEl) {
    const doneCount = pieces.filter(p => p.stage === 'concluido').length;
    perfSummaryEl.textContent = `⚡ ${doneCount} trabalhos concluídos!`;
  }

  pieces.forEach(p => {
    const timerBadge = document.getElementById(`timer-badge-${p.id}`);
    if (timerBadge) {
      timerBadge.textContent = formatSecondsToHMS(p.elapsedSeconds || 0);
    }
  });
}

function renderLegoBoard() {
  const pieces = StorageManager.get(STORAGE_KEYS.LEGO_PIECES, []);
  const board = document.getElementById('lego-board');
  if (!board) return;

  const activePiece = pieces.find(p => p.activeTimer);
  updateLegoTimerDisplays(pieces, activePiece);

  board.innerHTML = LEGO_STAGES.map(stage => {
    const stagePieces = pieces.filter(p => p.stage === stage.id);
    stagePieces.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

    const piecesHtml = stagePieces.length === 0 ? `
      <div class="empty-state" style="padding: 2rem 1rem;">
        <p style="font-size: 0.8rem;">Solte uma peça aqui 🧩</p>
      </div>
    ` : stagePieces.map(p => {
      const colorClass = `color-${p.color || 'indigo'}`;
      const pinnedClass = p.pinned ? 'pinned' : '';
      const timerActiveClass = p.activeTimer ? 'timer-active' : '';
      const targetMin = p.targetMinutes || 60;
      const elapsedSec = p.elapsedSeconds || 0;
      const elapsedMin = Math.round(elapsedSec / 60);

      let perfText = '';
      if (p.stage === 'concluido') {
        if (elapsedMin <= targetMin) {
          perfText = `⚡ Excelente! Concluído em ${elapsedMin}min (Dentro da meta de ${targetMin}min)`;
        } else {
          perfText = `⚠️ Concluído em ${elapsedMin}min (Meta era ${targetMin}min)`;
        }
      }

      return `
        <div class="lego-card-3d ${colorClass} ${pinnedClass} ${timerActiveClass}" 
             draggable="true" 
             ondragstart="handleLegoDragStart(event, '${p.id}')">
          
          <div class="lego-studs">
            <div class="stud-3d"></div>
            <div class="stud-3d"></div>
            <div class="stud-3d"></div>
            <div class="stud-3d"></div>
          </div>

          <div class="lego-card-top">
            <span class="lego-title-text">${escapeHtml(p.title)}</span>
            ${p.pinned ? `<span class="pin-badge" title="Peça Fixada">📌 Fixado</span>` : ''}
          </div>

          ${p.notes ? `<div class="lego-notes-box">${escapeHtml(p.notes)}</div>` : ''}

          <!-- Cronômetro & Tempo de Execução -->
          <div class="work-time-info">
            <div>
              <span>🎯 Meta: <strong>${targetMin}m</strong></span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span class="timer-badge ${p.activeTimer ? 'active' : ''}" id="timer-badge-${p.id}">
                ${formatSecondsToHMS(elapsedSec)}
              </span>
              <button class="btn-secondary-3d" style="padding: 4px 8px; font-size: 0.75rem;" onclick="toggleLegoTimer('${p.id}')">
                ${p.activeTimer ? '⏸️ Pausar' : '▶️ Ativar'}
              </button>
            </div>
          </div>

          ${perfText ? `<div style="font-size: 0.75rem; color: var(--color-success); font-weight: 700; margin-bottom: 0.5rem;">${perfText}</div>` : ''}

          <div class="lego-card-footer">
            <span>📅 ${formatDate(p.date)}</span>
            <div class="lego-stage-controls">
              <button class="btn-stage-move" title="Fixar/Soltar Nota" onclick="togglePinLegoPiece('${p.id}')">
                ${p.pinned ? '📌 Fixado' : '📌 Fixar'}
              </button>
              <button class="btn-delete-icon" title="Excluir Peça" onclick="deleteLegoPiece('${p.id}')">
                &times;
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="lego-column" 
           ondragover="handleLegoDragOver(event)" 
           ondragleave="handleLegoDragLeave(event)" 
           ondrop="handleLegoDrop(event, '${stage.id}')">
        
        <div class="lego-column-header">
          <h3>${stage.title}</h3>
          <span class="lego-count-badge">${stagePieces.length}</span>
        </div>

        <div class="lego-cards-zone">
          ${piecesHtml}
        </div>
      </div>
    `;
  }).join('');
}

// Timer Controls
function toggleLegoTimer(id) {
  const pieces = StorageManager.get(STORAGE_KEYS.LEGO_PIECES, []);
  const target = pieces.find(p => p.id === id);
  if (!target) return;

  const isCurrentlyActive = target.activeTimer;

  if (!isCurrentlyActive) {
    pieces.forEach(p => p.activeTimer = false);
    target.activeTimer = true;
  } else {
    target.activeTimer = false;
  }

  StorageManager.set(STORAGE_KEYS.LEGO_PIECES, pieces);
  renderLegoBoard();
}

// Drag & Drop
function handleLegoDragStart(e, pieceId) {
  draggedLegoId = pieceId;
  e.dataTransfer.setData('text/plain', pieceId);
}

function handleLegoDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('drag-over');
}

function handleLegoDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function handleLegoDrop(e, targetStageId) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');

  const pieceId = draggedLegoId || e.dataTransfer.getData('text/plain');
  if (!pieceId) return;

  const pieces = StorageManager.get(STORAGE_KEYS.LEGO_PIECES, []);
  const piece = pieces.find(p => p.id === pieceId);
  
  if (piece) {
    piece.stage = targetStageId;
    if (targetStageId === 'concluido') {
      piece.activeTimer = false;
    }
    StorageManager.set(STORAGE_KEYS.LEGO_PIECES, pieces);
    renderLegoBoard();
  }
}

function handleSaveLegoPiece(e) {
  e.preventDefault();
  const title = document.getElementById('lego-title').value.trim();
  const date = document.getElementById('lego-date').value;
  const targetMinutes = parseInt(document.getElementById('lego-target-time').value) || 60;
  const stage = document.getElementById('lego-stage').value;
  const notes = document.getElementById('lego-notes').value.trim();
  const color = document.getElementById('lego-color').value;
  const pinned = document.getElementById('lego-pinned').value === 'true';

  if (!title || !date) return;

  const pieces = StorageManager.get(STORAGE_KEYS.LEGO_PIECES, []);
  pieces.unshift({
    id: 'lego-' + Date.now(),
    title,
    date,
    targetMinutes,
    elapsedSeconds: 0,
    activeTimer: false,
    stage,
    notes,
    color,
    pinned
  });

  StorageManager.set(STORAGE_KEYS.LEGO_PIECES, pieces);
  document.getElementById('form-lego-peca').reset();
  closeModal('modal-lego-peca');
  renderLegoBoard();
}

function togglePinLegoPiece(id) {
  const pieces = StorageManager.get(STORAGE_KEYS.LEGO_PIECES, []);
  const piece = pieces.find(p => p.id === id);
  if (piece) {
    piece.pinned = !piece.pinned;
    StorageManager.set(STORAGE_KEYS.LEGO_PIECES, pieces);
    renderLegoBoard();
  }
}

function deleteLegoPiece(id) {
  let pieces = StorageManager.get(STORAGE_KEYS.LEGO_PIECES, []);
  pieces = pieces.filter(p => p.id !== id);
  StorageManager.set(STORAGE_KEYS.LEGO_PIECES, pieces);
  renderLegoBoard();
}

// Auxiliar contra XSS
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
}

function getCategoryEmoji(cat) {
  switch (cat) {
    case 'Trabalho': return '💼';
    case 'Alimentação': return '🛒';
    case 'Moradia': return '🏠';
    case 'Lazer': return '🎉';
    case 'Investimentos': return '💎';
    default: return '💰';
  }
}
