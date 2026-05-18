import { formatBRL } from '../utils.js';
import { uuid, getDateStr } from '../utils.js';
import { getTransactions, getSources, addTransaction, removeTransaction } from '../storage.js';
import { openExpenseModal } from '../modals/expense-modal.js';
import { openIncomeModal, openSourceModal, openManageSources, confirmIncome } from '../modals/income-modal.js';

const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

const CATEGORY_LABELS = {
  alimentacao: '🍔 Alimentação', transporte: '🚗 Transporte',
  moradia: '🏠 Moradia', saude: '💊 Saúde',
  lazer: '🎮 Lazer', educacao: '📚 Educação', outros: '📦 Outros',
  assinaturas: '📱 Assinaturas',
};

let activeTab = 'despesas';

export function renderTransactions(mk) {
  document.getElementById('page-transactions').innerHTML = buildTransactions(mk);
  window._txMk = mk;
}

function buildTransactions(mk) {
  return `
    <div class="inner-tabs">
      <button class="inner-tab ${activeTab === 'despesas' ? 'active' : ''}" onclick="window._txTab('despesas')">DESPESAS</button>
      <button class="inner-tab ${activeTab === 'receitas' ? 'active' : ''}" onclick="window._txTab('receitas')">RECEITAS</button>
    </div>
    <div id="tx-body">${activeTab === 'despesas' ? buildExpenses(mk) : buildReceitas(mk)}</div>
  `;
}

function buildExpenses(mk) {
  const txs = getTransactions(mk).filter(t => t.type === 'expense').sort((a,b) => b.date.localeCompare(a.date));
  const total = txs.reduce((s,t) => s+t.amount, 0);
  return `
    <div class="card" style="margin-bottom:10px;display:flex;justify-content:space-between;align-items:center">
      <div>
        <div class="section-label" style="margin:0">TOTAL DO MÊS</div>
        <div style="font-size:20px;font-weight:700;color:var(--color-expense)">${formatBRL(total)}</div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="window._openExpense()">+ Despesa</button>
    </div>
    <div class="card">
      ${txs.length ? txs.map(tx => `
        <div class="item-row" onclick="window._editExpense('${tx.id}')">
          <div>
            <div class="item-name">${esc(tx.desc)}</div>
            <div class="item-meta">${CATEGORY_LABELS[tx.category] ?? tx.category} · ${tx.date}</div>
          </div>
          <div class="item-amount expense">${formatBRL(tx.amount)}</div>
        </div>`).join('') : '<div class="empty-state">Nenhuma despesa este mês</div>'}
    </div>`;
}

// ── AUTO-REPARO: garante que toda fonte fixa/recorrente tem transação no mês ──
function ensureSourceTransactions(mk, sources) {
  const txs = getTransactions(mk).filter(t => t.type === 'income');
  let changed = false;
  for (const s of sources) {
    if (s.type !== 'fixa' && s.type !== 'recorrente') continue;
    if (!s.amount) continue;
    const exists = txs.find(t => t.sourceId === s.id);
    if (!exists) {
      addTransaction(mk, {
        id: uuid(),
        date: getDateStr(),
        type: 'income',
        sourceId: s.id,
        amount: s.amount,
        desc: s.name,
        confirmed: s.type === 'fixa',  // fixa = confirmada, recorrente = aguardando
      });
      changed = true;
    }
  }
  return changed;
}

