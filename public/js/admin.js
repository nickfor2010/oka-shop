// OKA admin: orders, production plan, products, settings and team.
import { $, esc, money, store, api, fmtDate, fmtTime, jar, art, toaster } from './common.js';

const DECOS = ['vanilla', 'shave', 'berries', 'lemon', 'crumbs', 'salt', 'sesame', 'straw', 'plain'];
const STATUSES = ['awaiting', 'reported', 'paid', 'shipped', 'cancelled'];
const T = {
  en: {
    admTitle: 'Shop admin', signIn: 'Sign in', name: 'Name', password: 'Password', wrong: 'Wrong name or password', firstRun: 'First time? Use the name you want and the password from setup.',
    tabOrders: 'Orders', tabProduction: 'Production', tabCustomers: 'Customers', tabProducts: 'Products', tabSettings: 'Settings', tabTeam: 'Team',
    viewShop: 'View shop', changePw: 'Change password', alertsOn: 'Send new orders to my LINE', alertsOff: 'Stop LINE alerts', logout: 'Sign out',
    pwBanner: "You're still using the first password. Please change it.", pwCurrent: 'Current password', pwNew: 'New password (8+ characters)', pwSaved: 'Password changed',
    alertsNeedLogin: 'Open the shop in this browser, log in with LINE, then come back and turn alerts on.', alertsDone: 'LINE alerts on. We sent you a test message.', alertsStopped: 'LINE alerts off',
    lineOff: 'LINE messaging is not connected yet, so customers get no automatic messages. Add LINE_MESSAGING_TOKEN in Cloudflare.',
    tNeedCheck: 'Transfers to check', tToShip: 'Paid, to ship', tAwait: 'Awaiting payment', tMonth: 'Sales this month',
    all: 'All', search: 'Search name, phone, order, last 5…', anyDate: 'Any ship date', csv: 'Export CSV', refresh: 'Refresh',
    noOrders: 'No orders yet. They appear here as soon as a customer checks out.', noMatch: 'No orders match.',
    st_awaiting: 'Awaiting payment', st_reported: 'Payment reported', st_paid: 'Paid', st_shipped: 'Shipped', st_cancelled: 'Cancelled',
    mv_paid: 'Confirm payment', mv_paid_from_shipped: 'Undo shipped', mv_shipped: 'Mark shipped', mv_cancelled: 'Cancel order', mv_awaiting: 'Back to awaiting', mv_reported: 'Back to reported',
    placed: 'Placed', ships: 'Ships', l5: 'Account ends', noL5: 'no digits yet', details: 'Details', hide: 'Hide',
    trackingL: 'Tracking number (optional)', shipNow: 'Mark shipped', cancelQ: 'Cancel this order? The customer gets a LINE message.', yesCancel: 'Yes, cancel', keep: 'Keep',
    timeline: 'History', messages: 'LINE messages', noMessages: 'No messages yet.', teamNote: 'Team note', saveNote: 'Save note', noteSaved: 'Note saved', resend: 'Resend last update',
    customerNote: 'Customer note', notFriend: 'Not a LINE friend: messages may not arrive', ev_placed: 'Order placed', ev_reported: 'Transfer reported', ev_paid: 'Paid', ev_shipped: 'Shipped', ev_cancelled: 'Cancelled', ev_awaiting: 'Back to awaiting', ev_note: 'Team note edited',
    m_placed: 'Order received', m_paid: 'Payment confirmed', m_shipped: 'Shipped', m_cancelled: 'Cancelled', 'm_alert-new': 'Team alert', 'm_alert-reported': 'Team alert',
    s_sent: 'sent', s_failed: 'failed', s_skipped: 'not sent (LINE not connected)',
    prodLead: 'Jars to make for each ship date. Confirmed = paid orders; pending = waiting for payment.', prodEmpty: 'No upcoming orders.', print: 'Print',
    flavor: 'Flavor', confirmed: 'Confirmed', pending: 'Pending', totalJars: 'Total', ordersN: (n) => `${n} order${n === 1 ? '' : 's'}`, jarsN: (n) => `${n} jars`,
    addProduct: 'Add product', edit: 'Edit', save: 'Save', saving: 'Saving…', saved: 'Saved', cancel: 'Cancel', del: 'Delete', delQ: 'Delete this product for good? Hiding it keeps its history.', delYes: 'Delete',
    pEn: 'Name (English)', pZh: 'Name (中文)', pDen: 'Description (English)', pDzh: 'Description (中文)', pPrice: 'Price (NT$)', pStatus: 'Status', pColor: 'Topping color', pDeco: 'Topping style', pSort: 'Order on page',
    photoAdd: 'Upload photo', photoRm: 'Remove photo', photoUp: 'Uploading…', ownerOnly: 'Only the owner can change products.',
    ps_available: 'On sale', ps_soon: 'Coming soon', ps_hidden: 'Hidden',
    deco_vanilla: 'Vanilla specks', deco_shave: 'Chocolate shavings', deco_berries: 'Berries', deco_lemon: 'Lemon slice', deco_crumbs: 'Biscuit crumbs', deco_salt: 'Sea salt', deco_sesame: 'Sesame seeds', deco_straw: 'Strawberries', deco_plain: 'Plain',
    setShip: 'Shipping', setFee: 'Shipping fee (NT$)', setFree: 'Free shipping from (NT$)', setBox: 'Gift box', setOff: 'Discount on a full box (%)', setBoxFee: 'Empty box price (NT$)',
    setDays: 'Ship dates', setLead: 'Days of notice (earliest ship date = today + this)', setWeekdays: 'Ship on', setCap: 'Max jars per ship date (0 = no limit)', setClosed: 'Closed dates (holidays, breaks)', addDate: 'Add',
    setBank: 'Bank transfer details', setBankHint: 'Shown to customers after they order, and in the LINE message.', bankName: 'Bank', bankCode: 'Bank code', account: 'Account number', accountName: 'Account name',
    setLine: 'LINE', setOa: 'Official Account ID (for the "add friend" link)',
    dow: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    teamLead: 'Staff can manage orders and see production. Only owners change products, prices, settings and the team.', addMember: 'Add team member', role: 'Role', owner: 'Owner', staff: 'Staff',
    you: 'you', inactive: 'Signed-in disabled', pwNotChanged: 'first password', alertsBadge: 'LINE alerts', makeOwner: 'Make owner', makeStaff: 'Make staff', disable: 'Disable', enable: 'Enable', resetPw: 'Reset password', newPwFor: (n) => `New password for ${n}`,
    cTotal: 'Customers', cNew: 'New this month', cRepeat: 'Ordered 2+ times', cNotFriend: 'Not LINE friends', cSearch: 'Search name, LINE name, phone, city…',
    cNone: 'No customers yet. Everyone who logs in with LINE appears here.', cNoMatch: 'No customers match.', cJoined: 'Joined', cLastOrder: 'Last order', cNoOrders: 'No orders yet',
    cOrders: (n) => `${n} order${n === 1 ? '' : 's'}`, cSpent: 'Paid', cOpen: (n) => `${n} waiting for payment`, cFriendNo: 'Not a LINE friend: messages won\'t arrive', cFriendYes: 'LINE friend',
    cProfileNote: 'Name, phone and address are from their latest order.', cOrderList: 'Orders', cOpenOrder: 'Open in Orders', cLang: 'Language', cLastLogin: 'Last login', cCsvOwner: 'Export CSV',
    errGeneric: 'Something went wrong. Please try again.',
  },
  zh: {
    admTitle: '商店後台', signIn: '登入', name: '名稱', password: '密碼', wrong: '名稱或密碼錯誤', firstRun: '第一次使用？輸入想用的名稱與設定時的密碼。',
    tabOrders: '訂單', tabProduction: '製作量', tabCustomers: '顧客', tabProducts: '商品', tabSettings: '設定', tabTeam: '團隊',
    viewShop: '查看商店', changePw: '變更密碼', alertsOn: '新訂單傳到我的 LINE', alertsOff: '停止 LINE 通知', logout: '登出',
    pwBanner: '你還在使用初始密碼，請盡快變更。', pwCurrent: '目前密碼', pwNew: '新密碼（至少 8 個字元）', pwSaved: '密碼已變更',
    alertsNeedLogin: '請先在這個瀏覽器開啟商店並用 LINE 登入，再回來開啟通知。', alertsDone: 'LINE 通知已開啟，已傳送測試訊息。', alertsStopped: 'LINE 通知已關閉',
    lineOff: 'LINE 訊息尚未連接，顧客不會收到自動通知。請在 Cloudflare 設定 LINE_MESSAGING_TOKEN。',
    tNeedCheck: '待核對匯款', tToShip: '已付款待出貨', tAwait: '待付款', tMonth: '本月營收',
    all: '全部', search: '搜尋姓名、電話、訂單、後五碼…', anyDate: '所有出貨日', csv: '匯出 CSV', refresh: '重新整理',
    noOrders: '目前沒有訂單。顧客結帳後會立即出現在這裡。', noMatch: '沒有符合的訂單。',
    st_awaiting: '待付款', st_reported: '已回報匯款', st_paid: '已付款', st_shipped: '已出貨', st_cancelled: '已取消',
    mv_paid: '確認收款', mv_paid_from_shipped: '取消出貨標記', mv_shipped: '標記已出貨', mv_cancelled: '取消訂單', mv_awaiting: '改回待付款', mv_reported: '改回已回報',
    placed: '下單', ships: '出貨', l5: '後五碼', noL5: '尚未填寫', details: '詳細', hide: '收起',
    trackingL: '物流單號（選填）', shipNow: '標記已出貨', cancelQ: '確定取消此訂單？顧客會收到 LINE 通知。', yesCancel: '確定取消', keep: '保留',
    timeline: '紀錄', messages: 'LINE 訊息', noMessages: '尚無訊息。', teamNote: '內部備註', saveNote: '儲存備註', noteSaved: '備註已儲存', resend: '重新傳送最新通知',
    customerNote: '顧客備註', notFriend: '尚未加好友：訊息可能無法送達', ev_placed: '下單', ev_reported: '回報匯款', ev_paid: '已付款', ev_shipped: '已出貨', ev_cancelled: '已取消', ev_awaiting: '改回待付款', ev_note: '修改內部備註',
    m_placed: '訂單確認', m_paid: '收款確認', m_shipped: '出貨通知', m_cancelled: '取消通知', 'm_alert-new': '團隊通知', 'm_alert-reported': '團隊通知',
    s_sent: '已送出', s_failed: '失敗', s_skipped: '未送出（LINE 未連接）',
    prodLead: '每個出貨日需要製作的罐數。已確認 = 已付款；待確認 = 尚未付款。', prodEmpty: '目前沒有即將出貨的訂單。', print: '列印',
    flavor: '口味', confirmed: '已確認', pending: '待確認', totalJars: '合計', ordersN: (n) => `${n} 筆訂單`, jarsN: (n) => `${n} 罐`,
    addProduct: '新增商品', edit: '編輯', save: '儲存', saving: '儲存中…', saved: '已儲存', cancel: '取消', del: '刪除', delQ: '確定永久刪除此商品？改為「隱藏」可保留紀錄。', delYes: '刪除',
    pEn: '名稱（英文）', pZh: '名稱（中文）', pDen: '說明（英文）', pDzh: '說明（中文）', pPrice: '價格（NT$）', pStatus: '狀態', pColor: '頂層顏色', pDeco: '頂層裝飾', pSort: '頁面排序',
    photoAdd: '上傳照片', photoRm: '移除照片', photoUp: '上傳中…', ownerOnly: '只有擁有者可以修改商品。',
    ps_available: '販售中', ps_soon: '即將推出', ps_hidden: '隱藏',
    deco_vanilla: '香草籽', deco_shave: '巧克力屑', deco_berries: '莓果', deco_lemon: '檸檬片', deco_crumbs: '餅乾碎', deco_salt: '海鹽', deco_sesame: '芝麻', deco_straw: '草莓', deco_plain: '無',
    setShip: '運費', setFee: '運費（NT$）', setFree: '免運門檻（NT$）', setBox: '禮盒', setOff: '裝滿禮盒折扣（%）', setBoxFee: '空禮盒價格（NT$）',
    setDays: '出貨日', setLead: '準備天數（最早出貨日 = 今天 + 天數）', setWeekdays: '出貨星期', setCap: '每個出貨日最多罐數（0 = 不限）', setClosed: '公休日', addDate: '新增',
    setBank: '匯款資訊', setBankHint: '顧客下單後與 LINE 訊息中會看到。', bankName: '銀行', bankCode: '銀行代碼', account: '帳號', accountName: '戶名',
    setLine: 'LINE', setOa: '官方帳號 ID（用於「加入好友」連結）',
    dow: ['日', '一', '二', '三', '四', '五', '六'],
    teamLead: '員工可以處理訂單和查看製作量。只有擁有者可以修改商品、價格、設定和團隊。', addMember: '新增成員', role: '角色', owner: '擁有者', staff: '員工',
    you: '你', inactive: '已停用', pwNotChanged: '初始密碼', alertsBadge: 'LINE 通知', makeOwner: '設為擁有者', makeStaff: '設為員工', disable: '停用', enable: '啟用', resetPw: '重設密碼', newPwFor: (n) => `${n} 的新密碼`,
    cTotal: '顧客', cNew: '本月新顧客', cRepeat: '回購 2 次以上', cNotFriend: '尚未加好友', cSearch: '搜尋姓名、LINE 名稱、電話、縣市…',
    cNone: '目前還沒有顧客。用 LINE 登入的人都會出現在這裡。', cNoMatch: '沒有符合的顧客。', cJoined: '加入', cLastOrder: '最近訂單', cNoOrders: '尚未下單',
    cOrders: (n) => `${n} 筆訂單`, cSpent: '已付款', cOpen: (n) => `${n} 筆待付款`, cFriendNo: '尚未加好友：收不到 LINE 通知', cFriendYes: 'LINE 好友',
    cProfileNote: '姓名、電話與地址來自最近一筆訂單。', cOrderList: '訂單', cOpenOrder: '在訂單中查看', cLang: '語言', cLastLogin: '最近登入', cCsvOwner: '匯出 CSV',
    errGeneric: '發生錯誤，請再試一次。',
  },
};
let lang = store.get('oka-lang', 'zh');
if (!T[lang]) lang = 'zh';
const t = (k) => T[lang][k] ?? T.en[k];
const toast = toaster($('#toast'));
const root = $('#root');

