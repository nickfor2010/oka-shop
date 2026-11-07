// Prices, shipping and ship dates. Shared by the shop page (for display) and the server (which is the
// one that counts), so both always calculate the same way.

export const BOX_SIZE = 6;
export const DEFAULT_SETTINGS = {
  shipFee: 220, // NT$ for orders under freeAt
  freeAt: 2000, // free shipping from this subtotal
  boxOff: 10, // % off the jars in a FULL gift box
  boxFee: 50, // price of the empty gift box
  leadDays: 2, // earliest ship date = today + leadDays
  shipDays: [1, 2, 3, 4, 5], // 0 = Sunday … 6 = Saturday
  closedDates: [], // 'YYYY-MM-DD' days with no shipping (holidays, breaks)
  dailyCap: 0, // max jars per ship date, 0 = no limit
  bankName: '', bankCode: '', account: '', accountName: '',
  lineOa: '@637xgnpi', // LINE Official Account id, for the "add friend" link
};

const int = (v, d, min = 0, max = 1e7) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
};
const str = (v, max = 80) => String(v ?? '').trim().slice(0, max);
const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

export function normalizeSettings(s = {}) {
  const d = DEFAULT_SETTINGS;
  return {
    shipFee: int(s.shipFee, d.shipFee),
    freeAt: int(s.freeAt, d.freeAt),
    boxOff: int(s.boxOff, d.boxOff, 0, 90),
    boxFee: int(s.boxFee, d.boxFee),
    leadDays: int(s.leadDays, d.leadDays, 0, 30),
    shipDays: Array.isArray(s.shipDays)
      ? [...new Set(s.shipDays.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))].sort()
      : [...d.shipDays],
    closedDates: Array.isArray(s.closedDates) ? [...new Set(s.closedDates.filter(isDate))].sort().slice(-300) : [],
    dailyCap: int(s.dailyCap, 0, 0, 100000),
    bankName: str(s.bankName),
    bankCode: str(s.bankCode, 10),
    account: str(s.account, 40),
    accountName: str(s.accountName),
    lineOa: str(s.lineOa ?? d.lineOa, 40),
  };
}

/** Price of one gift box from the prices of the jars in it. 10% off only when the box is full. */
export function boxPrice(jarPrices, s) {
  const jars = jarPrices.reduce((a, p) => a + p, 0);
  const factor = jarPrices.length === BOX_SIZE ? 1 - s.boxOff / 100 : 1;
  return Math.round(jars * factor) + s.boxFee;
}

export const shippingFee = (subtotal, s) => (subtotal <= 0 ? 0 : subtotal >= s.freeAt ? 0 : s.shipFee);

export const addDays = (dateStr, n) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
export const weekday = (dateStr) => new Date(dateStr + 'T00:00:00Z').getUTCDay();

/** The next `count` dates the shop ships on, starting `leadDays` after today (a 'YYYY-MM-DD' in Taipei time). */
export function shipDateOptions(today, s, count = 10) {
  const out = [];
  let d = addDays(today, s.leadDays);
  for (let i = 0; i < 180 && out.length < count; i++, d = addDays(d, 1)) {
    if (s.shipDays.includes(weekday(d)) && !s.closedDates.includes(d)) out.push(d);
  }
  return out;
}
