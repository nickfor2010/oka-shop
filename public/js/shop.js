// OKA shop page: menu, gift box builder, bag, LINE login, checkout, payment report and "My orders".
import { $, esc, money, store, api, fmtDate, jar, art, toaster, LINE_ICON } from './common.js';
import { boxPrice, shippingFee, BOX_SIZE } from './pricing.js';

const CITIES = ['台北市 Taipei', '新北市 New Taipei', '基隆市 Keelung', '桃園市 Taoyuan', '新竹市 Hsinchu City', '新竹縣 Hsinchu County', '苗栗縣 Miaoli', '台中市 Taichung', '彰化縣 Changhua', '南投縣 Nantou', '雲林縣 Yunlin', '嘉義市 Chiayi City', '嘉義縣 Chiayi County', '台南市 Tainan', '高雄市 Kaohsiung', '屏東縣 Pingtung', '宜蘭縣 Yilan', '花蓮縣 Hualien', '台東縣 Taitung', '澎湖縣 Penghu', '金門縣 Kinmen', '連江縣 Lienchiang'];
const REVIEWS = [
  { f: 'classic', name: '林志豪', text: '原味的奶香很乾淨，入口即化，全家都喜歡。', stars: 5 },
  { f: 'chocolate', name: 'Daniel Wu', text: 'Silky chocolate, rich but never heavy. Arrived cold and beautifully packed.', stars: 5 },
  { f: 'lemon', name: '王雅婷', text: '檸檬的酸度很清爽，夏天吃超幸福。', stars: 4 },
  { f: 'biscoff', name: 'Sophie Lin', text: 'The Biscoff crumble on top is addictive. I wish I had ordered two jars.', stars: 5 },
];

