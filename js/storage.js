const P = 'financa_';

// ── GENERIC ──────────────────────────────────────────────
const get = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(P + key)) ?? fallback; }
  catch { return fallback; }
};
const set = (key, val) => localStorage.setItem(P + key, JSON.stringify(val));

// ── INCOME SOURCES ────────────────────────────────────────
export const getSources   = ()      => get('income_sources', []);
export const setSources   = (arr)   => set('income_sources', arr);
export const addSource    = (src)   => setSources([...getSources(), src]);
export const removeSource = (id)    => setSources(getSources().filter(s => s.id !== id));
export const updateSource = (src)   => setSources(getSources().map(s => s.id === src.id ? src : s));

// ── TRANSACTIONS (monthly) ────────────────────────────────
export const getTransactions   = (mk)      => get(`transactions_${mk}`, []);
export const setTransactions   = (mk, arr) => set(`transactions_${mk}`, arr);
export const addTransaction    = (mk, tx)  => setTransactions(mk, [...getTransactions(mk), tx]);
export const removeTransaction = (mk, id)  => setTransactions(mk, getTransactions(mk).filter(t => t.id !== id));
export const updateTransaction = (mk, tx)  => setTransactions(mk, getTransactions(mk).map(t => t.id === tx.id ? tx : t));

// ── CARDS ─────────────────────────────────────────────────
export const getCards   = ()      => get('cards', []);
export const setCards   = (arr)   => set('cards', arr);
export const updateCard = (card)  => setCards(getCards().map(c => c.id === card.id ? card : c));

// ── CARD EXPENSES (monthly) ───────────────────────────────
export const getCardExpenses   = (mk)       => get(`card_expenses_${mk}`, []);
export const setCardExpenses   = (mk, arr)  => set(`card_expenses_${mk}`, arr);
export const addCardExpense    = (mk, exp)  => setCardExpenses(mk, [...getCardExpenses(mk), exp]);
export const removeCardExpense = (mk, id)   => setCardExpenses(mk, getCardExpenses(mk).filter(e => e.id !== id));

// ── GOALS ─────────────────────────────────────────────────
export const getGoals   = ()    => get('goals', []);
export const setGoals   = (arr) => set('goals', arr);
export const addGoal    = (g)   => setGoals([...getGoals(), g]);
export const removeGoal = (id)  => setGoals(getGoals().filter(g => g.id !== id));
export const updateGoal = (g)   => setGoals(getGoals().map(x => x.id === g.id ? g : x));

// ── SCHEDULED EXPENSES ────────────────────────────────────
export const getScheduled    = ()     => get('scheduled_expenses', []);
export const setScheduled    = (arr)  => set('scheduled_expenses', arr);
export const addScheduled    = (s)    => setScheduled([...getScheduled(), s]);
export const removeScheduled = (id)   => setScheduled(getScheduled().filter(s => s.id !== id));
export const updateScheduled = (s)    => setScheduled(getScheduled().map(x => x.id === s.id ? s : x));

// ── PLANNING (monthly) ────────────────────────────────────
export const getPlanning = (mk)    => get(`planning_${mk}`, { expectedIncome: 0, expectedExpense: 0, plannedSavings: 0 });
export const setPlanning = (mk, p) => set(`planning_${mk}`, p);

// ── INIT FLAG ─────────────────────────────────────────────
export const isMonthInit  = (mk) => !!get(`init_${mk}`, false);
export const setMonthInit = (mk) => set(`init_${mk}`, true);

// ── CARD INVOICE STATUS ───────────────────────────────────
export const getInvoiceStatus = (cardId, mk)         => get(`invoice_${cardId}_${mk}`, 'aberta');
export const setInvoiceStatus = (cardId, mk, status) => set(`invoice_${cardId}_${mk}`, status);

// ── AGGREGATION HELPERS ───────────────────────────────────
export function sumTransactions(monthKeys) {
  let income = 0, expense = 0;
  for (const mk of monthKeys) {
    for (const tx of getTransactions(mk)) {
      if (!tx.confirmed && tx.type === 'income') continue;
      if (tx.type === 'income') income += tx.amount;
      else expense += tx.amount;
    }
  }
  return { income, expense, balance: income - expense };
}

export function expensesByCategory(monthKeys) {
  const map = {};
  for (const mk of monthKeys) {
    for (const tx of getTransactions(mk)) {
      if (tx.type !== 'expense') continue;
      map[tx.category] = (map[tx.category] ?? 0) + tx.amount;
    }
  }
  return map;
}
