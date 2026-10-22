/* =========================================================
   lab.js —— 隐藏页面的交互
   /vault/   解密台（base64 回收口 + 凯撒轮盘 + 线索簿）
   /arcade/  街机厅（接星星小游戏）
   /atlas/   星图（七颗星 + 主题陈列）
   /seventh/ 第七夜
   ========================================================= */
(function () {
  'use strict';
  var D = document;
  var HJ = window.HJ;
  if (!HJ) return;

  var path = location.pathname;
  var ASSEMBLED = ['f2', 'f1', 'f3', 'f4', 'f5', 'f6'];  // 辞旧迎新团圆

  function $(s, r) { return (r || D).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || D).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  /* ================= 解密台 ================= */

  function initVault() {
    var slots = $('#vault-slots');
    if (slots) {
      slots.innerHTML = HJ.eggs.map(function (e, i) {
        return '<div class="lab-slot" data-hj-egg-slot="' + e.id + '">' +
          '<span class="hj-egg-ch">？</span><small>' + e.no + '</small></div>';
      }).join('');
    }

    var clues = $('#vault-clues');
    if (clues) {
      clues.innerHTML = HJ.eggs.map(function (e, i) {
        return '<li data-clue="' + e.id + '">' +
          '<span class="lab-c-no">' + e.no + '</span>' +
          '<span>' + esc(e.where) + '</span></li>';
      }).join('');
    }

    renderAssembled();
    HJ.refreshUI();

    /* base64 回收口 */
    var input = $('#vault-input');
    var go = $('#vault-decode');
    var out = $('#vault-result');

    function decode() {
      var raw = (input.value || '').trim();
      if (!raw) { out.className = 'lab-out bad'; out.innerHTML = '空白的纸，读不出东西。'; return; }
      var egg = HJ.findToken(raw);
      if (!egg) {
        out.className = 'lab-out bad';
        out.innerHTML = '这不是六片碎纸中的任何一片。也许你少抄了几个字符。';
        return;
      }
      if (HJ.hasEgg(egg.id)) {
        out.className = 'lab-out';
        out.innerHTML = '「<b>' + egg.ch + '</b>」已经在你手里了。它在第 ' + egg.no + ' 格。';
        return;
      }
      HJ.addEgg(egg.id);
      out.className = 'lab-out good';
      out.innerHTML = '这次对了：base64 拆开是「<b>' + egg.ch + '</b>」，已经放进第 ' + egg.no + ' 格。';
      renderAssembled();
    }
    if (go) go.addEventListener('click', decode);
    if (input) input.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') decode(); });

    /* 凯撒轮盘 */
    var cin = $('#caesar-input');
    var cgo = $('#caesar-go');
    var cout = $('#caesar-result');

    function caesar() {
      var txt = (cin.value || '').trim().toUpperCase();
      if (!txt) { cout.className = 'lab-out bad'; cout.textContent = '先写点什么。'; return; }
      if (txt.indexOf('NEWYEAR') >= 0 || txt.indexOf('NEW YEAR') >= 0 || txt === '新年快乐') {
        if (HJ.hasEgg('f3')) {
          cout.className = 'lab-out';
          cout.innerHTML = '你早就转过这一格了：<b>迎</b>。';
        } else {
          HJ.addEgg('f3');
          cout.className = 'lab-out good';
          cout.innerHTML = '轮盘咔哒一声。QHZBHDU → <b>NEWYEAR</b> → 「<b>迎</b>」。第三格亮了。';
        }
        renderAssembled();
        return;
      }
      /* 顺手给个位移演示，不揭答案 */
      cout.className = 'lab-out';
      var demo = txt.replace(/[A-Z]/g, function (c) {
        return String.fromCharCode(((c.charCodeAt(0) - 65 - 3 + 26) % 26) + 65);
      });
      cout.innerHTML = '按「往左三步」解一次：<code>' + esc(demo) + '</code> —— 但这句不是那把钥匙。';
    }
    if (cgo) cgo.addEventListener('click', caesar);
    if (cin) cin.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') caesar(); });

    /* 重置 */
    var reset = $('#vault-reset');
    if (reset) {
      reset.addEventListener('click', function () {
        if (window.confirm('把六片碎纸重新散回站点各处？主题不会丢。')) {
          HJ.reset();
          renderAssembled();
          if (out) { out.className = 'lab-out'; out.textContent = ''; }
        }
      });
    }

    D.addEventListener('hj:update', renderAssembled);
  }

  function renderAssembled() {
    var box = $('#vault-assembled');
    if (!box) return;
    var got = 0;
    var chars = ASSEMBLED.map(function (id) {
      var e = HJ.eggs.filter(function (x) { return x.id === id; })[0];
      var has = HJ.hasEgg(id);
      if (has) got++;
      return '<i class="' + (has ? 'got' : '') + '">' + (has ? e.ch : '？') + '</i>';
    }).join('');
    box.innerHTML =
      '<span class="lab-as-label">A S S E M B L E D · 拼 合 结 果</span>' +
      '<div class="lab-as-chars">' + chars + '</div>' +
      '<p class="lab-as-hint">' +
        (got === 6
          ? '六个字都到齐了。除夕那晚，把它们按这个顺序拼起来。'
          : '还差 ' + (6 - got) + ' 片。碎纸之间没有顺序提示，但拼出来的话你一定听过。') +
      '</p>';

    $$('#vault-clues li').forEach(function (li) {
      li.classList.toggle('done', HJ.hasEgg(li.getAttribute('data-clue')));
    });

    var status = $('#vault-status');
    if (status) {
      status.innerHTML = HJ.isUnlocked()
        ? '新年主题已解锁。你可以在左下角的调色盘里换过去。'
        : '集齐六片，会解锁「新年」主题，并放一次烟花。';
    }
  }

  /* ================= 街机厅 ================= */

  function initArcade() {
    var cv = $('#game-canvas');
    if (!cv) return;
    var ctx = cv.getContext('2d');
    var W = 760, Hh = 460;
    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = W * DPR;
    cv.height = Hh * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    var scoreEl = $('#arcade-score');
    var lostEl = $('#arcade-lost');
    var overlay = $('#arcade-overlay');
    var startBtn = $('#arcade-start');

    var state = 'idle';
    var score = 0, lost = 0;
    var stars = [], px = W / 2, targetX = W / 2;
    var last = 0, spawnAt = 0, t = 0;
    var keys = {};

    var BASKET_W = 104, BASKET_Y = 414, BASKET_H = 16;
    var TARGET = 13;

    function reset() {
      score = 0; lost = 0; stars = []; px = W / 2; targetX = W / 2;
      if (scoreEl) scoreEl.textContent = '0';
      if (lostEl) lostEl.textContent = '0';
    }

    function spawn() {
      var special = Math.random() < 0.12;
      stars.push({
        x: 40 + Math.random() * (W - 80),
        y: -20,
        vy: 1.9 + Math.random() * 2.4 + score * 0.05,
        size: special ? 15 : 10 + Math.random() * 5,
        rot: Math.random() * 6.28,
        vr: (Math.random() - 0.5) * 0.05,
        special: special,
        ph: Math.random() * 6.28
      });
    }

    function drawStar(s) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      var r = s.size;
      if (s.special) {
        ctx.fillStyle = '#7fe7ff';
        ctx.shadowColor = '#7fe7ff';
        ctx.shadowBlur = 18;
      } else {
        ctx.fillStyle = '#ffd97a';
        ctx.shadowColor = '#ffb347';
        ctx.shadowBlur = 12;
      }
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.42, -r * 0.3);
      ctx.lineTo(r, 0);
      ctx.lineTo(r * 0.42, r * 0.3);
      ctx.lineTo(0, r);
      ctx.lineTo(-r * 0.42, r * 0.3);
      ctx.lineTo(-r, 0);
      ctx.lineTo(-r * 0.42, -r * 0.3);
      ctx.closePath();
      ctx.fill();
      if (s.special) {
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        ctx.arc(0, 0, r * 2.4, 0, 6.2832);
        ctx.fill();
      }
      ctx.restore();
    }

    function drawBasket() {
      var x = px - BASKET_W / 2;
      ctx.save();
      ctx.fillStyle = 'rgba(127, 210, 255, 0.18)';
      ctx.fillRect(x, BASKET_Y, BASKET_W, BASKET_H);
      ctx.strokeStyle = '#8fd0ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, BASKET_Y + 1, BASKET_W - 2, BASKET_H - 2);
      ctx.fillStyle = '#8fd0ff';
      ctx.fillRect(x - 4, BASKET_Y - 3, 8, BASKET_H + 6);
      ctx.fillRect(x + BASKET_W - 4, BASKET_Y - 3, 8, BASKET_H + 6);
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#4dd0ff';
      for (var i = 0; i < 5; i++) {
        ctx.fillRect(x + 12 + i * ((BASKET_W - 24) / 4), BASKET_Y + 4, 2, BASKET_H - 8);
      }
      ctx.restore();
    }

    function drawBg() {
      ctx.clearRect(0, 0, W, Hh);
      ctx.fillStyle = 'rgba(4, 8, 20, 0.9)';
      ctx.fillRect(0, 0, W, Hh);
      /* 星尘底 */
      ctx.save();
      for (var i = 0; i < 46; i++) {
        var x = (i * 137.5) % W;
        var y = (i * 89.3) % Hh;
        var a = 0.06 + 0.1 * Math.abs(Math.sin(t * 0.4 + i));
        ctx.fillStyle = 'rgba(180, 220, 255, ' + a + ')';
        ctx.fillRect(x, y, 2, 2);
      }
      ctx.restore();
      /* 地平线 */
      ctx.strokeStyle = 'rgba(120, 210, 255, 0.18)';
      ctx.beginPath();
      ctx.moveTo(0, BASKET_Y + 30);
      ctx.lineTo(W, BASKET_Y + 30);
      ctx.stroke();
    }

    function step(dt) {
      t += dt;
      if (state === 'play') {
        if (px < targetX) px = Math.min(targetX, px + 14 * dt);
        else px = Math.max(targetX, px - 14 * dt);
        px = Math.max(BASKET_W / 2, Math.min(W - BASKET_W / 2, px));

        if (t > spawnAt) {
          spawn();
          spawnAt = t + Math.max(0.34, 0.86 - score * 0.03);
        }

        for (var i = stars.length - 1; i >= 0; i--) {
          var s = stars[i];
          s.y += s.vy * dt * 60;
          s.rot += s.vr * dt * 60;
          if (s.y > BASKET_Y - 4 && s.y < BASKET_Y + BASKET_H + 12 &&
              Math.abs(s.x - px) < BASKET_W / 2 + 6) {
            stars.splice(i, 1);
            score += s.special ? 2 : 1;
            if (scoreEl) scoreEl.textContent = score;
            HJ.burst(
              (s.x / W) * cv.getBoundingClientRect().width + cv.getBoundingClientRect().left,
              (s.y / Hh) * cv.getBoundingClientRect().height + cv.getBoundingClientRect().top,
              s.special ? 16 : 8
            );
            if (score >= TARGET) { win(); return; }
            continue;
          }
          if (s.y > Hh + 24) {
            stars.splice(i, 1);
            lost++;
            if (lostEl) lostEl.textContent = lost;
          }
        }
      }
      drawBg();
      for (var k = 0; k < stars.length; k++) drawStar(stars[k]);
      drawBasket();
      if (state === 'idle') {
        ctx.save();
        ctx.fillStyle = 'rgba(4, 8, 20, 0.55)';
        ctx.fillRect(0, 0, W, Hh);
        ctx.restore();
      }
    }

    function loop(ts) {
      var dt = last ? Math.min((ts - last) / 1000, 0.05) : 0.016;
      last = ts;
      if (state !== 'paused') step(dt);
      else { drawBg(); drawBasket(); for (var i = 0; i < stars.length; i++) drawStar(stars[i]); }
      requestAnimationFrame(loop);
    }

    function start() {
      reset();
      state = 'play';
      t = 0; spawnAt = 0.3;
      if (overlay) overlay.hidden = true;
      if (startBtn) startBtn.textContent = '重新开始';
    }

    function win() {
      state = 'won';
      if (overlay) {
        overlay.hidden = false;
        overlay.innerHTML =
          '<div><h3>十三颗，齐了</h3>' +
          '<p>机器吐出一张纸条，上面印着 <code>6L6e</code>。<br>拿到解密台去，它知道那是什么。</p>' +
          '<button class="lab-btn" id="arcade-again">再来一局</button> ' +
          '<a class="lab-btn ghost" href="/vault/" style="text-decoration:none;display:inline-block;margin-left:8px">去解密台</a></div>';
        var again = $('#arcade-again');
        if (again) again.addEventListener('click', start);
      }
      if (!HJ.hasEgg('f2')) HJ.addEgg('f2');
      else HJ.toast('又赢了一次', '十三颗星，不多不少');
    }

    /* 控制 */
    function pointer(ev) {
      var rect = cv.getBoundingClientRect();
      var cx = (ev.touches ? ev.touches[0].clientX : ev.clientX);
      targetX = ((cx - rect.left) / rect.width) * W;
      targetX = Math.max(BASKET_W / 2, Math.min(W - BASKET_W / 2, targetX));
    }
    cv.addEventListener('mousemove', pointer);
    cv.addEventListener('touchmove', function (ev) { ev.preventDefault(); pointer(ev); }, { passive: false });
    cv.addEventListener('touchstart', pointer);
    D.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowLeft' || ev.key === 'a') keys.l = true;
      if (ev.key === 'ArrowRight' || ev.key === 'd') keys.r = true;
    });
    D.addEventListener('keyup', function (ev) {
      if (ev.key === 'ArrowLeft' || ev.key === 'a') keys.l = false;
      if (ev.key === 'ArrowRight' || ev.key === 'd') keys.r = false;
    });
    setInterval(function () {
      if (state !== 'play') return;
      if (keys.l) targetX -= 26;
      if (keys.r) targetX += 26;
      targetX = Math.max(BASKET_W / 2, Math.min(W - BASKET_W / 2, targetX));
    }, 16);

    if (startBtn) startBtn.addEventListener('click', start);
    requestAnimationFrame(loop);
  }

  /* ================= 星图 ================= */

  function initAtlas() {
    var map = $('#atlas-map');
    if (map) {
      var pts = [
        { id: 'f1', x: 150, y: 96,  label: '壹' },
        { id: 'f2', x: 360, y: 62,  label: '贰' },
        { id: 'f3', x: 556, y: 124, label: '叁' },
        { id: 'f4', x: 226, y: 236, label: '肆' },
        { id: 'f6', x: 468, y: 252, label: '陆' },
        { id: 'f5', x: 344, y: 172, label: '伍' }
      ];
      var lines = '';
      for (var i = 0; i < pts.length - 1; i++) {
        lines += '<line x1="' + pts[i].x + '" y1="' + pts[i].y + '" x2="' + pts[i + 1].x +
          '" y2="' + pts[i + 1].y + '" stroke="rgba(140,180,255,.2)" stroke-width="1"/>';
      }
      var nodes = pts.map(function (p) {
        var e = HJ.eggs.filter(function (x) { return x.id === p.id; })[0];
        return '<g class="atlas-node" data-node="' + p.id + '" data-label="' + e.no + ' · ' + e.ch + '">' +
          '<circle cx="' + p.x + '" cy="' + p.y + '" r="7" fill="rgba(160,190,255,.35)" stroke="rgba(180,220,255,.5)" stroke-width="1"/>' +
          '<circle cx="' + p.x + '" cy="' + p.y + '" r="16" fill="transparent"/>' +
          '<text x="' + p.x + '" y="' + (p.y + 30) + '" text-anchor="middle">' + p.label + '</text></g>';
      }).join('');

      map.innerHTML =
        '<svg viewBox="0 0 700 320" preserveAspectRatio="xMidYMid meet">' +
          lines + nodes +
          '<g class="atlas-node" id="atlas-seventh" data-node="f5s" data-label="第七颗">' +
            '<circle cx="640" cy="270" r="4.5" fill="rgba(255,220,160,.35)" stroke="rgba(255,220,160,.4)" stroke-width="1"/>' +
            '<circle cx="640" cy="270" r="18" fill="transparent"/>' +
            '<text x="640" y="300" text-anchor="middle" style="opacity:.45">·</text></g>' +
          '<text x="26" y="300" style="fill:rgba(160,190,255,.28);font-size:10px;letter-spacing:3px;font-family:Consolas,monospace">THE ATLAS · 不 是 所 有 星 都 该 在 这</text>' +
        '</svg>';
    }

    var info = $('#atlas-info');
    function refreshNodes() {
      $$('.atlas-node[data-node]').forEach(function (g) {
        var id = g.getAttribute('data-node');
        if (id === 'f5s') return;
        g.classList.toggle('found', HJ.hasEgg(id));
      });
      var seventh = $('#atlas-seventh');
      if (seventh) seventh.style.opacity = HJ.hasEgg('f5') ? '0.95' : '0.5';
    }
    refreshNodes();

    if (map) {
      map.addEventListener('click', function (ev) {
        var g = ev.target.closest('.atlas-node');
        if (!g) return;
        var id = g.getAttribute('data-node');
        if (id === 'f5s') {
          if (HJ.hasEgg('f5')) {
            if (info) info.innerHTML = '第七颗星已经在你手里了。它本来不该在这里，现在也不在。';
            return;
          }
          HJ.addEgg('f5');
          if (info) info.innerHTML = '你点了一颗不该存在的星。它没有躲，只是碎成了「<b>团</b>」。';
          refreshNodes();
          return;
        }
        var e = HJ.eggs.filter(function (x) { return x.id === id; })[0];
        if (HJ.hasEgg(id)) {
          if (info) info.innerHTML = '<b>' + e.no + '</b> · 「' + e.ch + '」已经在你手里了。';
        } else {
          if (info) info.innerHTML = '<b>' + e.no + '</b> · 这颗星还是暗的。线索：' + esc(e.where);
        }
      });
    }

    /* 主题陈列 */
    var grid = $('#theme-grid');
    if (grid) {
      function render() {
        grid.innerHTML = HJ.themes.map(function (t) {
          var locked = t.locked && !HJ.isUnlocked();
          var active = D.documentElement.getAttribute('data-hj-theme') === t.id;
          return '<button class="theme-card' + (active ? ' is-active' : '') + (locked ? ' is-locked' : '') + '" ' +
            'data-theme-id="' + t.id + '">' +
            '<span class="theme-sw" style="background:' + t.sw + '"></span>' +
            '<span><span class="theme-nm">' + t.name + (locked ? ' 🔒' : '') + '</span>' +
            '<span class="theme-ds">' + t.desc + '</span></span></button>';
        }).join('');
      }
      render();
      grid.addEventListener('click', function (ev) {
        var b = ev.target.closest('.theme-card');
        if (!b) return;
        var id = b.getAttribute('data-theme-id');
        var t = HJ.themes.filter(function (x) { return x.id === id; })[0];
        if (t.locked && !HJ.isUnlocked()) {
          HJ.toast('还差一点', '集齐六片碎纸才开新年主题', 'lock');
          return;
        }
        HJ.applyTheme(id, { silent: true });
        HJ.toast('换个世界', t.name);
        render();
      });
      D.addEventListener('hj:theme', render);
    }

    D.addEventListener('hj:update', refreshNodes);
  }

  /* ================= 第七夜 ================= */

  function initSeventh() {
    var lock = $('#night-lock');
    var body = $('#night-body');
    if (!lock || !body) return;
    var need = 5;
    var have = HJ.eggs.filter(function (e) { return e.id !== 'f6'; }).filter(function (e) {
      return HJ.hasEgg(e.id);
    }).length;

    if (have < need) {
      lock.hidden = false;
      body.hidden = true;
      var t = $('#night-need');
      if (t) t.textContent = have + ' / ' + need;
      return;
    }

    lock.hidden = true;
    body.hidden = false;

    var btn = $('#night-take');
    if (btn) {
      btn.addEventListener('click', function () {
        if (HJ.hasEgg('f6')) {
          HJ.toast('你已经拿走了', '第六片在你手里');
          return;
        }
        HJ.addEgg('f6');
        btn.disabled = true;
        btn.textContent = '已收下「圆」';
      });
    }
    var fw = $('#night-fw');
    if (fw) fw.addEventListener('click', function () { HJ.fireworks(6000); });
  }

  /* ================= 启动 ================= */

  function boot() {
    if (path.indexOf('/vault/') === 0) initVault();
    else if (path.indexOf('/arcade/') === 0) initArcade();
    else if (path.indexOf('/atlas/') === 0) initAtlas();
    else if (path.indexOf('/seventh/') === 0) initSeventh();
  }

  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