const T = {
  en: {
    shop: 'Small Cheesecake Shop', navFlavors: 'Flavors', navBox: 'Gift Box', navStory: 'Our Story', navOrder: 'How to Order', bag: 'Bag',
    heroEyebrow: 'Made in Tainan · Shipped across Taiwan', heroTitle: 'Little cakes.<br><em>Big happiness.</em>',
    heroLede: 'Handmade cheesecake, layered into 220g jars and shipped chilled anywhere in Taiwan.', heroLede2: '一口甜點，剛剛好，就是幸福。',
    ctaShop: 'Shop flavors', ctaBox: 'Build a gift box', factJar: 'per jar', ribbon: 'Shipped chilled',
    factShipL: (a) => `shipping · free over ${a}`, flavorsLbl: (a, s) => (s ? `flavors · ${s} coming soon` : 'flavors'),
    colEyebrow: 'The collection', colTitle: 'Pick your jars', colLede: 'Every jar is 220g and made fresh in Tainan. Add a few, or build a gift box of six below.',
    add: 'Add to bag', soon: 'Coming soon', soonTag: 'Coming soon', menuLoading: 'Loading the menu…', menuError: "We couldn't load the menu. Please check your connection and reload the page.",
    boxEyebrow: (a) => `Save ${a}%`, boxTitle: 'Build your gift box',
    boxLede: (o, f) => `Choose up to six jars, repeats welcome. Fill all six and get ${o}% off the jars. The OKA gift box is ${f}. Want a different mix? Add this box, then build another.`,
    boxRule: (o, f) => `Fill all six for ${o}% off the jars · gift box ${f}`, boxBreak: (j, o, d, b) => `Jars ${j} − ${o}% (${d}) + gift box ${b}`, boxBreakPart: (j, b) => `Jars ${j} + gift box ${b}`,
    boxMoreOff: (n, o) => `Add ${n} more jar${n > 1 ? 's' : ''} to get ${o}% off the jars.`, boxOffYes: (o) => `Box full: ${o}% off the jars.`,
    boxN: (n) => (n === 6 ? 'Box of six' : `Gift box · ${n} jar${n > 1 ? 's' : ''}`), boxesN: (n) => `${n} boxes`,
    boxAdd: 'Add box to bag', boxSurprise: 'Surprise me', boxClear: 'Clear', boxHint: 'Tap a jar in the box to take it out.', empty: 'Empty',
    storyEyebrow: 'Our story', storyTitle: 'A small dessert, just right',
    story1: 'OKA started with a simple idea: a small, well-balanced dessert can change an afternoon.',
    story2: 'We bake in small batches in Tainan, layer each cheesecake by hand into a 220g jar, seal it fresh and ship it chilled. There is no storefront, just a kitchen and a lot of jars.',
    returnTitle: 'Give your jar a second life', returnBody: "Our jars are light, sturdy plastic, so they travel safely. Please don't throw them away: follow us on Instagram for reels with easy ideas to reuse them.",
    howEyebrow: 'How it works', howTitle: 'How to order',
    s1t: 'Choose', s1p: 'Pick single jars or a gift box.', s2t: 'Check out', s2p: 'Log in with LINE, then enter your address and ship date.',
    s3t: 'Transfer', s3p: 'Pay by bank transfer, then enter the last 5 digits of your account.', s4t: 'We confirm', s4p: 'We check the transfer and confirm on LINE.',
    s5t: 'We ship', s5p: 'Your jars leave Tainan chilled on the date you chose.',
    shipH: 'Shipping', ship1: (f, a) => `<strong>${f}</strong> flat on orders under ${a}`, ship2: (a) => `<strong>Free</strong> on orders of ${a} or more`, ship3: 'Chilled delivery anywhere in Taiwan',
    daysH: 'Shipping days', days1: 'Orders ship Monday to Friday', days2: 'Pick your ship date at checkout', days3: 'We tell you on LINE when it has shipped',
    payH: 'Payment', pay1: 'Bank transfer only', pay2: 'Enter the last 5 digits of your account after transferring', pay3: 'We start preparing once payment is confirmed',
    revEyebrow: 'From our customers', revTitle: 'Loved by the jar', revSummary: (r, n) => `★ ${r} average from ${n} reviews`,
    footTag: 'Made in Tainan · Shipped across Taiwan', contactH: 'Contact', copy: 'Copy', copied: 'Copied', infoH: 'Good to know',
    info1: 'Ships Mon–Fri', info2: 'Bank transfer only', info3: (a) => `Free shipping over ${a}`, privacyLink: 'Privacy',
    yourBag: 'Your bag', checkout: 'Checkout', payT: 'Payment', myOrders: 'My orders', login: 'Log in', bagEmpty: 'Your bag is empty.', browse: 'Browse flavors',
    subtotal: 'Subtotal', shipping: 'Shipping', free: 'Free', total: 'Total', toCheckout: 'Check out', back: 'Back to bag',
    freeLeft: (a) => `Add ${a} more for free shipping.`, freeYes: 'You get free shipping.', remove: 'Remove', unavailable: 'No longer available',
    loginT: 'Log in to check out', loginP: 'We use LINE to send your order confirmation, payment check and shipping updates. No password needed.', loginBtn: 'Log in with LINE',
    loginOff: "Online ordering isn't open yet. Please order on LINE @637xgnpi.", logout: 'Log out', loggedAs: (n) => `Logged in as ${n}`,
    addFriend: "Add OKA as a friend on LINE so we can send your order updates.", addFriendBtn: 'Add friend',
    name: 'Name', phone: 'Mobile number', email: 'Email (optional)', city: 'City / county', addr: 'Address', shipDate: 'Ship date', noteL: 'Note (optional)', full: 'Full',
    place: 'Place order', placing: 'Placing order…', errPhone: 'Use a Taiwan mobile number, e.g. 0912 345 678.', errReq: 'Please fill in this field.', errEmail: 'Check the email address.',
    noteShip: 'We ship on the date you pick. Chilled delivery usually arrives the next day, but the courier sets the exact time.',
    noDates: 'There are no ship dates open right now. Please check back soon or message us on LINE.',
    priceChanged: 'Prices or the menu changed. Your bag has been updated, please check it.',
    orderNo: 'Order number', transferTo: 'Transfer this amount to', bankName: 'Bank', bankCode: 'Bank code', account: 'Account number', accountName: 'Account name',
    bankMissing: 'We will send you the bank details on LINE.', last5L: 'Last 5 digits of the account you transferred from', last5Hint: '帳號後五碼. This is how we match your transfer to your order.',
    errLast5: 'Enter exactly 5 digits.', report: "I've transferred", later: "I'll transfer later", reported: "Thanks! We'll check your transfer and confirm on LINE.", fixDigits: 'Wrong digits? Enter them again',
    orLine: 'Questions? Message us on LINE @637xgnpi.', noOrders: "You haven't placed any orders yet.", reportNow: 'Enter transfer digits', ships: 'Ships', tracking: 'Tracking',
    l5: 'Account ends', st_awaiting: 'Awaiting payment', st_reported: 'Payment reported', st_paid: 'Paid', st_shipped: 'Shipped', st_cancelled: 'Cancelled',
    added: (n) => `${n} added to your bag`, boxAdded: (n) => (n > 1 ? `${n} gift boxes added to your bag` : 'Gift box added to your bag'),
    loginCancelled: 'LINE login was cancelled.', loginFailed: "LINE login didn't work. Please try again.", loginExpired: 'The login took too long. Please try again.',
    loading: 'Loading…', retry: 'Something went wrong. Please try again.',
    share: 'Share OKA with friends', shareTitle: 'Share OKA', shareLine: 'Send on LINE', shareFb: 'Share on Facebook', shareCopy: 'Copy link', shareCopied: 'Link copied',
    shareText: 'OKA: handmade cheesecake in little jars, made in Tainan and shipped chilled across Taiwan 🫙', shareAfter: 'Know someone who would love OKA? Share the shop',
  },
  zh: {
    shop: '小小起司蛋糕店', navFlavors: '口味', navBox: '禮盒', navStory: '品牌故事', navOrder: '訂購方式', bag: '購物袋',
    heroEyebrow: '台南製作 · 全台寄送', heroTitle: '小小一罐，<br><em>大大的幸福。</em>',
    heroLede: '手作起司蛋糕，一層層裝進 220g 小罐，低溫寄送到全台灣。', heroLede2: 'Little cakes. Big happiness.',
    ctaShop: '選購口味', ctaBox: '自選禮盒', factJar: '每罐容量', ribbon: '低溫寄送',
    factShipL: (a) => `運費 · 滿 ${a} 免運`, flavorsLbl: (a, s) => (s ? `種口味 · ${s} 款即將推出` : '種口味'),
    colEyebrow: '口味系列', colTitle: '挑選你的那一罐', colLede: '每罐 220g，在台南新鮮製作。可以單點，也可以在下方組一盒禮盒。',
    add: '加入購物袋', soon: '即將推出', soonTag: '即將推出', menuLoading: '菜單載入中…', menuError: '無法載入菜單，請檢查網路後重新整理頁面。',
    boxEyebrow: (a) => `省 ${a}%`, boxTitle: '自選禮盒',
    boxLede: (o, f) => `最多選六罐，同口味也可以。裝滿六罐，罐子享 ${o}% 折扣；OKA 禮盒 ${f}。想要不同組合？先把這盒加入購物袋，再組下一盒。`,
    boxRule: (o, f) => `裝滿六罐享 ${o}% 折扣 · 禮盒 ${f}`, boxBreak: (j, o, d, b) => `罐子 ${j} − ${o}%（${d}）+ 禮盒 ${b}`, boxBreakPart: (j, b) => `罐子 ${j} + 禮盒 ${b}`,
    boxMoreOff: (n, o) => `再選 ${n} 罐即可享罐子 ${o}% 折扣。`, boxOffYes: (o) => `已裝滿，罐子享 ${o}% 折扣。`,
    boxN: (n) => (n === 6 ? '六入禮盒' : `禮盒 · ${n} 罐`), boxesN: (n) => `${n} 盒`,
    boxAdd: '禮盒加入購物袋', boxSurprise: '幫我隨機選', boxClear: '清除', boxHint: '點禮盒裡的罐子即可移除。', empty: '空位',
    storyEyebrow: '品牌故事', storyTitle: '一口甜點，剛剛好',
    story1: 'OKA 從一個簡單的想法開始：一份剛剛好的小甜點，就能讓一個下午變得不一樣。',
    story2: '我們在台南小量製作，每一罐都親手層層填裝進 220g 小罐，新鮮封罐後低溫寄出。沒有門市，只有一間廚房和很多罐子。',
    returnTitle: '罐子的第二人生', returnBody: '我們使用輕巧耐用的塑膠罐，運送更安心。吃完別急著丟，追蹤我們的 Instagram，看看罐子還能怎麼再利用。',
    howEyebrow: '流程', howTitle: '訂購方式',
    s1t: '選擇', s1p: '單罐選購，或組一盒禮盒。', s2t: '結帳', s2p: '用 LINE 登入，填寫地址並選擇出貨日。',
    s3t: '匯款', s3p: '銀行轉帳後，填寫帳號後五碼。', s4t: '確認', s4p: '我們核對匯款後會在 LINE 通知你。',
    s5t: '出貨', s5p: '在你選的日期從台南低溫寄出。',
    shipH: '運費', ship1: (f, a) => `訂單未滿 ${a}，運費 <strong>${f}</strong>`, ship2: (a) => `訂單滿 ${a} <strong>免運</strong>`, ship3: '全台低溫宅配',
    daysH: '出貨日', days1: '週一至週五出貨', days2: '結帳時選擇出貨日期', days3: '出貨後會在 LINE 通知你',
    payH: '付款', pay1: '僅接受銀行轉帳', pay2: '匯款後填寫帳號後五碼', pay3: '確認付款後開始準備',
    revEyebrow: '顧客回饋', revTitle: '一罐接一罐的喜歡', revSummary: (r, n) => `★ ${r} 平均，共 ${n} 則評價`,
    footTag: '台南製作 · 全台寄送', contactH: '聯絡我們', copy: '複製', copied: '已複製', infoH: '購買須知',
    info1: '週一至週五出貨', info2: '僅接受銀行轉帳', info3: (a) => `滿 ${a} 免運`, privacyLink: '隱私權政策',
    yourBag: '購物袋', checkout: '結帳', payT: '付款', myOrders: '我的訂單', login: '登入', bagEmpty: '購物袋是空的。', browse: '去逛逛口味',
    subtotal: '小計', shipping: '運費', free: '免運', total: '總計', toCheckout: '前往結帳', back: '回到購物袋',
    freeLeft: (a) => `再買 ${a} 即可免運。`, freeYes: '已達免運門檻。', remove: '移除', unavailable: '已停售',
    loginT: '登入後結帳', loginP: '我們透過 LINE 傳送訂單確認、匯款確認與出貨通知，不需要密碼。', loginBtn: '用 LINE 登入',
    loginOff: '線上訂購尚未開放，請先在 LINE @637xgnpi 下單。', logout: '登出', loggedAs: (n) => `已登入：${n}`,
    addFriend: '請加 OKA 為 LINE 好友，我們才能傳送訂單通知。', addFriendBtn: '加入好友',
    name: '姓名', phone: '手機號碼', email: '電子郵件（選填）', city: '縣市', addr: '地址', shipDate: '出貨日', noteL: '備註（選填）', full: '已滿',
    place: '送出訂單', placing: '訂單送出中…', errPhone: '請輸入台灣手機號碼，例如 0912 345 678。', errReq: '請填寫此欄位。', errEmail: '請確認電子郵件格式。',
    noteShip: '我們會在你選的日期出貨。低溫宅配通常隔天送達，實際時間由物流決定。',
    noDates: '目前沒有可選的出貨日，請稍後再來看看，或在 LINE 聯絡我們。',
    priceChanged: '價格或菜單有更新，購物袋已重新計算，請再確認一次。',
    orderNo: '訂單編號', transferTo: '請匯款此金額至', bankName: '銀行', bankCode: '銀行代碼', account: '帳號', accountName: '戶名',
    bankMissing: '我們會在 LINE 傳送匯款帳戶給你。', last5L: '匯款帳號後五碼', last5Hint: '用來核對你的匯款與訂單。',
    errLast5: '請輸入 5 位數字。', report: '我已完成匯款', later: '稍後再匯款', reported: '謝謝！我們核對匯款後會在 LINE 通知你。', fixDigits: '填錯了？重新填寫',
    orLine: '有任何問題，歡迎在 LINE @637xgnpi 詢問。', noOrders: '目前還沒有訂單。', reportNow: '填寫後五碼', ships: '出貨', tracking: '物流單號',
    l5: '帳號後五碼', st_awaiting: '待付款', st_reported: '已回報匯款', st_paid: '已付款', st_shipped: '已出貨', st_cancelled: '已取消',
    added: (n) => `已將 ${n} 加入購物袋`, boxAdded: (n) => `已將 ${n} 盒禮盒加入購物袋`,
    loginCancelled: '已取消 LINE 登入。', loginFailed: 'LINE 登入失敗，請再試一次。', loginExpired: '登入逾時，請再試一次。',
    loading: '載入中…', retry: '發生錯誤，請再試一次。',
    share: '分享 OKA 給朋友', shareTitle: '分享 OKA', shareLine: '用 LINE 傳送', shareFb: '分享到 Facebook', shareCopy: '複製連結', shareCopied: '已複製連結',
    shareText: 'OKA 小小起司蛋糕：台南手作，一罐一罐低溫寄送到全台灣 🫙', shareAfter: '有朋友也會喜歡嗎？分享給他們',
  },
};

