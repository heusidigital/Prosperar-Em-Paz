import { formatBRL, getMonthRange, getPastMonths, formatMonthLabel } from '../utils.js';
import { sumTransactions, expensesByCategory, getCards, getCardExpenses, getClosedInvoice } from '../storage.js';

const CATEGORY_LABELS = {
  alimentacao: '🍔 Alimentação', transporte: '🚗 Transporte',
  moradia: '🏠 Moradia', saude: '💊 Saúde',
  lazer: '🎮 Lazer', educacao: '📚 Educação', outros: '📦 Outros'
};

const PERIODS = [
  { id: 'mes', label: 'Mês' },
  { id: 'bimestral', label: 'Bimestral' },
  { id: 'semestral', label: 'Semestral' },
  { id: 'anual', label: 'Anual' },
];

let currentPeriod = 'mes';

export function renderDashboard(mk) {
  document.getElementById('page-dashboard').innerHTML = buildDashboard(mk, currentPeriod);
}

function buildDashboard(mk, period) {
  const monthKeys = getMonthRange(period);
  const { income, expense, balance } = sumTransactions(monthKeys);
  const catMap = expensesByCategory(monthKeys);
  const topCats = Object.entries(catMap).sort((a,b) => b[1]-a[1]).slice(0,4);
  const maxCat = topCats[0]?.[1] ?? 1;
  const pastMonths = getPastMonths(6);
  const cards = getCards();

  const periodLabel = monthKeys.length === 1
    ? formatMonthLabel(monthKeys[0])
    : `${formatMonthLabel(monthKeys[0])} → ${formatMonthLabel(monthKeys[monthKeys.length-1])}`;

  const avgLabel    = monthKeys.length > 1 ? `média ${formatBRL(Math.round(income/monthKeys.length))}/mês` : '';
  const avgExpLabel = monthKeys.length > 1 ? `média ${formatBRL(Math.round(expense/monthKeys.length))}/mês` : '';

  return `
    <div class="period-bar">
      ${PERIODS.map(p => `
        <button class="period-btn ${p.id === period ? 'active' : ''}"
          onclick="window._dashPeriod('${p.id}')">
          ${p.label}
        </button>`).join('')}
    </div>

    <p class="text-muted" style="text-align:center;margin-bottom:12px;font-size:10px;letter-spacing:1px">${periodLabel}</p>

    <div class="card saldo-block" style="margin-bottom:10px">
      <div class="label">ECONOMIA DO PERÍODO</div>
      <div class="value" style="color:${balance >= 0 ? 'var(--color-income)' : 'var(--color-expense)'}">${formatBRL(balance)}</div>
      <div class="sub">receitas − despesas</div>
    </div>

    <div class="two-col">
      <div class="card mini-card income">
        <div class="mc-label">RECEITAS</div>
        <div class="mc-value">${formatBRL(income)}</div>
        ${avgLabel ? `<div class="mc-sub">${avgLabel}</div>` : ''}
      </div>
      <div class="card mini-card expense">
        <div class="mc-label">DESPESAS</div>
        <div class="mc-value">${formatBRL(expense)}</div>
        ${avgExpLabel ? `<div class="mc-sub">${avgExpLabel}</div>` : ''}
      </div>
    </div>

    <div class="card">
      <div class="section-label">EVOLUÇÃO — 6 MESES</div>
      ${buildChart(pastMonths, mk)}
      <div style="display:flex;gap:14px;margin-top:8px">
        <span style="font-size:9px;color:var(--color-text-muted);display:flex;align-items:center;gap:4px">
          <span style="width:8px;height:4px;border-radius:2px;background:var(--color-income);display:inline-block"></span>Receita
        </span>
        <span style="font-size:9px;color:var(--color-text-muted);display:flex;align-items:center;gap:4px">
          <span style="width:8px;height:4px;border-radius:2px;background:var(--color-expense);display:inline-block"></span>Despesa
        </span>
      </div>
    </div>

    ${cards.length ? `
    <div class="section-label" style="margin-top:4px">CARTÕES</div>
    <div class="two-col">
      ${cards.map(c => buildCardChip(c, mk)).join('')}
    </div>` : ''}

    ${topCats.length ? `
    <div class="card" style="margin-top:2px">
      <div class="section-label">TOP CATEGORIAS</div>
      ${topCats.map(([cat, amt]) => `
        <div class="cat-row">
          <div class="cat-name">${CATEGORY_LABELS[cat] ?? cat}</div>
          <div class="cat-bar-wrap">
            <div class="progress-wrap">
              <div class="progress-fill progress-expense" style="width:${Math.round(amt/maxCat*100)}%"></div>
            </div>
          </div>
          <div class="cat-val">${formatBRL(amt)}</div>
        </div>`).join('')}
    </div>` : ''}
  `;
}

