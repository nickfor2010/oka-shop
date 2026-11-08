// Day / night / auto. Loaded in <head> so the saved choice applies before the page is drawn,
// then any [data-theme-set] button switches it. "auto" follows the phone or computer setting.
(function () {
  var KEY = 'oka-theme', root = document.documentElement;
  function saved() { try { var v = localStorage.getItem(KEY); return v === 'light' || v === 'dark' ? v : 'auto'; } catch (e) { return 'auto'; } }
  function apply(mode) {
    if (mode === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', mode);
    var btns = document.querySelectorAll('[data-theme-set]');
    for (var i = 0; i < btns.length; i++) btns[i].setAttribute('aria-pressed', String(btns[i].getAttribute('data-theme-set') === mode));
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta && document.body) meta.setAttribute('content', getComputedStyle(document.body).backgroundColor);
  }
  apply(saved());
  document.addEventListener('DOMContentLoaded', function () { apply(saved()); });
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-theme-set]');
    if (!b) return;
    var mode = b.getAttribute('data-theme-set');
    try { if (mode === 'auto') localStorage.removeItem(KEY); else localStorage.setItem(KEY, mode); } catch (er) { /* private mode: still switches for this visit */ }
    apply(mode);
  });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onChange = function () { apply(saved()); };
    if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange);
  }
})();
