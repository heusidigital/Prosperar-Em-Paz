import { uuid } from '../utils.js';
import { addGoal, updateGoal, addScheduled, getGoals } from '../storage.js';

const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

const CATEGORIES = [
  { id: 'alimentacao', label: '🍔 Alimentação' }, { id: 'transporte', label: '🚗 Transporte' },
  { id: 'moradia', label: '🏠 Moradia' },         { id: 'saude', label: '💊 Saúde' },
  { id: 'lazer', label: '🎮 Lazer' },             { id: 'educacao', label: '📚 Educação' },
  { id: 'veiculo', label: '🚙 Veículo' },         { id: 'profissional', label: '💼 Profissional' },
  { id: 'seguro', label: '🛡️ Seguro' },           { id: 'outros', label: '📦 Outros' },
];

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export function openBudgetModal() {
  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">Novo Orçamento</div>
    <div class="form-group">
      <label class="form-label">CATEGORIA</label>
      <select class="form-select" id="bgt-cat">
        ${CATEGORIES.map(c => `<option value="${c.id}">${c.label}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">LIMITE MENSAL (R$)</label>
      <input class="form-input" id="bgt-limit" type="number" step="0.01" min="0" placeholder="0,00">
    </div>
    <button class="btn btn-primary" style="width:100%;margin-top:8px" onclick="window._bgtSave()">Salvar</button>
  `);
}

export function openSavingsGoalModal(existing = null) {
  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">${existing ? 'Atualizar Meta' : 'Nova Meta de Economia'}</div>
    <div class="form-group">
      <label class="form-label">NOME DO OBJETIVO</label>
      <input class="form-input" id="sg-name" placeholder="Ex: Viagem" value="${esc(existing?.name ?? '')}">
    </div>
    <div class="form-group">
      <label class="form-label">VALOR TOTAL DESEJADO (R$)</label>
      <input class="form-input" id="sg-target" type="number" step="0.01" min="0" placeholder="0,00" value="${existing ? (existing.target/100).toFixed(2) : ''}">
    </div>
    <div class="form-group">
      <label class="form-label">JÁ GUARDADO (R$)</label>
      <input class="form-input" id="sg-saved" type="number" step="0.01" min="0" placeholder="0,00" value="${existing ? (existing.saved/100).toFixed(2) : ''}">
    </div>
    <button class="btn btn-primary" style="width:100%;margin-top:8px" onclick="window._sgSave('${existing?.id ?? ''}')">Salvar</button>
  `);
}

export function openScheduledModal() {
  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">Nova Despesa Programada</div>
    <div class="form-group">
      <label class="form-label">DESCRIÇÃO</label>
      <input class="form-input" id="sc-desc" placeholder="Ex: IPVA — Carro">
    </div>
    <div class="form-group">
      <label class="form-label">VALOR (R$)</label>
      <input class="form-input" id="sc-amount" type="number" step="0.01" min="0" placeholder="0,00">
    </div>
    <div class="two-col">
      <div class="form-group">
        <label class="form-label">MÊS</label>
        <select class="form-select" id="sc-month">
          ${MONTHS.map((m,i) => `<option value="${i+1}">${m}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">DIA</label>
        <input class="form-input" id="sc-day" type="number" min="1" max="31" placeholder="Ex: 20">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">CATEGORIA</label>
      <select class="form-select" id="sc-cat">
        ${CATEGORIES.map(c => `<option value="${c.id}">${c.label}</option>`).join('')}
      </select>
    </div>
    <button class="btn btn-primary" style="width:100%;margin-top:8px" onclick="window._scSave()">Salvar</button>
  `);
}

window._bgtSave = function() {
  const cat   = document.getElementById('bgt-cat').value;
  const limit = Math.round(parseFloat(document.getElementById('bgt-limit').value) * 100);
  if (!limit) return alert('Informe o limite.');
  const existing = getGoals().find(g => g.type === 'orcamento' && g.category === cat);
  if (existing) {
    updateGoal({ ...existing, limit });
  } else {
    addGoal({ id: uuid(), type: 'orcamento', category: cat, limit });
  }
  closeModal();
};

window._sgSave = function(existingId) {
  const name   = document.getElementById('sg-name').value.trim();
  const target = Math.round(parseFloat(document.getElementById('sg-target').value) * 100);
  const saved  = Math.round(parseFloat(document.getElementById('sg-saved').value || '0') * 100);
  if (!name || !target) return alert('Preencha nome e valor desejado.');
  const goal = { id: existingId || uuid(), type: 'economia', name, target, saved };
  existingId ? updateGoal(goal) : addGoal(goal);
  closeModal();
};

window._scSave = function() {
  const desc   = document.getElementById('sc-desc').value.trim();
  const amount = Math.round(parseFloat(document.getElementById('sc-amount').value) * 100);
  const month  = parseInt(document.getElementById('sc-month').value);
  const day    = parseInt(document.getElementById('sc-day').value);
  const cat    = document.getElementById('sc-cat').value;
  if (!desc || !amount || !day) return alert('Preencha todos os campos.');
  addScheduled({ id: uuid(), desc, amount, dueMonth: month, dueDay: day, category: cat, recurrence: 'anual' });
  closeModal();
};