let me = null, info = {}, tab = store.get('oka-admin-tab', 'orders');
let ordersData = null, filter = 'all', shipFilter = '', query = '', openNo = null, detail = null, confirmKey = null, shipKey = null;
let products = [], editing = null, settings = null, team = [], prod = null;
let custData = null, custQuery = '', custOpen = null, custDetail = null;

const field = (id, label, val, attrs = '') => `<div class="field"><label for="${id}">${label}</label><input id="${id}" value="${esc(val ?? '')}" ${attrs}></div>`;
const pname = (p) => (lang === 'zh' ? p.zh : p.en);
const isOwner = () => me?.role === 'owner';

function applyI18n() {
  document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en';
  document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = t(el.dataset.t); });
  document.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.lang === lang));
}

// ---------- sign in ----------
function renderLogin(err = '') {
  $('#acct').hidden = true;
  root.innerHTML = `<form class="login-card" id="loginForm"><span class="logo" aria-hidden="true"></span><h1 style="text-align:center;font-size:1.5rem">${t('admTitle')}</h1>
    ${field('l-name', t('name'), store.get('oka-admin-name', ''), 'autocomplete="username" required')}
    ${field('l-pw', t('password'), '', 'type="password" autocomplete="current-password" required')}
    <p class="err" id="l-err" ${err ? '' : 'hidden'}>${esc(err)}</p>
    <button class="btn solid" type="submit">${t('signIn')}</button>
    <p class="muted" style="font-size:.8rem;text-align:center">${t('firstRun')}</p></form>`;
  ($('#l-name').value ? $('#l-pw') : $('#l-name')).focus();
}
async function boot() {
  applyI18n();
  try { info = await api('/api/admin/me'); me = info.admin; } catch { me = null; }
  if (!me) return renderLogin();
  renderShell();
}