// ---------- state ----------
let lang = store.get('oka-lang', (navigator.language || '').startsWith('zh') ? 'zh' : 'en');
if (!T[lang]) lang = 'en';
let cart = store.get('oka-cart', []);
if (!Array.isArray(cart)) cart = [];
let products = [], settings = null, shipDates = [], me = null, loginMode = 'off', loaded = false;
let box = [], boxQty = 1, qtys = {}, view = 'bag', payNo = null, orders = null, bank = null, busy = false, payEdit = false;

const t = (k) => T[lang][k] ?? T.en[k];
const P = (id) => products.find((p) => p.id === id);
const avail = (id) => P(id)?.status === 'available';
const pname = (p) => (p ? (lang === 'zh' ? p.zh : p.en) : '?');
const toast = toaster($('#toast'));
const saveCart = () => store.set('oka-cart', cart);
const friendUrl = () => `https://line.me/R/ti/p/${encodeURIComponent(settings?.lineOa || '@637xgnpi')}`;

// ---------- shop sections ----------
function applyI18n() {
  document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en';
  document.querySelectorAll('[data-t]').forEach((el) => {
    const v = t(el.dataset.t);
    if (typeof v !== 'string') return;
    if (el.hasAttribute('data-html')) el.innerHTML = v; else el.textContent = v;
  });
  document.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.lang === lang));
  const s = settings || { shipFee: 220, freeAt: 2000, boxOff: 10, boxFee: 50 };
  const a = products.filter((p) => p.status === 'available').length, so = products.filter((p) => p.status === 'soon').length;
  $('#factFlavors').textContent = a || '–';
  $('#factFlavorsLbl').textContent = t('flavorsLbl')(a, so);
  $('#factShipFee').textContent = money(s.shipFee);
  $('#factShipLbl').textContent = t('factShipL')(money(s.freeAt));
  $('#ship1').innerHTML = t('ship1')(money(s.shipFee), money(s.freeAt));
  $('#ship2').innerHTML = t('ship2')(money(s.freeAt));
  $('#info3').textContent = t('info3')(money(s.freeAt));
  $('#boxEyebrow').textContent = t('boxEyebrow')(s.boxOff);
  $('#boxLede').textContent = t('boxLede')(s.boxOff, money(s.boxFee));
  $('#year').textContent = new Date().getFullYear();
  const ab = $('#acctbtn'), pic = $('#acctpic');
  ab.classList.toggle('in', !!me);
  ab.setAttribute('aria-label', me ? t('myOrders') : t('loginBtn'));
  pic.hidden = !(me && me.picture);
  if (me?.picture) pic.src = me.picture;
  const ini = $('#acctinit');
  ini.hidden = !(me && !me.picture);
  ini.textContent = (me?.name || '?').trim().charAt(0).toUpperCase();
}
function renderShelf() {
  const sh = $('#shelf');
  sh.querySelectorAll('.jar').forEach((j) => j.remove());
  const pick = ['lemon', 'berry', 'chocolate'].map(P).filter(Boolean);
  (pick.length === 3 ? pick : products.slice(0, 3)).forEach((p) => sh.insertAdjacentHTML('beforeend', jar(p)));
}
function renderFlavors() {
  const g = $('#flavorGrid'), note = $('#menuNote');
  if (!loaded) { g.innerHTML = `<p class="muted"><span class="loading"></span> ${t('menuLoading')}</p>`; return; }
  note.hidden = true;
  g.innerHTML = products.map((p) => {
    const soon = p.status !== 'available', q = qtys[p.id] || 1;
    return `<article class="card${soon ? ' soon' : ''}">
      <div class="art${p.photo ? ' has-photo' : ''}">${soon ? `<span class="tag">${t('soonTag')}</span>` : ''}${art(p, pname(p))}</div>
      <div class="row"><div><h3>${esc(pname(p))}</h3><div class="zhname">${esc(lang === 'zh' ? p.en : p.zh)}</div></div><span class="price num">${money(p.price)}</span></div>
      <p class="desc">${esc(lang === 'zh' ? p.dzh || p.den : p.den || p.dzh)}</p>
      ${soon ? `<button type="button" class="btn ghost" disabled>${t('soon')}</button>`
    : `<div class="addrow"><div class="stepper"><button type="button" aria-label="−" data-q="${esc(p.id)}" data-d="-1">−</button><span class="num" id="q-${esc(p.id)}">${q}</span><button type="button" aria-label="+" data-q="${esc(p.id)}" data-d="1">+</button></div>
       <button type="button" class="btn solid" data-add="${esc(p.id)}">${t('add')}</button></div>`}
    </article>`;
  }).join('');
}
const bPrice = (ids) => boxPrice(ids.map((i) => P(i)?.price || 0), settings);
function renderBox() {
  if (!settings) return;
  box = box.filter(avail);
  $('#boxviz').innerHTML = [...Array(BOX_SIZE)].map((_, i) => {
    const id = box[i];
    if (!id) return `<div class="slot">${t('empty')}</div>`;
    const p = P(id);
    return `<button type="button" class="slot filled" data-rm="${i}" aria-label="${t('remove')} ${esc(pname(p))}"><span class="x" aria-hidden="true">×</span>${jar(p)}<span class="lbl">${esc(pname(p))}</span></button>`;
  }).join('');
  $('#picker').innerHTML = products.filter((p) => p.status === 'available').map((p) => `<button type="button" class="chip" data-pick="${esc(p.id)}" ${box.length >= BOX_SIZE ? 'disabled' : ''}><i style="background:${esc(p.color)}"></i>${esc(pname(p))}</button>`).join('');
  $('#boxProgress').textContent = `${box.length} / ${BOX_SIZE}`;
  $('#boxMeter').style.width = (box.length / BOX_SIZE) * 100 + '%';
  const s = settings, jars = box.reduce((a, i) => a + P(i).price, 0), full = box.length === BOX_SIZE;
  const ba = $('#boxAdd');
  ba.disabled = !box.length;
  ba.textContent = t('boxAdd');
  $('#boxQty').textContent = boxQty;
  $('#boxBarCount').textContent = `${box.length} / ${BOX_SIZE}` + (boxQty > 1 ? ` · ${t('boxesN')(boxQty)}` : '');
  $('#boxPrice').textContent = box.length ? money(bPrice(box)) : `−${s.boxOff}%`;
  $('#boxBarPrice').textContent = box.length ? money(bPrice(box) * boxQty) : '';
  $('#boxBreak').textContent = !box.length ? t('boxRule')(s.boxOff, money(s.boxFee))
    : full ? t('boxBreak')(money(jars), s.boxOff, money(jars - Math.round(jars * (1 - s.boxOff / 100))), money(s.boxFee))
      : t('boxBreakPart')(money(jars), money(s.boxFee));
  $('#boxOffHint').textContent = !box.length ? '' : full ? t('boxOffYes')(s.boxOff) : t('boxMoreOff')(BOX_SIZE - box.length, s.boxOff);
}
function renderReviews() {
  const list = REVIEWS.filter((r) => avail(r.f));
  $('#reviews').hidden = !list.length;
  if (!list.length) return;
  const avg = (list.reduce((s, r) => s + r.stars, 0) / list.length).toFixed(1);
  $('#revSummary').textContent = t('revSummary')(avg, list.length);
  $('#reviewList').innerHTML = list.map((r) => `<figure class="review" style="margin:0"><div class="stars" aria-label="${r.stars}/5">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</div><blockquote>${esc(r.text)}</blockquote><cite>${esc(r.name)} <span>· ${esc(pname(P(r.f)))}</span></cite></figure>`).join('');
}

