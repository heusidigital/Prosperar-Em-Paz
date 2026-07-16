import { uuid, getDateStr } from '../utils.js';
import { addTransaction, updateTransaction, removeTransaction } from '../storage.js';

const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

const CATEGORIES = [
  { id: 'alimentacao', label: '🍔 Alimentação' },
  { id: 'transporte',  label: '🚗 Transporte'  },
  { id: 'moradia',     label: '🏠 Moradia'     },
  { id: 'saude',       label: '💊 Saúde'       },
  { id: 'lazer',       label: '🎮 Lazer'       },
  { id: 'educacao',    label: '📚 Educação'    },
  { id: 'outros',      label: '📦 Outros'      },
  { id: 'assinaturas', label: '📱 Assinaturas' },
];

export function openExpenseModal(mk, tx = null) {
  const isEdit    = !!tx;
  const isPending = tx?.pending === true;
  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">${isEdit ? 'Editar Despesa' : 'Nova Despesa'}</div>
    <div class="form-group">
      <label class="form-label">DESCRIÇÃO</label>
      <input class="form-input" id="exp-desc" placeholder="Ex: Supermercado" value="${esc(tx?.desc ?? '')}">
    </div>
    <div class="form-group">
      <label class="form-label">VALOR (R$)</label>
      <input class="form-input" id="exp-amount" type="number" step="0.01" min="0" placeholder="0,00"
        value="${tx ? (tx.amount/100).toFixed(2) : ''}">
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

    <div class="form-group" style="display:flex;align-items:center;gap:10px;padding:10px 0;
         border-top:1px solid var(--color-border);border-bottom:1px solid var(--color-border);margin:4px 0">
      <input type="checkbox" id="exp-pending" style="width:18px;height:18px;accent-color:var(--color-gold);cursor:pointer"
        ${isPending ? 'checked' : ''}>
      <label for="exp-pending" style="font-size:13px;cursor:pointer;color:var(--color-text)">
        <b>Pendente</b> — ainda não paga, não entra no balancete
      </label>
    </div>

    <div style="display:flex;gap:10px;margin-top:8px">
      ${isEdit ? `<button class="btn btn-ghost" style="flex:1;color:var(--color-expense);border-color:var(--color-expense)"
          onclick="window._expDelete('${mk}','${tx.id}')">Excluir</button>` : ''}
      <button class="btn btn-primary" style="flex:1"
        onclick="window._expSave('${mk}','${tx?.id ?? ''}')">
        ${isEdit ? 'Salvar' : 'Adicionar'}
      </button>
    </div>
  `);
}

window._expSave = function(mk, existingId) {
  const desc    = document.getElementById('exp-desc').value.trim();
  const amount  = Math.round(parseFloat(document.getElementById('exp-amount').value) * 100);
  const cat     = document.getElementById('exp-cat').value;
  const date    = document.getElementById('exp-date').value;
  const pending = document.getElementById('exp-pending').checked;
  if (!desc || !amount || !date) return alert('Preencha todos os campos.');
  const tx = { id: existingId || uuid(), date, type: 'expense', amount, category: cat, desc, pending };
  existingId ? updateTransaction(mk, tx) : addTransaction(mk, tx);
  toast(existingId ? '✓ Despesa atualizada' : '✓ Despesa adicionada');
  closeModal();
};

window._expDelete = async function(mk, id) {
  if (!await appConfirm('Excluir esta despesa?', 'Excluir')) return;
  removeTransaction(mk, id);
  toast('✓ Despesa excluída');
  closeModal();
};
