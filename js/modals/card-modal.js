import { uuid, getDateStr, installmentQuitMonth, getMonthKey } from '../utils.js';
import { getCards, setCards, addCardExpense, getCardExpenses, setCardExpenses } from '../storage.js';

const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

export function openCardExpenseModal(mk, cardId) {
  const card = getCards().find(c => c.id === cardId);
  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">Gasto — ${esc(card.name)}</div>
    <div class="form-group">
      <label class="form-label">DESCRIÇÃO</label>
      <input class="form-input" id="ce-desc" placeholder="Ex: Farmácia">
    </div>
    <div class="form-group">
      <label class="form-label">VALOR (R$)</label>
      <input class="form-input" id="ce-amount" type="number" step="0.01" min="0" placeholder="0,00">
    </div>
    <div class="form-group">
      <label class="form-label">DATA</label>
      <input class="form-input" id="ce-date" type="date" value="${getDateStr()}">
    </div>
    <button class="btn btn-primary" style="width:100%;margin-top:8px" onclick="window._ceSave('${mk}','${cardId}')">Adicionar</button>
  `);
}

export function openAddRecurringModal(cardId) {
  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">Nova Assinatura</div>
    <div class="form-group">
      <label class="form-label">DESCRIÇÃO</label>
      <input class="form-input" id="cr-desc" placeholder="Ex: Netflix">
    </div>
    <div class="form-group">
      <label class="form-label">VALOR (R$)</label>
      <input class="form-input" id="cr-amount" type="number" step="0.01" min="0" placeholder="0,00">
    </div>
    <div class="form-group">
      <label class="form-label">DIA DO MÊS</label>
      <input class="form-input" id="cr-day" type="number" min="1" max="31" placeholder="Ex: 18">
    </div>
    <button class="btn btn-primary" style="width:100%;margin-top:8px" onclick="window._crSave('${cardId}')">Salvar</button>
  `);
}

export function openAddLoanModal(cardId) {
  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">Novo Empréstimo</div>
    <div class="form-group">
      <label class="form-label">DESCRIÇÃO</label>
      <input class="form-input" id="ln-desc" placeholder="Ex: Empréstimo pessoal">
    </div>
    <div class="form-group">
      <label class="form-label">VALOR DA PARCELA (R$)</label>
      <input class="form-input" id="ln-amount" type="number" step="0.01" min="0" placeholder="0,00">
    </div>
    <div class="form-group">
      <label class="form-label">TOTAL DE PARCELAS</label>
      <input class="form-input" id="ln-total" type="number" min="1" placeholder="Ex: 24">
    </div>
    <div class="form-group">
      <label class="form-label">DIA DO PAGAMENTO</label>
      <input class="form-input" id="ln-day" type="number" min="1" max="31" placeholder="Ex: 10">
    </div>
    <button class="btn btn-primary" style="width:100%;margin-top:8px" onclick="window._lnSave('${cardId}')">Salvar</button>
  `);
}

export function openCardConfigModal(cardId) {
  const cards  = getCards();
  const card   = cards.find(c => c.id === cardId) ?? { name: '', limit: 0, closeDay: 1, dueDay: 10, recurring: [], loans: [] };
  const isNew  = !cardId || !cards.find(c => c.id === cardId);
  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">${isNew ? 'Novo Cartão' : 'Configurar Cartão'}</div>
    <div class="form-group">
      <label class="form-label">NOME DO CARTÃO</label>
      <input class="form-input" id="cfg-name" placeholder="Ex: Nubank" value="${esc(card.name)}">
    </div>
    <div class="form-group">
      <label class="form-label">LIMITE (R$)</label>
      <input class="form-input" id="cfg-limit" type="number" step="0.01" min="0" placeholder="0,00" value="${card.limit ? (card.limit/100).toFixed(2) : ''}">
    </div>
    <div class="two-col">
      <div class="form-group">
        <label class="form-label">FECHA DIA</label>
        <input class="form-input" id="cfg-close" type="number" min="1" max="31" value="${card.closeDay || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">VENCE DIA</label>
        <input class="form-input" id="cfg-due" type="number" min="1" max="31" value="${card.dueDay || ''}">
      </div>
    </div>
    <button class="btn btn-primary" style="width:100%;margin-top:8px" onclick="window._cfgSave('${card.id ?? ''}')">Salvar</button>
  `);
}

