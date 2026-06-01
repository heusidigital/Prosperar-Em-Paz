import { getMonthKey, getDateStr, formatMonthFull, uuid } from './utils.js';
import { getSources, getTransactions, setTransactions, getCards, setCards, getCardExpenses, setCardExpenses,
         getScheduled, isMonthInit, setMonthInit } from './storage.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderTransactions } from './pages/transactions.js';
import { renderCards } from './pages/cards.js';
import { renderGoals } from './pages/goals.js';

let currentPage = 'dashboard';
let activeMk = getMonthKey();          // mês exibido (pode ser passado/futuro)
const TODAY_MK = getMonthKey();        // mês real de hoje (fixo)
window._currentMk = activeMk;

// ── ROUTER ───────────────────────────────────────────────
window.navigate = function(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  document.querySelector(`.nav-item[data-page="${page}"]`).classList.add('active');
  currentPage = page;
  renderPage(page);
};

function renderPage(page) {
  const pages = { dashboard: renderDashboard, transactions: renderTransactions, cards: renderCards, goals: renderGoals };
  pages[page]?.(activeMk);
  updateHeaderMonth();
}

// ── MODAL ─────────────────────────────────────────────────
window.openModal = function(html) {
  document.getElementById('modal-container').innerHTML = html;
  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('modal-container').classList.add('open');
};

window.closeModal = function() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.getElementById('modal-container').classList.remove('open');
  renderPage(currentPage);
};

// ── MONTHLY INIT ──────────────────────────────────────────
function initMonth(mk) {
  if (isMonthInit(mk)) return;

  const existing = getTransactions(mk);
  const toAdd = [];
  const today = getDateStr();

  for (const src of getSources()) {
    if (src.type === 'fixa') {
      toAdd.push({ id: uuid(), date: today, type: 'income', sourceId: src.id, amount: src.amount, desc: src.name, confirmed: true });
    } else if (src.type === 'recorrente') {
      toAdd.push({ id: uuid(), date: today, type: 'income', sourceId: src.id, amount: src.amount, desc: src.name, confirmed: false });
    }
  }

  const [y, m] = mk.split('-').map(Number);
  const cardExpenses = getCardExpenses(mk);
  const newCardExpenses = [...cardExpenses];
  const cards = getCards();
  for (const card of cards) {
    for (const rec of card.recurring ?? []) {
      const dateStr = `${y}-${String(m).padStart(2,'0')}-${String(rec.day).padStart(2,'0')}`;
      newCardExpenses.push({ id: uuid(), cardId: card.id, date: dateStr, desc: rec.desc, amount: rec.amount, isRecurring: true });
    }
    for (const loan of card.loans ?? []) {
      if (loan.paidInstallments < loan.totalInstallments) {
        const dateStr = `${y}-${String(m).padStart(2,'0')}-${String(loan.day).padStart(2,'0')}`;
        newCardExpenses.push({ id: uuid(), cardId: card.id, date: dateStr, desc: `${loan.desc} (${loan.paidInstallments + 1}/${loan.totalInstallments})`, amount: loan.installmentAmount, isLoan: true, loanId: loan.id });
        loan.paidInstallments += 1;
      }
    }
  }
  setCards(cards);   // persist updated paidInstallments
  setCardExpenses(mk, newCardExpenses);

  const scheduledForMonth = getScheduled().filter(s => s.dueMonth === m);
  for (const s of scheduledForMonth) {
    const dateStr = `${y}-${String(m).padStart(2,'0')}-${String(s.dueDay).padStart(2,'0')}`;
    toAdd.push({ id: uuid(), date: dateStr, type: 'expense', amount: s.amount, category: s.category ?? 'outros', desc: s.desc, confirmed: false, isScheduled: true });
  }

  setTransactions(mk, [...existing, ...toAdd]);
  setMonthInit(mk);
}

// ── NAVEGAÇÃO DE MÊS ─────────────────────────────────────
function shiftMonth(delta) {
  const [y, m] = activeMk.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  activeMk = getMonthKey(d);
  window._currentMk = activeMk;
  initMonth(activeMk);   // safe: só executa se o mês ainda não foi inicializado
  renderPage(currentPage);
}

window._prevMonth = () => shiftMonth(-1);
window._nextMonth = () => shiftMonth(+1);

function updateHeaderMonth() {
  const isPast   = activeMk < TODAY_MK;
  const isFuture = activeMk > TODAY_MK;
  const label    = formatMonthFull(activeMk);
  const badge    = isPast
    ? `<span style="font-size:9px;background:#c9a84c33;color:var(--color-gold);border-radius:4px;padding:1px 6px;margin-left:6px">MÊS ANTERIOR</span>`
    : isFuture
    ? `<span style="font-size:9px;background:#00e5ff22;color:#00e5ff;border-radius:4px;padding:1px 6px;margin-left:6px">MÊS FUTURO</span>`
    : '';

  document.getElementById('header-month').innerHTML = `
    <div style="display:flex;align-items:center;gap:4px;justify-content:flex-end">
      <button onclick="window._prevMonth()"
        style="background:none;border:none;color:#ffffff99;font-size:16px;cursor:pointer;padding:0 4px;line-height:1">‹</button>
      <span>${label}${badge}</span>
      <button onclick="window._nextMonth()"
        style="background:none;border:none;color:#ffffff99;font-size:16px;cursor:pointer;padding:0 4px;line-height:1;
               visibility:${activeMk >= TODAY_MK ? 'hidden' : 'visible'}">›</button>
    </div>`;
}

// ── BOOT ─────────────────────────────────────────────────
initMonth(activeMk);
renderPage('dashboard');

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/Prosperar-Em-Paz/service-worker.js');
}