function buildChart(months, currentMk) {
  const data = months.map(mk => sumTransactions([mk]));
  const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expense)), 1);
  return `
    <div class="chart-wrap">
      ${months.map((mk, i) => {
        const { income, expense } = data[i];
        const ih = Math.round((income / maxVal) * 65);
        const eh = Math.round((expense / maxVal) * 65);
        return `
          <div class="chart-group ${mk === currentMk ? 'current' : ''}">
            <div class="chart-bars">
              <div class="chart-bar chart-bar-income" style="height:${ih}px"></div>
              <div class="chart-bar chart-bar-expense" style="height:${eh}px"></div>
            </div>
            <div class="chart-month">${formatMonthLabel(mk).slice(0,3)}</div>
          </div>`;
      }).join('')}
    </div>`;
}

function buildCardChip(card, mk) {
  const expenses    = getCardExpenses(mk).filter(e => e.cardId === card.id);
  const avulsos     = expenses.filter(e => !e.isRecurring && !e.isLoan);
  const closeDay    = card.closeDay ?? 1;
  const todayDay    = new Date().getDate();
  const totalSubs   = (card.recurring ?? []).filter(r => r.day > closeDay && r.day <= todayDay).reduce((s, r) => s + r.amount, 0);
  const totalAvulso = avulsos.reduce((s, e) => s + e.amount, 0);
  const corrente    = totalSubs + totalAvulso;
  const closed      = getClosedInvoice(card.id, mk);

  return `
    <div class="card-dark">
      <div style="font-size:8px;letter-spacing:1px;color:#ffffff55;margin-bottom:4px">CARTÃO</div>
      <div style="font-size:12px;font-weight:700;color:#fff;margin-bottom:10px">${card.name}</div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div>
          <div style="font-size:8px;color:#ffffff55;letter-spacing:1px;margin-bottom:2px">CORRENTE</div>
          <div style="font-size:13px;font-weight:700;color:var(--color-expense)">${formatBRL(corrente)}</div>
        </div>
        <div>
          <div style="font-size:8px;color:#ffffff55;letter-spacing:1px;margin-bottom:2px">FECHADA</div>
          <div style="font-size:13px;font-weight:700;color:${closed.amount > 0 ? (closed.paid ? 'var(--color-income)' : 'var(--color-gold)') : '#ffffff33'}">
            ${closed.amount > 0 ? formatBRL(closed.amount) : '—'}
          </div>
          ${closed.amount > 0 && !closed.paid ? `<div style="font-size:9px;color:var(--color-gold)">em aberto</div>` : ''}
          ${closed.paid ? `<div style="font-size:9px;color:var(--color-income)">✓ paga</div>` : ''}
        </div>
      </div>
      <div style="font-size:9px;color:#ffffff44;margin-top:6px">vence dia ${card.dueDay}</div>
    </div>`;
}

window._dashPeriod = function(period) {
  currentPeriod = period;
  renderDashboard(window._currentMk);
};
