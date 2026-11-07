// Small helpers shared by the shop and the admin pages.
export const $ = (s, el = document) => el.querySelector(s);
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const money = (n) => 'NT$' + Math.round(n).toLocaleString('en-US');
export const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
};

/** fetch JSON from our API. Throws an Error with .status, .code and a readable message. */
export async function api(path, { method = 'GET', body, raw, type } = {}) {
  const res = await fetch(path, {
    method, credentials: 'same-origin',
    headers: raw ? { 'Content-Type': type } : body !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  let data = {};
  try { data = await res.json(); } catch { /* empty */ }
  if (!res.ok) { const e = new Error(data.error || `Request failed (${res.status})`); e.status = res.status; e.code = data.code; throw e; }
  return data;
}

const DOW = { en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], zh: ['週日', '週一', '週二', '週三', '週四', '週五', '週六'] };
export const dow = (date, lang) => DOW[lang][new Date(date + 'T00:00:00Z').getUTCDay()];
export const fmtDate = (date, lang) => { if (!date) return ''; const [, m, d] = date.split('-').map(Number); return `${dow(date, lang)} ${m}/${d}`; };
export const fmtTime = (ms) => { const d = new Date(ms); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

let jid = 0;
/** Line-art jar in the style of the logo, coloured by the product's topping. */
export function jar(p, label = '') {
  p ||= { color: '#ddd', deco: 'plain' };
  const id = 'j' + (++jid);
  const deco = {
    vanilla: '<g fill="#2b2b2b">' + [[40, 57], [55, 55], [70, 58], [83, 56], [62, 60]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.3"/>`).join('') + '</g>',
    shave: '<g fill="#3d2418">' + [[38, 52, 10], [58, 50, 12], [78, 53, 9]].map(([x, y, w]) => `<rect x="${x}" y="${y}" width="${w}" height="3.5" rx="1.7"/>`).join('') + '</g>',
    berries: '<g stroke="var(--ink)" stroke-width="1.6">' + [[44, 50, '#2F4C9A'], [56, 47, '#5A2448'], [68, 51, '#2F4C9A'], [80, 48, '#B4304A']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="5.5" fill="${c}"/>`).join('') + '</g>',
    lemon: '<g stroke="var(--ink)" stroke-width="1.6"><path d="M48 54a14 14 0 0 1 28 0z" fill="#FBEA8C"/><path d="M62 54v-12M62 54l-9-8M62 54l9-8" fill="none"/></g>',
    crumbs: '<g fill="#7E4A22">' + [[36, 52], [46, 50], [57, 53], [66, 49], [76, 52], [84, 50], [52, 55], [71, 55]].map(([x, y]) => `<rect x="${x}" y="${y}" width="5" height="4" rx="1" transform="rotate(${(x * 7) % 40 - 20} ${x} ${y})"/>`).join('') + '</g>',
    salt: '<g fill="#fff" stroke="var(--ink)" stroke-width=".8">' + [[42, 53], [56, 51], [69, 54], [80, 52], [62, 57]].map(([x, y]) => `<rect x="${x}" y="${y}" width="3.4" height="3.4"/>`).join('') + '</g>',
    sesame: '<g fill="#EDE6D6">' + [[40, 55], [50, 52], [60, 56], [70, 52], [80, 55], [56, 58], [74, 58]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2.2" ry="1.2"/>`).join('') + '</g>',
    straw: '<g stroke="var(--ink)" stroke-width="1.6">' + [[48, 48], [70, 47]].map(([x, y]) => `<path d="M${x - 7} ${y} q7 16 14 0 q-7-5-14 0z" fill="#E8435A"/><path d="M${x - 3} ${y - 2} l3 -4 l3 4" fill="#4E8A3E"/>`).join('') + '</g>',
  }[p.deco] || '';
  const color = /^#[0-9a-fA-F]{3,8}$/.test(p.color || '') ? p.color : '#F4E2AE';
  return `<svg class="jar" viewBox="0 0 124 156" role="img" aria-label="${esc(label)}">
<defs><clipPath id="${id}"><rect x="23" y="37" width="78" height="104" rx="13"/></clipPath></defs>
<rect x="18" y="32" width="88" height="114" rx="17" fill="var(--glass)"/>
<g clip-path="url(#${id})">
 <rect x="20" y="114" width="84" height="30" fill="#D9A864"/>
 <g fill="#A8732F">${[30, 44, 58, 72, 86, 38, 64, 92].map((x, i) => `<circle cx="${x}" cy="${122 + (i % 3) * 6}" r="1.6"/>`).join('')}</g>
 <rect x="20" y="60" width="84" height="56" fill="#FFF5DC"/>
 <path d="M20 60 q10-6 21 0 t21 0 t21 0 t21 0 v-18 h-84z" fill="${color}"/>
 <path d="M20 60 q10-6 21 0 t21 0 t21 0 t21 0" fill="none" stroke="var(--ink)" stroke-width="1.4" opacity=".55"/>
 <path d="M20 114 q12 4 24 0 t24 0 t24 0 t12 1" fill="none" stroke="var(--ink)" stroke-width="1.4" opacity=".55"/>
 ${deco}
</g>
<rect x="18" y="32" width="88" height="114" rx="17" fill="none" stroke="var(--ink)" stroke-width="2.6"/>
<path d="M30 52v66" stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity=".55"/>
<rect x="24" y="24" width="76" height="10" rx="3" fill="var(--card)" stroke="var(--ink)" stroke-width="2.6"/>
<rect x="30" y="8" width="64" height="17" rx="5" fill="var(--card)" stroke="var(--ink)" stroke-width="2.6"/>
<path d="M38 13v7M46 13v7M54 13v7M62 13v7M70 13v7M78 13v7M86 13v7" stroke="var(--ink)" stroke-width="1.3" opacity=".5"/>
</svg>`;
}
/** Product photo if there is one, otherwise the illustrated jar. */
export const art = (p, label) => (p?.photo ? `<img class="photo" src="${esc(p.photo)}" alt="${esc(label)}" loading="lazy">` : jar(p, label));

export function toaster(el) {
  let t;
  return (msg) => { el.textContent = msg; el.classList.add('on'); clearTimeout(t); t = setTimeout(() => el.classList.remove('on'), 2600); };
}
export const LINE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.5C6.5 2.5 2 6.1 2 10.6c0 4 3.6 7.4 8.4 8 .3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.5 1.1-.5 5.9-3.5 8-6 1.5-1.6 2-3.2 2-4.9 0-4.5-4.5-8.1-10.1-8.1zM8.3 13.2H6.4c-.3 0-.5-.2-.5-.5V8.9c0-.3.2-.5.5-.5s.5.2.5.5v3.3h1.4c.3 0 .5.2.5.5s-.2.5-.5.5zm1.9-.5c0 .3-.2.5-.5.5s-.5-.2-.5-.5V8.9c0-.3.2-.5.5-.5s.5.2.5.5v3.8zm4.6 0c0 .2-.1.4-.3.5h-.2c-.2 0-.3-.1-.4-.2l-1.9-2.6v2.3c0 .3-.2.5-.5.5s-.5-.2-.5-.5V8.9c0-.2.1-.4.3-.5h.2c.2 0 .3.1.4.2l1.9 2.6V8.9c0-.3.2-.5.5-.5s.5.2.5.5v3.8zm3.1-2.4c.3 0 .5.2.5.5s-.2.5-.5.5h-1.4v.9h1.4c.3 0 .5.2.5.5s-.2.5-.5.5h-1.9c-.3 0-.5-.2-.5-.5V8.9c0-.3.2-.5.5-.5h1.9c.3 0 .5.2.5.5s-.2.5-.5.5h-1.4v.9h1.4z"/></svg>';
