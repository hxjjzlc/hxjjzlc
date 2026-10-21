/* =========================================================
   fx.js —— 「冰箱里的月亮」夸张特效引擎
   · 随机场景图 + 匹配意境粒子（雨 / 雪 / 霜光）
   · 标题逐字浮动、跑马灯、漂浮 emoji、光标星屑、月亮徽章
   只在存在 #fx-root 的页面运行
   ========================================================= */
(function () {
  'use strict';

  var SCENES = [
    { url: '/fx/scene-rain.svg',   mode: 'rain',  name: '雨夜霓虹',  hi: '#8fd0ff', lo: '#b3c9ff' },
    { url: '/fx/scene-fridge.svg', mode: 'frost', name: '冰箱冷光',  hi: '#e8fbff', lo: '#bfeaff' },
    { url: '/fx/scene-snow.svg',   mode: 'snow',  name: '雪原月光',  hi: '#ffffff', lo: '#d6ecff' }
  ];

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  ready(function () {
    var root = document.getElementById('fx-root');
    if (!root) return;
    if (document.body.classList.contains('fx-glam')) return;   // 防重复初始化
    document.body.classList.add('fx-glam');

    /* ---------- 1. 选场景 ---------- */
    var forced = (root.getAttribute('data-fx-force') || '').trim();
    // 支持用 ?fx=rain|frost|snow 强制指定，便于预览
    try {
      var qs = new URLSearchParams(location.search).get('fx');
      if (qs) forced = qs.trim();
    } catch (e) { /* 忽略 */ }
    var picked = null;
    if (forced) {
      for (var i = 0; i < SCENES.length; i++) {
        if (SCENES[i].mode === forced) { picked = SCENES[i]; break; }
      }
    }
    if (!picked) picked = SCENES[Math.floor(Math.random() * SCENES.length)];

    var stage = document.createElement('div');
    stage.id = 'fx-stage';
    stage.style.backgroundImage = 'url("' + picked.url + '")';
    document.body.insertBefore(stage, document.body.firstChild);

    // 压暗层：让亮场景也不至于把文字淹掉
    var veil = document.createElement('div');
    veil.id = 'fx-veil';
    document.body.insertBefore(veil, stage.nextSibling);
    document.documentElement.style.background = '#04060f';

    /* ---------- 2. 顶部跑马灯 ---------- */
    var ribbon = document.createElement('div');
    ribbon.id = 'fx-ribbon';
    ribbon.innerHTML = '<span>🌙 冰箱里的月亮 · 十七个未接来电 · 意识流现场 · 请勿用于任何严肃场合 · ' +
      'RAIN / SNOW / FROST · 当前场景：' + picked.name + ' · 随手关掉也好 · 但月亮会一直亮着 📮 ✨ ' +
      '🌙 冰箱里的月亮 · 十七个未接来电 · 意识流现场 · 请勿用于任何严肃场合 · ' +
      '当前场景：' + picked.name + ' 📮 ✨</span>';
    document.body.appendChild(ribbon);

    /* ---------- 3. 粒子层 ---------- */
    var canvas = document.createElement('canvas');
    canvas.id = 'fx-canvas';
    document.body.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);

    var parts = [];
    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      seed();
    }

    function rnd(a, b) { return a + Math.random() * (b - a); }

    var MOON = { x: 0, y: 0, r: 0 };
    function seed() {
      var count = picked.mode === 'rain' ? Math.round(W / 5)
                : picked.mode === 'snow' ? Math.round(W / 12)
                : Math.round(W / 16);
      count = Math.min(count, 320);
      parts = [];
      for (var i = 0; i < count; i++) {
        parts.push(makeParticle(true));
      }
      MOON.x = W * 0.72; MOON.y = H * 0.22; MOON.r = Math.min(W, H) * 0.10;
    }

    function makeParticle(initial) {
      var m = picked.mode;
      if (m === 'rain') {
        return {
          x: rnd(-60, W + 60),
          y: initial ? rnd(-H, H) : rnd(-H * 0.4, -20),
          len: rnd(12, 34),
          vy: rnd(9, 20),
          vx: rnd(-1.6, -0.4),
          w: Math.random() < 0.18 ? 1.7 : 0.9,
          a: rnd(0.12, 0.45)
        };
      }
      if (m === 'snow') {
        return {
          x: rnd(0, W),
          y: initial ? rnd(0, H) : rnd(-40, -5),
          r: rnd(0.9, 3.4),
          vy: rnd(0.35, 1.5),
          vx: rnd(-0.5, 0.5),
          ph: rnd(0, Math.PI * 2),
          a: rnd(0.25, 0.9)
        };
      }
      /* frost：极缓慢上升的冷光尘 */
      return {
        x: rnd(0, W),
        y: initial ? rnd(0, H) : rnd(H + 10, H + 90),
        r: rnd(0.7, 2.6),
        vy: rnd(-0.55, -0.12),
        vx: rnd(-0.28, 0.28),
        ph: rnd(0, Math.PI * 2),
        a: rnd(0.15, 0.7)
      };
    }

    var t = 0;
    function frame() {
      t += 0.016;
      ctx.clearRect(0, 0, W, H);
      var i, p;

      if (picked.mode === 'rain') {
        ctx.lineCap = 'round';
        for (i = 0; i < parts.length; i++) {
          p = parts[i];
          p.x += p.vx * 3.2;
          p.y += p.vy * 3.2;
          if (p.y > H + 40) { parts[i] = makeParticle(false); continue; }
          ctx.strokeStyle = 'rgba(190, 228, 255, ' + p.a + ')';
          ctx.lineWidth = p.w;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.vx * 2.4, p.y + p.len);
          ctx.stroke();
        }
        /* 月亮周围的水汽光晕 */
        var g = ctx.createRadialGradient(MOON.x, MOON.y, 0, MOON.x, MOON.y, MOON.r * 2.2);
        g.addColorStop(0, 'rgba(255, 245, 210, 0.10)');
        g.addColorStop(1, 'rgba(255, 245, 210, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(MOON.x, MOON.y, MOON.r * 2.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (picked.mode === 'snow') {
        for (i = 0; i < parts.length; i++) {
          p = parts[i];
          p.x += p.vx + Math.sin(t * 1.1 + p.ph) * 0.55;
          p.y += p.vy;
          if (p.y > H + 8) { parts[i] = makeParticle(false); continue; }
          if (p.x < -8) p.x = W + 8;
          if (p.x > W + 8) p.x = -8;
          ctx.fillStyle = 'rgba(255, 255, 255, ' + p.a + ')';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        for (i = 0; i < parts.length; i++) {
          p = parts[i];
          p.x += p.vx + Math.sin(t * 0.7 + p.ph) * 0.32;
          p.y += p.vy;
          if (p.y < -12) { parts[i] = makeParticle(false); continue; }
          var tw = 0.5 + 0.5 * Math.sin(t * 2.2 + p.ph);
          ctx.fillStyle = 'rgba(226, 250, 255, ' + (p.a * tw) + ')';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      requestAnimationFrame(frame);
    }
    resize();
    window.addEventListener('resize', resize);
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      requestAnimationFrame(frame);
    }

    /* ---------- 4. 标题逐字浮动（每个字自带一段彩虹） ---------- */
    var EMO = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}]/u;
    function splitGraphemes(str) {
      try {
        var seg = new Intl.Segmenter('zh-Hans', { granularity: 'grapheme' });
        return Array.from(seg.segment(str), function (x) { return x.segment; });
      } catch (e) {
        return Array.from(str);
      }
    }
    var heads = document.querySelectorAll('#article-container h1, #article-container h2');
    for (var h = 0; h < heads.length; h++) {
      var el = heads[h];
      if (el.querySelector('.fx-ch')) continue;
      var txt = (el.textContent || '').trim();
      if (!txt) continue;
      el.textContent = '';
      var chars = splitGraphemes(txt);
      var n = chars.length;
      for (var c = 0; c < n; c++) {
        var ch = chars[c];
        var s = document.createElement('span');
        var isEmoji = EMO.test(ch);
        s.className = isEmoji ? 'fx-ch fx-emo' : 'fx-ch';
        s.textContent = ch === ' ' ? '\u00a0' : ch;
        if (!isEmoji) {
          s.style.backgroundSize = Math.max(n * 100, 200) + '% 100%';
          s.style.backgroundPosition = (n > 1 ? (c / (n - 1)) * 100 : 0).toFixed(2) + '% 50%';
        }
        s.style.animationDelay = (c * 58) + 'ms';
        s.style.animationDuration = (2.8 + (c % 5) * 0.28).toFixed(2) + 's';
        el.appendChild(s);
      }
    }

    /* ---------- 5. 漂浮 emoji ---------- */
    var POOL = ['🌙', '🧊', '✨', '🧦', '🐈', '☕', '🌧️', '🫧', '📮', '🍜', '🕯️', '🌀', '❄️', '🪞', '🎧'];
    var layer = document.createElement('div');
    layer.id = 'fx-emoji';
    document.body.appendChild(layer);

    function spawnEmoji() {
      if (document.hidden) return;
      var e = document.createElement('span');
      e.className = 'fx-float-emoji';
      e.textContent = POOL[Math.floor(Math.random() * POOL.length)];
      e.style.left = (Math.random() * 96) + 'vw';
      e.style.bottom = (-6 + Math.random() * 4) + 'vh';
      e.style.fontSize = (16 + Math.random() * 26) + 'px';
      var dur = 11 + Math.random() * 12;
      e.style.animationDuration = dur.toFixed(1) + 's';
      layer.appendChild(e);
      setTimeout(function () { if (e.parentNode) e.parentNode.removeChild(e); }, dur * 1000 + 400);
    }
    for (var k = 0; k < 6; k++) setTimeout(spawnEmoji, k * 900);
    setInterval(spawnEmoji, 1500);

    /* ---------- 6. 光标星屑 ---------- */
    var sparkGlyphs = ['✦', '✧', '★', '❉', '·'];
    var lastSpawn = 0;
    document.addEventListener('mousemove', function (ev) {
      var now = Date.now();
      if (now - lastSpawn < 62) return;
      lastSpawn = now;
      var sp = document.createElement('span');
      sp.className = 'fx-spark';
      sp.textContent = sparkGlyphs[Math.floor(Math.random() * sparkGlyphs.length)];
      sp.style.left = ev.clientX + 'px';
      sp.style.top = ev.clientY + 'px';
      sp.style.color = 'hsl(' + Math.floor(Math.random() * 360) + ', 95%, 72%)';
      sp.style.setProperty('--dx', (Math.random() * 40 - 20).toFixed(0) + 'px');
      sp.style.setProperty('--dy', (-18 - Math.random() * 26).toFixed(0) + 'px');
      document.body.appendChild(sp);
      setTimeout(function () { if (sp.parentNode) sp.parentNode.removeChild(sp); }, 950);
    }, { passive: true });

    /* ---------- 7. 月亮徽章 + 场景标签 ---------- */
    var moon = document.createElement('div');
    moon.id = 'fx-moon';
    moon.title = '冰箱里那盏灯，关上门也一直亮着。';
    moon.innerHTML = '<b>🌙</b>';
    document.body.appendChild(moon);
    moon.addEventListener('click', function () {
      var all = document.querySelectorAll('.fx-ch');
      for (var i = 0; i < all.length; i++) {
        all[i].style.animationDuration = (0.4 + Math.random() * 0.9).toFixed(2) + 's';
      }
      moon.title = '你把它摇快了。🎐';
    });

    var tag = document.createElement('div');
    tag.id = 'fx-tag';
    tag.textContent = 'SCENE · ' + picked.name + ' ｜ FX · ' + picked.mode.toUpperCase() +
      ' ｜ SEED · ' + Math.random().toString(36).slice(2, 7).toUpperCase();
    document.body.appendChild(tag);

    /* ---------- 8. 彩蛋 ---------- */
    console.log('%c🌙 冰箱里的月亮 %c你已经打开控制台了，那说明你也有一点乱。',
      'background:linear-gradient(90deg,#ff5f6d,#ffe93d,#4dd0ff);color:#111;padding:4px 10px;border-radius:6px;font-weight:700',
      'color:#8fd0ff');
  });
})();