// ---------- shell ----------
function renderAcct() {
  const m = $('#acct');
  m.hidden = false;
  m.innerHTML = `<button type="button" class="btn ghost small-btn" id="acctToggle" aria-expanded="false">${esc(me.name)} ▾</button>
    <div hidden id="acctMenu"><a href="/" target="_blank" rel="noopener">${t('viewShop')} ↗</a><button type="button" id="pwOpen">${t('changePw')}</button>
    <button type="button" id="alertsToggle">${me.line_alerts ? t('alertsOff') : t('alertsOn')}</button><button type="button" id="logout">${t('logout')}</button></div>`;
}
function renderShell() {
  renderAcct();
  const tabs = ['orders', 'production', 'customers', 'products', ...(isOwner() ? ['settings', 'team'] : [])];
  if (!tabs.includes(tab)) tab = 'orders';
  root.innerHTML = `${!me.pw_changed ? `<p class="banner no-print" style="margin-bottom:14px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><span>${t('pwBanner')}</span><button type="button" class="dlink" id="pwOpen2">${t('changePw')}</button></p>` : ''}
    ${!info.lineMessaging && isOwner() ? `<p class="banner no-print" style="margin-bottom:14px">${t('lineOff')}</p>` : ''}
    <div id="pwBox"></div>
    <div class="tabs" role="tablist">${tabs.map((k) => `<button type="button" role="tab" aria-selected="${tab === k}" data-tab="${k}">${t('tab' + k[0].toUpperCase() + k.slice(1))}</button>`).join('')}</div>
    <div id="body"></div>`;
  loadTab();
}
async function loadTab() {
  store.set('oka-admin-tab', tab);
  const body = $('#body');
  body.innerHTML = '<p class="muted"><span class="loading"></span></p>';
  try {
    if (tab === 'orders') { await loadOrders(); }
    if (tab === 'production') { prod = await api('/api/admin/production'); renderProduction(); }
    if (tab === 'customers') { await loadCustomers(); }
    if (tab === 'products') { products = (await api('/api/admin/products')).products; renderProducts(); }
    if (tab === 'settings') { settings = (await api('/api/admin/settings')).settings; renderSettings(); }
    if (tab === 'team') { team = (await api('/api/admin/team')).team; renderTeam(); }
  } catch (e) { handleErr(e); }
}
function handleErr(e) {
  if (e.status === 401) { me = null; renderLogin(); return; }
  toast(e.message || t('errGeneric'));
}

// ---------- orders ----------
async function loadOrders() {
  const qs = new URLSearchParams();
  if (filter !== 'all') qs.set('status', filter);
  if (shipFilter) qs.set('ship_date', shipFilter);
  if (query) qs.set('q', query);
  ordersData = await api('/api/admin/orders?' + qs);
  if (openNo) detail = await api(`/api/admin/orders/${encodeURIComponent(openNo)}`).catch(() => null);
  renderOrders();
}
const itemsText = (o) => o.items.map((i) => (i.type === 'box' ? `${lang === 'zh' ? (i.items.length === 6 ? '六入禮盒' : `禮盒 ${i.items.length} 罐`) : i.items.length === 6 ? 'Box of six' : `Gift box ${i.items.length} jars`} ×${i.qty} (${i.items.map((j) => (lang === 'zh' ? j.zh : j.en)).join(', ')})` : `${lang === 'zh' ? i.zh : i.en} ×${i.qty}`)).join(' · ');
function moveLabel(o, to) { return to === 'paid' && o.status === 'shipped' ? t('mv_paid_from_shipped') : t('mv_' + to); }
function actionsHtml(o) {
  const key = o.no;
  if (confirmKey === key) return `<p style="font-size:.85rem">${t('cancelQ')}</p><button type="button" class="btn solid" data-move="cancelled" data-no="${esc(o.no)}">${t('yesCancel')}</button><button type="button" class="btn ghost" data-confirm="">${t('keep')}</button>`;
  if (shipKey === key) return `<div class="field"><label for="trk">${t('trackingL')}</label><input id="trk" autocomplete="off"></div><button type="button" class="btn solid" data-move="shipped" data-no="${esc(o.no)}">${t('shipNow')}</button><button type="button" class="btn ghost" data-ship="">${t('cancel')}</button>`;
  const main = { awaiting: ['paid'], reported: ['paid'], paid: ['shipped'], shipped: [], cancelled: [] }[o.status];
  const undo = { awaiting: [], reported: ['awaiting'], paid: [o.last5 ? 'reported' : 'awaiting'], shipped: ['paid'], cancelled: [o.last5 ? 'reported' : 'awaiting'] }[o.status];
  return [
    ...main.map((m) => (m === 'shipped' ? `<button type="button" class="btn solid" data-ship="${esc(o.no)}">${t('mv_shipped')}</button>` : `<button type="button" class="btn solid" data-move="${m}" data-no="${esc(o.no)}">${moveLabel(o, m)}</button>`)),
    ...undo.map((m) => `<button type="button" class="btn ghost" data-move="${m}" data-no="${esc(o.no)}">${moveLabel(o, m)}</button>`),
    ...(['awaiting', 'reported', 'paid'].includes(o.status) ? [`<button type="button" class="btn ghost" data-confirm="${esc(o.no)}">${t('mv_cancelled')}</button>`] : []),
  ].join('');
}
function detailHtml(o) {
  if (!detail || detail.order.no !== o.no) return '<div class="detail"><p class="muted"><span class="loading"></span></p></div>';
  const ev = detail.events.map((e) => `<li><span class="when">${fmtTime(e.at)}</span><span>${t('ev_' + e.kind) || e.kind}${e.detail && e.kind !== 'placed' ? ` · ${esc(e.detail)}` : ''}${e.actor && e.actor !== 'customer' ? ` <span class="muted">(${esc(e.actor)})</span>` : ''}</span></li>`).join('');
  const msgs = detail.messages.length ? detail.messages.map((m) => `<li><span class="when">${fmtTime(m.at)}</span><span>${t('m_' + m.kind) || m.kind} · <b class="msg-${m.status}">${t('s_' + m.status)}</b>${m.error && m.status === 'failed' ? ` <small class="muted">${esc(m.error)}</small>` : ''}</span></li>`).join('') : `<li class="muted">${t('noMessages')}</li>`;
  return `<div class="detail">
    <div><h4>${t('timeline')}</h4><ul class="timeline">${ev}</ul>
      ${o.note ? `<h4 style="margin-top:12px">${t('customerNote')}</h4><p style="font-size:.9rem">“${esc(o.note)}”</p>` : ''}</div>
    <div><h4>${t('messages')}</h4><ul class="timeline">${msgs}</ul>
      <p style="margin-top:8px"><button type="button" class="btn ghost small-btn" data-resend="${esc(o.no)}">${t('resend')}</button></p>
      <div class="field" style="margin-top:12px"><label for="note-${esc(o.no)}">${t('teamNote')}</label><textarea id="note-${esc(o.no)}" rows="2" maxlength="1000">${esc(detail.order.admin_note || '')}</textarea></div>
      <p style="margin-top:6px"><button type="button" class="btn ghost small-btn" data-note="${esc(o.no)}">${t('saveNote')}</button></p></div>
  </div>`;
}
function renderOrders() {
  const d = ordersData, c = d.counts, total = STATUSES.reduce((a, s) => a + c[s], 0);
  const chip = (k) => `<button type="button" class="chip" data-filter="${k}" aria-pressed="${filter === k}">${k === 'all' ? t('all') : t('st_' + k)} <span class="num muted">${k === 'all' ? total : c[k]}</span></button>`;
  const dates = [...new Set(d.orders.map((o) => o.ship_date).concat(shipFilter ? [shipFilter] : []))].sort();
  $('#body').innerHTML = `<div class="tiles">
      <button type="button" class="tile ${c.reported ? 'alert' : ''}" data-filter="reported" style="text-align:left"><b>${c.reported}</b><span>${t('tNeedCheck')}</span></button>
      <button type="button" class="tile" data-filter="paid" style="text-align:left"><b>${c.paid}</b><span>${t('tToShip')}</span></button>
      <button type="button" class="tile" data-filter="awaiting" style="text-align:left"><b>${c.awaiting}</b><span>${t('tAwait')}</span></button>
      <div class="tile"><b>${money(d.monthSales)}</b><span>${t('tMonth')}</span></div></div>
    <div class="filters no-print">${['all', ...STATUSES].map(chip).join('')}</div>
    <div class="filters no-print"><select id="shipSel" aria-label="${t('anyDate')}" class="chip" style="padding:6px 12px"><option value="">${t('anyDate')}</option>${dates.map((x) => `<option value="${x}" ${x === shipFilter ? 'selected' : ''}>${fmtDate(x, lang)}</option>`).join('')}</select>
      <input id="q" type="search" placeholder="${t('search')}" value="${esc(query)}" aria-label="${t('search')}">
      <a class="btn ghost small-btn" href="/api/admin/orders.csv${shipFilter ? `?from=${shipFilter}&to=${shipFilter}` : ''}">${t('csv')}</a>
      <button type="button" class="btn ghost small-btn" id="refresh">${t('refresh')}</button></div>
    <div class="olist">${!total ? `<p class="muted">${t('noOrders')}</p>` : !d.orders.length ? `<p class="muted">${t('noMatch')}</p>` : d.orders.map((o) => `<article class="orow ${o.status}">
      <div><h3>${esc(o.no)}</h3><small>${t('placed')} ${fmtTime(o.created_at)}</small><p style="margin-top:6px"><span class="pill ${o.status}">${t('st_' + o.status)}</span></p>
        <p style="margin-top:8px"><button type="button" class="dlink" data-open="${esc(o.no)}">${openNo === o.no ? t('hide') : t('details')}</button></p></div>
      <div><strong>${esc(o.name)}</strong> <small style="display:inline">${o.line_name && o.line_name !== o.name ? `(LINE: ${esc(o.line_name)})` : ''}</small><small>${esc(o.phone)}${o.email ? ` · ${esc(o.email)}` : ''}<br>${esc(o.city)} ${esc(o.addr)}</small>
        ${o.friend === false ? `<small style="color:#C2412D">${t('notFriend')}</small>` : ''}${o.admin_note ? `<small style="margin-top:4px">📝 ${esc(o.admin_note)}</small>` : ''}</div>
      <div><small style="color:var(--ink)">${esc(itemsText(o))}</small><small style="margin-top:6px">${t('ships')} <b style="color:var(--ink)">${fmtDate(o.ship_date, lang)}</b></small>
        <small style="margin-top:4px">${t('l5')} ${o.last5 ? `<span class="l5">${esc(o.last5)}</span>` : t('noL5')}</small>${o.tracking_no ? `<small>🚚 ${esc(o.tracking_no)}</small>` : ''}</div>
      <div class="acts"><strong class="num" style="font-family:var(--f-display);font-size:1.2rem;text-align:right">${money(o.total)}</strong>${actionsHtml(o)}</div>
      ${openNo === o.no ? detailHtml(o) : ''}
    </article>`).join('')}</div>`;
  if (shipKey) $('#trk')?.focus();
}
async function move(no, status) {
  const body = { status };
  if (status === 'shipped') body.tracking_no = $('#trk')?.value || '';
  try {
    await api(`/api/admin/orders/${encodeURIComponent(no)}/status`, { method: 'POST', body });
    confirmKey = shipKey = null;
    toast(t('st_' + status));
    await loadOrders();
  } catch (e) { handleErr(e); }
}

// ---------- production ----------
function renderProduction() {
  const P = Object.fromEntries(prod.products.map((p) => [p.id, p]));
  $('#body').innerHTML = `<div class="adm-head" style="margin-bottom:12px"><p class="muted" style="max-width:60ch">${t('prodLead')}</p><button type="button" class="btn ghost small-btn no-print" id="print">${t('print')}</button></div>
    ${!prod.days.length ? `<p class="muted">${t('prodEmpty')}</p>` : prod.days.map((d) => {
    const ids = [...new Set([...Object.keys(d.confirmed), ...Object.keys(d.pending)])].sort((a, b) => (P[a]?.sort ?? 99) - (P[b]?.sort ?? 99));
    const sc = ids.reduce((a, i) => a + (d.confirmed[i] || 0), 0), sp = ids.reduce((a, i) => a + (d.pending[i] || 0), 0);
    return `<section class="prod-day"><header><h3>${fmtDate(d.date, lang)}</h3><span class="muted">${t('ordersN')(d.orders)} · ${t('jarsN')(d.jars)}</span></header>
      <div class="tscroll"><table class="ptable"><thead><tr><th>${t('flavor')}</th><th>${t('confirmed')}</th><th>${t('pending')}</th><th>${t('totalJars')}</th></tr></thead>
      <tbody>${ids.map((i) => `<tr><td>${esc(P[i] ? pname(P[i]) : i)}</td><td>${d.confirmed[i] || 0}</td><td class="muted">${d.pending[i] || 0}</td><td><b>${(d.confirmed[i] || 0) + (d.pending[i] || 0)}</b></td></tr>`).join('')}</tbody>
      <tfoot><tr><td>${t('totalJars')}</td><td>${sc}</td><td>${sp}</td><td>${sc + sp}</td></tr></tfoot></table></div></section>`;
  }).join('')}`;
}

// ---------- customers ----------
async function loadCustomers() {
  custData = await api('/api/admin/customers' + (custQuery ? '?q=' + encodeURIComponent(custQuery) : ''));
  if (custOpen) custDetail = await api(`/api/admin/customers/${custOpen}`).catch(() => null);
  renderCustomers();
}
const fmtDay = (ms) => { if (!ms) return ''; const d = new Date(ms); return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`; };
function avatar(c, size = 44) {
  const initial = esc((c.line_name || c.name || '?').trim().charAt(0).toUpperCase());
  return c.picture
    ? `<img src="${esc(c.picture)}" alt="" width="${size}" height="${size}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;flex:none" loading="lazy" referrerpolicy="no-referrer">`
    : `<span aria-hidden="true" style="width:${size}px;height:${size}px;border-radius:50%;background:var(--paper-2);display:grid;place-items:center;font-weight:800;flex:none">${initial}</span>`;
}
function custDetailHtml(c) {
  if (!custDetail || custDetail.customer.id !== c.id) return '<div class="detail"><p class="muted"><span class="loading"></span></p></div>';
  const o = custDetail.orders;
  return `<div class="detail">
    <div><h4>${t('cOrderList')}</h4>${!o.length ? `<p class="muted">${t('cNoOrders')}</p>` : `<ul class="timeline">${o.map((x) => `<li><span class="when">${fmtTime(x.created_at)}</span>
      <span><b class="num">${esc(x.no)}</b> · <span class="pill ${x.status}">${t('st_' + x.status)}</span> · ${money(x.total)} · ${t('ships')} ${fmtDate(x.ship_date, lang)}
      <button type="button" class="dlink" data-goorder="${esc(x.no)}">${t('cOpenOrder')}</button></span></li>`).join('')}</ul>`}</div>
    <div><h4>${t('cProfileNote')}</h4><ul class="timeline">
      <li><span class="when">${t('cJoined')}</span><span>${fmtTime(c.created_at)}</span></li>
      <li><span class="when">${t('cLastLogin')}</span><span>${c.last_login ? fmtTime(c.last_login) : '–'}</span></li>
      <li><span class="when">${t('cLang')}</span><span>${c.lang === 'zh' ? '中文' : 'English'}</span></li>
      <li><span class="when">LINE</span><span>${esc(c.line_name)} · ${c.friend === false ? `<b class="msg-failed">${t('cFriendNo')}</b>` : c.friend ? `<b class="msg-sent">${t('cFriendYes')}</b>` : '–'}</span></li>
    </ul></div></div>`;
}
function renderCustomers() {
  const d = custData, s = d.summary;
  $('#body').innerHTML = `<div class="tiles">
      <div class="tile"><b>${s.total}</b><span>${t('cTotal')}</span></div>
      <div class="tile"><b>${s.newThisMonth}</b><span>${t('cNew')}</span></div>
      <div class="tile"><b>${s.repeat}</b><span>${t('cRepeat')}</span></div>
      <div class="tile ${s.notFriends ? 'alert' : ''}"><b>${s.notFriends}</b><span>${t('cNotFriend')}</span></div></div>
    <div class="filters no-print"><input id="cq" type="search" placeholder="${t('cSearch')}" value="${esc(custQuery)}" aria-label="${t('cSearch')}" style="margin-left:0">
      ${isOwner() ? `<a class="btn ghost small-btn" href="/api/admin/customers.csv">${t('cCsvOwner')}</a>` : ''}</div>
    <div class="olist">${!s.total ? `<p class="muted">${t('cNone')}</p>` : !d.customers.length ? `<p class="muted">${t('cNoMatch')}</p>` : d.customers.map((c) => `<article class="orow" style="grid-template-columns:1.3fr 1.2fr 1fr auto">
      <div style="display:flex;gap:12px;align-items:flex-start">${avatar(c)}<div style="min-width:0"><h3 style="font-variant-numeric:normal">${esc(c.name || c.line_name)}</h3>
        <small>LINE: ${esc(c.line_name)}${c.friend === false ? ` · <span style="color:#C2412D">${t('cNotFriend')}</span>` : ''}</small>
        <p style="margin-top:6px"><button type="button" class="dlink" data-cust="${c.id}">${custOpen === c.id ? t('hide') : t('details')}</button></p></div></div>
      <div><small style="color:var(--ink)">${esc(c.phone) || '–'}</small><small>${esc(c.email)}</small><small>${esc(c.city)} ${esc(c.addr)}</small></div>
      <div><small>${t('cJoined')} ${fmtDay(c.created_at)}</small><small>${c.last_order ? `${t('cLastOrder')} ${fmtDay(c.last_order)}` : t('cNoOrders')}</small>
        ${c.open_orders ? `<small style="color:var(--st-wait)">${t('cOpen')(c.open_orders)}</small>` : ''}</div>
      <div class="acts" style="text-align:right"><strong class="num" style="font-family:var(--f-display);font-size:1.15rem">${money(c.spent)}</strong><small class="muted">${t('cOrders')(c.orders)}</small></div>
      ${custOpen === c.id ? custDetailHtml(c) : ''}
    </article>`).join('')}</div>`;
}

