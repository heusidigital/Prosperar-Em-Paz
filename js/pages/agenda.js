import { formatBRL, getMonthKey } from '../utils.js';
import { getCards, getScheduled, getSources, getClosedInvoice, setClosedInvoice,
         getAgendaPaid, setAgendaPaid } from '../storage.js';

const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

const WEEKDAYS = ['DOM','SEG','TER','QUA','QUI','SEX','SÁB'];

export function renderAgenda(mk) {
  document.getElementById('page-agenda').innerHTML = buildAgenda(mk);
  window._agendaMk = mk;
}

// ── Monta a lista única de vencimentos do mês ─────────────
// Fonte única: card.recurring (assinaturas), card.loans (empréstimos),
// fatura fechada (vencimento do cartão), programadas anuais e receitas com dia.
function buildItems(mk) {
  const [y, m] = mk.split('-').map(Number);
  const items = [];

  for (const card of getCards()) {
    for (const r of card.recurring ?? []) {
      items.push({ id: `sub_${card.id}_${r.id}`, day: r.day, icon: '📱',
                   desc: r.desc, sub: card.name, amount: r.amount, kind: 'expense',
                   cardId: card.id, recId: r.id, editable: 'sub' });
    }
    for (const loan of card.loans ?? []) {
      if (loan.paidInstallments < loan.totalInstallments) {
        items.push({ id: `loan_${loan.id}`, day: loan.day, icon: '🏦',
                     desc: `${loan.desc} (${loan.paidInstallments + 1}/${loan.totalInstallments})`,
                     sub: 'empréstimo', amount: loan.installmentAmount, kind: 'expense' });
      }
    }
    const closed = getClosedInvoice(card.id, mk);
    if (closed.amount > 0) {
      items.push({ id: `inv_${card.id}`, day: card.dueDay, icon: '💳',
                   desc: `Fatura ${card.name}`, sub: 'vencimento do cartão',
                   amount: closed.amount, kind: 'invoice', cardId: card.id, invoicePaid: closed.paid });
    }
  }

  for (const s of getScheduled()) {
    if (s.dueMonth === m) {
      items.push({ id: `sch_${s.id}`, day: s.dueDay, icon: '🗓',
                   desc: s.desc, sub: 'programada anual', amount: s.amount, kind: 'expense' });
    }
  }

  for (const src of getSources()) {
    if (src.day && src.amount && (src.type === 'fixa' || src.type === 'recorrente')) {
      items.push({ id: `inc_${src.id}`, day: src.day, icon: '💰',
                   desc: src.name, sub: 'receita', amount: src.amount, kind: 'income' });
    }
  }

  return items.sort((a, b) => a.day - b.day);
}

