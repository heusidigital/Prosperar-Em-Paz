import { formatBRL } from '../utils.js';
import { getGoals, removeGoal, getTransactions, getScheduled, removeScheduled } from '../storage.js';
import { openBudgetModal, openSavingsGoalModal, openScheduledModal } from '../modals/goal-modal.js';

const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

const CATEGORY_LABELS = {
  alimentacao:'🍔 Alimentação', transporte:'🚗 Transporte', moradia:'🏠 Moradia',
  saude:'💊 Saúde', lazer:'🎮 Lazer', educacao:'📚 Educação',
  veiculo:'🚙 Veículo', profissional:'💼 Profissional', seguro:'🛡️ Seguro', outros:'📦 Outros'
};
const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MONTHS_FULL  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

let activeGoalTab = 'orcamento';

export function renderGoals(mk) {
  document.getElementById('page-goals').innerHTML = buildGoals(mk);
  window._goalMk = mk;
}

function buildGoals(mk) {
  return `
    <div class="inner-tabs">
      <button class="inner-tab ${activeGoalTab==='orcamento'?'active':''}" onclick="window._goalTab('orcamento')">ORÇAMENTO</button>
      <button class="inner-tab ${activeGoalTab==='metas'?'active':''}" onclick="window._goalTab('metas')">METAS</button>
      <button class="inner-tab ${activeGoalTab==='programadas'?'active':''}" onclick="window._goalTab('programadas')">PROGRAMADAS</button>
    </div>
    <div id="goal-body">${buildGoalBody(mk)}</div>
  `;
}

function buildGoalBody(mk) {
  if (activeGoalTab === 'orcamento')   return buildOrcamento(mk);
  if (activeGoalTab === 'metas')       return buildMetas();
  return buildProgramadas();
}

function buildOrcamento(mk) {
  const goals = getGoals().filter(g => g.type === 'orcamento');
  const txs   = getTransactions(mk).filter(t => t.type === 'expense');
  return `
    <div style="display:flex;justify-content:flex-end;margin-bottom:12px">
      <button class="btn btn-primary btn-sm" onclick="window._openBudget()">+ Orçamento</button>
    </div>
    <div class="card">
      ${goals.length ? goals.map(g => {
        const spent = txs.filter(t => t.category === g.category).reduce((s,t) => s+t.amount, 0);
        const pct   = Math.min(Math.round(spent/g.limit*100), 100);
        const over  = spent > g.limit;
        return `
          <div style="margin-bottom:14px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <div style="font-size:13px;font-weight:600">${CATEGORY_LABELS[g.category] ?? esc(g.category)}</div>
              <div style="display:flex;align-items:center;gap:2px">
                <span style="font-size:11px;color:${over?'var(--color-expense)':'var(--color-text-muted)'};margin-right:4px">${formatBRL(spent)} / ${formatBRL(g.limit)}</span>
                <button class="icon-btn" style="min-width:32px;min-height:32px;font-size:13px" onclick="window._editBudget('${g.id}')" title="Editar">✏️</button>
                <button class="icon-btn danger" style="min-width:32px;min-height:32px;font-size:13px" onclick="window._removeBudget('${g.id}')" title="Excluir">🗑</button>
              </div>
            </div>
            <div class="progress-wrap">
              <div class="progress-fill ${over?'progress-warn':'progress-expense'}" style="width:${pct}%"></div>
            </div>
            ${over ? `<div style="font-size:9px;color:var(--color-expense);margin-top:3px">Limite ultrapassado em ${formatBRL(spent-g.limit)}</div>` : ''}
          </div>`;
      }).join('') : '<div class="empty-state">Nenhum orçamento definido</div>'}
    </div>`;
}