function buildReceitas(mk) {
  const sources = getSources();
  const fixed   = sources.filter(s => s.type === 'fixa');
  const recorr  = sources.filter(s => s.type === 'recorrente');

  // Auto-reparo: cria transações ausentes para fontes cadastradas
  ensureSourceTransactions(mk, sources);

  // Lê transações após o reparo
  const txs = getTransactions(mk).filter(t => t.type === 'income');

  // ── Cálculo dos totais ──────────────────────────────────────
  // FIXO: soma dos valores das fontes fixas (sempre garantido)
  const fixedTotal = fixed.reduce((a, s) => a + (s.amount ?? 0), 0);

  // Recorrentes confirmadas este mês
  const recorrenteConfirmado = txs
    .filter(t => t.confirmed && recorr.find(s => s.id === t.sourceId))
    .reduce((a, t) => a + t.amount, 0);

  // Variável: transações sem vínculo a fonte nenhuma (lançamentos manuais)
  const variavelConfirmado = txs
    .filter(t => t.confirmed && !sources.find(s => s.id === t.sourceId))
    .reduce((a, t) => a + t.amount, 0);

  // RECEBIDO = fixo garantido + recorrentes confirmadas + variáveis
  const recebido = fixedTotal + recorrenteConfirmado + variavelConfirmado;

  // A RECEBER = recorrentes ainda não confirmadas (valor da fonte)
  const aReceber = recorr.reduce((a, s) => {
    const tx = txs.find(t => t.sourceId === s.id);
    return a + (tx?.confirmed ? 0 : (s.amount ?? 0));
  }, 0);

  // Transações variáveis (sem fonte vinculada)
  const varTxs = txs.filter(t => !sources.find(s => s.id === t.sourceId));

  return `
    <div class="three-col">
      <div class="card">
        <div class="mc-label">FIXO</div>
        <div class="mc-value" style="color:#00e5ff;font-size:14px">${formatBRL(fixedTotal)}</div>
      </div>
      <div class="card">
        <div class="mc-label">RECEBIDO</div>
        <div class="mc-value income" style="font-size:14px">${formatBRL(recebido)}</div>
      </div>
      <div class="card">
        <div class="mc-label">A RECEBER</div>
        <div class="mc-value" style="color:var(--color-gold);font-size:14px">${formatBRL(aReceber)}</div>
      </div>
    </div>

    <div class="section-label">RECEITA FIXA (AUTOMÁTICA)</div>
    <div class="card">
      ${fixed.map(s => `
        <div class="item-row">
          <div>
            <div class="item-name">${esc(s.name)} <span class="badge badge-fixa">FIXA</span></div>
            <div class="item-meta status-row">
              <span class="dot dot-auto"></span>Automática · dia ${s.day ?? '—'}
            </div>
          </div>
          <div class="item-amount income">${formatBRL(s.amount)}</div>
        </div>`).join('') || '<div class="empty-state" style="padding:12px 0">Nenhuma receita fixa cadastrada</div>'}
    </div>

    <div class="section-label" style="margin-top:8px">
      RECORRENTES
      <button class="btn btn-ghost btn-sm" onclick="window._openManageSources()">⚙ Gerenciar</button>
    </div>
    <div class="card">
      ${recorr.map(s => {
        const tx = txs.find(t => t.sourceId === s.id);
        const confirmed = tx?.confirmed;
        return `<div class="item-row">
          <div>
            <div class="item-name">${esc(s.name)} <span class="badge badge-recorrente">RECORRENTE</span></div>
            <div class="item-meta status-row">
              ${confirmed
                ? `<span class="dot dot-ok"></span>Recebido ✓`
                : tx
                  ? `<span class="dot dot-pend"></span>
                     <button class="btn btn-ghost btn-sm" onclick="window._confirmIncome('${tx.id}')">Confirmar recebimento</button>`
                  : `<span class="dot dot-pend"></span>Aguardando`}
            </div>
          </div>
          <div class="item-amount income">${formatBRL(s.amount)}</div>
        </div>`;
      }).join('') || '<div class="empty-state" style="padding:12px 0">Nenhuma fonte recorrente</div>'}
    </div>

    <div class="section-label" style="margin-top:8px">
      VARIÁVEL
      <button class="btn btn-ghost btn-sm" onclick="window._openIncomeModal()">+ Lançar</button>
    </div>
    <div class="card">
      ${varTxs.length ? varTxs.map(tx => `
        <div class="item-row">
          <div style="flex:1">
            <div class="item-name">${esc(tx.desc)}</div>
            <div class="item-meta">${tx.date}</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="item-amount income">${formatBRL(tx.amount)}</div>
            <button onclick="window._delIncomeTx('${tx.id}')"
              style="background:none;border:none;color:var(--color-expense);font-size:16px;
                     cursor:pointer;padding:4px;line-height:1">🗑</button>
          </div>
        </div>`).join('')
      : '<div class="empty-state" style="padding:12px 0">Nenhum lançamento variável</div>'}
    </div>

    <div style="margin-top:10px">
      <button class="btn btn-ghost" style="width:100%" onclick="window._openManageSources()">⚙ Gerenciar fontes de receita</button>
    </div>`;
}

window._txTab             = t    => { activeTab = t; renderTransactions(window._txMk); };
window._openExpense       = ()   => openExpenseModal(window._txMk);
window._editExpense       = id   => { const tx = getTransactions(window._txMk).find(t => t.id === id); if (tx) openExpenseModal(window._txMk, tx); };
window._openIncomeModal   = ()   => openIncomeModal(window._txMk);
window._openSourceModal   = type => openSourceModal(type);
window._openManageSources = ()   => openManageSources();
window._confirmIncome     = txId => { confirmIncome(window._txMk, txId); renderTransactions(window._txMk); };
window._delIncomeTx       = id   => {
  if (!confirm('Remover este lançamento?')) return;
  removeTransaction(window._txMk, id);
  renderTransactions(window._txMk);
};