window._ceSave = function(mk, cardId) {
  const desc   = document.getElementById('ce-desc').value.trim();
  const amount = Math.round(parseFloat(document.getElementById('ce-amount').value) * 100);
  const date   = document.getElementById('ce-date').value;
  if (!desc || !amount || !date) return alert('Preencha todos os campos.');
  addCardExpense(mk, { id: uuid(), cardId, date, desc, amount });
  closeModal();
};

window._crSave = function(cardId) {
  const desc   = document.getElementById('cr-desc').value.trim();
  const amount = Math.round(parseFloat(document.getElementById('cr-amount').value) * 100);
  const day    = parseInt(document.getElementById('cr-day').value);
  if (!desc || !amount || !day) return alert('Preencha todos os campos.');
  const cards = getCards();
  const card  = cards.find(c => c.id === cardId);
  if (!card) return;
  const newRec = { id: uuid(), desc, amount, day };
  card.recurring.push(newRec);
  setCards(cards);

  // Adiciona imediatamente nos gastos do mês atual (sem esperar o próximo mês)
  const mk = window._cardMk;
  if (mk) {
    const [y, m] = mk.split('-').map(Number);
    const dateStr = `${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    addCardExpense(mk, { id: uuid(), cardId, date: dateStr, desc, amount, isRecurring: true, recurringId: newRec.id });
  }
  closeModal();
};

window._crDelete = function(cardId, recurringId) {
  if (!confirm('Remover esta assinatura? Ela não aparecerá nos próximos meses.')) return;
  const cards = getCards();
  const card  = cards.find(c => c.id === cardId);
  if (!card) return;
  card.recurring = (card.recurring ?? []).filter(r => r.id !== recurringId);
  setCards(cards);
  // Remove também do mês atual
  const mk = window._cardMk;
  if (mk) {
    const expenses = getCardExpenses(mk).filter(e => e.recurringId !== recurringId);
    setCardExpenses(mk, expenses);
  }
  closeModal();
};

window._lnSave = function(cardId) {
  const desc   = document.getElementById('ln-desc').value.trim();
  const amount = Math.round(parseFloat(document.getElementById('ln-amount').value) * 100);
  const total  = parseInt(document.getElementById('ln-total').value);
  const day    = parseInt(document.getElementById('ln-day').value);
  if (!desc || !amount || !total || !day) return alert('Preencha todos os campos.');
  const cards = getCards();
  const card  = cards.find(c => c.id === cardId);
  if (!card) return;
  if (!card.loans) card.loans = [];
  card.loans.push({ id: uuid(), desc, installmentAmount: amount, day, totalInstallments: total, paidInstallments: 0, startMonth: getMonthKey() });
  setCards(cards);
  closeModal();
};

window._cfgSave = function(existingId) {
  const name  = document.getElementById('cfg-name').value.trim();
  const limit = Math.round(parseFloat(document.getElementById('cfg-limit').value || '0') * 100);
  const close = parseInt(document.getElementById('cfg-close').value);
  const due   = parseInt(document.getElementById('cfg-due').value);
  if (!name || !close || !due) return alert('Preencha nome, dia de fechamento e vencimento.');
  const cards = getCards();
  if (existingId) {
    const card = cards.find(c => c.id === existingId);
    if (card) Object.assign(card, { name, limit, closeDay: close, dueDay: due });
    setCards(cards);
  } else {
    if (cards.length >= 2) return alert('Máximo de 2 cartões.');
    cards.push({ id: uuid(), name, limit, closeDay: close, dueDay: due, recurring: [], loans: [] });
    setCards(cards);
  }
  closeModal();
};