// ---------- bag ----------
const lineOk = (l) => (l.type === 'box' ? l.items.length && l.items.every(avail) : avail(l.id));
const lineTotal = (l) => (!lineOk(l) ? 0 : l.type === 'box' ? bPrice(l.items) * l.qty : P(l.id).price * l.qty);
function totals() {
  const sub = cart.reduce((a, l) => a + lineTotal(l), 0);
  const ship = settings ? shippingFee(sub, settings) : 0;
  return { sub, ship, total: sub + ship, jars: cart.filter(lineOk).reduce((a, l) => a + (l.type === 'box' ? l.items.length : 1) * l.qty, 0) };
}
function addJar(id, q) {
  if (!avail(id)) return;
  const l = cart.find((x) => x.key === id);
  if (l) l.qty += q; else cart.push({ key: id, type: 'jar', id, qty: q });
  saveCart(); renderBag(); toast(t('added')(`${q} × ${pname(P(id))}`)); bump();
}
function addBox() {
  if (!box.length || !box.every(avail)) return;
  const n = boxQty, items = [...box].sort(), key = 'box:' + items.join(',');
  const l = cart.find((x) => x.key === key);
  if (l) l.qty += n; else cart.push({ key, type: 'box', items, qty: n });
  saveCart(); box = []; boxQty = 1; renderBox(); renderBag(); toast(t('boxAdded')(n)); bump();
}
const bump = () => $('#bagcount').animate?.([{ transform: 'scale(1.4)' }, { transform: 'scale(1)' }], { duration: 300 });
function summarizeBox(items) {
  const c = {};
  items.forEach((i) => (c[i] = (c[i] || 0) + 1));
  return Object.entries(c).map(([id, n]) => `${pname(P(id))} ×${n}`).join(', ');
}
function sumsHtml() {
  const s = settings, { sub, ship, total } = totals();
  return `<div class="sum"><span>${t('subtotal')}</span><span class="num">${money(sub)}</span></div>
  <div class="sum"><span>${t('shipping')}</span><span class="num">${ship ? money(ship) : t('free')}</span></div>
  <div class="freebar">${sub >= s.freeAt ? t('freeYes') : t('freeLeft')(money(s.freeAt - sub))}</div>
  <div class="meter" aria-hidden="true"><b style="width:${Math.min(100, (sub / s.freeAt) * 100)}%;background:${sub >= s.freeAt ? 'var(--ok)' : 'var(--berry)'}"></b></div>
  <div class="sum total"><span>${t('total')}</span><span class="num">${money(total)}</span></div>`;
}
const friendBanner = () => (me && me.friend === false ? `<p class="banner friendbar"><span>${t('addFriend')}</span><a href="${friendUrl()}" target="_blank" rel="noopener">${t('addFriendBtn')} →</a></p>` : '');
const itemsText = (o) => o.items.map((i) => (i.type === 'box' ? `${t('boxN')(i.items.length)} ×${i.qty}` : `${lang === 'zh' ? i.zh : i.en} ×${i.qty}`)).join(' · ');
function field(n, type, label, val, attrs = '') {
  return `<div class="field"><label for="f-${n}">${label}</label><input id="f-${n}" name="${n}" type="${type}" value="${esc(val || '')}" ${attrs}><span class="err" id="e-${n}" hidden></span></div>`;
}

