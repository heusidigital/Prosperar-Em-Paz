import { formatBRL } from '../utils.js';
import { uuid, getDateStr } from '../utils.js';
import { getTransactions, getSources, addTransaction, updateTransaction, removeTransaction, removeSource, getCards } from '../storage.js';
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
  const all      = getTransactions(mk).filter(t => t.type === 'expense').sort((a,b) => b.date.localeCompare(a.date));
  const pagas    = all.filter(t => !t.pending);
  const pend     = all.filter(t => t.pending);
  const totalPago    = pagas.reduce((s,t) => s + t.amount, 0);
  const totalPendente = pend.reduce((s,t) => s + t.amount, 0);

  const rowPaga = tx => `
    <div class="item-row">
      <div style="flex:1;cursor:pointer" onclick="window._editExpense('${tx.id}')">
        <div class="item-name">${esc(tx.desc)}</div>
        <div class="item-meta">${CATEGORY_LABELS[tx.category] ?? tx.category} · ${tx.date}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <div class="item-amount expense">${formatBRL(tx.amount)}</div>
        <button onclick="window._editExpense('${tx.id}')"
          style="background:none;border:none;color:var(--color-text-muted);font-size:15px;
                 cursor:pointer;padding:2px 4px;line-height:1" title="Editar">✏️</button>
      </div>
    </div>`;

  const rowPend = tx => `
    <div class="item-row" style="opacity:0.75">
      <div style="flex:1">
        <div class="item-name">${esc(tx.desc)}
          <span style="font-size:9px;background:#c9a84c22;color:var(--color-gold);
                       border-radius:4px;padding:1px 5px;margin-left:4px">PENDENTE</span>
        </div>
        <div class="item-meta">${CATEGORY_LABELS[tx.category] ?? tx.category} · ${tx.date}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <div class="item-amount" style="color:var(--color-gold)">${formatBRL(tx.amount)}</div>
        <button onclick="window._markPaid('${tx.id}')"
          style="background:none;border:1px solid var(--color-income);color:var(--color-income);
                 border-radius:6px;padding:3px 8px;font-size:10px;cursor:pointer;white-space:nowrap">✓ Pagar</button>
        <button onclick="window._delPending('${tx.id}')"
          style="background:none;border:none;color:var(--color-expense);font-size:15px;cursor:pointer;padding:2px">🗑</button>
      </div>
    </div>`;

  // ── Assinaturas dos cartões (leitura direta de card.recurring) ──
  const cards = getCards();
  // Monta lista plana com referência ao cartão, ordenada por dia do mês
  const allSubs = cards.flatMap(c =>
    (c.recurring ?? []).map(r => ({ ...r, cardName: c.name }))
  ).sort((a, b) => a.day - b.day);
  const totalSubs = allSubs.reduce((s, r) => s + r.amount, 0);

  return `
    <div style="display:flex;gap:8px;margin-bottom:10px">
      <div class="card" style="flex:1">
        <div class="section-label" style="margin:0 0 2px">TOTAL PAGO</div>
        <div style="font-size:18px;font-weight:700;color:var(--color-expense)">${formatBRL(totalPago)}</div>
      </div>
      <div class="card" style="flex:1">
        <div class="section-label" style="margin:0 0 2px">PENDENTES</div>
        <div style="font-size:18px;font-weight:700;color:var(--color-gold)">${formatBRL(totalPendente)}</div>
      </div>
      <button class="btn btn-primary btn-sm" style="align-self:center" onclick="window._openExpense()">+ Despesa</button>
    </div>

    <div class="section-label">DESPESAS PAGAS</div>
    <div class="card" style="margin-bottom:10px">
      ${pagas.length ? pagas.map(rowPaga).join('') : '<div class="empty-state">Nenhuma despesa paga</div>'}
    </div>

    ${pend.length ? `
    <div class="section-label">DESPESAS PENDENTES</div>
    <div class="card" style="margin-bottom:10px">
      ${pend.map(rowPend).join('')}
    </div>` : ''}

    <div class="section-label" style="margin-top:4px">
      ASSINATURAS DOS CARTÕES
      <span style="font-size:9px;color:var(--color-text-muted);font-weight:400;letter-spacing:0">
        · gerenciado em Cartões · não duplica no saldo
      </span>
    </div>
    <div class="card" style="margin-bottom:4px">
      ${allSubs.length ? `
        ${allSubs.map(r => `
          <div class="item-row" style="padding:8px 0">
            <div style="flex:1">
              <div class="item-name" style="font-size:13px">${esc(r.desc)}</div>
              <div class="item-meta">Dia ${r.day}
                <span style="margin-left:6px;background:var(--color-header);color:#ffffff88;
                             font-size:9px;padding:1px 6px;border-radius:4px">${esc(r.cardName)}</span>
              </div>
            </div>
            <div class="item-amount" style="color:var(--color-expense)">${formatBRL(r.amount)}</div>
          </div>`).join('')}
        <div style="border-top:1px solid var(--color-border);margin-top:6px;padding-top:8px;
                    display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:10px;letter-spacing:1px;color:var(--color-text-muted)">TOTAL ASSINATURAS/MÊS</span>
          <span style="font-size:16px;font-weight:700;color:var(--color-expense)">${formatBRL(totalSubs)}</span>
        </div>`
      : '<div class="empty-state">Nenhuma assinatura cadastrada nos cartões</div>'}
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
        const dayInfo = s.day ? `· esperado dia ${s.day}` : '';
        return `<div class="item-row" style="align-items:flex-start">
          <div style="flex:1">
            <div class="item-name">${esc(s.name)} <span class="badge badge-recorrente">RECORRENTE</span></div>
            <div class="item-meta" style="margin-top:2px;color:var(--color-text-muted)">${dayInfo}</div>
            <div class="item-meta status-row" style="margin-top:4px">
              ${confirmed
                ? `<span class="dot dot-ok"></span>Recebido ✓`
                : tx
                  ? `<span class="dot dot-pend"></span>
                     <button class="btn btn-ghost btn-sm" onclick="window._confirmIncome('${tx.id}')">Confirmar recebimento</button>`
                  : `<span class="dot dot-pend"></span>Aguardando`}
            </div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
            <div class="item-amount income">${formatBRL(s.amount)}</div>
            <button onclick="window._delSource('${s.id}')"
              style="background:none;border:none;color:var(--color-expense);font-size:14px;
                     cursor:pointer;padding:2px 4px;line-height:1">🗑</button>
          </div>
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
window._delIncomeTx = id => {
  if (!confirm('Remover este lançamento?')) return;
  removeTransaction(window._txMk, id);
  renderTransactions(window._txMk);
};
window._delSource   = id => {
  if (!confirm('Remover esta fonte recorrente? Os lançamentos já feitos não serão apagados.')) return;
  removeSource(id);
  renderTransactions(window._txMk);
};
window._markPaid    = id => {
  // Marca despesa pendente como paga (entra no balancete)
  const mk = window._txMk;
  const txs = getTransactions(mk);
  const tx  = txs.find(t => t.id === id);
  if (tx) { updateTransaction(mk, { ...tx, pending: false }); renderTransactions(mk); }
};
window._delPending  = id => {
  if (!confirm('Excluir esta despesa pendente?')) return;
  removeTransaction(window._txMk, id);
  renderTransactions(window._txMk);
};
