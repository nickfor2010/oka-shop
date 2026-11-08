// Texts of the LINE messages the shop sends. Customers get them in the language they ordered in.

const nt = (n) => 'NT$' + Math.round(n).toLocaleString('en-US');
const DOW = { en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], zh: ['日', '一', '二', '三', '四', '五', '六'] };
export function shipDay(date, lang) {
  const [, m, d] = date.split('-').map(Number);
  const wd = new Date(date + 'T00:00:00Z').getUTCDay();
  return lang === 'zh' ? `${m}/${d}（週${DOW.zh[wd]}）` : `${DOW.en[wd]} ${m}/${d}`;
}
export function itemsText(o, lang) {
  return o.items.map((i) => {
    if (i.type === 'jar') return `${lang === 'zh' ? i.zh : i.en} ×${i.qty}`;
    const n = i.items.length;
    const label = lang === 'zh' ? (n === 6 ? '六入禮盒' : `禮盒 ${n} 罐`) : n === 6 ? 'Box of six' : `Gift box (${n} jars)`;
    return `${label} ×${i.qty}`;
  }).join(lang === 'zh' ? '、' : ', ');
}
function bankLines(s, lang) {
  if (!s.account) return lang === 'zh' ? '匯款帳戶請洽 LINE 客服。' : 'Ask us here on LINE for the bank details.';
  const rows = lang === 'zh'
    ? [['銀行', s.bankName], ['代碼', s.bankCode], ['帳號', s.account], ['戶名', s.accountName]]
    : [['Bank', s.bankName], ['Code', s.bankCode], ['Account', s.account], ['Name', s.accountName]];
  return rows.filter((r) => r[1]).map(([k, v]) => `${k}: ${v}`).join('\n');
}

/** Message to the customer about their order. kind: placed | paid | shipped | cancelled */
export function orderMessage(kind, o, s, site) {
  const zh = o.lang === 'zh';
  const link = `${site}/#order-${o.no}`;
  switch (kind) {
    case 'placed':
      return zh
        ? `謝謝你的訂購！訂單 ${o.no} 已收到。\n\n${itemsText(o, 'zh')}\n總金額：${nt(o.total)}\n出貨日：${shipDay(o.ship_date, 'zh')}\n\n請匯款至：\n${bankLines(s, 'zh')}\n\n匯款後請填寫帳號後五碼：\n${link}`
        : `Thank you! We received order ${o.no}.\n\n${itemsText(o, 'en')}\nTotal: ${nt(o.total)}\nShips: ${shipDay(o.ship_date, 'en')}\n\nPlease transfer to:\n${bankLines(s, 'en')}\n\nAfter transferring, enter the last 5 digits of your account:\n${link}`;
    case 'paid':
      return zh
        ? `已確認收到 ${nt(o.total)}，謝謝！訂單 ${o.no} 會在 ${shipDay(o.ship_date, 'zh')} 從台南低溫寄出。`
        : `Payment of ${nt(o.total)} received, thank you! Order ${o.no} will leave Tainan chilled on ${shipDay(o.ship_date, 'en')}.`;
    case 'shipped':
      return zh
        ? `訂單 ${o.no} 已出貨！${o.tracking_no ? `\n物流單號：${o.tracking_no}` : ''}\n收到後請盡快冷藏。\n\n品嚐後歡迎留下評價，給我們一點鼓勵：\n${site}/#review-${o.no}`
        : `Order ${o.no} has shipped!${o.tracking_no ? `\nTracking number: ${o.tracking_no}` : ''}\nPlease refrigerate the jars as soon as they arrive.\n\nAfter tasting, we'd love a short review:\n${site}/#review-${o.no}`;
    case 'cancelled':
      return zh
        ? `訂單 ${o.no} 已取消。如有任何問題，請直接回覆這則訊息。`
        : `Order ${o.no} has been cancelled. If you have any questions, just reply to this message.`;
    default:
      return '';
  }
}

/** Alert to the shop team (always in Chinese with English labels kept short). kind: new | reported */
export function alertMessage(kind, o, extra = {}) {
  if (kind === 'review') return `⭐ 新評價待審核 New review to approve ${o.no}\n${'★'.repeat(extra.rating)}${'☆'.repeat(5 - extra.rating)} ${extra.name}\n「${String(extra.text).slice(0, 120)}」`;
  if (kind === 'new') return `🧾 新訂單 New order ${o.no}\n${o.name} · ${nt(o.total)}\n${itemsText(o, 'zh')}\n出貨 Ship ${shipDay(o.ship_date, 'zh')}`;
  if (kind === 'reported') return `💰 匯款回報 Transfer reported ${o.no}\n後五碼 Last 5: ${o.last5} · ${nt(o.total)}\n${o.name}`;
  return '';
}
