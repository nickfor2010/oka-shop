// OKA Shop — platform-independent API core.
// Runs on Cloudflare Workers (D1 + R2) and on Node.js (node:sqlite + a folder) through small adapters:
//   db.all(sql, params) -> rows, db.get(sql, params) -> row|null, db.run(sql, params) -> { lastId }
//   photos.put(key, bytes, type), photos.get(key) -> { body, type } | null, photos.delete(key)
import { normalizeSettings, boxPrice, shippingFee, shipDateOptions, BOX_SIZE } from '../public/js/pricing.js';
import { DEFAULT_PRODUCTS } from './seed.js';
import { createLine } from './line.js';
import { orderMessage, alertMessage, itemsText } from './messages.js';

const CUSTOMER_SESSION_DAYS = 180;
const ADMIN_SESSION_HOURS = 12;
const PBKDF2_ITERATIONS = 20000; // modest for the Workers CPU budget; admin logins are also rate-limited
const STATUSES = ['awaiting', 'reported', 'paid', 'shipped', 'cancelled'];
// Which status changes the team can make from each status.
const ADMIN_MOVES = {
  awaiting: ['paid', 'cancelled'],
  reported: ['paid', 'awaiting', 'cancelled'],
  paid: ['shipped', 'reported', 'awaiting', 'cancelled'],
  shipped: ['paid'],
  cancelled: ['awaiting', 'reported'],
};
export const DECOS = ['vanilla', 'shave', 'berries', 'lemon', 'crumbs', 'salt', 'sesame', 'straw', 'plain'];
const PRODUCT_STATUS = ['available', 'soon', 'hidden'];
const PHOTO_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
const NO_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, en TEXT NOT NULL, zh TEXT NOT NULL, den TEXT DEFAULT '', dzh TEXT DEFAULT '',
     price INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'available', color TEXT DEFAULT '#F4E2AE', deco TEXT DEFAULT 'plain',
     photo TEXT, sort INTEGER DEFAULT 99, updated_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`,
  `CREATE TABLE IF NOT EXISTS customers (id INTEGER PRIMARY KEY AUTOINCREMENT, line_user_id TEXT UNIQUE NOT NULL, line_name TEXT DEFAULT '',
     line_picture TEXT DEFAULT '', friend INTEGER, name TEXT DEFAULT '', phone TEXT DEFAULT '', email TEXT DEFAULT '', city TEXT DEFAULT '',
     addr TEXT DEFAULT '', lang TEXT DEFAULT 'en', created_at INTEGER NOT NULL, last_login INTEGER)`,
  `CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE COLLATE NOCASE, pw_hash TEXT NOT NULL,
     role TEXT NOT NULL DEFAULT 'staff', pw_changed INTEGER DEFAULT 0, line_user_id TEXT, active INTEGER DEFAULT 1, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, kind TEXT NOT NULL, user_id INTEGER NOT NULL, expires INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS oauth_states (state TEXT PRIMARY KEY, return_to TEXT, created INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS login_attempts (ip TEXT PRIMARY KEY, count INTEGER NOT NULL, first INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, no TEXT NOT NULL UNIQUE, customer_id INTEGER NOT NULL REFERENCES customers(id),
     status TEXT NOT NULL DEFAULT 'awaiting', created_at INTEGER NOT NULL, ship_date TEXT NOT NULL, name TEXT NOT NULL, phone TEXT NOT NULL,
     email TEXT DEFAULT '', city TEXT NOT NULL, addr TEXT NOT NULL, note TEXT DEFAULT '', items TEXT NOT NULL, jars INTEGER NOT NULL,
     subtotal INTEGER NOT NULL, ship_fee INTEGER NOT NULL, total INTEGER NOT NULL, last5 TEXT DEFAULT '', reported_at INTEGER, paid_at INTEGER,
     shipped_at INTEGER, cancelled_at INTEGER, tracking_no TEXT DEFAULT '', admin_note TEXT DEFAULT '', lang TEXT DEFAULT 'en')`,
  `CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_ship ON orders(ship_date, status)`,
  `CREATE TABLE IF NOT EXISTS order_events (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
     at INTEGER NOT NULL, kind TEXT NOT NULL, actor TEXT DEFAULT '', detail TEXT DEFAULT '')`,
  `CREATE INDEX IF NOT EXISTS idx_events_order ON order_events(order_id, at)`,
  `CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER, to_line TEXT NOT NULL, kind TEXT NOT NULL,
     text TEXT NOT NULL, status TEXT NOT NULL, error TEXT DEFAULT '', at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_messages_order ON messages(order_id, at)`,
  // One review per order, written after it has shipped; shown on the shop only once the team approves it.
  `CREATE TABLE IF NOT EXISTS reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL UNIQUE REFERENCES orders(id),
     customer_id INTEGER NOT NULL REFERENCES customers(id), product_id TEXT, rating INTEGER NOT NULL, text TEXT NOT NULL, display_name TEXT NOT NULL,
     status TEXT NOT NULL DEFAULT 'pending', created_at INTEGER NOT NULL, updated_at INTEGER, decided_at INTEGER, decided_by TEXT DEFAULT '')`,
  `CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status, created_at)`,
];

// ---------- helpers ----------
export class HttpError extends Error {
  constructor(status, message, code) { super(message); this.status = status; this.code = code; }
}
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } });
const redirect = (to, headers = {}) => new Response(null, { status: 302, headers: { Location: to, 'Cache-Control': 'no-store', ...headers } });
const str = (v, max) => String(v ?? '').trim().slice(0, max);
const enc = new TextEncoder();
const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const fromHex = (hex) => new Uint8Array(hex.match(/../g).map((h) => parseInt(h, 16)));
const randomHex = (n) => toHex(crypto.getRandomValues(new Uint8Array(n)));
async function pbkdf2(secret, saltHex, iterations) {
  const key = await crypto.subtle.importKey('raw', enc.encode(String(secret)), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(saltHex), iterations }, key, 256));
}
export async function hashSecret(secret) {
  const salt = randomHex(16);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${salt}$${toHex(await pbkdf2(secret, salt, PBKDF2_ITERATIONS))}`;
}
async function verifySecret(secret, stored) {
  if (!stored?.startsWith('pbkdf2$')) return false;
  const [, iter, salt, h] = stored.split('$');
  const a = await pbkdf2(secret, salt, Number(iter));
  const b = fromHex(h);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.min(a.length, b.length); i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
const parseCookies = (req) => Object.fromEntries((req.headers.get('cookie') || '').split(/;\s*/).filter((c) => c.includes('='))
  .map((c) => { const i = c.indexOf('='); return [c.slice(0, i), decodeURIComponent(c.slice(i + 1))]; }));
const setCookie = (name, value, maxAgeSec, secure) =>
  `${name}=${value}; Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}; Max-Age=${maxAgeSec}`;
const safeReturn = (p) => (typeof p === 'string' && /^\/(?!\/)[\w\-./#?=&%]*$/.test(p) ? p : '/');

export function dayKeyIn(tz) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  return (ms) => f.format(new Date(ms));
}
const parseItems = (o) => { try { return JSON.parse(o.items); } catch { return []; } };

export function createApp({ db, timezone = 'Asia/Taipei', adminPassword = 'oka-admin', line: lineCfg = {}, photos = null, devLogin = false, fetchImpl, now = () => Date.now() }) {
  const line = createLine({ ...lineCfg, fetchImpl: fetchImpl || globalThis.fetch?.bind(globalThis) });
  const dayKey = dayKeyIn(timezone);
  let readyP;
  const ready = () => (readyP ||= (async () => {
    for (const s of SCHEMA) await db.run(s);
    const c = await db.get('SELECT COUNT(*) AS n FROM products');
    if (!c?.n) for (const p of DEFAULT_PRODUCTS) await saveProduct(p.id, p);
  })().catch((e) => { readyP = null; throw e; }));

  // ---------- settings ----------
  async function getSettings() {
    const r = await db.get("SELECT value FROM settings WHERE key = 'shop'");
    let v = {};
    try { v = JSON.parse(r?.value || '{}'); } catch { /* fall back to defaults */ }
    return normalizeSettings(v);
  }
  const putSettings = (s) => db.run("INSERT INTO settings (key, value) VALUES ('shop', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [JSON.stringify(s)]);
  const publicSettings = (s) => ({ shipFee: s.shipFee, freeAt: s.freeAt, boxOff: s.boxOff, boxFee: s.boxFee, shipDays: s.shipDays, lineOa: s.lineOa });
  const bankOf = (s) => ({ bankName: s.bankName, bankCode: s.bankCode, account: s.account, accountName: s.accountName });

  // ---------- products ----------
  const productOut = (p) => ({ id: p.id, en: p.en, zh: p.zh, den: p.den || '', dzh: p.dzh || '', price: p.price, status: p.status, color: p.color, deco: p.deco, photo: p.photo ? `/photos/${p.photo}` : null, sort: p.sort });
  function productFields(b, cur = {}) {
    const pick = (k) => (b[k] !== undefined ? b[k] : cur[k]);
    const out = {
      en: str(pick('en'), 60), zh: str(pick('zh'), 60), den: str(pick('den'), 200), dzh: str(pick('dzh'), 200),
      price: Math.round(Number(pick('price'))), status: pick('status') || 'available', color: String(pick('color') || '#F4E2AE'),
      deco: pick('deco') || 'plain', sort: Math.round(Number(pick('sort') ?? 99)),
    };
    if (!out.en || !out.zh) throw new HttpError(400, 'Enter the name in English and Chinese');
    if (!Number.isFinite(out.price) || out.price < 0 || out.price > 100000) throw new HttpError(400, 'Enter a price between 0 and 100,000');
    if (!PRODUCT_STATUS.includes(out.status)) throw new HttpError(400, 'Unknown status');
    if (!/^#[0-9a-fA-F]{6}$/.test(out.color)) throw new HttpError(400, 'Color must look like #F4E2AE');
    if (!DECOS.includes(out.deco)) throw new HttpError(400, 'Unknown topping style');
    if (!Number.isFinite(out.sort)) out.sort = 99;
    return out;
  }
  async function saveProduct(id, p) {
    await db.run(`INSERT INTO products (id, en, zh, den, dzh, price, status, color, deco, sort, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET en=excluded.en, zh=excluded.zh, den=excluded.den, dzh=excluded.dzh, price=excluded.price, status=excluded.status,
      color=excluded.color, deco=excluded.deco, sort=excluded.sort, updated_at=excluded.updated_at`,
    [id, p.en, p.zh, p.den, p.dzh, p.price, p.status, p.color, p.deco, p.sort, now()]);
  }
  const listProducts = async (all) => (await db.all(`SELECT * FROM products ${all ? '' : "WHERE status != 'hidden'"} ORDER BY sort, en`)).map(productOut);

  // ---------- sessions ----------
  async function newSession(kind, userId, ms) {
    const token = randomHex(32);
    await db.run('INSERT INTO sessions (token, kind, user_id, expires) VALUES (?,?,?,?)', [token, kind, userId, now() + ms]);
    if (Math.random() < 0.05) await db.run('DELETE FROM sessions WHERE expires < ?', [now()]);
    return token;
  }
  async function sessionOf(req, kind) {
    const token = parseCookies(req)[kind === 'admin' ? 'oka_a' : 'oka_c'];
    if (!token) return null;
    const s = await db.get('SELECT * FROM sessions WHERE token = ? AND kind = ?', [token, kind]);
    if (!s || s.expires < now()) return null;
    const row = kind === 'admin'
      ? await db.get('SELECT * FROM admins WHERE id = ? AND active = 1', [s.user_id])
      : await db.get('SELECT * FROM customers WHERE id = ?', [s.user_id]);
    return row ? { ...row, token } : null;
  }
  async function requireCustomer(req) {
    const c = await sessionOf(req, 'customer');
    if (!c) throw new HttpError(401, 'Please log in with LINE first', 'login');
    return c;
  }
  async function requireAdmin(req, ownerOnly = false) {
    const a = await sessionOf(req, 'admin');
    if (!a) throw new HttpError(401, 'Please sign in');
    if (ownerOnly && a.role !== 'owner') throw new HttpError(403, 'Only the owner can do this');
    return a;
  }
  const customerOut = (c) => c && ({ name: c.line_name, picture: c.line_picture, friend: c.friend === null || c.friend === undefined ? null : !!c.friend,
    profile: { name: c.name, phone: c.phone, email: c.email, city: c.city, addr: c.addr } });
  const adminOut = (a) => a && ({ id: a.id, name: a.name, role: a.role, pw_changed: !!a.pw_changed, line_alerts: !!a.line_user_id, active: !!a.active, created_at: a.created_at });

  async function loginCustomer({ userId, name, picture, friend }, secure) {
    const existing = await db.get('SELECT id FROM customers WHERE line_user_id = ?', [userId]);
    let id = existing?.id;
    if (id) await db.run('UPDATE customers SET line_name = ?, line_picture = ?, friend = COALESCE(?, friend), last_login = ? WHERE id = ?', [name, picture, friend === null ? null : friend ? 1 : 0, now(), id]);
    else id = (await db.run('INSERT INTO customers (line_user_id, line_name, line_picture, friend, created_at, last_login) VALUES (?,?,?,?,?,?)', [userId, name, picture, friend === null ? null : friend ? 1 : 0, now(), now()])).lastId;
    const token = await newSession('customer', id, CUSTOMER_SESSION_DAYS * 86400000);
    return setCookie('oka_c', token, CUSTOMER_SESSION_DAYS * 86400, secure);
  }

  // ---------- rate limit (admin login) ----------
  async function checkRate(ip) {
    const r = await db.get('SELECT * FROM login_attempts WHERE ip = ?', [ip]);
    if (r && now() - r.first < 15 * 60000 && r.count >= 10) throw new HttpError(429, 'Too many attempts. Try again in 15 minutes.');
  }
  async function failRate(ip) {
    const r = await db.get('SELECT * FROM login_attempts WHERE ip = ?', [ip]);
    if (!r || now() - r.first >= 15 * 60000) await db.run('INSERT INTO login_attempts (ip, count, first) VALUES (?,1,?) ON CONFLICT(ip) DO UPDATE SET count = 1, first = excluded.first', [ip, now()]);
    else await db.run('UPDATE login_attempts SET count = count + 1 WHERE ip = ?', [ip]);
  }

  // ---------- orders ----------
  const orderOut = (o, admin = false) => ({
    no: o.no, status: o.status, created_at: o.created_at, ship_date: o.ship_date, name: o.name, phone: o.phone, email: o.email,
    city: o.city, addr: o.addr, note: o.note, items: parseItems(o), jars: o.jars, subtotal: o.subtotal, ship_fee: o.ship_fee, total: o.total,
    last5: o.last5, reported_at: o.reported_at, paid_at: o.paid_at, shipped_at: o.shipped_at, cancelled_at: o.cancelled_at,
    tracking_no: o.tracking_no, lang: o.lang,
    ...(admin ? { admin_note: o.admin_note, line_name: o.line_name, friend: o.friend === null || o.friend === undefined ? null : !!o.friend } : {}),
  });
  const addEvent = (orderId, kind, actor = '', detail = '') =>
    db.run('INSERT INTO order_events (order_id, at, kind, actor, detail) VALUES (?,?,?,?,?)', [orderId, now(), kind, actor, String(detail).slice(0, 300)]);

  async function uniqueNo(today) {
    for (let i = 0; i < 20; i++) {
      const rnd = [...crypto.getRandomValues(new Uint8Array(4))].map((b) => NO_CHARS[b % NO_CHARS.length]).join('');
      const no = `OKA-${today.slice(2).replace(/-/g, '')}-${rnd}`;
      if (!(await db.get('SELECT 1 AS x FROM orders WHERE no = ?', [no]))) return no;
    }
    throw new HttpError(500, 'Could not create an order number');
  }

  /** Ship dates customers can pick, with how many jars are still free on each when there is a daily limit. */
  async function shipDates(s) {
    const dates = shipDateOptions(dayKey(now()), s, 10);
    if (!s.dailyCap || !dates.length) return dates.map((date) => ({ date, left: null }));
    const rows = await db.all(`SELECT ship_date, SUM(jars) AS n FROM orders WHERE status != 'cancelled' AND ship_date IN (${dates.map(() => '?').join(',')}) GROUP BY ship_date`, dates);
    const used = Object.fromEntries(rows.map((r) => [r.ship_date, r.n]));
    return dates.map((date) => ({ date, left: Math.max(0, s.dailyCap - (used[date] || 0)) }));
  }

  /** Builds the order lines from what the customer sent, using the prices in the database. */
  function priceLines(items, products, s) {
    const P = Object.fromEntries(products.map((p) => [p.id, p]));
    const onSale = (id) => P[id]?.status === 'available';
    if (!Array.isArray(items) || !items.length) throw new HttpError(400, 'Your bag is empty');
    if (items.length > 40) throw new HttpError(400, 'Too many different items in one order');
    const merged = new Map();
    for (const it of items) {
      const qty = Math.round(Number(it?.qty));
      if (!(qty >= 1 && qty <= 50)) throw new HttpError(400, 'Each quantity must be between 1 and 50');
      if (it.type === 'jar') {
        if (!onSale(it.id)) throw new HttpError(409, 'Something in your bag is no longer available. Please check your bag.', 'unavailable');
        const key = 'jar:' + it.id;
        merged.set(key, { type: 'jar', id: it.id, qty: (merged.get(key)?.qty || 0) + qty });
      } else if (it.type === 'box') {
        const ids = Array.isArray(it.items) ? it.items.map(String) : [];
        if (ids.length < 1 || ids.length > BOX_SIZE) throw new HttpError(400, `A gift box holds 1 to ${BOX_SIZE} jars`);
        if (!ids.every(onSale)) throw new HttpError(409, 'Something in your bag is no longer available. Please check your bag.', 'unavailable');
        ids.sort();
        const key = 'box:' + ids.join(',');
        merged.set(key, { type: 'box', ids, qty: (merged.get(key)?.qty || 0) + qty });
      } else throw new HttpError(400, 'Unknown item in your bag');
    }
    return [...merged.values()].map((l) => {
      if (l.type === 'jar') {
        const p = P[l.id];
        return { type: 'jar', id: p.id, en: p.en, zh: p.zh, price: p.price, qty: l.qty, total: p.price * l.qty };
      }
      const jars = l.ids.map((id) => ({ id, en: P[id].en, zh: P[id].zh, price: P[id].price }));
      const price = boxPrice(jars.map((j) => j.price), s);
      return { type: 'box', items: jars, full: jars.length === BOX_SIZE, price, qty: l.qty, total: price * l.qty };
    });
  }

  async function createOrder(cust, b) {
    const s = await getSettings();
    const products = await db.all('SELECT * FROM products');
    const lines = priceLines(b.items, products, s);
    const jars = lines.reduce((a, l) => a + (l.type === 'box' ? l.items.length : 1) * l.qty, 0);
    const subtotal = lines.reduce((a, l) => a + l.total, 0);
    const ship_fee = shippingFee(subtotal, s);
    const total = subtotal + ship_fee;
    if (b.expectedTotal !== undefined && Math.round(Number(b.expectedTotal)) !== total) {
      throw new HttpError(409, 'Prices have changed since you opened the page. Please check your bag.', 'price_changed');
    }
    const f = { name: str(b.name, 60), phone: String(b.phone || '').replace(/[\s-]/g, ''), email: str(b.email, 120), city: str(b.city, 40), addr: str(b.addr, 200), note: str(b.note, 500) };
    if (!f.name) throw new HttpError(400, 'Enter your name');
    if (!/^09\d{8}$/.test(f.phone)) throw new HttpError(400, 'Enter a Taiwan mobile number, e.g. 0912 345 678');
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) throw new HttpError(400, 'Check the email address');
    if (!f.city || !f.addr) throw new HttpError(400, 'Enter your address');
    const lang = b.lang === 'zh' ? 'zh' : 'en';
    const dates = await shipDates(s);
    const pick = dates.find((d) => d.date === b.ship_date);
    if (!pick) throw new HttpError(400, 'Please choose one of the ship dates shown', 'ship_date');
    if (pick.left !== null && pick.left < jars) throw new HttpError(409, 'That ship date is full. Please pick another day.', 'ship_date');
    const no = await uniqueNo(dayKey(now()));
    const { lastId } = await db.run(`INSERT INTO orders (no, customer_id, status, created_at, ship_date, name, phone, email, city, addr, note, items, jars, subtotal, ship_fee, total, lang)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [no, cust.id, 'awaiting', now(), pick.date, f.name, f.phone, f.email, f.city, f.addr, f.note, JSON.stringify(lines), jars, subtotal, ship_fee, total, lang]);
    await addEvent(lastId, 'placed', 'customer', `${itemsText({ items: lines }, 'en')} · NT$${total}`);
    await db.run('UPDATE customers SET name = ?, phone = ?, email = ?, city = ?, addr = ?, lang = ? WHERE id = ?', [f.name, f.phone, f.email, f.city, f.addr, lang, cust.id]);
    return db.get('SELECT * FROM orders WHERE id = ?', [lastId]);
  }

  // ---------- LINE messages ----------
  async function sendLine(to, kind, text, orderId) {
    const r = await line.push(to, text);
    await db.run('INSERT INTO messages (order_id, to_line, kind, text, status, error, at) VALUES (?,?,?,?,?,?,?)', [orderId ?? null, to, kind, text, r.status, r.error || '', now()]);
    return r;
  }
  async function notifyCustomer(o, kind, site) {
    const c = await db.get('SELECT line_user_id FROM customers WHERE id = ?', [o.customer_id]);
    if (!c) return;
    await sendLine(c.line_user_id, kind, orderMessage(kind, orderOut(o), await getSettings(), site), o.id);
  }
  async function alertTeam(o, kind, extra) {
    const team = await db.all("SELECT line_user_id FROM admins WHERE active = 1 AND line_user_id IS NOT NULL AND line_user_id != ''");
    const text = alertMessage(kind, orderOut(o), extra);
    for (const a of team) await sendLine(a.line_user_id, 'alert-' + kind, text, o.id);
  }

  // ---------- reviews ----------
  const reviewOwnOut = (r) => ({ rating: r.rating, text: r.text, display_name: r.display_name, product_id: r.product_id, status: r.status, created_at: r.created_at });
  async function publicReviews() {
    const rows = await db.all(`SELECT r.rating, r.text, r.display_name, r.product_id, r.created_at, p.en, p.zh FROM reviews r LEFT JOIN products p ON p.id = r.product_id
      WHERE r.status = 'approved' ORDER BY r.created_at DESC LIMIT 12`);
    const s = await db.get("SELECT COUNT(*) AS n, AVG(rating) AS avg FROM reviews WHERE status = 'approved'");
    return { count: s.n || 0, average: s.n ? Math.round(s.avg * 10) / 10 : null,
      list: rows.map((r) => ({ rating: r.rating, text: r.text, name: r.display_name, product: r.product_id && r.en ? { id: r.product_id, en: r.en, zh: r.zh } : null, created_at: r.created_at })) };
  }

  // ---------- admin: production plan ----------
  async function production(days = 14) {
    const today = dayKey(now());
    const rows = await db.all("SELECT ship_date, status, items FROM orders WHERE status NOT IN ('cancelled') AND ship_date >= ? ORDER BY ship_date LIMIT 5000", [today]);
    const byDate = new Map();
    for (const r of rows) {
      if (!byDate.has(r.ship_date)) {
        if (byDate.size >= days) break;
        byDate.set(r.ship_date, { date: r.ship_date, orders: 0, jars: 0, confirmed: {}, pending: {} });
      }
      const d = byDate.get(r.ship_date);
      const bucket = r.status === 'paid' || r.status === 'shipped' ? d.confirmed : d.pending;
      d.orders++;
      for (const l of parseItems(r)) {
        const ids = l.type === 'box' ? l.items.map((j) => j.id) : [l.id];
        for (const id of ids) { bucket[id] = (bucket[id] || 0) + l.qty; d.jars += l.qty; }
      }
    }
    return [...byDate.values()];
  }

  const csvCell = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

  // ---------- routes ----------
  const routes = [];
  const route = (method, pattern, fn) => routes.push({ method, re: new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), fn });

  route('GET', '/healthz', async () => json({ ok: true }));

  // Shop data: menu, prices, ship dates and who is logged in.
  route('GET', '/api/shop', async ({ req }) => {
    const s = await getSettings();
    const me = await sessionOf(req, 'customer');
    return json({
      products: await listProducts(false), settings: publicSettings(s), shipDates: await shipDates(s), today: dayKey(now()),
      me: customerOut(me), login: line.loginEnabled ? 'line' : devLogin ? 'dev' : 'off',
      reviews: await publicReviews(),
    });
  });

  // ----- customer login with LINE -----
  route('GET', '/auth/line', async ({ url }) => {
    if (!line.loginEnabled) return devLogin ? redirect('/auth/dev?return=' + encodeURIComponent(safeReturn(url.searchParams.get('return')))) : json({ error: 'LINE Login is not set up yet' }, 503);
    const state = randomHex(16);
    await db.run('INSERT INTO oauth_states (state, return_to, created) VALUES (?,?,?)', [state, safeReturn(url.searchParams.get('return')), now()]);
    await db.run('DELETE FROM oauth_states WHERE created < ?', [now() - 3600000]);
    return redirect(line.authorizeUrl(`${url.origin}/auth/line/callback`, state));
  });
  route('GET', '/auth/line/callback', async ({ url }) => {
    const state = url.searchParams.get('state') || '';
    const row = await db.get('SELECT * FROM oauth_states WHERE state = ?', [state]);
    if (row) await db.run('DELETE FROM oauth_states WHERE state = ?', [state]);
    if (!row || now() - row.created > 3600000) return redirect('/?login=expired');
    if (url.searchParams.get('error') || !url.searchParams.get('code')) return redirect(row.return_to.split('#')[0] + (row.return_to.includes('?') ? '&' : '?') + 'login=cancelled');
    let profile;
    try { profile = await line.exchange(url.searchParams.get('code'), `${url.origin}/auth/line/callback`); } catch (e) {
      console.error('LINE login failed', e);
      return redirect('/?login=failed');
    }
    const fsc = url.searchParams.get('friendship_status_changed');
    if (profile.friend === null && fsc === 'true') profile.friend = true;
    return redirect(row.return_to, { 'Set-Cookie': await loginCustomer(profile, url.protocol === 'https:') });
  });
  // Local development only: pretend to log in with LINE.
  route('GET', '/auth/dev', async ({ url }) => {
    if (!devLogin || line.loginEnabled) return json({ error: 'Not available' }, 404);
    const name = str(url.searchParams.get('name'), 40);
    const ret = safeReturn(url.searchParams.get('return'));
    if (!name) {
      return new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Test login</title>
<body style="font-family:system-ui;max-width:360px;margin:60px auto;padding:0 16px"><h1>Test login</h1><p>LINE Login is not set up, so this local copy lets you sign in with any name.</p>
<form><input type="hidden" name="return" value="${ret.replace(/"/g, '&quot;')}"><label>Name <input name="name" required autofocus></label> <button>Log in</button></form>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
    return redirect(ret, { 'Set-Cookie': await loginCustomer({ userId: 'dev-' + name.toLowerCase(), name, picture: '', friend: true }, url.protocol === 'https:') });
  });
  route('POST', '/api/logout', async ({ req, url }) => {
    const tok = parseCookies(req).oka_c;
    if (tok) await db.run("DELETE FROM sessions WHERE token = ? AND kind = 'customer'", [tok]);
    return json({ ok: true }, 200, { 'Set-Cookie': setCookie('oka_c', '', 0, url.protocol === 'https:') });
  });

  // ----- customer orders -----
  route('POST', '/api/orders', async ({ req, body, site, defer }) => {
    const cust = await requireCustomer(req);
    const o = await createOrder(cust, body);
    defer((async () => { await notifyCustomer(o, 'placed', site); await alertTeam(o, 'new'); })());
    return json({ order: orderOut(o), bank: bankOf(await getSettings()) }, 201);
  });
  route('GET', '/api/orders', async ({ req }) => {
    const cust = await requireCustomer(req);
    const rows = await db.all('SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT 100', [cust.id]);
    const revs = Object.fromEntries((await db.all('SELECT * FROM reviews WHERE customer_id = ?', [cust.id])).map((r) => [r.order_id, reviewOwnOut(r)]));
    return json({ orders: rows.map((o) => ({ ...orderOut(o), review: revs[o.id] || null })), bank: bankOf(await getSettings()) });
  });
  route('GET', '/api/orders/:no', async ({ req, params }) => {
    const cust = await requireCustomer(req);
    const o = await db.get('SELECT * FROM orders WHERE no = ? AND customer_id = ?', [params.no, cust.id]);
    if (!o) throw new HttpError(404, 'Order not found');
    const r = await db.get('SELECT * FROM reviews WHERE order_id = ?', [o.id]);
    return json({ order: { ...orderOut(o), review: r ? reviewOwnOut(r) : null }, bank: bankOf(await getSettings()) });
  });
  // Customer writes (or, while it's still waiting for approval, corrects) the review of a shipped order.
  route('POST', '/api/orders/:no/review', async ({ req, params, body, defer }) => {
    const cust = await requireCustomer(req);
    const o = await db.get('SELECT * FROM orders WHERE no = ? AND customer_id = ?', [params.no, cust.id]);
    if (!o) throw new HttpError(404, 'Order not found');
    if (o.status !== 'shipped') throw new HttpError(409, 'You can review an order once it has shipped');
    const rating = Math.round(Number(body.rating));
    if (!(rating >= 1 && rating <= 5)) throw new HttpError(400, 'Choose 1 to 5 stars');
    const text = str(body.text, 500);
    if (text.length < 5) throw new HttpError(400, 'Write a few words about your cheesecake');
    const name = str(body.display_name, 30) || cust.line_name || 'OKA customer';
    const inOrder = new Set(parseItems(o).flatMap((l) => (l.type === 'box' ? l.items.map((j) => j.id) : [l.id])));
    const product = body.product_id && inOrder.has(String(body.product_id)) ? String(body.product_id) : null;
    const cur = await db.get('SELECT * FROM reviews WHERE order_id = ?', [o.id]);
    if (cur && cur.status !== 'pending') throw new HttpError(409, 'This review has already been checked by the shop');
    if (cur) await db.run('UPDATE reviews SET rating = ?, text = ?, display_name = ?, product_id = ?, updated_at = ? WHERE id = ?', [rating, text, name, product, now(), cur.id]);
    else await db.run('INSERT INTO reviews (order_id, customer_id, product_id, rating, text, display_name, status, created_at) VALUES (?,?,?,?,?,?,?,?)', [o.id, cust.id, product, rating, text, name, 'pending', now()]);
    await addEvent(o.id, 'review', 'customer', `${rating}★`);
    if (!cur) defer(alertTeam(o, 'review', { rating, text, name }));
    const r = await db.get('SELECT * FROM reviews WHERE order_id = ?', [o.id]);
    return json({ review: reviewOwnOut(r) }, cur ? 200 : 201);
  });
  route('POST', '/api/orders/:no/payment', async ({ req, params, body, defer }) => {
    const cust = await requireCustomer(req);
    const o = await db.get('SELECT * FROM orders WHERE no = ? AND customer_id = ?', [params.no, cust.id]);
    if (!o) throw new HttpError(404, 'Order not found');
    const last5 = String(body.last5 || '').trim();
    if (!/^\d{5}$/.test(last5)) throw new HttpError(400, 'Enter exactly 5 digits');
    if (!['awaiting', 'reported'].includes(o.status)) throw new HttpError(409, 'This order no longer needs a payment report');
    await db.run("UPDATE orders SET last5 = ?, reported_at = ?, status = 'reported' WHERE id = ?", [last5, now(), o.id]);
    await addEvent(o.id, 'reported', 'customer', last5);
    const upd = await db.get('SELECT * FROM orders WHERE id = ?', [o.id]);
    defer(alertTeam(upd, 'reported'));
    return json({ order: orderOut(upd) });
  });

  // ----- photos (served from R2 / disk) -----
  route('GET', '/photos/:a/:b/:c', async ({ params }) => {
    const key = `${params.a}/${params.b}/${params.c}`;
    if (!photos || !/^[a-z0-9._-]+\/[a-z0-9._-]+\/[a-z0-9._-]+$/i.test(key)) return new Response('Not found', { status: 404 });
    const obj = await photos.get(key);
    if (!obj) return new Response('Not found', { status: 404 });
    return new Response(obj.body, { headers: { 'Content-Type': obj.type || 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' } });
  });

  // ----- admin: sign in -----
  route('POST', '/api/admin/login', async ({ body, ip, url }) => {
    await checkRate(ip);
    const name = str(body.name, 40) || 'owner';
    const password = String(body.password || '');
    let admin = null;
    const count = (await db.get('SELECT COUNT(*) AS n FROM admins')).n;
    if (!count) {
      // First run: the password from ADMIN_PASSWORD creates the owner account.
      if (password && password === adminPassword) {
        const { lastId } = await db.run('INSERT INTO admins (name, pw_hash, role, created_at) VALUES (?,?,?,?)', [name, await hashSecret(password), 'owner', now()]);
        admin = await db.get('SELECT * FROM admins WHERE id = ?', [lastId]);
      }
    } else {
      const a = await db.get('SELECT * FROM admins WHERE name = ? AND active = 1', [name]);
      if (a && (await verifySecret(password, a.pw_hash))) admin = a;
    }
    if (!admin) { await failRate(ip); throw new HttpError(401, 'Wrong name or password'); }
    await db.run('DELETE FROM login_attempts WHERE ip = ?', [ip]);
    const token = await newSession('admin', admin.id, ADMIN_SESSION_HOURS * 3600000);
    return json({ admin: adminOut(admin) }, 200, { 'Set-Cookie': setCookie('oka_a', token, ADMIN_SESSION_HOURS * 3600, url.protocol === 'https:') });
  });
  route('POST', '/api/admin/logout', async ({ req, url }) => {
    const tok = parseCookies(req).oka_a;
    if (tok) await db.run("DELETE FROM sessions WHERE token = ? AND kind = 'admin'", [tok]);
    return json({ ok: true }, 200, { 'Set-Cookie': setCookie('oka_a', '', 0, url.protocol === 'https:') });
  });
  route('GET', '/api/admin/me', async ({ req }) => {
    const a = await requireAdmin(req);
    const cust = await sessionOf(req, 'customer');
    return json({ admin: adminOut(a), lineLinkable: !!cust, lineMessaging: line.messagingEnabled, lineLogin: line.loginEnabled });
  });
  route('POST', '/api/admin/me/password', async ({ req, body }) => {
    const a = await requireAdmin(req);
    if (!(await verifySecret(String(body.current || ''), a.pw_hash))) throw new HttpError(400, 'Your current password is wrong');
    const pw = String(body.password || '');
    if (pw.length < 8) throw new HttpError(400, 'Use at least 8 characters');
    await db.run('UPDATE admins SET pw_hash = ?, pw_changed = 1 WHERE id = ?', [await hashSecret(pw), a.id]);
    await db.run("DELETE FROM sessions WHERE kind = 'admin' AND user_id = ? AND token != ?", [a.id, a.token]);
    return json({ ok: true });
  });
  // New-order alerts go to the LINE account this browser is logged into on the shop.
  route('POST', '/api/admin/me/line-alerts', async ({ req, body }) => {
    const a = await requireAdmin(req);
    if (!body.on) { await db.run('UPDATE admins SET line_user_id = NULL WHERE id = ?', [a.id]); return json({ ok: true, line_alerts: false }); }
    const cust = await sessionOf(req, 'customer');
    if (!cust) throw new HttpError(400, 'Log in with LINE on the shop page in this browser first, then come back here.');
    await db.run('UPDATE admins SET line_user_id = ? WHERE id = ?', [cust.line_user_id, a.id]);
    await sendLine(cust.line_user_id, 'alert-test', `✅ OKA: new orders and payment reports will be sent here.\n之後的新訂單與匯款回報會傳到這裡。`, null);
    return json({ ok: true, line_alerts: true });
  });

  // ----- admin: orders -----
  route('GET', '/api/admin/orders', async ({ req, url }) => {
    await requireAdmin(req);
    const status = url.searchParams.get('status');
    const ship = url.searchParams.get('ship_date');
    const q = str(url.searchParams.get('q'), 60);
    const where = [], params = [];
    if (status && STATUSES.includes(status)) { where.push('o.status = ?'); params.push(status); }
    if (ship && /^\d{4}-\d{2}-\d{2}$/.test(ship)) { where.push('o.ship_date = ?'); params.push(ship); }
    if (q) { where.push('(o.no LIKE ? OR o.name LIKE ? OR o.phone LIKE ? OR o.last5 LIKE ? OR o.email LIKE ? OR c.line_name LIKE ?)'); params.push(...Array(6).fill(`%${q}%`)); }
    const rows = await db.all(`SELECT o.*, c.line_name, c.friend FROM orders o JOIN customers c ON c.id = o.customer_id ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY ${status === 'paid' ? 'o.ship_date ASC, o.created_at ASC' : 'o.created_at DESC'} LIMIT 500`, params);
    const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    for (const r of await db.all('SELECT status, COUNT(*) AS n FROM orders GROUP BY status')) counts[r.status] = r.n;
    const rev = await db.get("SELECT COALESCE(SUM(total), 0) AS n FROM orders WHERE status IN ('paid','shipped') AND created_at >= ?", [Date.parse(dayKey(now()).slice(0, 8) + '01T00:00:00+08:00')]);
    return json({ orders: rows.map((o) => orderOut(o, true)), counts, monthSales: rev.n, today: dayKey(now()) });
  });
  route('GET', '/api/admin/orders/:no', async ({ req, params }) => {
    await requireAdmin(req);
    const o = await db.get('SELECT o.*, c.line_name, c.friend FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.no = ?', [params.no]);
    if (!o) throw new HttpError(404, 'Order not found');
    const events = await db.all('SELECT at, kind, actor, detail FROM order_events WHERE order_id = ? ORDER BY at, id', [o.id]);
    const messages = await db.all('SELECT at, kind, status, error, text FROM messages WHERE order_id = ? ORDER BY at, id', [o.id]);
    return json({ order: orderOut(o, true), events, messages, moves: ADMIN_MOVES[o.status].filter((m) => m !== 'reported' || o.last5) });
  });
  route('POST', '/api/admin/orders/:no/status', async ({ req, params, body, site, defer }) => {
    const a = await requireAdmin(req);
    const o = await db.get('SELECT * FROM orders WHERE no = ?', [params.no]);
    if (!o) throw new HttpError(404, 'Order not found');
    const to = body.status;
    if (!ADMIN_MOVES[o.status]?.includes(to) || (to === 'reported' && !o.last5)) throw new HttpError(409, `This order can't move from ${o.status} to ${to}`);
    const stamp = { paid: 'paid_at', shipped: 'shipped_at', cancelled: 'cancelled_at' }[to];
    const tracking = to === 'shipped' ? str(body.tracking_no, 60) : o.tracking_no;
    await db.run(`UPDATE orders SET status = ?, tracking_no = ?${stamp ? `, ${stamp} = ?` : ''} WHERE id = ?`, stamp ? [to, tracking, now(), o.id] : [to, tracking, o.id]);
    await addEvent(o.id, to, a.name, to === 'shipped' && tracking ? tracking : '');
    const upd = await db.get('SELECT * FROM orders WHERE id = ?', [o.id]);
    // Customers hear about real progress, not about undo steps.
    const forward = (to === 'paid' && ['awaiting', 'reported'].includes(o.status)) || to === 'shipped' || to === 'cancelled';
    if (forward && body.notify !== false) defer(notifyCustomer(upd, to, site));
    return json({ order: orderOut(upd, true) });
  });
  route('POST', '/api/admin/orders/:no/note', async ({ req, params, body }) => {
    const a = await requireAdmin(req);
    const o = await db.get('SELECT id FROM orders WHERE no = ?', [params.no]);
    if (!o) throw new HttpError(404, 'Order not found');
    await db.run('UPDATE orders SET admin_note = ? WHERE id = ?', [str(body.admin_note, 1000), o.id]);
    await addEvent(o.id, 'note', a.name);
    return json({ ok: true });
  });
  route('POST', '/api/admin/orders/:no/resend', async ({ req, params, site }) => {
    await requireAdmin(req);
    const o = await db.get('SELECT * FROM orders WHERE no = ?', [params.no]);
    if (!o) throw new HttpError(404, 'Order not found');
    const kind = { awaiting: 'placed', reported: 'placed', paid: 'paid', shipped: 'shipped', cancelled: 'cancelled' }[o.status];
    await notifyCustomer(o, kind, site);
    const last = await db.get('SELECT status, error FROM messages WHERE order_id = ? ORDER BY id DESC LIMIT 1', [o.id]);
    return json({ result: last });
  });
  route('GET', '/api/admin/orders.csv', async ({ req, url }) => {
    await requireAdmin(req);
    const from = url.searchParams.get('from') || '2000-01-01', to = url.searchParams.get('to') || '2999-12-31';
    const rows = await db.all("SELECT o.*, c.line_name FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.ship_date BETWEEN ? AND ? ORDER BY o.ship_date, o.created_at", [from, to]);
    const head = ['Order', 'Status', 'Placed', 'Ship date', 'Name', 'LINE name', 'Phone', 'Email', 'City', 'Address', 'Items', 'Jars', 'Subtotal', 'Shipping', 'Total', 'Last 5', 'Tracking', 'Customer note', 'Team note'];
    const lines = rows.map((o) => [o.no, o.status, new Date(o.created_at).toISOString(), o.ship_date, o.name, o.line_name, o.phone, o.email, o.city, o.addr,
      itemsText({ items: parseItems(o) }, 'en'), o.jars, o.subtotal, o.ship_fee, o.total, o.last5, o.tracking_no, o.note, o.admin_note].map(csvCell).join(','));
    return new Response('﻿' + [head.join(','), ...lines].join('\r\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="oka-orders-${from}-${to}.csv"`, 'Cache-Control': 'no-store' } });
  });
  route('GET', '/api/admin/production', async ({ req }) => {
    await requireAdmin(req);
    return json({ days: await production(14), products: await listProducts(true) });
  });

  // ----- admin: customers (everyone who has logged in with LINE) -----
  const CUSTOMER_STATS = `SELECT c.*, COUNT(o.id) AS orders,
      COALESCE(SUM(CASE WHEN o.status IN ('paid','shipped') THEN o.total END), 0) AS spent,
      SUM(CASE WHEN o.status IN ('awaiting','reported') THEN 1 ELSE 0 END) AS open_orders,
      MAX(o.created_at) AS last_order
    FROM customers c LEFT JOIN orders o ON o.customer_id = c.id`;
  const customerAdminOut = (c) => ({
    id: c.id, line_name: c.line_name, picture: c.line_picture, friend: c.friend === null || c.friend === undefined ? null : !!c.friend,
    name: c.name, phone: c.phone, email: c.email, city: c.city, addr: c.addr, lang: c.lang, created_at: c.created_at, last_login: c.last_login,
    orders: c.orders || 0, spent: c.spent || 0, open_orders: c.open_orders || 0, last_order: c.last_order || null,
  });
  route('GET', '/api/admin/customers', async ({ req, url }) => {
    await requireAdmin(req);
    const q = str(url.searchParams.get('q'), 60);
    const params = q ? Array(6).fill(`%${q}%`) : [];
    const rows = await db.all(`${CUSTOMER_STATS} ${q ? 'WHERE (c.line_name LIKE ? OR c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ? OR c.city LIKE ? OR c.addr LIKE ?)' : ''}
      GROUP BY c.id ORDER BY COALESCE(MAX(o.created_at), c.created_at) DESC LIMIT 1000`, params);
    const monthStart = Date.parse(dayKey(now()).slice(0, 8) + '01T00:00:00+08:00');
    const s = await db.get(`SELECT COUNT(*) AS total, SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS new_month,
      SUM(CASE WHEN friend = 0 THEN 1 ELSE 0 END) AS not_friends FROM customers`, [monthStart]);
    const repeat = await db.get("SELECT COUNT(*) AS n FROM (SELECT customer_id FROM orders WHERE status != 'cancelled' GROUP BY customer_id HAVING COUNT(*) >= 2)");
    return json({ customers: rows.map(customerAdminOut), summary: { total: s.total || 0, newThisMonth: s.new_month || 0, notFriends: s.not_friends || 0, repeat: repeat.n || 0 } });
  });
  route('GET', '/api/admin/customers/:id', async ({ req, params }) => {
    await requireAdmin(req);
    const c = await db.get(`${CUSTOMER_STATS} WHERE c.id = ? GROUP BY c.id`, [Number(params.id)]);
    if (!c) throw new HttpError(404, 'Customer not found');
    const orders = await db.all('SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT 200', [c.id]);
    return json({ customer: customerAdminOut(c), orders: orders.map((o) => orderOut(o, true)) });
  });
  route('GET', '/api/admin/customers.csv', async ({ req }) => {
    await requireAdmin(req, true);
    const rows = await db.all(`${CUSTOMER_STATS} GROUP BY c.id ORDER BY c.created_at`);
    const head = ['Customer', 'LINE name', 'Name', 'Phone', 'Email', 'City', 'Address', 'LINE friend', 'Language', 'Joined', 'Last login', 'Orders', 'Paid total', 'Last order'];
    const iso = (ms) => (ms ? new Date(ms).toISOString() : '');
    const lines = rows.map((c) => [c.id, c.line_name, c.name, c.phone, c.email, c.city, c.addr, c.friend === null ? '' : c.friend ? 'yes' : 'no', c.lang,
      iso(c.created_at), iso(c.last_login), c.orders, c.spent, iso(c.last_order)].map(csvCell).join(','));
    return new Response('﻿' + [head.join(','), ...lines].join('\r\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="oka-customers-${dayKey(now())}.csv"`, 'Cache-Control': 'no-store' } });
  });

  // ----- admin: reviews -----
  route('GET', '/api/admin/reviews', async ({ req, url }) => {
    await requireAdmin(req);
    const status = ['pending', 'approved', 'rejected'].includes(url.searchParams.get('status')) ? url.searchParams.get('status') : 'pending';
    const rows = await db.all(`SELECT r.*, o.no, c.line_name, p.en, p.zh FROM reviews r JOIN orders o ON o.id = r.order_id JOIN customers c ON c.id = r.customer_id
      LEFT JOIN products p ON p.id = r.product_id WHERE r.status = ? ORDER BY r.created_at DESC LIMIT 500`, [status]);
    const counts = { pending: 0, approved: 0, rejected: 0 };
    for (const c of await db.all('SELECT status, COUNT(*) AS n FROM reviews GROUP BY status')) counts[c.status] = c.n;
    return json({ reviews: rows.map((r) => ({ id: r.id, order_no: r.no, line_name: r.line_name, rating: r.rating, text: r.text, display_name: r.display_name,
      product: r.product_id && r.en ? { id: r.product_id, en: r.en, zh: r.zh } : null, status: r.status, created_at: r.created_at, decided_at: r.decided_at, decided_by: r.decided_by })), counts });
  });
  route('POST', '/api/admin/reviews/:id', async ({ req, params, body }) => {
    const a = await requireAdmin(req);
    const r = await db.get('SELECT * FROM reviews WHERE id = ?', [Number(params.id)]);
    if (!r) throw new HttpError(404, 'Review not found');
    if (!['approved', 'rejected', 'pending'].includes(body.status)) throw new HttpError(400, 'Unknown status');
    await db.run('UPDATE reviews SET status = ?, decided_at = ?, decided_by = ? WHERE id = ?', [body.status, body.status === 'pending' ? null : now(), body.status === 'pending' ? '' : a.name, r.id]);
    await addEvent(r.order_id, 'review-' + body.status, a.name);
    return json({ ok: true });
  });

  // ----- admin: products -----
  route('GET', '/api/admin/products', async ({ req }) => { await requireAdmin(req); return json({ products: await listProducts(true), decos: DECOS }); });
  route('POST', '/api/admin/products', async ({ req, body }) => {
    await requireAdmin(req, true);
    const f = productFields(body);
    let id = (f.en.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'product').slice(0, 30);
    if (await db.get('SELECT 1 AS x FROM products WHERE id = ?', [id])) id += '-' + randomHex(2);
    await saveProduct(id, f);
    return json({ product: productOut(await db.get('SELECT * FROM products WHERE id = ?', [id])) }, 201);
  });
  route('PUT', '/api/admin/products/:id', async ({ req, params, body }) => {
    await requireAdmin(req, true);
    const cur = await db.get('SELECT * FROM products WHERE id = ?', [params.id]);
    if (!cur) throw new HttpError(404, 'Product not found');
    await saveProduct(cur.id, productFields(body, cur));
    return json({ product: productOut(await db.get('SELECT * FROM products WHERE id = ?', [cur.id])) });
  });
  route('DELETE', '/api/admin/products/:id', async ({ req, params }) => {
    await requireAdmin(req, true);
    const cur = await db.get('SELECT * FROM products WHERE id = ?', [params.id]);
    if (!cur) throw new HttpError(404, 'Product not found');
    await db.run('DELETE FROM products WHERE id = ?', [cur.id]);
    if (cur.photo && photos) await photos.delete(cur.photo).catch(() => {});
    return json({ ok: true });
  });
  route('POST', '/api/admin/products/:id/photo', async ({ req, params, raw }) => {
    await requireAdmin(req, true);
    if (!photos) throw new HttpError(503, 'Photo storage is not set up');
    const cur = await db.get('SELECT * FROM products WHERE id = ?', [params.id]);
    if (!cur) throw new HttpError(404, 'Product not found');
    const type = (req.headers.get('content-type') || '').split(';')[0].trim();
    if (!PHOTO_TYPES[type]) throw new HttpError(415, 'Upload a JPEG, PNG or WebP image');
    const bytes = new Uint8Array(await raw());
    if (!bytes.length || bytes.length > MAX_PHOTO_BYTES) throw new HttpError(413, 'Photos must be smaller than 4 MB');
    const key = `products/${cur.id}/${randomHex(6)}.${PHOTO_TYPES[type]}`;
    await photos.put(key, bytes, type);
    await db.run('UPDATE products SET photo = ?, updated_at = ? WHERE id = ?', [key, now(), cur.id]);
    if (cur.photo) await photos.delete(cur.photo).catch(() => {});
    return json({ product: productOut(await db.get('SELECT * FROM products WHERE id = ?', [cur.id])) });
  });
  route('DELETE', '/api/admin/products/:id/photo', async ({ req, params }) => {
    await requireAdmin(req, true);
    const cur = await db.get('SELECT * FROM products WHERE id = ?', [params.id]);
    if (!cur) throw new HttpError(404, 'Product not found');
    await db.run('UPDATE products SET photo = NULL, updated_at = ? WHERE id = ?', [now(), cur.id]);
    if (cur.photo && photos) await photos.delete(cur.photo).catch(() => {});
    return json({ product: productOut(await db.get('SELECT * FROM products WHERE id = ?', [cur.id])) });
  });

  // ----- admin: settings and team (owner only) -----
  route('GET', '/api/admin/settings', async ({ req }) => { await requireAdmin(req, true); return json({ settings: await getSettings() }); });
  route('PUT', '/api/admin/settings', async ({ req, body }) => {
    await requireAdmin(req, true);
    const s = normalizeSettings({ ...(await getSettings()), ...body });
    await putSettings(s);
    return json({ settings: s });
  });
  route('GET', '/api/admin/team', async ({ req }) => {
    await requireAdmin(req, true);
    return json({ team: (await db.all("SELECT * FROM admins ORDER BY (role = 'owner') DESC, name")).map(adminOut) });
  });
  route('POST', '/api/admin/team', async ({ req, body }) => {
    await requireAdmin(req, true);
    const name = str(body.name, 40), pw = String(body.password || ''), role = body.role === 'owner' ? 'owner' : 'staff';
    if (!name) throw new HttpError(400, 'Enter a name');
    if (pw.length < 8) throw new HttpError(400, 'Use a password of at least 8 characters');
    if (await db.get('SELECT 1 AS x FROM admins WHERE name = ?', [name])) throw new HttpError(409, 'Someone already uses that name');
    const { lastId } = await db.run('INSERT INTO admins (name, pw_hash, role, created_at) VALUES (?,?,?,?)', [name, await hashSecret(pw), role, now()]);
    return json({ admin: adminOut(await db.get('SELECT * FROM admins WHERE id = ?', [lastId])) }, 201);
  });
  route('PUT', '/api/admin/team/:id', async ({ req, params, body }) => {
    const me = await requireAdmin(req, true);
    const a = await db.get('SELECT * FROM admins WHERE id = ?', [Number(params.id)]);
    if (!a) throw new HttpError(404, 'Not found');
    if (a.id === me.id && (body.role === 'staff' || body.active === false)) throw new HttpError(400, "You can't remove your own owner access");
    const role = body.role === undefined ? a.role : body.role === 'owner' ? 'owner' : 'staff';
    const active = body.active === undefined ? a.active : body.active ? 1 : 0;
    await db.run('UPDATE admins SET role = ?, active = ? WHERE id = ?', [role, active, a.id]);
    if (body.password) {
      if (String(body.password).length < 8) throw new HttpError(400, 'Use a password of at least 8 characters');
      await db.run('UPDATE admins SET pw_hash = ?, pw_changed = 0 WHERE id = ?', [await hashSecret(String(body.password)), a.id]);
    }
    if (!active || body.password) await db.run("DELETE FROM sessions WHERE kind = 'admin' AND user_id = ?", [a.id]);
    return json({ admin: adminOut(await db.get('SELECT * FROM admins WHERE id = ?', [a.id])) });
  });

  // ---------- request handling ----------
  async function handle(request, { ip = 'unknown', defer = (p) => p.catch((e) => console.error(e)) } = {}) {
    const url = new URL(request.url);
    const p = url.pathname;
    if (!(p.startsWith('/api/') || p.startsWith('/auth/') || p.startsWith('/photos/') || p === '/healthz')) return null;
    try {
      await ready();
      const method = request.method === 'HEAD' ? 'GET' : request.method;
      let matched = false;
      for (const r of routes) {
        const m = r.re.exec(p);
        if (!m) continue;
        matched = true;
        if (r.method !== method) continue;
        let body = {};
        if (method !== 'GET' && method !== 'DELETE') {
          const type = request.headers.get('content-type') || '';
          // JSON or image bodies only: cross-site forms can't send these without a CORS preflight.
          if (type.startsWith('application/json')) { try { body = JSON.parse((await request.text()) || '{}'); } catch { throw new HttpError(400, 'Bad request'); } } else if (!type.startsWith('image/') && p !== '/api/logout' && p !== '/api/admin/logout') throw new HttpError(415, 'Send JSON');
          if (body === null || typeof body !== 'object' || Array.isArray(body)) body = {};
        }
        const site = url.origin;
        return await r.fn({ req: request, url, params: m.groups || {}, body, raw: () => request.arrayBuffer(), ip, site, defer: (pr) => defer(Promise.resolve(pr).catch((e) => console.error(e))) });
      }
      return json({ error: matched ? 'Method not allowed' : 'Not found' }, matched ? 405 : 404);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message, code: e.code }, e.status);
      console.error(e);
      return json({ error: 'Something went wrong. Please try again.' }, 500);
    }
  }

  return { handle, ready };
}
