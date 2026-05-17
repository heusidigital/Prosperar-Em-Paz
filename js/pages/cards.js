import { formatBRL, installmentQuitMonth } from '../utils.js';
import { getCards, getCardExpenses, getInvoiceStatus, setInvoiceStatus } from '../storage.js';
import { openCardExpenseModal, openAddRecurringModal, openAddLoanModal, openCardConfigModal } from '../modals/card-modal.js';

const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

export function renderCards(mk) {
  const el    = document.getElementById('page-cards');
  const cards = getCards();
  window._cardMk = mk;

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
  const recurring = expenses.filter(e => e.isRecurring);
  const loans     = expenses.filter(e => e.isLoan);
  const avulsos   = expenses.filter(e => !e.isRecurring && !e.isLoan);
  const fatura    = expenses.reduce((s,e) => s + e.amount, 0);
  const available = card.limit ? card.limit - fatura : null;
  const status    = getInvoiceStatus(card.id, mk);
  const cardLoans = (card.loans ?? []).filter(l => l.paidInstallments < l.totalInstallments);

  return `
    <div class="card-dark" style="margin-bottom:0;border-radius:var(--radius) var(--radius) 0 0">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div style="font-size:8px;letter-spacing:1px;color:#ffffff55">CARTÃO</div>
          <div style="font-size:16px;font-weight:700;color:#fff;margin-top:2px">${esc(card.name)}</div>
          <div style="font-size:10px;color:#ffffff55;margin-top:4px">Fecha dia ${card.closeDay} · Vence dia ${card.dueDay}</div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="window._openCardConfig('${card.id}')" style="color:#ffffff99;border-color:#ffffff33">Editar</button>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:14px">
        <div>
          <div style="font-size:9px;color:#ffffff55;letter-spacing:1px">FATURA DO MÊS</div>
          <div style="font-size:22px;font-weight:700;color:var(--color-gold)">${formatBRL(fatura)}</div>
          ${available !== null ? `<div style="font-size:9px;color:#ffffff55;margin-top:2px">Disponível: ${formatBRL(available)}</div>` : ''}
        </div>
        <button class="btn btn-sm"
          style="background:${status==='paga'?'var(--color-income-dim)':'var(--color-expense-dim)'};color:${status==='paga'?'var(--color-income)':'var(--color-expense)'};border:1px solid currentColor"
          onclick="window._toggleInvoice('${card.id}')">
          ${status === 'paga' ? '✓ Paga' : 'Marcar paga'}
        </button>
      </div>
    </div>

    <div class="card" style="border-radius:0 0 var(--radius) var(--radius);margin-bottom:16px">

      <div class="section-label">
        ASSINATURAS
        <button class="btn btn-ghost btn-sm" onclick="window._openRecurring('${card.id}')">+ Adicionar</button>
      </div>
      ${recurring.length ? recurring.map(e => `
        <div class="item-row">
          <div>
            <div class="item-name">${esc(e.desc)}</div>
            <div class="item-meta">Dia ${e.date.split('-')[2].replace(/^0/,'')}</div>
          </div>
          <div class="item-amount expense">${formatBRL(e.amount)}</div>
        </div>`).join('') : '<p class="text-muted" style="padding:8px 0">Nenhuma assinatura</p>'}

      <div class="divider"></div>

      <div class="section-label">
        EMPRÉSTIMOS
        <button class="btn btn-ghost btn-sm" onclick="window._openLoan('${card.id}')">+ Adicionar</button>
      </div>
      ${cardLoans.length ? cardLoans.map(loan => `
        <div class="item-row">
          <div>
            <div class="item-name">${esc(loan.desc)}</div>
            <div class="item-meta">Parcela ${loan.paidInstallments} de ${loan.totalInstallments} · quita em ${installmentQuitMonth(loan.startMonth, loan.totalInstallments)}</div>
          </div>
          <div class="item-amount expense">${formatBRL(loan.installmentAmount)}</div>
        </div>`).join('') : '<p class="text-muted" style="padding:8px 0">Nenhum empréstimo ativo</p>'}

      <div class="divider"></div>

      <div class="section-label">
        GASTOS AVULSOS
        <button class="btn btn-primary btn-sm" onclick="window._openCardExpense('${card.id}')">+ Gasto</button>
      </div>
      ${avulsos.length ? avulsos.sort((a,b) => b.date.localeCompare(a.date)).map(e => `
        <div class="item-row">
          <div>
            <div class="item-name">${esc(e.desc)}</div>
            <div class="item-meta">${e.date}</div>
          </div>
          <div class="item-amount expense">${formatBRL(e.amount)}</div>
        </div>`).join('') : '<p class="text-muted" style="padding:8px 0">Nenhum gasto avulso</p>'}
    </div>`;
}

window._openCardExpense = id => openCardExpenseModal(window._cardMk, id);
window._openRecurring   = id => openAddRecurringModal(id);
window._openLoan        = id => openAddLoanModal(id);
window._openCardConfig  = id => openCardConfigModal(id);
window._toggleInvoice   = function(cardId) {
  const mk  = window._cardMk;
  const cur = getInvoiceStatus(cardId, mk);
  setInvoiceStatus(cardId, mk, cur === 'paga' ? 'aberta' : 'paga');
  renderCards(mk);
};