// ---------- products ----------
function renderProducts() {
  const opt = (arr, cur, pre) => arr.map((v) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${t(pre + v)}</option>`).join('');
  const ed = editing ? `<form class="editor" id="prodForm" novalidate>
    <div class="preview"><div class="thumb" id="prodPrev">${art(editing, editing.en)}</div><div><h3 style="font-size:1.15rem">${esc(editing.en || t('addProduct'))}</h3>
      ${editing.id ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><label class="btn ghost small-btn" style="cursor:pointer" id="photoLbl">${t('photoAdd')}<input type="file" id="photoIn" accept="image/*" hidden></label>${editing.photo ? `<button type="button" class="btn ghost small-btn" id="photoRm">${t('photoRm')}</button>` : ''}</div>` : ''}</div></div>
    <div class="grid2" style="margin-top:14px">
      ${field('p-en', t('pEn'), editing.en, 'maxlength="60"')}${field('p-zh', t('pZh'), editing.zh, 'maxlength="60"')}
      ${field('p-den', t('pDen'), editing.den, 'maxlength="200"')}${field('p-dzh', t('pDzh'), editing.dzh, 'maxlength="200"')}
      ${field('p-price', t('pPrice'), editing.price, 'type="number" min="0" step="10" inputmode="numeric"')}
      <div class="field"><label for="p-status">${t('pStatus')}</label><select id="p-status">${opt(['available', 'soon', 'hidden'], editing.status, 'ps_')}</select></div>
      <div class="field"><label for="p-color">${t('pColor')}</label><input type="color" id="p-color" value="${esc(editing.color || '#F4E2AE')}"></div>
      <div class="field"><label for="p-deco">${t('pDeco')}</label><select id="p-deco">${opt(DECOS, editing.deco, 'deco_')}</select></div>
      ${field('p-sort', t('pSort'), editing.sort, 'type="number" step="1"')}
    </div>
    <div class="acts"><button type="submit" class="btn solid" id="prodSave">${t('save')}</button><button type="button" class="btn ghost" id="prodCancel">${t('cancel')}</button>
      ${editing.id ? (confirmKey === 'del' ? `<span class="confirmbar">${t('delQ')} <button type="button" class="btn solid" id="prodDel">${t('delYes')}</button><button type="button" class="btn ghost" data-confirm="">${t('keep')}</button></span>` : `<button type="button" class="btn ghost" data-confirm="del" style="margin-left:auto">${t('del')}</button>`) : ''}</div>
    <p class="err" id="prodErr" hidden></p></form>` : '';
  $('#body').innerHTML = `${!isOwner() ? `<p class="muted" style="margin-bottom:12px">${t('ownerOnly')}</p>` : ''}${ed}
    ${isOwner() && !editing ? `<div style="display:flex;justify-content:flex-end;margin-bottom:12px"><button type="button" class="btn solid" id="newProd">+ ${t('addProduct')}</button></div>` : ''}
    <div class="plist">${products.map((p) => `<div class="prow"><div class="thumb">${art(p, p.en)}</div>
      <div style="min-width:0"><h3>${esc(p.en)} <span class="muted" style="font-weight:500">${esc(p.zh)}</span></h3><small>${t('ps_' + p.status)} · #${esc(p.sort)}</small></div>
      <strong class="num pprice">${money(p.price)}</strong>
      ${isOwner() ? `<button type="button" class="btn ghost small-btn" data-edit="${esc(p.id)}">${t('edit')}</button>` : '<span></span>'}</div>`).join('')}</div>`;
}
const readEditor = () => ({ ...editing, en: $('#p-en').value.trim(), zh: $('#p-zh').value.trim(), den: $('#p-den').value.trim(), dzh: $('#p-dzh').value.trim(), price: Number($('#p-price').value), status: $('#p-status').value, color: $('#p-color').value, deco: $('#p-deco').value, sort: Number($('#p-sort').value) });
async function saveProduct() {
  const p = readEditor(), err = $('#prodErr');
  $('#prodSave').textContent = t('saving');
  try {
    const body = { en: p.en, zh: p.zh, den: p.den, dzh: p.dzh, price: p.price, status: p.status, color: p.color, deco: p.deco, sort: p.sort };
    if (p.id) await api(`/api/admin/products/${encodeURIComponent(p.id)}`, { method: 'PUT', body }); else await api('/api/admin/products', { method: 'POST', body });
    editing = null; confirmKey = null; toast(t('saved'));
    products = (await api('/api/admin/products')).products; renderProducts();
  } catch (e) { if (e.status === 401) return handleErr(e); err.textContent = e.message; err.hidden = false; $('#prodSave').textContent = t('save'); }
}
/** Shrinks a photo in the browser before uploading (max 1400px, JPEG), so pages load fast. */
async function shrink(file) {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 1400 / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return new Promise((r) => c.toBlob(r, 'image/jpeg', 0.86));
}
async function uploadPhoto(file) {
  const lbl = $('#photoLbl');
  if (lbl) lbl.firstChild.textContent = t('photoUp');
  try {
    const blob = await shrink(file).catch(() => file);
    const r = await api(`/api/admin/products/${encodeURIComponent(editing.id)}/photo`, { method: 'POST', raw: blob, type: blob.type || 'image/jpeg' });
    editing = { ...readEditor(), photo: r.product.photo };
    products = products.map((p) => (p.id === r.product.id ? r.product : p));
    renderProducts();
  } catch (e) { handleErr(e); renderProducts(); }
}

// ---------- settings ----------
function renderSettings() {
  const s = settings;
  $('#body').innerHTML = `<form class="settings" id="setForm" novalidate>
    <fieldset><legend>${t('setShip')}</legend><div class="grid2" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">${field('s-shipFee', t('setFee'), s.shipFee, 'type="number" min="0"')}${field('s-freeAt', t('setFree'), s.freeAt, 'type="number" min="0"')}</div></fieldset>
    <fieldset><legend>${t('setBox')}</legend><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">${field('s-boxOff', t('setOff'), s.boxOff, 'type="number" min="0" max="90"')}${field('s-boxFee', t('setBoxFee'), s.boxFee, 'type="number" min="0"')}</div></fieldset>
    <fieldset><legend>${t('setDays')}</legend>
      <div class="field"><span style="font-weight:700;font-size:.88rem">${t('setWeekdays')}</span><div class="weekdays">${[1, 2, 3, 4, 5, 6, 0].map((d) => `<label><input type="checkbox" name="wd" value="${d}" ${s.shipDays.includes(d) ? 'checked' : ''}><span>${t('dow')[d]}</span></label>`).join('')}</div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">${field('s-leadDays', t('setLead'), s.leadDays, 'type="number" min="0" max="30"')}${field('s-dailyCap', t('setCap'), s.dailyCap, 'type="number" min="0"')}</div>
      <div class="field"><span style="font-weight:700;font-size:.88rem">${t('setClosed')}</span><div class="inline-form" style="margin-top:0"><input type="date" id="closedIn" aria-label="${t('setClosed')}" style="max-width:200px"><button type="button" class="btn ghost small-btn" id="closedAdd">${t('addDate')}</button></div>
        <div class="closed" id="closedList">${s.closedDates.map((d) => `<span>${fmtDate(d, lang)} ${d.slice(0, 4)}<button type="button" data-unclose="${d}" aria-label="Remove">×</button></span>`).join('')}</div></div></fieldset>
    <fieldset><legend>${t('setBank')}</legend><p class="muted" style="font-size:.85rem">${t('setBankHint')}</p>
      ${field('s-bankName', t('bankName'), s.bankName)}${field('s-bankCode', t('bankCode'), s.bankCode, 'inputmode="numeric"')}${field('s-account', t('account'), s.account, 'inputmode="numeric"')}${field('s-accountName', t('accountName'), s.accountName)}</fieldset>
    <fieldset><legend>${t('setLine')}</legend>${field('s-lineOa', t('setOa'), s.lineOa)}</fieldset>
    <div><button type="submit" class="btn solid" id="setSave">${t('save')}</button></div></form>`;
}
async function saveSettings() {
  const v = (k) => $('#s-' + k).value;
  const body = { ...settings, shipFee: v('shipFee'), freeAt: v('freeAt'), boxOff: v('boxOff'), boxFee: v('boxFee'), leadDays: v('leadDays'), dailyCap: v('dailyCap'),
    shipDays: [...document.querySelectorAll('input[name=wd]:checked')].map((x) => Number(x.value)), bankName: v('bankName'), bankCode: v('bankCode'), account: v('account'), accountName: v('accountName'), lineOa: v('lineOa') };
  $('#setSave').textContent = t('saving');
  try { settings = (await api('/api/admin/settings', { method: 'PUT', body })).settings; toast(t('saved')); renderSettings(); } catch (e) { handleErr(e); $('#setSave').textContent = t('save'); }
}

// ---------- team ----------
function renderTeam() {
  $('#body').innerHTML = `<p class="muted" style="margin-bottom:14px;max-width:62ch">${t('teamLead')}</p>
    <div style="display:flex;flex-direction:column;gap:10px">${team.map((a) => `<div class="trow"><div><strong>${esc(a.name)}</strong>${a.id === me.id ? ` <span class="muted">(${t('you')})</span>` : ''}
      <div class="muted" style="font-size:.84rem">${a.role === 'owner' ? t('owner') : t('staff')}${!a.active ? ` · ${t('inactive')}` : ''}${!a.pw_changed ? ` · ${t('pwNotChanged')}` : ''}${a.line_alerts ? ` · ${t('alertsBadge')}` : ''}</div></div>
      ${a.id === me.id ? '' : `<div class="acts"><button type="button" class="btn ghost" data-role="${a.id}" data-to="${a.role === 'owner' ? 'staff' : 'owner'}">${a.role === 'owner' ? t('makeStaff') : t('makeOwner')}</button>
        <button type="button" class="btn ghost" data-active="${a.id}" data-to="${a.active ? 0 : 1}">${a.active ? t('disable') : t('enable')}</button>
        <button type="button" class="btn ghost" data-reset="${a.id}">${t('resetPw')}</button></div>`}
      ${confirmKey === 'reset' + a.id ? `<form class="inline-form" style="width:100%" data-resetform="${a.id}">${field('rp-' + a.id, t('newPwFor')(esc(a.name)), '', 'type="text" minlength="8" autocomplete="off"')}<button class="btn solid small-btn">${t('save')}</button><button type="button" class="btn ghost small-btn" data-confirm="">${t('cancel')}</button></form>` : ''}
    </div>`).join('')}</div>
    <form class="editor" id="teamForm" style="margin-top:20px" novalidate><h3 style="font-size:1.05rem">${t('addMember')}</h3>
      <div class="grid2" style="margin-top:10px">${field('t-name', t('name'), '', 'maxlength="40" autocomplete="off"')}${field('t-pw', t('password'), '', 'type="text" minlength="8" autocomplete="off"')}
      <div class="field"><label for="t-role">${t('role')}</label><select id="t-role"><option value="staff">${t('staff')}</option><option value="owner">${t('owner')}</option></select></div></div>
      <div class="acts"><button class="btn solid">${t('addMember')}</button></div><p class="err" id="teamErr" hidden></p></form>`;
}
async function teamUpdate(id, body) {
  try { await api(`/api/admin/team/${id}`, { method: 'PUT', body }); confirmKey = null; team = (await api('/api/admin/team')).team; toast(t('saved')); renderTeam(); } catch (e) { handleErr(e); }
}

// ---------- password ----------
function renderPw() {
  $('#pwBox').innerHTML = `<form class="editor" id="pwForm" novalidate><h3 style="font-size:1.05rem">${t('changePw')}</h3><div class="grid2" style="margin-top:10px">
    ${field('pw-cur', t('pwCurrent'), '', 'type="password" autocomplete="current-password"')}${field('pw-new', t('pwNew'), '', 'type="password" autocomplete="new-password" minlength="8"')}</div>
    <div class="acts"><button class="btn solid">${t('save')}</button><button type="button" class="btn ghost" id="pwClose">${t('cancel')}</button></div><p class="err" id="pwErr" hidden></p></form>`;
  $('#pw-cur').focus();
}

// ---------- events ----------
document.addEventListener('click', async (e) => {
  const b = e.target.closest('button,a');
  if (!$('#acct').contains(e.target)) { const m = $('#acctMenu'); if (m) m.hidden = true; }
  if (!b) return;
  const d = b.dataset;
  if (d.lang) { lang = d.lang; store.set('oka-lang', lang); applyI18n(); return me ? renderShell() : renderLogin(); }
  if (d.tab) { tab = d.tab; editing = null; confirmKey = shipKey = null; openNo = null; return renderShell(); }
  if (d.filter) { filter = filter === d.filter && b.classList.contains('tile') ? 'all' : d.filter; return loadOrders().catch(handleErr); }
  if (d.open) { openNo = openNo === d.open ? null : d.open; detail = null; renderOrders(); if (openNo) { detail = await api(`/api/admin/orders/${encodeURIComponent(openNo)}`).catch(() => null); renderOrders(); } return; }
  if ('confirm' in d) { confirmKey = d.confirm || null; shipKey = null; return tab === 'orders' ? renderOrders() : tab === 'team' ? renderTeam() : renderProducts(); }
  if ('ship' in d) { shipKey = d.ship || null; confirmKey = null; return renderOrders(); }
  if (d.move) return move(d.no, d.move);
  if (d.note) { try { await api(`/api/admin/orders/${encodeURIComponent(d.note)}/note`, { method: 'POST', body: { admin_note: $('#note-' + CSS.escape(d.note)).value } }); toast(t('noteSaved')); await loadOrders(); } catch (er) { handleErr(er); } return; }
  if (d.resend) { try { const r = await api(`/api/admin/orders/${encodeURIComponent(d.resend)}/resend`, { method: 'POST', body: {} }); toast(t('s_' + (r.result?.status || 'skipped'))); await loadOrders(); } catch (er) { handleErr(er); } return; }
  if (d.cust) { const id = Number(d.cust); custOpen = custOpen === id ? null : id; custDetail = null; renderCustomers(); if (custOpen) { custDetail = await api(`/api/admin/customers/${id}`).catch(() => null); renderCustomers(); } return; }
  if (d.goorder) { tab = 'orders'; filter = 'all'; shipFilter = ''; query = d.goorder; openNo = d.goorder; detail = null; return renderShell(); }
  if (d.edit) { editing = { ...products.find((p) => p.id === d.edit) }; confirmKey = null; renderProducts(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  if (d.unclose) { settings.closedDates = settings.closedDates.filter((x) => x !== d.unclose); return renderSettings(); }
  if (d.role) return teamUpdate(d.role, { role: d.to });
  if (d.active) return teamUpdate(d.active, { active: d.to === '1' });
  if (d.reset) { confirmKey = 'reset' + d.reset; renderTeam(); $('#rp-' + d.reset).focus(); return; }
  switch (b.id) {
    case 'acctToggle': { const m = $('#acctMenu'); m.hidden = !m.hidden; b.setAttribute('aria-expanded', String(!m.hidden)); break; }
    case 'pwOpen': case 'pwOpen2': $('#acctMenu').hidden = true; renderPw(); break;
    case 'pwClose': $('#pwBox').innerHTML = ''; break;
    case 'logout': await api('/api/admin/logout', { method: 'POST' }).catch(() => {}); me = null; renderLogin(); break;
    case 'alertsToggle':
      $('#acctMenu').hidden = true;
      try { const r = await api('/api/admin/me/line-alerts', { method: 'POST', body: { on: !me.line_alerts } }); me.line_alerts = r.line_alerts; toast(r.line_alerts ? t('alertsDone') : t('alertsStopped')); renderAcct(); } catch (er) { toast(er.status === 400 ? t('alertsNeedLogin') : er.message); }
      break;
    case 'refresh': loadOrders().catch(handleErr); break;
    case 'print': window.print(); break;
    case 'newProd': editing = { en: '', zh: '', den: '', dzh: '', price: 410, status: 'soon', color: '#F4E2AE', deco: 'plain', sort: products.length + 1, photo: null }; renderProducts(); break;
    case 'prodCancel': editing = null; confirmKey = null; renderProducts(); break;
    case 'prodDel': try { await api(`/api/admin/products/${encodeURIComponent(editing.id)}`, { method: 'DELETE' }); editing = null; confirmKey = null; products = (await api('/api/admin/products')).products; renderProducts(); } catch (er) { handleErr(er); } break;
    case 'photoRm': try { const r = await api(`/api/admin/products/${encodeURIComponent(editing.id)}/photo`, { method: 'DELETE' }); editing = { ...readEditor(), photo: null }; products = products.map((p) => (p.id === r.product.id ? r.product : p)); renderProducts(); } catch (er) { handleErr(er); } break;
    case 'closedAdd': { const v = $('#closedIn').value; if (v && !settings.closedDates.includes(v)) { settings.closedDates = [...settings.closedDates, v].sort(); renderSettings(); } break; }
  }
});
let qTimer;
document.addEventListener('input', (e) => {
  if (e.target.id === 'cq') { clearTimeout(qTimer); qTimer = setTimeout(() => { custQuery = e.target.value.trim(); loadCustomers().then(() => { const q = $('#cq'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }).catch(handleErr); }, 300); }
  if (e.target.id === 'q') { clearTimeout(qTimer); qTimer = setTimeout(() => { query = e.target.value.trim(); loadOrders().then(() => { const q = $('#q'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }).catch(handleErr); }, 300); }
  if (['p-color', 'p-deco'].includes(e.target.id) && editing && !editing.photo) $('#prodPrev').innerHTML = jar(readEditor());
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'shipSel') { shipFilter = e.target.value; loadOrders().catch(handleErr); }
  if (e.target.id === 'photoIn' && e.target.files?.[0]) uploadPhoto(e.target.files[0]);
});
document.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  if (f.id === 'loginForm') {
    const name = $('#l-name').value.trim();
    try { const r = await api('/api/admin/login', { method: 'POST', body: { name, password: $('#l-pw').value } }); store.set('oka-admin-name', name); me = r.admin; info = await api('/api/admin/me'); renderShell(); } catch (er) { renderLogin(er.status === 401 ? t('wrong') : er.message); }
  }
  if (f.id === 'prodForm') saveProduct();
  if (f.id === 'setForm') saveSettings();
  if (f.id === 'pwForm') {
    try { await api('/api/admin/me/password', { method: 'POST', body: { current: $('#pw-cur').value, password: $('#pw-new').value } }); me.pw_changed = true; toast(t('pwSaved')); renderShell(); } catch (er) { const el = $('#pwErr'); el.textContent = er.message; el.hidden = false; }
  }
  if (f.id === 'teamForm') {
    try { await api('/api/admin/team', { method: 'POST', body: { name: $('#t-name').value, password: $('#t-pw').value, role: $('#t-role').value } }); team = (await api('/api/admin/team')).team; toast(t('saved')); renderTeam(); } catch (er) { const el = $('#teamErr'); el.textContent = er.message; el.hidden = false; }
  }
  if (f.dataset.resetform) teamUpdate(f.dataset.resetform, { password: $('#rp-' + f.dataset.resetform).value });
});
// Keep the order list fresh while the page is open.
setInterval(() => {
  if (me && tab === 'orders' && document.visibilityState === 'visible' && !confirmKey && !shipKey && document.activeElement?.tagName !== 'TEXTAREA' && document.activeElement?.id !== 'q') loadOrders().catch(() => {});
}, 60000);

boot();
