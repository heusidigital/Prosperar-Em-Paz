export const uuid = () => crypto.randomUUID();

export function formatBRL(centavos) {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function getMonthKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function getDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatMonthLabel(monthKey) {
  const MONTHS = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
  const [y, m] = monthKey.split('-').map(Number);
  return `${MONTHS[m - 1]}/${String(y).slice(2)}`;
}

export function formatMonthFull(monthKey) {
  const [y, m] = monthKey.split('-');
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

// Returns array of YYYY-MM keys for given period ending at current month
export function getMonthRange(period) {
  const now = new Date();
  const counts = { mes: 1, bimestral: 2, semestral: 6, anual: 12 };
  const count = counts[period] ?? 1;
  const keys = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(getMonthKey(d));
  }
  return keys;
}

// Returns N months prior to current (for chart history)
export function getPastMonths(n) {
  const now = new Date();
  const keys = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(getMonthKey(d));
  }
  return keys;
}

export function installmentQuitMonth(startMonth, totalInstallments) {
  if (!totalInstallments || totalInstallments < 1) return '—';
  const [y, m] = startMonth.split('-').map(Number);
  const d = new Date(y, m - 1 + totalInstallments - 1, 1);
  return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
}
