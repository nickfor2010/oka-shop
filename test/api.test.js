// End-to-end API tests against throwaway databases and a fake LINE API.
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from '../server.js';
import { boxPrice, normalizeSettings, shipDateOptions } from '../public/js/pricing.js';

// Fake LINE: records pushes and answers the login endpoints.
const pushes = [];
const fakeLine = async (url, opts = {}) => {
  const u = String(url);
  const ok = (body) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
  if (u.endsWith('/oauth2/v2.1/token')) return new URLSearchParams(opts.body).get('code') === 'good' ? ok({ id_token: 'idt', access_token: 'at' }) : new Response('bad code', { status: 400 });
  if (u.endsWith('/oauth2/v2.1/verify')) return ok({ sub: 'U123', name: 'Mei', picture: 'https://example.com/p.jpg' });
  if (u.endsWith('/friendship/v1/status')) return ok({ friendFlag: true });
  if (u.endsWith('/v2/bot/message/push')) { pushes.push(JSON.parse(opts.body)); return ok({}); }
  throw new Error('unexpected fetch ' + u);
};

const dirs = [];
const servers = [];
async function start(env) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oka-test-'));
  dirs.push(dataDir);
  const s = createServer({ dataDir, env: { ADMIN_PASSWORD: 'first-pass', ...env }, fetchImpl: fakeLine });
  await new Promise((r) => s.server.listen(0, r));
  servers.push(s);
  return { ...s, base: `http://127.0.0.1:${s.server.address().port}` };
}
let dev, lineSrv;
before(async () => {
  dev = await start({ DEV_LOGIN: '1' });
  lineSrv = await start({ DEV_LOGIN: '0', LINE_LOGIN_CHANNEL_ID: '123', LINE_LOGIN_CHANNEL_SECRET: 'sec', LINE_MESSAGING_TOKEN: 'tok' });
});
after(() => { servers.forEach((s) => s.server.close()); dirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true })); });

