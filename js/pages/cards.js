import { formatBRL, installmentQuitMonth } from '../utils.js';
import { getCards, setCards, getCardExpenses, setCardExpenses, removeCardExpense, getClosedInvoice, setClosedInvoice } from '../storage.js';
import { openCardExpenseModal, openAddRecurringModal, openAddLoanModal, openCardConfigModal, openClosedInvoiceModal } from '../modals/card-modal.js';

const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

export function renderCards(mk) {
  const el    = document.getElementById('page-cards');
  const cards = getCards();
  window._cardMk = mk;
  window._renderCardsAfterModal = () => renderCards(mk);

  if (!cards.length) {
    el.innerHTML = `
      <div class="empty-state" style="padding-top:60px">
        <p style="margin-bottom:20px">Nenhum cartão cadastrado</p>
        <button class="btn btn-primary" onclick="window._openCardConfig('')">+ Adicionar Cartão</button>
      </div>`;
    return;
  }

  el.innerHTML = cards.map(card => buildCardSection(card, mk)).join('') +
    (cards.length < 2 ? `<button class="btn btn-ghost" style="width:100%;margin-top:4px" onclick="window._openCardConfig('')">+ Adicionar Cartão</button>` : '');
}

function buildCardSection(card, mk) {
  const expenses  = getCardExpenses(mk).filter(e => e.cardId === card.id);
  const loans     = expenses.filter(e => e.isLoan);
  const avulsos   = expenses.filter(e => !e.isRecurring && !e.isLoan);
  const cardLoans = (card.loans ?? []).filter(l => l.paidInstallments < l.totalInstallments);

  // ── FATURA FECHADA (manual) ──────────────────────────────
  const closed    = getClosedInvoice(card.id, mk);       // { amount, paid }

  // ── FATURA CORRENTE (auto-calculated) ────────────────────
  // Assinaturas com day > closeDay pertencem ao ciclo corrente (ex: Nubank fecha dia 15 → day 16-31)
  // Regra de virada de mês:
  //   Se hoje < closeDay → estamos ANTES do fechamento deste mês.
  //     As assinaturas day > closeDay rodaram NO MÊS PASSADO — todas já cobradas.
  //   Se hoje >= closeDay → estamos APÓS o fechamento, novo ciclo aberto.
  //     Apenas as que já passaram este mês (day > closeDay AND day <= hoje).
  const closeDay = card.closeDay ?? 1;
  const todayDay = new Date().getDate();

  // Todas as assinaturas aparecem em toda fatura — nunca em duplicidade.
  // Ciclo de faturamento (ex: fecha dia 14):
  //   Antes do fechamento (hoje < 14):
  //     Período = dia 15 mês passado → dia 14 deste mês
  //     Já cobradas: day > closeDay (rodaram mês passado) OU day <= hoje (já rodaram este mês)
  //     Em breve:    day > hoje E day <= closeDay (vão cobrar ainda antes do fechamento)
  //   Após o fechamento (hoje >= 14):
  //     Novo ciclo começou — apenas as que já passaram neste novo ciclo
  //     Já cobradas: day > closeDay E day <= hoje
  //     Em breve:    day > hoje (ainda neste mês)
  let subsJaVencidas, subsAVencer;
  if (todayDay < closeDay) {
    subsJaVencidas = (card.recurring ?? []).filter(r => r.day > closeDay || r.day <= todayDay);
    subsAVencer    = (card.recurring ?? []).filter(r => r.day > todayDay && r.day <= closeDay);
  } else {
    subsJaVencidas = (card.recurring ?? []).filter(r => r.day > closeDay && r.day <= todayDay);
    subsAVencer    = (card.recurring ?? []).filter(r => r.day > todayDay);
  }

  const totalSubs   = subsJaVencidas.reduce((s, r) => s + r.amount, 0);
  // Empréstimos NÃO entram — dívidas separadas (boleto/débito)
  const totalAvulso = avulsos.reduce((s, e) => s + e.amount, 0);
  const corrente    = totalSubs + totalAvulso;

  return `
    <div class="card-dark" style="margin-bottom:0;border-radius:var(--radius) var(--radius) 0 0">
      <!-- Card title row -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
        <div>
          <div style="font-size:8px;letter-spacing:1px;color:#ffffff55">CARTÃO</div>
          <div style="font-size:16px;font-weight:700;color:#fff;margin-top:2px">${esc(card.name)}</div>
          <div style="font-size:10px;color:#ffffff55;margin-top:4px">Fecha dia ${card.closeDay} · Vence dia ${card.dueDay}</div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="window._openCardConfig('${card.id}')" style="color:#ffffff99;border-color:#ffffff33">Editar</button>
      </div>

      <!-- Dual invoice row -->
      <div style="display:grid;grid-template-columns:1fr 1px 1fr;gap:0;align-items:start">

        <!-- Left: FATURA CORRENTE (auto-calculada) -->
        <div style="padding-right:12px">
          <div style="font-size:8px;letter-spacing:1px;color:#ffffff55;margin-bottom:4px">FATURA CORRENTE</div>
          <div style="font-size:20px;font-weight:700;color:var(--color-expense)">${formatBRL(corrente)}</div>

          <div style="margin-top:10px;font-size:11px;color:#ffffff88;line-height:1.9">
            ${subsJaVencidas.length > 0
              ? subsJaVencidas.map(r => `<div>📱 ${esc(r.desc)} <b>${formatBRL(r.amount)}</b></div>`).join('')
              : `<div style="color:#ffffff44;font-size:10px">Nenhuma assinatura vencida ainda</div>`}
            ${subsAVencer.length > 0
              ? `<div style="color:#ffffff44;font-size:10px;margin-top:4px">
                   Em breve: ${subsAVencer.map(r => `dia ${r.day}`).join(', ')}
                 </div>`
              : ''}
            ${totalAvulso > 0
              ? `<div>🧾 Avulsos: <b>${formatBRL(totalAvulso)}</b></div>`
              : ''}
          </div>

          <button onclick="window._openCardExpense('${card.id}')"
            style="margin-top:10px;background:var(--color-expense-dim);border:1px solid var(--color-expense);
                   color:var(--color-expense);border-radius:6px;padding:5px 12px;
                   font-size:11px;cursor:pointer;width:100%">
            + Adicionar gasto
          </button>
          ${avulsos.length > 0 ? `
          <button onclick="window._clearAvulsos('${card.id}')"
            style="margin-top:6px;background:none;border:1px solid #ffffff22;color:#ffffff44;
                   border-radius:6px;padding:4px 12px;font-size:10px;cursor:pointer;width:100%">
            🗑 Limpar avulsos antigos
          </button>` : ''}
        </div>

        <!-- Divider -->
        <div style="background:#ffffff22;width:1px;align-self:stretch"></div>

        <!-- Right: FATURA FECHADA (manual) -->
        <div style="padding-left:12px">
          <div style="font-size:8px;letter-spacing:1px;color:#ffffff55;margin-bottom:4px">FATURA FECHADA</div>
          <div style="font-size:20px;font-weight:700;color:${closed.paid ? 'var(--color-income)' : 'var(--color-gold)'}">
            ${formatBRL(closed.amount)}
          </div>
          ${closed.paid
            ? `<div style="font-size:11px;color:var(--color-income);margin-top:3px">✓ Paga</div>`
            : closed.amount > 0
              ? `<div style="font-size:11px;color:#ffffff88;margin-top:3px">Aguardando pagamento</div>`
              : `<div style="font-size:11px;color:#ffffff44;margin-top:3px">Sem fatura fechada</div>`
          }
          <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">
            <button onclick="window._openClosedInvoice('${card.id}')"
              style="background:#ffffff15;border:1px solid #ffffff33;color:#fff;border-radius:6px;
                     padding:5px 10px;font-size:11px;cursor:pointer">
              ${closed.amount > 0 ? '✏️ Editar' : '+ Lançar fatura'}
            </button>
            ${closed.amount > 0 && !closed.paid ? `
            <button onclick="window._payClosedInvoice('${card.id}')"
              style="background:var(--color-income-dim);border:1px solid var(--color-income);
                     color:var(--color-income);border-radius:6px;padding:5px 10px;font-size:11px;cursor:pointer">
              ✓ Pagar
            </button>` : ''}
            ${closed.paid ? `
            <button onclick="window._reopenClosedInvoice('${card.id}')"
              style="background:none;border:1px solid #ffffff33;color:#ffffff66;border-radius:6px;
                     padding:5px 10px;font-size:11px;cursor:pointer">
              Reabrir
            </button>` : ''}
          </div>
        </div>
      </div>
    </div>

    <div class="card" style="border-radius:0 0 var(--radius) var(--radius);margin-bottom:16px">

      <div class="section-label">
        ASSINATURAS
        <button class="btn btn-ghost btn-sm" onclick="window._openRecurring('${card.id}')">+ Adicionar</button>
      </div>
      ${card.recurring?.length ? card.recurring.map(r => `
        <div class="item-row">
          <div style="flex:1">
            <div class="item-name">${esc(r.desc)}</div>
            <div class="item-meta">Dia ${r.day}</div>
          </div>
          <div style="display:flex;align-items:center;gap:2px">
            <div class="item-amount expense" style="margin-right:6px">${formatBRL(r.amount)}</div>
            <button class="icon-btn" onclick="window._crEdit('${card.id}','${r.id}')" title="Editar">✏️</button>
            <button class="icon-btn danger" onclick="window._crDelete('${card.id}','${r.id}')" title="Excluir">🗑</button>
          </div>
        </div>`).join('') : '<p class="text-muted" style="padding:8px 0">Nenhuma assinatura</p>'}

      <div class="divider"></div>

      <div class="section-label">
        EMPRÉSTIMOS
        <button class="btn btn-ghost btn-sm" onclick="window._openLoan('${card.id}')">+ Adicionar</button>
      </div>
      ${cardLoans.length ? cardLoans.map(loan => `
        <div class="item-row">
          <div style="flex:1">
            <div class="item-name">${esc(loan.desc)}</div>
            <div class="item-meta">Parcela ${loan.paidInstallments + 1} de ${loan.totalInstallments} · dia ${loan.day} · quita em ${installmentQuitMonth(loan.startMonth, loan.totalInstallments)}</div>
          </div>
          <div style="display:flex;align-items:center;gap:2px">
            <div class="item-amount expense" style="margin-right:6px">${formatBRL(loan.installmentAmount)}</div>
            <button class="icon-btn" onclick="window._lnEdit('${card.id}','${loan.id}')" title="Editar">✏️</button>
            <button class="icon-btn danger" onclick="window._lnDelete('${card.id}','${loan.id}')" title="Excluir">🗑</button>
          </div>
        </div>`).join('') : '<p class="text-muted" style="padding:8px 0">Nenhum empréstimo ativo</p>'}

      <div class="divider"></div>

      <div class="section-label">
        GASTOS AVULSOS
        <button class="btn btn-primary btn-sm" onclick="window._openCardExpense('${card.id}')">+ Gasto</button>
      </div>
      ${avulsos.length ? avulsos.sort((a,b) => b.date.localeCompare(a.date)).map(e => `
        <div class="item-row">
          <div style="flex:1">
            <div class="item-name">${esc(e.desc)}</div>
            <div class="item-meta">${e.date}</div>
          </div>
          <div style="display:flex;align-items:center;gap:2px">
            <div class="item-amount expense" style="margin-right:6px">${formatBRL(e.amount)}</div>
            <button class="icon-btn" onclick="window._ceEdit('${e.id}')" title="Editar">✏️</button>
            <button class="icon-btn danger" onclick="window._delCardExpense('${e.id}')" title="Excluir">🗑</button>
          </div>
        </div>`).join('') : '<p class="text-muted" style="padding:8px 0">Nenhum gasto avulso</p>'}
    </div>`;
}

