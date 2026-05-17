import { uuid, getDateStr } from '../utils.js';
import { addTransaction, updateTransaction, removeTransaction } from '../storage.js';

const CATEGORIES = [
  { id: 'alimentacao', label: '🍔 Alimentação' },
  { id: 'transporte',  label: '🚗 Transporte'  },
  { id: 'moradia',     label: '🏠 Moradia'     },
  { id: 'saude',       label: '💊 Saúde'       },
  { id: 'lazer',       label: '🎮 Lazer'       },
  { id: 'educacao',    label: '📚 Educação'    },
  { id: 'outros',      label: '📦 Outros'      },
];

export function openExpenseModal(mk, tx = null) {
  const isEdit = !!tx;
  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">${isEdit ? 'Editar Despesa' : 'Nova Despesa'}</div>
    <div class="form-group">
      <label class="form-label">DESCRIÇÃO</label>
      <input class="form-input" id="exp-desc" placeholder="Ex: Supermercado" value="${tx?.desc ?? ''}">
    </div>
    <div class="form-group">
      <label class="form-label">VALOR (R$)</label>
      <input class="form-input" id="exp-amount" type="number" step="0.01" min="0" placeholder="0,00" value="${tx ? (tx.amount/100).toFixed(2) : ''}">
    </div>
    <div class="form-group">
      <label class="form-label">CATEGORIA</label>
      <select class="form-select" id="exp-cat">
        ${CATEGORIES.map(c => `<option value="${c.id}" ${tx?.category === c.id ? 'selected' : ''}>${c.label}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">DATA</label>
      <input class="form-input" id="exp-date" type="date" value="${tx?.date ?? getDateStr()}">
    </div>
    <div style="display:flex;gap:10px;margin-top:8px">
      ${isEdit ? `<button class="btn btn-ghost" style="flex:1;color:var(--color-expense);border-color:var(--color-expense)" onclick="window._expDelete('${mk}','${tx.id}')">Excluir</button>` : ''}
      <button class="btn btn-primary" style="flex:1" onclick="window._expSave('${mk}','${tx?.id ?? ''}')">
        ${isEdit ? 'Salvar' : 'Adicionar'}
      </button>
    </div>
  `);
}

window._expSave = function(mk, existingId) {
  const desc   = document.getElementById('exp-desc').value.trim();
  const amount = Math.round(parseFloat(document.getElementById('exp-amount').value) * 100);
  const cat    = document.getElementById('exp-cat').value;
  const date   = document.getElementById('exp-date').value;
  if (!desc || !amount || !date) return alert('Preencha todos os campos.');
  const tx = { id: existingId || uuid(), date, type: 'expense', amount, category: cat, desc };
  existingId ? updateTransaction(mk, tx) : addTransaction(mk, tx);
  closeModal();
};

window._expDelete = function(mk, id) {
  if (!confirm('Excluir esta despesa?')) return;
  removeTransaction(mk, id);
  closeModal();
};