function buildAgenda(mk) {
  const items    = buildItems(mk);
  const paid     = getAgendaPaid(mk);
  const isNowMk  = mk === getMonthKey();
  const isPastMk = mk < getMonthKey();
  const todayDay = new Date().getDate();
  const [y, m]   = mk.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();

  const isPaid = it => it.kind === 'invoice' ? it.invoicePaid : !!paid[it.id];
  const isLate = it => it.kind !== 'income' && !isPaid(it) &&
                       (isPastMk || (isNowMk && it.day < todayDay));

  const pendentes = items.filter(it => it.kind !== 'income' && !isPaid(it));
  const lancados  = items.filter(it => it.kind !== 'income' && isPaid(it));
  const atrasados = items.filter(isLate);
  const totalPend = pendentes.reduce((s, it) => s + it.amount, 0);
  const totalPago = lancados.reduce((s, it) => s + it.amount, 0);

  if (!items.length) {
    return `
      <div class="empty-state" style="padding-top:60px">
        <p style="font-size:15px;margin-bottom:8px">Nada agendado neste mês</p>
        <p>Cadastre assinaturas em <b>Cartões</b>, despesas anuais em <b>Metas → Programadas</b><br>e receitas em <b>Lançamentos → Receitas</b>.</p>
      </div>`;
  }

  // Agrupa por dia
  const byDay = {};
  for (const it of items) (byDay[it.day] ??= []).push(it);
  const days = Object.keys(byDay).map(Number).sort((a, b) => a - b);

  const dayBlock = day => {
    const clamped = Math.min(day, daysInMonth);
    const wd      = WEEKDAYS[new Date(y, m - 1, clamped).getDay()];
    const isToday = isNowMk && day === todayDay;
    return `
      <div class="agenda-day ${isToday ? 'today' : ''}">
        <div class="agenda-day-label">
          ${wd} · DIA ${day} ${isToday ? '<span class="agenda-today-tag">HOJE</span>' : ''}
        </div>
        ${byDay[day].map(it => rowFor(it)).join('')}
      </div>`;
  };

  const rowFor = it => {
    if (it.kind === 'income') {
      return `
        <div class="agenda-row income">
          <div class="agenda-ico">${it.icon}</div>
          <div class="agenda-info">
            <div class="agenda-desc">${esc(it.desc)}</div>
            <div class="agenda-sub">${esc(it.sub)}</div>
          </div>
          <div class="agenda-amount" style="color:var(--color-income)">+ ${formatBRL(it.amount)}</div>
        </div>`;
    }
    const pago = isPaid(it);
    const late = isLate(it);
    return `
      <div class="agenda-row ${pago ? 'done' : ''}">
        <div class="agenda-ico">${it.icon}</div>
        <div class="agenda-info">
          <div class="agenda-desc">${esc(it.desc)}
            ${late ? '<span class="agenda-late-tag">ATRASADO</span>' : ''}
          </div>
          <div class="agenda-sub">${esc(it.sub)}</div>
        </div>
        <div class="agenda-amount">${formatBRL(it.amount)}</div>
        ${pago
          ? `<button class="agenda-btn undo" onclick="window._agToggle('${it.id}')" title="Desfazer">✓</button>`
          : `<button class="agenda-btn pay" onclick="window._agToggle('${it.id}')">Lancei</button>`}
      </div>`;
  };

  return `
    <div class="two-col" style="margin-bottom:12px">
      <div class="card mini-card" style="margin-bottom:0">
        <div class="mc-label">A LANÇAR NO BANCO</div>
        <div class="mc-value" style="color:var(--color-expense)">${formatBRL(totalPend)}</div>
        <div class="mc-sub">${pendentes.length} ${pendentes.length === 1 ? 'item' : 'itens'}${atrasados.length ? ` · <span style="color:var(--color-expense);font-weight:700">${atrasados.length} em atraso</span>` : ''}</div>
      </div>
      <div class="card mini-card" style="margin-bottom:0">
        <div class="mc-label">JÁ LANÇADO</div>
        <div class="mc-value" style="color:var(--color-income)">${formatBRL(totalPago)}</div>
        <div class="mc-sub">${lancados.length} ${lancados.length === 1 ? 'item' : 'itens'} ✓</div>
      </div>
    </div>

    <div class="card" style="padding:6px 16px 10px">
      ${days.map(dayBlock).join('')}
    </div>

    <p class="text-muted" style="text-align:center;margin:6px 0 10px;font-size:10px">
      Assinaturas e empréstimos são editados em <b>Cartões</b> · programadas em <b>Metas</b>
    </p>`;
}

// ── Marca / desmarca como lançado ─────────────────────────
window._agToggle = function(id) {
  const mk = window._agendaMk;
  if (id.startsWith('inv_')) {
    const cardId = id.slice(4);
    const cur = getClosedInvoice(cardId, mk);
    setClosedInvoice(cardId, mk, { ...cur, paid: !cur.paid });
    toast(cur.paid ? 'Fatura reaberta' : '✓ Fatura paga');
  } else {
    const paid = getAgendaPaid(mk);
    if (paid[id]) { delete paid[id]; toast('Lançamento desfeito'); }
    else          { paid[id] = true;  toast('✓ Lançado no banco'); }
    setAgendaPaid(mk, paid);
  }
  renderAgenda(mk);
};
