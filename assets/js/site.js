(function () {
  'use strict';

  /* ── Active nav link ── */
  function markActiveNav(pageFile) {
    var current = pageFile ||
      (location.pathname.split('/').pop() || 'index.html');
    document.querySelectorAll('.nav-links a').forEach(function (a) {
      var href = a.getAttribute('href') || '';
      if (href === current) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    // People dropdown parent stays highlighted on both of its subpages
    if (current === 'students.html') {
      var drop = document.querySelector('.nav-drop > a');
      if (drop) drop.setAttribute('aria-current', 'page');
    }
  }
  markActiveNav();

  /* ── Theme toggle ── */
  var root = document.documentElement;
  var btn = document.getElementById('themeBtn');
  try {
    var saved = localStorage.getItem('aida-theme');
    if (saved === 'dark' || saved === 'light') root.setAttribute('data-theme', saved);
  } catch (e) {}
  if (btn) btn.addEventListener('click', function () {
    // light is the site default; dark applies only when explicitly toggled
    var current = root.getAttribute('data-theme') || 'light';
    var next = current === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('aida-theme', next); } catch (e) {}
  });

  /* ── Hero: real CMOS standard-cell layouts ──────────────
     Draws a placed row of textbook-correct cells:
       INV_X1  — PMOS/NMOS pair, output Y on shared drain
       NAND2_X1 — parallel PMOS (VDD–Y–VDD), series NMOS (Y–·–VSS)
       NOR2_X1  — series PMOS (VDD–·–Y), parallel NMOS (VSS–Y–VSS)
     Every contact, rail stub, and M1 route reflects the actual
     transistor-level connectivity of the gate.                  */
  var canvas = document.getElementById('cellCanvas');
  if (canvas) {
    var ctx = canvas.getContext('2d');
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var C = {
      diff: 'rgba(63,164,108,0.50)',
      poly: 'rgba(206,85,64,0.80)',
      m1:   'rgba(78,127,225,0.85)',
      m1dim:'rgba(78,127,225,0.45)',
      via:  'rgba(224,181,74,0.95)',
      bound:'rgba(152,161,181,0.22)',
      label:'rgba(152,161,181,0.85)',
      net:  'rgba(237,240,246,0.90)'
    };

    var P = 34;           // gate pitch
    var CW = 9;           // contact size
    var MW = 8;           // M1 wire width

    function geom(h) {
      return {
        railH: 10,
        pTop: 28, pBot: 76,          // P-diffusion band
        nTop: h - 76, nBot: h - 28,  // N-diffusion band
        polyTop: 18, polyBot: h - 18,
        mid: h / 2
      };
    }

    function drawRails(w, h, g) {
      ctx.fillStyle = C.m1;
      ctx.fillRect(0, 0, w, g.railH);
      ctx.fillRect(0, h - g.railH, w, g.railH);
      ctx.font = '600 9px "IBM Plex Mono", monospace';
      ctx.fillStyle = 'rgba(12,16,23,0.9)';
      ctx.fillText('VDD', 8, g.railH - 2);
      ctx.fillText('VSS', 8, h - 2.5);
    }

    // primitives -------------------------------------------------
    function contact(x, y) {
      ctx.fillStyle = C.via;
      ctx.fillRect(x - CW / 2, y - CW / 2, CW, CW);
    }
    function m1v(x, y1, y2) { // vertical M1
      ctx.fillStyle = C.m1;
      ctx.fillRect(x - MW / 2, Math.min(y1, y2), MW, Math.abs(y2 - y1));
    }
    function m1h(x1, x2, y) { // horizontal M1
      ctx.fillStyle = C.m1;
      ctx.fillRect(Math.min(x1, x2) - MW / 2, y - MW / 2, Math.abs(x2 - x1) + MW, MW);
    }
    function netLabel(txt, x, y) {
      ctx.font = '600 9.5px "IBM Plex Mono", monospace';
      ctx.fillStyle = C.net;
      ctx.fillText(txt, x, y);
    }

    function pMid(g) { return (g.pTop + g.pBot) / 2; }
    function nMid(g) { return (g.nTop + g.nBot) / 2; }

    // shared cell scaffolding ------------------------------------
    // nGates gates → cell width (nGates+1)*P; node j at x0+P*j+P/2, gate i at x0+P*(i+1)
    function cellFrame(x0, wCell, h, g, name) {
      ctx.fillStyle = C.bound;
      ctx.fillRect(x0, g.railH, 1, h - 2 * g.railH);
      ctx.fillRect(x0 + wCell, g.railH, 1, h - 2 * g.railH);
      // diffusion bands within the cell (inset from boundary)
      ctx.fillStyle = C.diff;
      ctx.fillRect(x0 + 6, g.pTop, wCell - 12, g.pBot - g.pTop);
      ctx.fillRect(x0 + 6, g.nTop, wCell - 12, g.nBot - g.nTop);
      // instance name
      ctx.font = '500 8.5px "IBM Plex Mono", monospace';
      ctx.fillStyle = C.label;
      ctx.fillText(name, x0 + 6, g.railH + 12);
    }
    function gates(x0, n, g, labels, labelY) {
      for (var i = 0; i < n; i++) {
        var gx = x0 + P * (i + 1);
        ctx.fillStyle = C.poly;
        ctx.fillRect(gx - 2.5, g.polyTop, 5, g.polyBot - g.polyTop);
        contact(gx, labelY);            // gate input pin
        netLabel(labels[i], gx + 8, labelY + 4);
      }
    }
    function nodeX(x0, j) { return x0 + P * j + P / 2; }
    function vddTap(x, g) { contact(x, pMid(g)); m1v(x, pMid(g), 0); }
    function vssTap(x, g, h) { contact(x, nMid(g)); m1v(x, nMid(g), h); }

    // cells ------------------------------------------------------
    function drawINV(x0, h, g) {
      var w = 2 * P;
      cellFrame(x0, w, h, g, 'INV_X1');
      gates(x0, 1, g, ['A'], g.mid);
      var nL = nodeX(x0, 0), nR = nodeX(x0, 1);
      vddTap(nL, g);                       // PMOS source → VDD
      vssTap(nL, g, h);                    // NMOS source → VSS
      contact(nR, pMid(g));                // shared drain → Y
      contact(nR, nMid(g));
      m1v(nR, pMid(g), nMid(g));           // Y: connect P and N drains
      netLabel('Y', nR + 7, g.mid - 8);
      return w;
    }

    function drawNAND2(x0, h, g) {
      var w = 3 * P;
      cellFrame(x0, w, h, g, 'NAND2_X1');
      gates(x0, 2, g, ['A', 'B'], g.mid - 16);
      var n0 = nodeX(x0, 0), n1 = nodeX(x0, 1), n2 = nodeX(x0, 2);
      // PMOS parallel: VDD — Y — VDD
      vddTap(n0, g); vddTap(n2, g);
      contact(n1, pMid(g));
      // NMOS series: Y — (internal) — VSS
      contact(n0, nMid(g));
      vssTap(n2, g, h);
      // Y net: P-drain (n1) → route down/left → N-drain (n0)
      var yh = g.mid + 16;
      m1v(n1, pMid(g), yh);
      m1h(n0, n1, yh);
      m1v(n0, yh, nMid(g));
      netLabel('Y', n1 + 7, yh + 4);
      return w;
    }

    function drawNOR2(x0, h, g) {
      var w = 3 * P;
      cellFrame(x0, w, h, g, 'NOR2_X1');
      gates(x0, 2, g, ['A', 'B'], g.mid - 16);
      var n0 = nodeX(x0, 0), n1 = nodeX(x0, 1), n2 = nodeX(x0, 2);
      // PMOS series: VDD — (internal) — Y
      vddTap(n0, g);
      contact(n2, pMid(g));
      // NMOS parallel: VSS — Y — VSS
      vssTap(n0, g, h); vssTap(n2, g, h);
      contact(n1, nMid(g));
      // Y net: P-drain (n2) → route down/left → N-drain (n1)
      var yh = g.mid + 16;
      m1v(n2, pMid(g), yh);
      m1h(n1, n2, yh);
      m1v(n1, yh, nMid(g));
      netLabel('Y', n2 + 7, yh + 4);
      return w;
    }

    function drawRow(w, h) {
      var g = geom(h);
      ctx.clearRect(0, 0, w, h);
      drawRails(w, h, g);
      var order = [drawINV, drawNAND2, drawNOR2, drawNAND2, drawINV, drawNOR2];
      var x = 14, i = 0;
      while (x < w - P) {
        x += order[i % order.length](x, h, g);
        i++;
      }
    }

    var revealDone = false;
    function render() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (reduceMotion || revealDone) { drawRow(w, h); return; }

      var start = null, dur = 1400;
      function frame(ts) {
        if (start === null) start = ts;
        var t = Math.min((ts - start) / dur, 1);
        var ease = 1 - Math.pow(1 - t, 3);
        ctx.clearRect(0, 0, w, h);
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, w * ease, h);
        ctx.clip();
        drawRow(w, h);
        ctx.restore();
        if (t < 1) requestAnimationFrame(frame);
        else revealDone = true;
      }
      requestAnimationFrame(frame);
    }

    render();
    window.__renderLayout = render;
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(render, 150);
    });
  }

  /* ── Hide photo sections that have no images yet ──
     Photo <img> tags remove themselves onerror, so after load an empty
     [data-hide-if-empty] section means no photos exist yet. */
  window.addEventListener('load', function () {
    document.querySelectorAll('[data-hide-if-empty]').forEach(function (sec) {
      if (!sec.querySelector('img')) sec.hidden = true;
    });
  });

  /* ── Preview-only router (multi-page simulation in one file) ── */
  if (document.getElementById('preview-root')) {
    var PAGES = ['index', 'research', 'publications', 'professor', 'students', 'contact', 'apply', 'gallery'];
    function showPage(name) {
      document.querySelectorAll('main[data-page]').forEach(function (m) {
        m.hidden = (m.getAttribute('data-page') !== name);
      });
      markActiveNav(name + '.html');
      window.scrollTo(0, 0);
      if (name === 'index' && window.__renderLayout) window.__renderLayout();
    }
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (!a) return;
      var href = a.getAttribute('href') || '';
      var m = href.match(/^([a-z]+)\.html(#[\w-]+)?/);
      if (m && PAGES.indexOf(m[1]) !== -1) {
        e.preventDefault();
        showPage(m[1]);
        if (m[2]) {
          var target = document.getElementById(m[2].slice(1));
          if (target) target.scrollIntoView();
        }
      }
    });
    showPage('index');
  }
})();