window._openCardExpense    = id => openCardExpenseModal(window._cardMk, id);
window._openRecurring      = id => openAddRecurringModal(id);
window._crEdit = function(cardId, recurringId) {
  const card = getCards().find(c => c.id === cardId);
  const rec  = card?.recurring?.find(r => r.id === recurringId);
  if (rec) openAddRecurringModal(cardId, rec);
};
window._openLoan           = id => openAddLoanModal(id);
window._openCardConfig     = id => openCardConfigModal(id);
window._openClosedInvoice  = id => openClosedInvoiceModal(id);
// _crDelete está definido em card-modal.js (importado acima)

window._lnEdit = function(cardId, loanId) {
  const card = getCards().find(c => c.id === cardId);
  const loan = card?.loans?.find(l => l.id === loanId);
  if (loan) openAddLoanModal(cardId, loan);
};

window._lnDelete = async function(cardId, loanId) {
  if (!await appConfirm('Excluir este empréstimo? As parcelas futuras não serão mais lançadas.', 'Excluir')) return;
  const cards = getCards();
  const card  = cards.find(c => c.id === cardId);
  if (!card) return;
  card.loans = (card.loans ?? []).filter(l => l.id !== loanId);
  setCards(cards);
  toast('✓ Empréstimo excluído');
  renderCards(window._cardMk);
};