function renderBag() {
  $('#bagcount').textContent = cart.reduce((s, l) => s + l.qty, 0);
  const body = $('#dbody'), foot = $('#dfoot');
  $('#dtitle').textContent = { bag: t('yourBag'), login: t('login'), checkout: t('checkout'), pay: t('payT'), orders: t('myOrders') }[view];
  if (!settings) { body.innerHTML = `<p class="muted"><span class="loading"></span> ${t('loading')}</p>`; foot.innerHTML = ''; return; }

  if (view === 'login') {
    body.innerHTML = loginMode === 'off'
      ? `<div class="loginbox"><span class="logo" aria-hidden="true"></span><p>${t('loginOff')}</p></div>`
      : `<div class="loginbox"><span class="logo" aria-hidden="true"></span><h3 style="font-size:1.3rem">${t('loginT')}</h3><p class="muted">${t('loginP')}</p>
         <a class="linebtn" href="/auth/line?return=${encodeURIComponent(pendingReturn || '/#checkout')}">${LINE_ICON}${t('loginBtn')}</a></div>`;
    foot.innerHTML = `<button type="button" class="btn ghost" id="toBag">${t('back')}</button>`;
    return;
  }
  if (view === 'pay') return renderPay(body, foot);
  if (view === 'orders') return renderOrders(body, foot);

  const ordersLink = me ? `<p style="margin-bottom:10px"><button type="button" class="dlink" id="toOrders">${t('myOrders')}</button></p>` : '';
  if (!cart.length) {
    view = 'bag';
    body.innerHTML = ordersLink + `<div class="empty"><span class="logo" aria-hidden="true"></span><p>${t('bagEmpty')}</p><a class="btn ghost" href="#flavors" style="margin-top:16px" data-close>${t('browse')}</a></div>`;
    foot.innerHTML = '';
    return;
  }
  if (view === 'bag') {
    body.innerHTML = ordersLink + cart.map((l, i) => {
      const ok = lineOk(l), p = l.type === 'box' ? P(l.items[0]) : P(l.id);
      const title = l.type === 'box' ? t('boxN')(l.items.length) : pname(p);
      const sub = !ok ? t('unavailable') : l.type === 'box' ? summarizeBox(l.items) : `${money(p.price)} · 220g`;
      return `<div class="line" style="${ok ? '' : 'opacity:.55'}"><div class="thumb">${jar(p)}</div><div style="min-width:0"><h3>${esc(title)}</h3><small>${esc(sub)}</small></div>
      <div class="right"><span class="num" style="font-weight:700">${money(lineTotal(l))}</span><div class="stepper"><button type="button" data-lq="${i}" data-d="-1" aria-label="−">−</button><span class="num">${l.qty}</span><button type="button" data-lq="${i}" data-d="1" aria-label="+">+</button></div></div></div>`;
    }).join('');
    foot.innerHTML = sumsHtml() + `<button type="button" class="btn solid" id="toCo" ${totals().sub ? '' : 'disabled'}>${t('toCheckout')}</button>`;
    return;
  }
  // checkout
  const v = me?.profile || {}, { jars, total } = totals();
  const dates = shipDates.map((d, i) => {
    const full = d.left !== null && d.left < jars;
    return `<input type="radio" name="ship_date" id="d${i}" value="${d.date}" ${full ? 'disabled' : ''}><label for="d${i}" class="${full ? 'date-full' : ''}">${fmtDate(d.date, lang).replace(' ', '<br><span class="num">')}</span>${full ? `<br><small>${t('full')}</small>` : ''}</label>`;
  }).join('');
  body.innerHTML = `<form class="co" id="coForm" novalidate>
    <p class="muted" style="font-size:.85rem">${esc(t('loggedAs')(me.name))}</p>
    ${friendBanner()}
    ${field('name', 'text', t('name'), v.name || me.name, 'autocomplete="name" required')}
    ${field('phone', 'tel', t('phone'), v.phone, 'autocomplete="tel" inputmode="tel" placeholder="0912 345 678" required')}
    ${field('email', 'email', t('email'), v.email, 'autocomplete="email"')}
    <div class="two"><div class="field"><label for="f-city">${t('city')}</label><select id="f-city" name="city">${CITIES.map((c) => `<option ${c === (v.city || '台南市 Tainan') ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
    ${field('addr', 'text', t('addr'), v.addr, 'autocomplete="street-address" required')}</div>
    <div class="field"><span style="font-weight:700;font-size:.88rem">${t('shipDate')}</span>${shipDates.length ? `<div class="dates">${dates}</div>` : `<p class="banner">${t('noDates')}</p>`}<span class="err" id="e-ship_date" hidden></span></div>
    <p class="note">${t('noteShip')}</p>
    <div class="field"><label for="f-note">${t('noteL')}</label><textarea id="f-note" name="note" rows="2" maxlength="500"></textarea></div>
    <p class="err" id="e-order" hidden></p>
  </form>`;
  const first = body.querySelector('.dates input:not(:disabled)');
  if (first) first.checked = true;
  foot.innerHTML = sumsHtml() + `<button type="submit" form="coForm" class="btn solid" id="placeBtn" ${shipDates.length ? '' : 'disabled'}>${t('place')} · <span class="num">${money(total)}</span></button><button type="button" class="btn ghost" id="toBag">${t('back')}</button>`;
}

function renderPay(body, foot) {
  const o = orders?.find((x) => x.no === payNo);
  if (!o) { body.innerHTML = `<p class="muted"><span class="loading"></span> ${t('loading')}</p>`; foot.innerHTML = ''; return; }
  const b = bank || {};
  const bankHtml = b.account
    ? [['bankName', b.bankName], ['bankCode', b.bankCode], ['account', b.account], ['accountName', b.accountName]].filter((x) => x[1])
      .map(([k, val]) => `<div class="bankrow"><span>${t(k)}</span><b>${esc(val)}${k === 'account' ? ` <button type="button" class="copybtn" data-copy="${esc(val)}">${t('copy')}</button>` : ''}</b></div>`).join('')
    : `<p class="note">${t('bankMissing')}</p>`;
  const canReport = o.status === 'awaiting' || (o.status === 'reported' && payEdit);
  body.innerHTML = `<div style="text-align:left">
    ${friendBanner()}
    <p class="muted">${t('orderNo')}</p><p class="num" style="font-family:var(--f-display);font-weight:800;font-size:1.35rem">${esc(o.no)} <span class="pill ${o.status}" style="vertical-align:middle">${t('st_' + o.status)}</span></p>
    <div class="paybox"><p class="muted" style="font-size:.88rem">${t('transferTo')}</p><p class="num" style="font-family:var(--f-display);font-weight:800;font-size:1.8rem;margin-bottom:8px">${money(o.total)}</p>${bankHtml}</div>
    ${canReport ? `<form id="payForm" novalidate style="margin-top:18px" class="co">
      <div class="field"><label for="f-last5">${t('last5L')}</label><input id="f-last5" name="last5" class="last5" inputmode="numeric" maxlength="5" autocomplete="off" placeholder="•••••" aria-describedby="h-l5" value="${esc(payEdit ? o.last5 : '')}"><span class="muted" id="h-l5" style="font-size:.8rem">${t('last5Hint')}</span><span class="err" id="e-last5" hidden></span></div>
    </form>` : o.status === 'reported' ? `<p class="note" style="margin-top:16px">${t('reported')} ${t('l5')} <span class="l5">${esc(o.last5)}</span></p><p style="margin-top:8px"><button type="button" class="dlink" id="fixDigits">${t('fixDigits')}</button></p>` : ''}
    <p class="muted" style="font-size:.86rem;margin-top:14px">${t('orLine')}</p>
    <button type="button" class="sharebtn" data-share><span>${t('shareAfter')} →</span></button>
  </div>`;
  foot.innerHTML = canReport
    ? `<button type="submit" form="payForm" class="btn solid" id="reportBtn">${t('report')}</button><button type="button" class="btn ghost" id="payLater">${t('later')}</button>`
    : `<button type="button" class="btn solid" id="toOrders">${t('myOrders')}</button>`;
}

function renderOrders(body, foot) {
  foot.innerHTML = `<button type="button" class="btn ghost" id="toBag">${t('back')}</button><p class="muted" style="font-size:.82rem;text-align:center">${esc(t('loggedAs')(me?.name || ''))} · <button type="button" class="dlink" id="logout">${t('logout')}</button></p>`;
  if (!orders) { body.innerHTML = `<p class="muted"><span class="loading"></span> ${t('loading')}</p>`; return; }
  body.innerHTML = friendBanner() + (!orders.length ? `<div class="empty"><p>${t('noOrders')}</p></div>` : orders.map((o) => {
    const step = { awaiting: 1, reported: 2, paid: 3, shipped: 4, cancelled: 0 }[o.status];
    return `<div class="myorder"><div class="r"><strong class="num">${esc(o.no)}</strong><span class="pill ${o.status}">${t('st_' + o.status)}</span></div>
      <small>${esc(itemsText(o))}</small>
      <div class="r"><small>${t('ships')} ${esc(fmtDate(o.ship_date, lang))}${o.tracking_no ? ` · ${t('tracking')} ${esc(o.tracking_no)}` : ''}</small><strong class="num">${money(o.total)}</strong></div>
      ${o.status !== 'cancelled' ? `<div class="statusline" aria-hidden="true">${[1, 2, 3, 4].map((i) => `<i class="${i <= step ? 'on' : ''}"></i>`).join('')}</div>` : ''}
      ${o.status === 'awaiting' ? `<button type="button" class="btn solid" style="padding:8px 14px;font-size:.9rem" data-pay="${esc(o.no)}">${t('reportNow')}</button>` : ''}
    </div>`;
  }).join(''));
}

// ---------- actions ----------
let pendingReturn = null;
async function loadOrders() {
  try { const r = await api('/api/orders'); orders = r.orders; bank = r.bank; } catch (e) {
    if (e.status === 401) { me = null; pendingReturn = '/#orders'; view = 'login'; } else toast(t('retry'));
  }
  renderBag();
}
function go(v) {
  view = v;
  if ((v === 'checkout' || v === 'orders') && !me) { pendingReturn = v === 'orders' ? '/#orders' : '/#checkout'; view = 'login'; }
  if (view === 'orders') { orders = null; loadOrders(); }
  renderBag();
  $('#dbody').scrollTop = 0;
}
async function placeOrder(form) {
  if (busy) return;
  const fd = new FormData(form), g = (n) => String(fd.get(n) || '').trim();
  let ok = true;
  const chk = (n, bad, msg) => { const el = $('#e-' + n); if (!el) return; el.textContent = msg; el.hidden = !bad; if (bad) ok = false; };
  chk('name', !g('name'), t('errReq'));
  chk('phone', !/^09\d{8}$/.test(g('phone').replace(/[\s-]/g, '')), t('errPhone'));
  chk('email', g('email') && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(g('email')), t('errEmail'));
  chk('addr', !g('addr'), t('errReq'));
  chk('ship_date', !g('ship_date'), t('errReq'));
  if (!ok) { form.querySelector('.err:not([hidden])')?.parentElement.querySelector('input,select')?.focus(); return; }
  const { total } = totals();
  const items = cart.filter(lineOk).map((l) => (l.type === 'box' ? { type: 'box', items: l.items, qty: l.qty } : { type: 'jar', id: l.id, qty: l.qty }));
  const btn = $('#placeBtn');
  busy = true; btn.disabled = true; btn.textContent = t('placing');
  try {
    const r = await api('/api/orders', { method: 'POST', body: { items, name: g('name'), phone: g('phone'), email: g('email'), city: g('city'), addr: g('addr'), ship_date: g('ship_date'), note: g('note'), lang, expectedTotal: total } });
    cart = []; saveCart();
    orders = [r.order, ...(orders || [])]; bank = r.bank; payNo = r.order.no; view = 'pay'; payEdit = false;
    me.profile = { name: g('name'), phone: g('phone'), email: g('email'), city: g('city'), addr: g('addr') };
    renderBag(); $('#dbody').scrollTop = 0;
    loadShop(); // refresh ship-date availability
  } catch (e) {
    if (e.status === 401) { me = null; pendingReturn = '/#checkout'; view = 'login'; renderBag(); return; }
    if (e.code === 'price_changed' || e.code === 'unavailable') { await loadShop(); view = 'bag'; renderBag(); toast(t('priceChanged')); return; }
    if (e.code === 'ship_date') await loadShop();
    const el = $('#e-order'); if (el) { el.textContent = e.message; el.hidden = false; }
    btn.disabled = false; btn.innerHTML = `${t('place')} · <span class="num">${money(totals().total)}</span>`;
  } finally { busy = false; }
}
async function reportPayment(form) {
  if (busy) return;
  const v = String(new FormData(form).get('last5') || '').trim(), el = $('#e-last5');
  if (!/^\d{5}$/.test(v)) { el.textContent = t('errLast5'); el.hidden = false; $('#f-last5').focus(); return; }
  busy = true; $('#reportBtn').disabled = true;
  try {
    const r = await api(`/api/orders/${encodeURIComponent(payNo)}/payment`, { method: 'POST', body: { last5: v } });
    orders = orders.map((o) => (o.no === payNo ? r.order : o)); payEdit = false;
    renderBag(); toast(t('reported'));
  } catch (e) { el.textContent = e.message; el.hidden = false; $('#reportBtn').disabled = false; } finally { busy = false; }
}
async function openOrder(no) {
  if (!me) { pendingReturn = `/#order-${no}`; view = 'login'; renderBag(); openBag(); return; }
  payNo = no; view = 'pay'; payEdit = false; openBag();
  if (!orders?.find((o) => o.no === no)) {
    renderBag();
    try { const r = await api(`/api/orders/${encodeURIComponent(no)}`); orders = [r.order, ...(orders || []).filter((o) => o.no !== no)]; bank = r.bank; } catch { view = 'orders'; return go('orders'); }
  }
  renderBag();
}

// ---------- drawer, events ----------
function openBag() { $('#drawer').classList.add('on'); $('#drawer').setAttribute('aria-hidden', 'false'); $('#scrim').classList.add('on'); $('#dclose').focus(); }
function closeBag() { $('#drawer').classList.remove('on'); $('#drawer').setAttribute('aria-hidden', 'true'); $('#scrim').classList.remove('on'); if (view !== 'checkout') view = 'bag'; renderBag(); }
function selectText(el) { if (!el) return; const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }

document.addEventListener('click', async (e) => {
  const b = e.target.closest('button,a');
  if (!b) return;
  const d = b.dataset;
  if (d.lang) { lang = d.lang; store.set('oka-lang', lang); renderAll(); return; }
  if (d.q) { qtys[d.q] = Math.max(1, Math.min(20, (qtys[d.q] || 1) + Number(d.d))); $('#q-' + CSS.escape(d.q)).textContent = qtys[d.q]; return; }
  if (d.add) { addJar(d.add, qtys[d.add] || 1); qtys[d.add] = 1; $('#q-' + CSS.escape(d.add)).textContent = 1; return; }
  if (d.pick) {
    if (box.length < BOX_SIZE && avail(d.pick)) {
      box.push(d.pick); renderBox();
      if (box.length === BOX_SIZE) { $('.boxbar').scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); $('#boxAdd').focus({ preventScroll: true }); }
    }
    return;
  }
  if (d.rm) { box.splice(Number(d.rm), 1); renderBox(); return; }
  if (d.lq) { const l = cart[Number(d.lq)]; l.qty += Number(d.d); if (l.qty < 1) cart.splice(Number(d.lq), 1); saveCart(); renderBag(); return; }
  if (d.pay) { payNo = d.pay; payEdit = false; view = 'pay'; renderBag(); return; }
  if (d.copy) {
    const okFn = () => { const o = b.textContent; b.textContent = t('copied'); setTimeout(() => (b.textContent = o), 1500); };
    try { navigator.clipboard.writeText(d.copy).then(okFn, () => selectText(b.previousElementSibling || b.parentElement)); } catch { selectText(b.previousElementSibling || b.parentElement); }
    return;
  }
  if (b.hasAttribute('data-close')) { closeBag(); return; }
  if (b.hasAttribute('data-share')) { share(); return; }
  switch (b.id) {
    case 'bagbtn': if (view !== 'checkout') view = 'bag'; renderBag(); openBag(); break;
    case 'acctbtn': if (me) { go('orders'); openBag(); } else if (loginMode === 'off') toast(t('loginOff')); else location.href = '/auth/line?return=' + encodeURIComponent('/#orders'); break;
    case 'dclose': closeBag(); break;
    case 'shareClose': closeShare(); break;
    case 'shareCopy': copyShare(); break;
    case 'boxAdd': addBox(); break;
    case 'boxClear': box = []; boxQty = 1; renderBox(); break;
    case 'boxQtyMinus': boxQty = Math.max(1, boxQty - 1); renderBox(); break;
    case 'boxQtyPlus': boxQty = Math.min(20, boxQty + 1); renderBox(); break;
    case 'boxSurprise': { const av = products.filter((p) => p.status === 'available').map((p) => p.id); if (!av.length) break; while (box.length < BOX_SIZE) box.push(av[Math.floor(Math.random() * av.length)]); renderBox(); break; }
    case 'toCo': go('checkout'); break;
    case 'toBag': go('bag'); break;
    case 'toOrders': go('orders'); break;
    case 'payLater': go('orders'); break;
    case 'fixDigits': payEdit = true; renderBag(); break;
    case 'logout': await api('/api/logout', { method: 'POST' }).catch(() => {}); me = null; orders = null; view = 'bag'; renderAll(); break;
  }
});
document.addEventListener('input', (e) => { if (e.target.id === 'f-last5') e.target.value = e.target.value.replace(/\D/g, '').slice(0, 5); });
$('#scrim').addEventListener('click', closeBag);
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!$('#shareSheet').hidden) closeShare(); else if ($('#drawer').classList.contains('on')) closeBag();
});
$('#shareSheet').addEventListener('click', (e) => { if (e.target.id === 'shareSheet') closeShare(); });