function buildMetas() {
  const goals = getGoals().filter(g => g.type === 'economia');
  return `
    <div style="display:flex;justify-content:flex-end;margin-bottom:12px">
      <button class="btn btn-primary btn-sm" onclick="window._openSavings('')">+ Nova Meta</button>
    </div>
    ${goals.length ? goals.map(g => {
      const pct = Math.min(Math.round(g.saved/g.target*100), 100);
      return `
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
            <div>
              <div style="font-size:15px;font-weight:700">${esc(g.name)}</div>
              <div style="font-size:11px;color:var(--color-text-muted);margin-top:2px">${formatBRL(g.saved)} de ${formatBRL(g.target)}</div>
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn btn-ghost btn-sm" onclick="window._openSavings('${g.id}')">Editar</button>
              <button class="btn btn-sm" style="background:var(--color-expense-dim);color:var(--color-expense);border:1px solid var(--color-expense)" onclick="window._removeGoal('${g.id}')">×</button>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px">
            <span style="font-size:12px;color:var(--color-gold);font-weight:700">${pct}%</span>
            <span style="font-size:11px;color:var(--color-text-muted)">Faltam ${formatBRL(Math.max(g.target-g.saved,0))}</span>
          </div>
          <div class="progress-wrap">
            <div class="progress-fill progress-gold" style="width:${pct}%"></div>
          </div>
        </div>`;
    }).join('') : '<div class="card"><div class="empty-state">Nenhuma meta cadastrada</div></div>'}`;
}

function buildProgramadas() {
  const items = getScheduled().sort((a,b) => a.dueMonth - b.dueMonth);
  const now   = new Date();
  return `
    <div style="display:flex;justify-content:flex-end;margin-bottom:12px">
      <button class="btn btn-primary btn-sm" onclick="window._openScheduled()">+ Programar</button>
    </div>

    <div class="card" style="margin-bottom:12px">
      <div class="section-label">CALENDÁRIO ANUAL</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">
        ${Array.from({length:12}, (_,i) => {
          const monthItems = items.filter(s => s.dueMonth === i+1);
          const hasBig     = monthItems.some(s => s.amount >= 50000);
          const isCurrent  = i === now.getMonth();
          return `
            <div style="text-align:center;padding:8px 4px;border-radius:8px;background:${isCurrent?'var(--color-gold-dim)':'var(--color-bg)'};border:1px solid ${isCurrent?'var(--color-gold)':'var(--color-border)'}">
              <div style="font-size:9px;color:${isCurrent?'var(--color-gold)':'var(--color-text-muted)'};font-weight:600">${MONTHS_SHORT[i]}</div>
              <div style="font-size:14px;margin-top:2px">${monthItems.length ? (hasBig ? '🔴' : '🟡') : '·'}</div>
              ${monthItems.length ? `<div style="font-size:8px;color:var(--color-expense)">${formatBRL(monthItems.reduce((s,x) => s+x.amount, 0))}</div>` : ''}
            </div>`;
        }).join('')}
      </div>
    </div>

    <div class="card">
      ${items.length ? items.map(s => `
        <div class="item-row">
          <div style="flex:1">
            <div class="item-name">${esc(s.desc)}</div>
            <div class="item-meta">${CATEGORY_LABELS[s.category] ?? esc(s.category)} · ${MONTHS_FULL[s.dueMonth-1]}, dia ${s.dueDay} · anual</div>
          </div>
          <div style="display:flex;align-items:center;gap:2px">
            <div class="item-amount expense" style="margin-right:6px">${formatBRL(s.amount)}</div>
            <button class="icon-btn" onclick="window._editScheduled('${s.id}')" title="Editar">✏️</button>
            <button class="icon-btn danger" onclick="window._removeScheduled('${s.id}')" title="Excluir">🗑</button>
          </div>
        </div>`).join('') : '<div class="empty-state">Nenhuma despesa programada</div>'}
    </div>`;
}

window._goalTab        = t  => { activeGoalTab = t; renderGoals(window._goalMk); };
window._openBudget     = () => openBudgetModal();
window._editBudget     = id => { const g = getGoals().find(g => g.id === id); if (g) openBudgetModal(g); };
window._openSavings    = id => { const g = id ? getGoals().find(g => g.id === id) : null; openSavingsGoalModal(g); };
window._openScheduled  = () => openScheduledModal();
window._editScheduled  = id => { const s = getScheduled().find(s => s.id === id); if (s) openScheduledModal(s); };
window._removeGoal     = async id => {
  if (!await appConfirm('Remover esta meta?', 'Remover')) return;
  removeGoal(id); toast('✓ Meta removida'); renderGoals(window._goalMk);
};
window._removeBudget   = async id => {
  if (!await appConfirm('Remover este orçamento?', 'Remover')) return;
  removeGoal(id); toast('✓ Orçamento removido'); renderGoals(window._goalMk);
};
window._removeScheduled = async id => {
  if (!await appConfirm('Remover esta despesa programada?', 'Remover')) return;
  removeScheduled(id); toast('✓ Programada removida'); renderGoals(window._goalMk);
};
