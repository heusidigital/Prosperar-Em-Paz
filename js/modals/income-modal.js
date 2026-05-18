import { uuid, getDateStr, formatBRL } from '../utils.js';
import { addTransaction, updateTransaction, getTransactions,
         addSource, getSources, removeSource, updateSource } from '../storage.js';

const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

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

export function openSourceModal(type, existing) {
  const labels = { fixa: 'Receita Fixa', recorrente: 'Recorrente Mensal', variavel: 'Variável' };
  const isEdit     = !!existing;
  const showDay    = type === 'fixa' || type === 'recorrente';  // recorrente também tem dia
  const showAmount = type !== 'variavel';
  const amtVal     = existing?.amount ? (existing.amount / 100).toFixed(2) : '';
  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">${isEdit ? 'Editar' : 'Nova'} Fonte — ${labels[type]}</div>
    ${isEdit ? `<input type="hidden" id="src-id" value="${existing.id}">` : ''}
    <div class="form-group">
      <label class="form-label">NOME DA FONTE</label>
      <input class="form-input" id="src-name"
        value="${isEdit ? esc(existing.name) : ''}"
        placeholder="${type === 'fixa' ? 'Ex: Aposentadoria' : type === 'recorrente' ? 'Ex: Assessoria Cliente A' : 'Ex: Assessoria Empresa X'}">
    </div>
    ${showAmount ? `
    <div class="form-group">
      <label class="form-label">VALOR MENSAL (R$)</label>
      <input class="form-input" id="src-amount" type="number" step="0.01" min="0"
        value="${amtVal}" placeholder="0,00">
    </div>` : ''}
    ${showDay ? `
    <div class="form-group">
      <label class="form-label">DIA DO MÊS QUE ENTRA</label>
      <input class="form-input" id="src-day" type="number" min="1" max="31"
        value="${existing?.day ?? ''}"
        placeholder="${type === 'fixa' ? 'Ex: 5' : 'Ex: 20 (opcional)'}">
    </div>` : ''}
    <button class="btn btn-primary" style="width:100%;margin-top:8px"
      onclick="window._srcSave('${type}', ${isEdit})">
      ${isEdit ? 'Salvar alterações' : 'Salvar Fonte'}
    </button>
  `);
}

export function openManageSources() {
  const sources = getSources();
  const typeLabel = { fixa: 'FIXA', recorrente: 'RECORRENTE', variavel: 'VARIÁVEL' };
  const typeBadge = { fixa: 'badge-fixa', recorrente: 'badge-recorrente', variavel: 'badge-var' };

  const rows = sources.length ? sources.map(s => `
    <div class="item-row" style="padding:10px 0;border-bottom:1px solid var(--color-border)">
      <div style="flex:1">
        <div class="item-name" style="margin-bottom:3px">
          ${esc(s.name)}
          <span class="badge ${typeBadge[s.type] ?? ''}" style="margin-left:6px">${typeLabel[s.type] ?? s.type}</span>
        </div>
        <div class="item-meta">
          ${s.amount ? formatBRL(s.amount) + '/mês' : 'Valor variável'}
          ${s.day ? ' · dia ' + s.day : ''}
        </div>
      </div>
      <div style="display:flex;gap:6px">
        <button onclick="window._srcEdit('${s.id}')"
          style="background:none;border:1px solid var(--color-gold);color:var(--color-gold);
                 border-radius:8px;padding:6px 10px;font-size:11px;cursor:pointer">
          ✏️
        </button>
        <button onclick="window._srcDelete('${s.id}')"
          style="background:none;border:1px solid #b07a2a44;color:var(--color-expense);
                 border-radius:8px;padding:6px 10px;font-size:11px;cursor:pointer">
          🗑
        </button>
      </div>
    </div>`).join('') : '<div class="empty-state">Nenhuma fonte cadastrada</div>';

  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">Gerenciar Fontes de Receita</div>
    <div style="margin-top:4px">${rows}</div>
    <div style="margin-top:16px;display:flex;flex-direction:column;gap:8px">
      <button class="btn btn-ghost" style="width:100%" onclick="window._srcNew('fixa')">+ Nova Receita Fixa</button>
      <button class="btn btn-ghost" style="width:100%" onclick="window._srcNew('recorrente')">+ Nova Recorrente</button>
      <button class="btn btn-ghost" style="width:100%" onclick="window._srcNew('variavel')">+ Nova Variável</button>
    </div>
  `);
}

export function confirmIncome(mk, txId) {
  const tx = getTransactions(mk).find(t => t.id === txId);
  if (tx) updateTransaction(mk, { ...tx, confirmed: true });
}

// ── Lançamento variável ───────────────────────────────────────
window._incSave = function(mk) {
  const desc   = document.getElementById('inc-desc').value.trim();
  const amount = Math.round(parseFloat(document.getElementById('inc-amount').value) * 100);
  const date   = document.getElementById('inc-date').value;
  if (!desc || !amount || !date) return alert('Preencha todos os campos.');
  addTransaction(mk, { id: uuid(), date, type: 'income', amount, desc, confirmed: true });
  closeModal();
};

// ── Salvar fonte (nova ou edição) ─────────────────────────────
window._srcSave = function(type, isEdit) {
  const name   = document.getElementById('src-name')?.value.trim();
  const amtEl  = document.getElementById('src-amount');
  const dayEl  = document.getElementById('src-day');
  const idEl   = document.getElementById('src-id');
  const amount = amtEl ? Math.round(parseFloat(amtEl.value) * 100) : undefined;
  const day    = dayEl && dayEl.value ? parseInt(dayEl.value) : undefined;

  if (!name) return alert('Informe o nome da fonte.');
  if ((type === 'fixa' || type === 'recorrente') && !amount) return alert('Informe o valor.');
  if (type === 'fixa' && !day) return alert('Informe o dia do mês.');

  if (isEdit && idEl) {
    // Edição: atualiza source e a transação pendente do mês atual
    const existingId = idEl.value;
    const src = { id: existingId, name, type, ...(amount && { amount }), ...(day && { day }) };
    updateSource(src);
    // Atualiza transação do mês se existir e ainda não confirmada
    const mk = window._txMk;
    if (mk && amount) {
      const tx = getTransactions(mk).find(t => t.sourceId === existingId);
      if (tx && !tx.confirmed) {
        updateTransaction(mk, { ...tx, amount, desc: name });
      }
    }
    closeModal();
    openManageSources();
    return;
  }

  // Nova fonte
  const src = { id: uuid(), name, type, ...(amount && { amount }), ...(day && { day }) };
  addSource(src);

  // Cria transação do mês atual imediatamente
  const mk = window._txMk;
  if (mk && amount && (type === 'fixa' || type === 'recorrente')) {
    const alreadyExists = getTransactions(mk).find(t => t.sourceId === src.id);
    if (!alreadyExists) {
      addTransaction(mk, {
        id: uuid(),
        date: getDateStr(),
        type: 'income',
        sourceId: src.id,
        amount: src.amount,
        desc: src.name,
        confirmed: type === 'fixa',
      });
    }
  }
  closeModal();
};

window._srcEdit   = function(id) {
  const src = getSources().find(s => s.id === id);
  if (src) openSourceModal(src.type, src);
};
window._srcDelete = function(id) {
  if (!confirm('Remover esta fonte? Os lançamentos já feitos não serão apagados.')) return;
  removeSource(id);
  openManageSources();
};
window._srcNew    = function(type) { openSourceModal(type); };