// ---------- share ----------
const shopUrl = () => location.origin + '/';
let shareOpener = null;
async function share() {
  const url = shopUrl(), text = t('shareText');
  // Phones: the system share menu (LINE, Instagram, WhatsApp…). Elsewhere: our own small menu.
  if (navigator.share && matchMedia('(pointer: coarse)').matches) {
    try { await navigator.share({ title: 'OKA', text, url }); return; } catch (e) { if (e?.name === 'AbortError') return; }
  }
  $('#shareText').textContent = text;
  $('#shareUrl').textContent = url;
  $('#shareLine').href = 'https://line.me/R/share?text=' + encodeURIComponent(`${text}\n${url}`);
  $('#shareFb').href = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url);
  shareOpener = document.activeElement;
  $('#shareSheet').hidden = false;
  $('#shareClose').focus();
}
function closeShare() { $('#shareSheet').hidden = true; shareOpener?.focus?.(); }
async function copyShare() {
  try { await navigator.clipboard.writeText(shopUrl()); toast(t('shareCopied')); closeShare(); } catch { selectText($('#shareUrl')); }
}
document.addEventListener('submit', (e) => {
  e.preventDefault();
  if (e.target.id === 'coForm') placeOrder(e.target);
  if (e.target.id === 'payForm') reportPayment(e.target);
});

