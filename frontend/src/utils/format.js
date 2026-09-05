export function formatCurrency(amount, currency = 'INR') {
  if (amount === null || amount === undefined || isNaN(amount)) return '—';
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Number(amount).toLocaleString()}`;
  }
}

/**
 * Resolve the price an itinerary activity should display.
 *
 * Canonical cost shape (produced by the backend pricing service):
 *   cost: { amount, currency, isEstimate, perPerson, estimateNote,
 *           displayAmount?, displaySuffix? }
 *  - displayAmount (when present) is a display-only price, e.g. the nightly
 *    rate shown on a hotel check-in row that is not added to day totals.
 *  - amount 0 means the item is free (rendered "Free", never a dash).
 * Returns { price, suffix, isEstimate, isFree }.
 */
export function resolveActivityPrice(cost = {}) {
  const raw = cost.displayAmount != null ? cost.displayAmount : cost.amount;
  const price = typeof raw === 'number' && !Number.isNaN(raw) ? raw : null;
  return {
    price,
    suffix: cost.displaySuffix || '',
    isEstimate: cost.isEstimate === true,
    isFree: price === 0,
  };
}

/** Today's date as YYYY-MM-DD (local time) — used to disable past dates on date inputs. */
export function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatDate(date) {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateShort(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function formatTime(time) {
  if (!time) return '';
  return time;
}

export function daysBetween(start, end) {
  const a = new Date(start);
  const b = new Date(end);
  if (isNaN(a) || isNaN(b)) return 0;
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
}

export function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(date);
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('') || '?';
}

export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function toQueryString(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') search.set(k, v);
  });
  const s = search.toString();
  return s ? `?${s}` : '';
}