function client(base) {
  let cookies = {};
  const call = async (p, { method = 'GET', body, headers = {}, raw } = {}) => {
    const res = await fetch(base + p, {
      method, redirect: 'manual',
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), cookie: Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; '), ...headers },
      body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
    for (const c of res.headers.getSetCookie?.() || []) { const [kv] = c.split(';'); const [k, v] = kv.split('='); if (v) cookies[k] = v; else delete cookies[k]; }
    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch { data = text; }
    return { status: res.status, data, location: res.headers.get('location'), type: res.headers.get('content-type') };
  };
  call.cookies = () => cookies;
  return call;
}
const devLogin = async (c, name) => { const r = await c(`/auth/dev?name=${encodeURIComponent(name)}&return=/`); assert.equal(r.status, 302); };
async function adminLogin(base) {
  const a = client(base);
  assert.equal((await a('/api/admin/login', { method: 'POST', body: { name: 'owner', password: 'first-pass' } })).status, 200);
  return a;
}

test('pricing: 10% only on a full box, NT$50 box, free shipping from 2000', () => {
  const s = normalizeSettings({});
  assert.equal(boxPrice([410, 410, 380, 410], s), 1610 + 50);
  assert.equal(boxPrice([380, 380, 380, 410, 410, 410], s), Math.round(2370 * 0.9) + 50);
  // Saturday 2026-11-07, two days lead → first date is Monday 11/9, weekends skipped
  assert.deepEqual(shipDateOptions('2026-11-07', s, 6), ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-16']);
  assert.deepEqual(shipDateOptions('2026-11-07', { ...s, closedDates: ['2026-11-10'] }, 2), ['2026-11-09', '2026-11-11']);
});

test('shop: menu, checkout, payment report and admin flow', async () => {
  const shopper = client(dev.base);
  let shop = (await shopper('/api/shop')).data;
  assert.equal(shop.products.length, 8);
  assert.equal(shop.me, null);
  assert.equal(shop.login, 'dev');
  assert.ok(shop.shipDates.length >= 5);
  const shipDate = shop.shipDates[0].date;

  const items = [{ type: 'jar', id: 'classic', qty: 2 }, { type: 'box', items: ['berry', 'lemon', 'classic', 'chocolate'], qty: 1 }];
  const order = { items, name: 'Amy Lin', phone: '0912 345 678', email: '', city: '台南市 Tainan', addr: '中西區 1 號', ship_date: shipDate, lang: 'zh' };
  assert.equal((await shopper('/api/orders', { method: 'POST', body: order })).status, 401); // must log in first

  await devLogin(shopper, 'Amy');
  shop = (await shopper('/api/shop')).data;
  assert.equal(shop.me.name, 'Amy');

  // Validation and server-side prices
  assert.equal((await shopper('/api/orders', { method: 'POST', body: { ...order, phone: '123' } })).status, 400);
  assert.equal((await shopper('/api/orders', { method: 'POST', body: { ...order, ship_date: '2020-01-01' } })).status, 400);
  assert.equal((await shopper('/api/orders', { method: 'POST', body: { ...order, items: [{ type: 'jar', id: 'sesame', qty: 1 }] } })).status, 409); // coming soon
  assert.equal((await shopper('/api/orders', { method: 'POST', body: { ...order, items: [{ type: 'box', items: Array(7).fill('classic'), qty: 1 }] } })).status, 400);
  const wrong = await shopper('/api/orders', { method: 'POST', body: { ...order, expectedTotal: 1 } });
  assert.equal(wrong.status, 409);
  assert.equal(wrong.data.code, 'price_changed');

  const created = await shopper('/api/orders', { method: 'POST', body: { ...order, expectedTotal: 760 + 1660 } });
  assert.equal(created.status, 201, JSON.stringify(created.data));
  const o = created.data.order;
  assert.match(o.no, /^OKA-\d{6}-[A-Z0-9]{4}$/);
  assert.equal(o.status, 'awaiting');
  assert.equal(o.subtotal, 760 + 1660);
  assert.equal(o.ship_fee, 0);
  assert.equal(o.total, 2420);
  assert.equal(o.jars, 6);
  assert.equal(o.phone, '0912345678');
  assert.equal(o.items[1].full, false);

  // Customer's saved details come back next time
  shop = (await shopper('/api/shop')).data;
  assert.equal(shop.me.profile.addr, '中西區 1 號');

  // Another customer can't see it
  const other = client(dev.base);
  await devLogin(other, 'Bob');
  assert.equal((await other(`/api/orders/${o.no}`)).status, 404);
  assert.equal((await other('/api/orders')).data.orders.length, 0);

  // Payment report
  assert.equal((await shopper(`/api/orders/${o.no}/payment`, { method: 'POST', body: { last5: '12a45' } })).status, 400);
  const rep = await shopper(`/api/orders/${o.no}/payment`, { method: 'POST', body: { last5: '54321' } });
  assert.equal(rep.data.order.status, 'reported');
  assert.equal(rep.data.order.last5, '54321');

  // Admin
  const anon = client(dev.base);
  assert.equal((await anon('/api/admin/orders')).status, 401);
  assert.equal((await anon('/api/admin/login', { method: 'POST', body: { name: 'owner', password: 'nope' } })).status, 401);
  const admin = await adminLogin(dev.base);
  const me = (await admin('/api/admin/me')).data.admin;
  assert.equal(me.role, 'owner');
  assert.equal(me.pw_changed, false);
  let list = (await admin('/api/admin/orders')).data;
  assert.equal(list.counts.reported, 1);
  assert.equal(list.orders[0].no, o.no);
  assert.equal((await admin('/api/admin/orders?q=54321')).data.orders.length, 1);
  assert.equal((await admin('/api/admin/orders?q=nobody')).data.orders.length, 0);

  assert.equal((await admin(`/api/admin/orders/${o.no}/status`, { method: 'POST', body: { status: 'shipped' } })).status, 409); // must be paid first
  assert.equal((await admin(`/api/admin/orders/${o.no}/status`, { method: 'POST', body: { status: 'paid' } })).data.order.status, 'paid');
  const shipped = await admin(`/api/admin/orders/${o.no}/status`, { method: 'POST', body: { status: 'shipped', tracking_no: '1234-5678' } });
  assert.equal(shipped.data.order.status, 'shipped');
  assert.equal(shipped.data.order.tracking_no, '1234-5678');
  const detail = (await admin(`/api/admin/orders/${o.no}`)).data;
  assert.deepEqual(detail.events.map((e) => e.kind), ['placed', 'reported', 'paid', 'shipped']);
  assert.deepEqual(detail.moves, ['paid']);
  // Without LINE messaging set up, messages are logged as skipped
  await dev.settle();
  assert.ok(detail.messages.length >= 1);
  assert.ok(detail.messages.every((m) => m.status === 'skipped'));

  // Customer sees the new status
  assert.equal((await shopper(`/api/orders/${o.no}`)).data.order.status, 'shipped');

  // Production plan counts jars per flavour per ship date
  const prod = (await admin('/api/admin/production')).data;
  assert.equal(prod.days[0].date, shipDate);
  assert.equal(prod.days[0].confirmed.classic, 3);
  assert.equal(prod.days[0].confirmed.berry, 1);

  // CSV
  const csv = await admin(`/api/admin/orders.csv?from=${shipDate}&to=${shipDate}`);
  assert.match(csv.type, /text\/csv/);
  assert.ok(csv.data.includes(o.no));
});

test('admin: products, photos, settings, team and roles', async () => {
  const admin = await adminLogin(dev.base);
  // New product
  assert.equal((await admin('/api/admin/products', { method: 'POST', body: { en: 'Matcha', zh: '', price: 430 } })).status, 400);
  const p = (await admin('/api/admin/products', { method: 'POST', body: { en: 'Matcha', zh: '抹茶', price: 430, status: 'available', color: '#7A9A3A', deco: 'crumbs', sort: 9 } })).data.product;
  assert.equal(p.id, 'matcha');
  let shop = (await client(dev.base)('/api/shop')).data;
  assert.ok(shop.products.find((x) => x.id === 'matcha'));
  // Hide it
  await admin('/api/admin/products/matcha', { method: 'PUT', body: { status: 'hidden' } });
  shop = (await client(dev.base)('/api/shop')).data;
  assert.ok(!shop.products.find((x) => x.id === 'matcha'));
  // Photo upload and serving
  const png = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex');
  assert.equal((await admin('/api/admin/products/classic/photo', { method: 'POST', raw: png, headers: { 'Content-Type': 'text/plain' } })).status, 415);
  const up = await admin('/api/admin/products/classic/photo', { method: 'POST', raw: png, headers: { 'Content-Type': 'image/png' } });
  assert.equal(up.status, 200, JSON.stringify(up.data));
  const img = await fetch(dev.base + up.data.product.photo);
  assert.equal(img.status, 200);
  assert.equal(img.headers.get('content-type'), 'image/png');
  // Settings change prices for the next order
  const st = (await admin('/api/admin/settings', { method: 'PUT', body: { shipFee: 250, bankName: '玉山銀行', bankCode: '808', account: '0000-1111-2222', accountName: 'OKA', dailyCap: 9 } })).data.settings;
  assert.equal(st.shipFee, 250);
  shop = (await client(dev.base)('/api/shop')).data;
  assert.equal(shop.settings.shipFee, 250);
  assert.equal(shop.settings.account, undefined); // bank details only after ordering
  assert.equal(shop.shipDates[0].left, 3); // 6 jars already booked by the previous test
  // Daily limit
  const c = client(dev.base);
  await devLogin(c, 'Cap');
  const d = shop.shipDates[0].date;
  const big = await c('/api/orders', { method: 'POST', body: { items: [{ type: 'jar', id: 'lemon', qty: 4 }], name: 'C', phone: '0911111111', city: 'X', addr: 'Y', ship_date: d } });
  assert.equal(big.status, 409);
  const fits = await c('/api/orders', { method: 'POST', body: { items: [{ type: 'jar', id: 'lemon', qty: 1 }], name: 'C', phone: '0911111111', city: 'X', addr: 'Y', ship_date: d } });
  assert.equal(fits.status, 201);
  assert.equal(fits.data.order.ship_fee, 250);
  assert.equal(fits.data.bank.account, '0000-1111-2222');
  await admin('/api/admin/settings', { method: 'PUT', body: { dailyCap: 0, shipFee: 220 } });

  // Team: staff can manage orders but not products or settings
  assert.equal((await admin('/api/admin/team', { method: 'POST', body: { name: 'Lin', password: 'short' } })).status, 400);
  const staff = (await admin('/api/admin/team', { method: 'POST', body: { name: 'Lin', password: 'helper-pass-1', role: 'staff' } })).data.admin;
  const s = client(dev.base);
  assert.equal((await s('/api/admin/login', { method: 'POST', body: { name: 'lin', password: 'helper-pass-1' } })).status, 200);
  assert.equal((await s('/api/admin/orders')).status, 200);
  assert.equal((await s('/api/admin/settings')).status, 403);
  assert.equal((await s('/api/admin/products/classic', { method: 'PUT', body: { price: 1 } })).status, 403);
  // Password change
  assert.equal((await s('/api/admin/me/password', { method: 'POST', body: { current: 'wrong', password: 'new-password-2' } })).status, 400);
  assert.equal((await s('/api/admin/me/password', { method: 'POST', body: { current: 'helper-pass-1', password: 'new-password-2' } })).status, 200);
  assert.equal((await s('/api/admin/me')).data.admin.pw_changed, true);
  // Deactivate signs them out
  await admin(`/api/admin/team/${staff.id}`, { method: 'PUT', body: { active: false } });
  assert.equal((await s('/api/admin/orders')).status, 401);
  // Owner can't demote themself
  const ownerId = (await admin('/api/admin/me')).data.admin.id;
  assert.equal((await admin(`/api/admin/team/${ownerId}`, { method: 'PUT', body: { role: 'staff' } })).status, 400);
  // Requests without JSON are refused (blocks cross-site form posts)
  assert.equal((await admin('/api/admin/settings', { method: 'PUT', raw: 'shipFee=1', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })).status, 415);
});

test('LINE: login, order messages and team alerts', async () => {
  const c = client(lineSrv.base);
  assert.equal((await c('/api/shop')).data.login, 'line');
  assert.equal((await c('/auth/dev?name=x')).status, 404); // test login is off when LINE is set up
  const start = await c('/auth/line?return=/%23checkout');
  assert.equal(start.status, 302);
  const auth = new URL(start.location);
  assert.equal(auth.host, 'access.line.me');
  assert.equal(auth.searchParams.get('client_id'), '123');
  assert.equal(auth.searchParams.get('bot_prompt'), 'aggressive');
  const state = auth.searchParams.get('state');
  assert.equal((await c('/auth/line/callback?code=good&state=forged')).location, '/?login=expired');
  const back = await c(`/auth/line/callback?code=good&state=${state}`);
  assert.equal(back.location, '/#checkout');
  const shop = (await c('/api/shop')).data;
  assert.equal(shop.me.name, 'Mei');
  assert.equal(shop.me.friend, true);
  // A state can only be used once
  assert.equal((await c(`/auth/line/callback?code=good&state=${state}`)).location, '/?login=expired');

  // Owner links their LINE for alerts (same browser is logged in on the shop)
  const a = client(lineSrv.base);
  assert.equal((await a('/api/admin/login', { method: 'POST', body: { name: 'owner', password: 'first-pass' } })).status, 200);
  assert.equal((await a('/api/admin/me/line-alerts', { method: 'POST', body: { on: true } })).status, 400); // not logged in with LINE here
  const ownerCookies = { ...c.cookies() };
  const both = async (p, opts) => fetch(lineSrv.base + p, { method: 'POST', headers: { 'Content-Type': 'application/json', cookie: `oka_c=${ownerCookies.oka_c}; oka_a=${a.cookies().oka_a}` }, body: JSON.stringify(opts) });
  assert.equal((await both('/api/admin/me/line-alerts', { on: true })).status, 200);
  pushes.length = 0;

  const o = (await c('/api/orders', { method: 'POST', body: { items: [{ type: 'jar', id: 'lemon', qty: 1 }], name: 'Mei', phone: '0922333444', city: '高雄市 Kaohsiung', addr: '苓雅區', ship_date: shop.shipDates[0].date, lang: 'zh' } })).data.order;
  await lineSrv.settle();
  assert.equal(pushes.length, 2);
  assert.equal(pushes[0].to, 'U123');
  assert.match(pushes[0].messages[0].text, /訂單 OKA-/);
  assert.match(pushes[0].messages[0].text, /NT\$630/); // 410 + 220 shipping
  assert.match(pushes[1].messages[0].text, /新訂單/);

  pushes.length = 0;
  await c(`/api/orders/${o.no}/payment`, { method: 'POST', body: { last5: '11111' } });
  await a(`/api/admin/orders/${o.no}/status`, { method: 'POST', body: { status: 'paid' } });
  await a(`/api/admin/orders/${o.no}/status`, { method: 'POST', body: { status: 'reported' } }); // undo: customer not told
  await lineSrv.settle();
  assert.deepEqual(pushes.map((p) => p.messages[0].text.slice(0, 4)), ['💰 匯', '已確認收']);
  const detail = (await a(`/api/admin/orders/${o.no}`)).data;
  assert.ok(detail.messages.some((m) => m.kind === 'paid' && m.status === 'sent'));
});