function renderShop() { applyI18n(); renderShelf(); renderFlavors(); renderBox(); renderReviews(); }
function renderAll() { renderShop(); renderBag(); }

async function loadShop() {
  try {
    const r = await api('/api/shop');
    products = r.products; settings = r.settings; shipDates = r.shipDates; me = r.me; loginMode = r.login; loaded = true;
    cart = cart.filter((l) => (l.type === 'box' ? l.items.every((i) => P(i)) : P(l.id))); saveCart();
    renderAll();
  } catch {
    if (!loaded) { const n = $('#menuNote'); n.textContent = t('menuError'); n.hidden = false; $('#flavorGrid').innerHTML = ''; }
  }
}

function handleHash() {
  const h = location.hash;
  if (h === '#checkout' && cart.length) { history.replaceState(null, '', location.pathname); go('checkout'); openBag(); }
  else if (h === '#orders') { history.replaceState(null, '', location.pathname); go('orders'); openBag(); }
  else if (h.startsWith('#order-')) { const no = decodeURIComponent(h.slice(7)); history.replaceState(null, '', location.pathname); openOrder(no); }
}

renderAll();
await loadShop();
const login = new URLSearchParams(location.search).get('login');
if (login) { toast(t({ cancelled: 'loginCancelled', failed: 'loginFailed', expired: 'loginExpired' }[login] || 'loginFailed')); history.replaceState(null, '', location.pathname + location.hash); }
handleHash();
window.addEventListener('hashchange', handleHash);
