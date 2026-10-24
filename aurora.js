/* Artemis Aurora — Figma redesign v1 motion M2 (palette cycle), M6 (card pointer glow),
   M7 (section reveal), plus Pause motion, the footer palette picker, mobile menu and live status.
   No dependencies; the page is complete and readable without it. */
(function () {
  'use strict';
  var root = document.documentElement;
  var PALETTES = ['aurora', 'nebula', 'sunset', 'dusk'];
  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var store = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
                set: function (k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} } };
  var pinned = store.get('artemis-palette'); if (PALETTES.indexOf(pinned) < 0) pinned = null;
  var paused = store.get('artemis-motion') === 'paused';
  var idx = pinned ? PALETTES.indexOf(pinned) : 0;
  function apply() { root.setAttribute('data-palette', PALETTES[idx]); }
  apply();
  if (paused) root.setAttribute('data-motion', 'paused');

  // M2: hold 12 s, then a 4 s crossfade (the CSS transition on the registered colours) = one step every 16 s.
  var timer = null;
  function canCycle() { return !pinned && !paused && !reduce; }
  function start() { if (!timer && canCycle()) timer = setInterval(function () { if (!document.hidden) { idx = (idx + 1) % PALETTES.length; apply(); sync(); } }, 16000); }
  function stop() { clearInterval(timer); timer = null; }
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
  start();

  var sync = function () {};
  document.addEventListener('DOMContentLoaded', function () {
    root.classList.add('js');

    // Palette picker (footer) — or a single cycling button on pages without one.
    var picks = document.querySelectorAll('[data-pick]');
    if (!picks.length) {
      var pb = document.createElement('button');
      pb.type = 'button'; pb.className = 'aurora-palette'; pb.setAttribute('data-track', 'palette_cycle');
      pb.addEventListener('click', function () { stop(); idx = (idx + 1) % PALETTES.length; pinned = PALETTES[idx]; store.set('artemis-palette', pinned); apply(); sync(); });
      document.body.appendChild(pb);
      sync = function () { pb.setAttribute('aria-label', 'Colour palette: ' + PALETTES[idx] + '. Select for the next palette.'); pb.title = pb.getAttribute('aria-label'); };
    } else {
      picks.forEach(function (b) {
        b.addEventListener('click', function () {
          var p = b.getAttribute('data-pick');
          if (p === 'auto') { pinned = null; store.set('artemis-palette', null); start(); }
          else { stop(); pinned = p; idx = PALETTES.indexOf(p); store.set('artemis-palette', p); apply(); }
          sync();
        });
      });
      sync = function () { picks.forEach(function (b) { var p = b.getAttribute('data-pick'); b.setAttribute('aria-pressed', (p === 'auto' ? !pinned : pinned === p) ? 'true' : 'false'); }); };
    }
    sync();

    // Pause motion (WCAG 2.2.2)
    var mt = document.querySelectorAll('[data-motion-toggle]');
    function syncMotion() { mt.forEach(function (b) { b.setAttribute('aria-pressed', paused ? 'true' : 'false'); var l = b.querySelector('.l'); if (l) l.textContent = paused ? 'Play motion' : 'Pause motion'; var i = b.querySelector('.i'); if (i) i.textContent = paused ? '\u25B6' : '\u275A\u275A'; }); }
    mt.forEach(function (b) { b.addEventListener('click', function () {
      paused = !paused; store.set('artemis-motion', paused ? 'paused' : null);
      if (paused) { root.setAttribute('data-motion', 'paused'); stop(); } else { root.removeAttribute('data-motion'); start(); }
      syncMotion();
    }); });
    syncMotion();

    // Mobile menu
    var burger = document.querySelector('.burger'), drawer = document.getElementById('drawer');
    if (burger && drawer) {
      burger.addEventListener('click', function () { var o = drawer.classList.toggle('open'); burger.setAttribute('aria-expanded', o ? 'true' : 'false'); });
      drawer.addEventListener('click', function (e) { if (e.target.closest('a')) { drawer.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); } });
    }

    // M6: radial glow follows the pointer on cards (fine pointers only).
    if (!reduce && matchMedia('(pointer: fine)').matches) {
      document.addEventListener('pointermove', function (e) {
        var c = e.target.closest && e.target.closest('.card'); if (!c) return;
        var r = c.getBoundingClientRect();
        c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px');
      }, { passive: true });
    }

    // M7: reveal once, children staggered 60 ms; failsafe so nothing stays hidden.
    var rv = document.querySelectorAll('.rv');
    rv.forEach(function (n) { var sib = n.parentElement ? Array.prototype.filter.call(n.parentElement.children, function (c) { return c.classList.contains('rv'); }) : []; n.style.setProperty('--i', Math.min(sib.indexOf(n), 6)); });
    if (!('IntersectionObserver' in window)) rv.forEach(function (n) { n.classList.add('in'); });
    else {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
      rv.forEach(function (n) { io.observe(n); });
      setTimeout(function () { rv.forEach(function (n) { n.classList.add('in'); }); }, 4000);
    }

    // Live status from the Artemis gateway (public, read-only endpoints).
    var $ = function (id) { return document.getElementById(id); };
    if (!$('st-chat') && !$('hero-dot')) return;
    var API = 'https://api.artemisai-bycutlineindustries.studio';
    function txt(id, v, cls) { var n = $(id); if (!n) return; n.textContent = v; if (cls) n.className = cls; }
    function get(path) {
      var c = window.AbortController ? new AbortController() : null;
      var t = setTimeout(function () { if (c) c.abort(); }, 8000);
      return fetch(API + path, { cache: 'no-store', credentials: 'omit', signal: c ? c.signal : undefined }).then(function (r) { clearTimeout(t); if (!r.ok) throw new Error(r.status); return r.json(); });
    }
    var t0 = performance.now();
    get('/api/health').then(function (h) {
      var ok = !!(h && h.ok), ms = Math.round(performance.now() - t0);
      ['hero-dot', 'live-dot'].forEach(function (id) { var d = $(id); if (d) d.className = 'dot ' + (ok ? 'ok' : 'bad'); });
      txt('hero-state', ok ? 'Artemis Chat is online' : 'Artemis Chat is unreachable right now');
      txt('st-gw', ok ? 'Reachable · ' + ms + ' ms from you' : 'Not responding', ok ? 'on' : 'off');
      txt('st-queue', (h.queued || 0) + ' queued · ' + (h.generating || 0) + ' generating');
    }).catch(function () {
      ['hero-dot', 'live-dot'].forEach(function (id) { var d = $(id); if (d) d.className = 'dot bad'; });
      txt('hero-state', 'Status unavailable right now'); txt('st-gw', 'Not responding', 'off');
    });
    get('/api/status').then(function (s) {
      var cap = s.capabilities || {}, tools = cap.tools || {};
      txt('st-chat', s.serving ? 'Serving' : (s.configured ? 'Configured, not serving' : 'Not configured'), s.serving ? 'on' : 'off');
      txt('st-model', (s.bootstrap || s.quality === 'not-artemis') ? 'Bootstrap model (not Artemis\u2019s own weights)' : (s.model || '\u2014'));
      txt('st-search', tools.web_search ? 'On (' + tools.web_search + ')' : 'Off', tools.web_search ? 'on' : 'off');
      txt('st-fetch', tools.web_fetch ? 'On' : 'Off', tools.web_fetch ? 'on' : 'off');
      txt('st-storage', s.storage === 'server' ? 'Saved to your account' : (s.storage || '\u2014'));
      txt('st-voice', cap.voice_input ? 'On' : 'Not yet', cap.voice_input ? 'on' : 'off');
      txt('st-upload', cap.file_upload ? 'On' : 'Not yet', cap.file_upload ? 'on' : 'off');
      txt('st-when', 'checked ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
    }).catch(function () { txt('st-chat', 'Status unavailable', 'off'); });
  });
})();
