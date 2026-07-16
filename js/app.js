import { getMonthKey, getDateStr, formatMonthFull, uuid } from './utils.js';
import { getSources, getTransactions, setTransactions, getCards, setCards, getCardExpenses, setCardExpenses,
         getScheduled, isMonthInit, setMonthInit } from './storage.js';
import { renderAgenda } from './pages/agenda.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderTransactions } from './pages/transactions.js';
import { renderCards } from './pages/cards.js';
import { renderGoals } from './pages/goals.js';

let currentPage = 'agenda';
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
  const pages = { agenda: renderAgenda, dashboard: renderDashboard, transactions: renderTransactions, cards: renderCards, goals: renderGoals };
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

// ── TOAST (feedback de ação) ──────────────────────────────
window.toast = function(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
};

// ── CONFIRMAÇÃO PRÓPRIA (substitui o confirm() do navegador) ──
window.appConfirm = function(msg, okLabel = 'Confirmar') {
  return new Promise(resolve => {
    const ov = document.createElement('div');
    ov.className = 'confirm-overlay';
    ov.innerHTML = `
      <div class="confirm-box">
        <div class="confirm-msg">${msg}</div>
        <div class="confirm-actions">
          <button class="btn btn-ghost" id="cf-no">Cancelar</button>
          <button class="btn btn-primary" id="cf-yes">${okLabel}</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    const done = v => { ov.remove(); resolve(v); };
    ov.querySelector('#cf-no').onclick  = () => done(false);
    ov.querySelector('#cf-yes').onclick = () => done(true);
    ov.onclick = e => { if (e.target === ov) done(false); };
  });
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

  // Assinaturas NÃO são mais copiadas para card_expenses — a fonte única
  // é card.recurring; o estado pago/não-pago do mês vive na Agenda.
  const cardExpenses = getCardExpenses(mk);
  const newCardExpenses = [...cardExpenses];
  const cards = getCards();
  for (const card of cards) {
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
function gotoMk(mk) {
  activeMk = mk;
  window._currentMk = activeMk;
  // Só inicializa meses até o atual — espiar um mês FUTURO não pode
  // criar lançamentos nem avançar parcelas de empréstimo.
  if (mk <= TODAY_MK) initMonth(mk);
  renderPage(currentPage);
}

function shiftMonth(delta) {
  const [y, m] = activeMk.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  gotoMk(getMonthKey(d));
}

window._prevMonth = () => shiftMonth(-1);
window._nextMonth = () => shiftMonth(+1);
window._gotoMonth = mk => gotoMk(mk);

window._toggleMonthPicker = function() {
  document.getElementById('month-picker')?.classList.toggle('open');
};

function buildMonthPicker() {
  // Últimos 12 meses, do atual para trás
  const [ty, tm] = TODAY_MK.split('-').map(Number);
  const items = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(ty, tm - 1 - i, 1);
    const mk = getMonthKey(d);
    items.push(`
      <button class="month-pick-item ${mk === activeMk ? 'active' : ''}" onclick="window._gotoMonth('${mk}')">
        ${formatMonthFull(mk)} ${mk === TODAY_MK ? '<span class="mp-tag">atual</span>' : ''}
      </button>`);
  }
  return items.join('');
}

function updateHeaderMonth() {
  const isPast   = activeMk < TODAY_MK;
  const isFuture = activeMk > TODAY_MK;
  const label    = formatMonthFull(activeMk);
  const badge    = isPast
    ? `<span class="month-badge past">MÊS ANTERIOR</span>`
    : isFuture
    ? `<span class="month-badge future">MÊS FUTURO</span>`
    : '';

  document.getElementById('header-month').innerHTML = `
    <div class="month-nav">
      <button class="month-arrow" onclick="window._prevMonth()">‹</button>
      <button class="month-label" onclick="window._toggleMonthPicker()">${label} <span class="month-caret">▾</span></button>
      <button class="month-arrow" onclick="window._nextMonth()"
        style="visibility:${activeMk >= TODAY_MK ? 'hidden' : 'visible'}">›</button>
    </div>
    ${badge}
    <div class="month-picker" id="month-picker">${buildMonthPicker()}</div>`;
}

// ── BACKUP (exportar / restaurar) ─────────────────────────
window._exportBackup = function() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith('financa_')) data[k] = localStorage.getItem(k);
  }
  const payload = { app: 'EFT Prosperar em Paz', exportedAt: getDateStr(), keys: Object.keys(data).length, data };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `eft-backup-${getDateStr()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('✓ Backup exportado');
};

window._importBackup = function() {
  document.getElementById('backup-file').click();
};

async function handleBackupFile(file) {
  try {
    const text = await file.text();
    const payload = JSON.parse(text);
    if (!payload?.data || typeof payload.data !== 'object') { toast('Arquivo de backup inválido'); return; }
    const n = Object.keys(payload.data).length;
    const ok = await appConfirm(
      `Restaurar backup de <b>${payload.exportedAt ?? '?'}</b> com <b>${n}</b> registros?<br><br>` +
      `<span style="color:var(--color-expense)">Os dados atuais deste aparelho serão substituídos.</span>`,
      'Restaurar');
    if (!ok) return;
    // Limpa os dados atuais do app e grava o backup
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith('financa_')) toRemove.push(k);
    }
    toRemove.forEach(k => localStorage.removeItem(k));
    for (const [k, v] of Object.entries(payload.data)) localStorage.setItem(k, v);
    toast('✓ Backup restaurado');
    setTimeout(() => location.reload(), 600);
  } catch {
    toast('Não foi possível ler o arquivo');
  }
}

// ── BOOT ─────────────────────────────────────────────────
initMonth(activeMk);
renderPage('agenda');

document.getElementById('backup-file').addEventListener('change', e => {
  const f = e.target.files[0];
  if (f) handleBackupFile(f);
  e.target.value = '';
});

// Fecha o seletor de meses ao tocar fora dele
document.addEventListener('click', e => {
  const picker = document.getElementById('month-picker');
  if (picker?.classList.contains('open') && !e.target.closest('.header-month')) {
    picker.classList.remove('open');
  }
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/Prosperar-Em-Paz/service-worker.js');
}