window._ceEdit = function(expId) {
  const mk  = window._cardMk;
  const exp = getCardExpenses(mk).find(e => e.id === expId);
  if (exp) openCardExpenseModal(mk, exp.cardId, exp);
};

window._payClosedInvoice = function(cardId) {
  const mk = window._cardMk;
  const cur = getClosedInvoice(cardId, mk);
  setClosedInvoice(cardId, mk, { ...cur, paid: true });
  renderCards(mk);
};

window._reopenClosedInvoice = function(cardId) {
  const mk = window._cardMk;
  const cur = getClosedInvoice(cardId, mk);
  setClosedInvoice(cardId, mk, { ...cur, paid: false });
  renderCards(mk);
};

window._delCardExpense = async function(expId) {
  if (!await appConfirm('Remover este gasto avulso?', 'Remover')) return;
  const mk = window._cardMk;
  removeCardExpense(mk, expId);
  toast('✓ Gasto removido');
  renderCards(mk);
};

window._clearAvulsos = async function(cardId) {
  if (!await appConfirm('Remover <b>todos</b> os gastos avulsos deste cartão no mês atual?<br><br>Use isso para zerar os lançamentos antigos antes de começar pelo novo sistema.', 'Remover tudo')) return;
  const mk = window._cardMk;
  // mantém assinaturas e empréstimos, remove apenas avulsos deste cartão
  const remaining = getCardExpenses(mk).filter(e => e.cardId !== cardId || e.isRecurring || e.isLoan);
  setCardExpenses(mk, remaining);
  toast('✓ Avulsos removidos');
  renderCards(mk);
};
