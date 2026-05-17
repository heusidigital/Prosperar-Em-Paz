import { uuid, getDateStr } from '../utils.js';
import { addTransaction, updateTransaction, getTransactions, addSource } from '../storage.js';

export function openIncomeModal(mk) {
  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">Lançar Receita Variável</div>
    <div class="form-group">
      <label class="form-label">DESCRIÇÃO</label>
      <input class="form-input" id="inc-desc" placeholder="Ex: Assessoria Empresa X">
    </div>
    <div class="form-group">
      <label class="form-label">VALOR (R$)</label>
      <input class="form-input" id="inc-amount" type="number" step="0.01" min="0" placeholder="0,00">
    </div>
    <div class="form-group">
      <label class="form-label">DATA</label>
      <input class="form-input" id="inc-date" type="date" value="${getDateStr()}">
    </div>
    <button class="btn btn-primary" style="width:100%;margin-top:8px" onclick="window._incSave('${mk}')">Adicionar</button>
  `);
}

export function openSourceModal(type) {
  const labels = { fixa: 'Receita Fixa', recorrente: 'Recorrente Mensal', variavel: 'Variável' };
  const showDay    = type === 'fixa';
  const showAmount = type !== 'variavel';
  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">Nova Fonte — ${labels[type]}</div>
    <div class="form-group">
      <label class="form-label">NOME DA FONTE</label>
      <input class="form-input" id="src-name" placeholder="${type === 'fixa' ? 'Ex: Aposentadoria' : type === 'recorrente' ? 'Ex: Marketing — Cliente A' : 'Ex: Assessoria Empresa X'}">
    </div>
    ${showAmount ? `
    <div class="form-group">
      <label class="form-label">VALOR MENSAL (R$)</label>
      <input class="form-input" id="src-amount" type="number" step="0.01" min="0" placeholder="0,00">
    </div>` : ''}
    ${showDay ? `
    <div class="form-group">
      <label class="form-label">DIA DO MÊS QUE ENTRA</label>
      <input class="form-input" id="src-day" type="number" min="1" max="31" placeholder="Ex: 5">
    </div>` : ''}
    <button class="btn btn-primary" style="width:100%;margin-top:8px" onclick="window._srcSave('${type}')">Salvar Fonte</button>
  `);
}

export function confirmIncome(mk, txId) {
  const tx = getTransactions(mk).find(t => t.id === txId);
  if (tx) updateTransaction(mk, { ...tx, confirmed: true });
}

window._incSave = function(mk) {
  const desc   = document.getElementById('inc-desc').value.trim();
  const amount = Math.round(parseFloat(document.getElementById('inc-amount').value) * 100);
  const date   = document.getElementById('inc-date').value;
  if (!desc || !amount || !date) return alert('Preencha todos os campos.');
  addTransaction(mk, { id: uuid(), date, type: 'income', amount, desc, confirmed: true });
  closeModal();
};

window._srcSave = function(type) {
  const name   = document.getElementById('src-name')?.value.trim();
  const amtEl  = document.getElementById('src-amount');
  const dayEl  = document.getElementById('src-day');
  const amount = amtEl ? Math.round(parseFloat(amtEl.value) * 100) : undefined;
  const day    = dayEl ? parseInt(dayEl.value) : undefined;
  if (!name) return alert('Informe o nome da fonte.');
  if ((type === 'fixa' || type === 'recorrente') && !amount) return alert('Informe o valor.');
  if (type === 'fixa' && !day) return alert('Informe o dia.');
  const src = { id: uuid(), name, type, ...(amount && { amount }), ...(day && { day }) };
  addSource(src);
  closeModal();
};
