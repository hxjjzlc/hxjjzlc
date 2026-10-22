/* =============================================================================
   odyssey.js · 四渡 · 镜湖 的文章主控（轻量版）
   -----------------------------------------------------------------------------
   整篇只留两件事：

     1. 侧视角的血海 —— 随滚动上升、下降。整层只有一个 transform，
        落合成层，不重绘、不读纹理、没有 canvas。
     2. 镜面那一段 —— 每句话下面压着另一句话的倒影（语义相反），
        走到底锁屏，点一下整页翻面，反面按倒序再走一遍。

   原先那套 WebGL（彼岸花海 / 墨流体 / 血雨粒子）整段拆掉了：
   太多设备带不动，一卡就什么都不成立。现在连集显和老手机都能跑满帧。

   另外留一个机制：页面上显示出来的日期，永远是"明天"。
   ============================================================================= */
(function () {
  'use strict';
  var D = document, W = window, HTML = D.documentElement;
  var root = D.getElementById('article-container') || D.querySelector('.post-content');
  if (!root) return;

  /* ------------------------------------------------ 0. 显示的时间永远是明天 */
  /* 只动本文的 meta（#post-meta），侧栏"最新文章"里别的日期一概不碰。
     连 title="发表于 …" 一起改，悬停看到的也是明天。 */
  (function stampTomorrow() {
    var d = new Date();
    d.setDate(d.getDate() + 1);
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    var txt = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    var iso = txt + 'T00:00:00+08:00';
    var nodes = D.querySelectorAll('#post-meta time, .post-meta time');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].setAttribute('datetime', iso);
      nodes[i].textContent = txt;
      var ttl = nodes[i].getAttribute('title');
      if (ttl) nodes[i].setAttribute('title', ttl.replace(/\d{4}-\d{2}-\d{2}/, txt));
    }
  })();

  var ACTS = ['abyss', 'ink', 'blood', 'mirror', 'rev1', 'rev2', 'rev3', 'rev4'];

  /* ------------------------------------------------------------- 1. 拆幕 */
  /* 三条来路都收：构建期过滤器产出的 div、HTML 注释、正文里原样残留的
     ":::act 名字" 段落。最后一条是运行时兜底——过滤器没被加载时也照样能跑。 */
  (function commentsToMarks() {
    var walker = D.createTreeWalker(root, NodeFilter.SHOW_COMMENT, null);
    var n, list = [];
    while ((n = walker.nextNode())) {
      var m = /^\s*act\s*:\s*([a-z0-9]+)\s*$/i.exec(n.nodeValue || '');
      if (m) list.push({ node: n, name: m[1].toLowerCase() });
    }
    list.forEach(function (it) {
      var d = D.createElement('div');
      d.className = 'od-mark';
      d.setAttribute('data-act', it.name);
      if (it.node.parentNode) it.node.parentNode.replaceChild(d, it.node);
    });
  })();

  (function textToMarks() {
    if (root.querySelector('.od-mark')) return;
    var VALID = new RegExp('^(' + ACTS.join('|') + ')$', 'i');
    var cand = root.querySelectorAll('p, div, li, pre, h1, h2, h3, h4, h5, h6');
    var hits = [];
    for (var i = 0; i < cand.length; i++) {
      var el = cand[i];
      if (el.classList && el.classList.contains('od-mark')) continue;
      if (el.children && el.children.length &&
          el.tagName === 'DIV' && el.querySelector('p, div, h1, h2, h3, h4, h5, h6')) continue;
      var txt = (el.textContent || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
      if (!txt || txt.length > 40) continue;
      var m = /^:{3}\s*act\s+([a-z0-9]+)$/i.exec(txt);
      if (!m || !VALID.test(m[1])) continue;
      hits.push({ el: el, name: m[1].toLowerCase() });
    }
    hits.forEach(function (h) {
      var d = D.createElement('div');
      d.className = 'od-mark';
      d.setAttribute('data-act', h.name);
      if (h.el.parentNode) h.el.parentNode.replaceChild(d, h.el);
    });
    if (hits.length && W.console) {
      console.info('[odyssey] 运行时补了 ' + hits.length + ' 个幕标记（Hexo 过滤器未生效）');
    }
  })();

  var marks = [].slice.call(root.querySelectorAll('.od-mark'));
  if (marks.length < 4) {
    if (W.console) {
      console.warn('[odyssey] 只找到 ' + marks.length +
        ' 个幕标记，特效跳过。正文里需要至少 4 处独立一行的 ":::act 名字"。');
    }
    return;
  }

  marks.forEach(function (el) {
    var guard = 0;
    while (el.parentNode && el.parentNode !== root && guard++ < 30) {
      var p = el.parentNode;
      if (!p.parentNode) break;
      p.parentNode.insertBefore(el, p);
    }
  });

  var groups = [], cur = null;
  [].slice.call(root.childNodes).forEach(function (nd) {
    if (nd.nodeType === 1 && nd.classList && nd.classList.contains('od-mark')) {
      cur = { name: (nd.getAttribute('data-act') || '').toLowerCase(), nodes: [] };
      groups.push(cur);
    } else if (cur) {
      cur.nodes.push(nd);
    }
  });
  if (groups.length < 4) return;

  var sideA = D.createElement('div');
  sideA.className = 'od-side od-side-a';
  var sideB = D.createElement('div');
  sideB.className = 'od-side od-side-b';
  var secs = {};
  groups.forEach(function (g) {
    var el = D.createElement('section');
    el.className = 'od-act od-act-' + g.name;
    el.setAttribute('data-act', g.name);
    g.nodes.forEach(function (nd) { el.appendChild(nd); });
    secs[g.name] = el;
    (g.name.indexOf('rev') === 0 ? sideB : sideA).appendChild(el);
  });
  if (!secs.abyss) return;

  root.textContent = '';
  root.appendChild(sideA);

  /* --------------------------------------------- 2. 反面的滚动世界 */
  var inv = D.createElement('div');
  inv.className = 'od-inv';
  inv.id = 'od-inv';
  var invInner = D.createElement('div');
  invInner.className = 'od-inv-inner';
  invInner.appendChild(sideB);
  var tail = D.createElement('div');
  tail.className = 'od-tail';
  tail.id = 'od-tail';
  invInner.appendChild(tail);
  inv.appendChild(invInner);
  D.body.appendChild(inv);

  /* --------------------------------------------- 3. 舞台（只有海，没有 GL） */
  var stage = D.createElement('div');
  stage.id = 'od-stage';
  stage.setAttribute('aria-hidden', 'true');
  stage.innerHTML =
    '<div class="od-air"></div>' +
    '<div class="od-sea-wrap">' +
    '  <div class="od-sea"><div class="od-sheen"></div></div>' +
    '</div>';
  D.body.appendChild(stage);

  HTML.classList.add('od-mode');
  HTML.setAttribute('data-hj-dark', '1');

  /* ------------------------------------------------------------- 4. 状态 */
  var FORWARD = ['abyss', 'ink', 'blood', 'mirror'];
  var BACKWARD = ['rev1', 'rev2', 'rev3', 'rev4'];
  var curAct = null, busy = false, tl = null;
  var locked = false, flipped = false, tailOpen = false;
  var last = 0;
  var TOP = {};

  var S = { act: 0, sea: 0, ink: 0 };

  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 2.2); }

  function absTop(el) {
    var y = 0, n = el, guard = 0;
    while (n && n !== D.body && n !== HTML && guard++ < 40) {
      y += n.offsetTop || 0;
      n = n.offsetParent;
    }
    return y;
  }
  function curScroll() {
    return flipped ? inv.scrollTop : (W.pageYOffset || HTML.scrollTop || 0);
  }
  function vh() { return W.innerHeight || 800; }
  function docH() {
    return flipped ? inv.scrollHeight : Math.max(D.body.scrollHeight, HTML.scrollHeight);
  }

  /* --------------------------------------------- 5. 时间线（只插值 sea/ink） */
  function play(steps) {
    var end = 0;
    var list = steps.map(function (s) {
      var at = s.at || 0, dur = s.dur || 0;
      if (at + dur > end) end = at + dur;
      return { at: at, dur: dur, key: s.key, to: s.to, fn: s.fn, started: false, done: false, from: 0, t0: 0 };
    });
    tl = { t: 0, steps: list, end: end + 0.08 };
    busy = true;
  }
  function stepTL(dt) {
    if (!tl) return;
    tl.t += dt;
    for (var i = 0; i < tl.steps.length; i++) {
      var s = tl.steps[i];
      if (!s.started && tl.t >= s.at) {
        s.started = true;
        s.from = (typeof S[s.key] === 'number') ? S[s.key] : 0;
        s.t0 = tl.t;
        if (s.fn) { s.fn(); s.done = true; }
      }
      if (s.started && !s.done) {
        var k = s.dur <= 0 ? 1 : clamp((tl.t - s.t0) / s.dur, 0, 1);
        S[s.key] = s.from + (s.to - s.from) * ease(k);
        if (k >= 1) s.done = true;
      }
    }
    if (tl.t >= tl.end) { tl = null; busy = false; }
  }

  /* --------------------------------------------- 6. 转场：只有海的涨落 */
  /* sea: 0 = 挂在屏幕外（一滴血都看不见）；1 = 铺满整屏。
     整篇是一条持续的上涨曲线，中间只在镜面那一幕退下去一次。 */
  var T = {
    'abyss>ink':    [{ at: 0.00, key: 'sea', to: 0.24, dur: 1.55 }, { at: 0.00, key: 'ink', to: 0.46, dur: 1.55 }],
    'ink>abyss':    [{ at: 0.00, key: 'sea', to: 0.08, dur: 1.45 }, { at: 0.00, key: 'ink', to: 0.00, dur: 1.45 }],
    'ink>blood':    [{ at: 0.00, key: 'sea', to: 0.68, dur: 1.70 }, { at: 0.00, key: 'ink', to: 0.10, dur: 1.40 }],
    'blood>ink':    [{ at: 0.00, key: 'sea', to: 0.24, dur: 1.40 }, { at: 0.00, key: 'ink', to: 0.46, dur: 1.40 }],
    'blood>mirror': [{ at: 0.00, key: 'sea', to: 1.00, dur: 1.75 }, { at: 0.10, key: 'ink', to: 0.55, dur: 1.30 }],
    'mirror>blood': [{ at: 0.00, key: 'sea', to: 0.68, dur: 1.20 }, { at: 0.00, key: 'ink', to: 0.10, dur: 1.10 }],
    '*>abyss':      [{ at: 0.00, key: 'sea', to: 0.08, dur: 1.45 }, { at: 0.00, key: 'ink', to: 0.00, dur: 1.45 }],
    '*>ink':        [{ at: 0.00, key: 'sea', to: 0.24, dur: 1.45 }, { at: 0.00, key: 'ink', to: 0.46, dur: 1.45 }],
    '*>blood':      [{ at: 0.00, key: 'sea', to: 0.68, dur: 1.50 }, { at: 0.00, key: 'ink', to: 0.10, dur: 1.20 }],
    '*>mirror':     [{ at: 0.00, key: 'sea', to: 1.00, dur: 1.60 }, { at: 0.00, key: 'ink', to: 0.55, dur: 1.30 }]
  };

  function applyInstant(name) {
    var base = {
      abyss:  { act: 0, sea: 0.08, ink: 0.00 },
      ink:    { act: 1, sea: 0.24, ink: 0.46 },
      blood:  { act: 2, sea: 0.68, ink: 0.10 },
      mirror: { act: 3, sea: 1.00, ink: 0.55 }
    }[name];
    if (!base) return;
    for (var k in base) S[k] = base[k];
  }

  function transition(from, to) {
    var seq = T[from + '>' + to] || T['*>' + to];
    curAct = to;
    if (!seq || !from) { applyInstant(to); return; }
    play(seq);
  }

  /* ------------------------------------------------------------- 7. 定位 */
  function measure() {
    TOP = {};
    var list = flipped ? BACKWARD : FORWARD;
    list.forEach(function (k) {
      if (secs[k]) TOP[k] = absTop(secs[k]);
    });
  }
  /* 测量是否可信：最后一幕的偏移确实落在下面（而不是全部挤在 0）。
     布局没稳定时 offsetTop 全 0，这时任何"当前在哪一幕"的判断都不能信。 */
  function trustMeasure() {
    var order = flipped ? BACKWARD : FORWARD;
    var last = TOP[order[order.length - 1]];
    return typeof last === 'number' && last > vh() * 0.5;
  }
  function currentName() {
    var order = flipped ? BACKWARD : FORWARD;
    if (!trustMeasure()) return order[0];
    var y = curScroll() + vh() * 0.42;
    var name = order[0];
    for (var i = 0; i < order.length; i++) {
      if (secs[order[i]] && TOP[order[i]] <= y + 2) name = order[i];
    }
    return name;
  }
  function actProgress(name) {
    var el = secs[name];
    if (!el) return 0;
    var top = TOP[name] || 0;
    var order = flipped ? BACKWARD : FORWARD;
    var i = order.indexOf(name), next = order[i + 1];
    var bot = (next && TOP[next] != null) ? TOP[next] : docH();
    var span = Math.max(1, bot - top - vh() * 0.5);
    return clamp((curScroll() - top) / span, 0, 1);
  }

  /* ------------------------------------------------------- 8. 镜面那一幕 */
  /* 满 → 退下去露出墨底（这一段是倒影文字在撑） → 涨回来，锁屏 */
  function updateMirror() {
    var p = actProgress('mirror');
    var sea;
    if (p < 0.10) {
      sea = 1;
    } else if (p < 0.44) {
      sea = 1 - ease((p - 0.10) / 0.34) * 0.97;
    } else if (p < 0.74) {
      sea = 0.03;
    } else {
      sea = 0.03 + ease((p - 0.74) / 0.26) * 0.97;
    }
    S.sea = sea;
    S.ink = 0.55;
    if (p > 0.97) lockBottom();
  }

  /* ------------------------------------------------------- 9. 反面的四幕 */
  function seg(name) {
    var el = secs[name];
    if (!el) return 0;
    var top = TOP[name] || 0;
    var h = el.offsetHeight || 0;
    var span = Math.max(1, h - vh() * 0.35);
    return clamp((curScroll() - top) / span, 0, 1);
  }
  /* 反面的顺序：血海下降 → 停住（俯视那一段，海面压得很低）→ 墨褪 → 海再微微回升 */
  function updateRev() {
    var p1 = seg('rev1'), p3 = seg('rev3'), p4 = seg('rev4');

    var sea = 1 - easeOut(clamp(p1 * 1.15, 0, 1)) * 0.95;   /* 1 → 0.05 */
    var ink = 0.62;

    if (p3 > 0) {
      ink = 0.62 * (1 - ease(clamp(p3 * 1.1, 0, 1)));        /* 墨褪干净 */
    }
    if (p4 > 0) {
      ink = 0;
      sea = 0.05 + easeOut(clamp(p4 * 1.1, 0, 1)) * 0.13;   /* 回到 0.05 → 0.18 */
    }

    S.sea = clamp(sea, 0, 1);
    S.ink = clamp(ink, 0, 1);
    S.act = S.sea > 0.5 ? 3 : (S.sea > 0.15 ? 1 : 0);

    if (p4 > 0.55 && !tailOpen) {
      tailOpen = true;
      tail.classList.add('open');
      D.body.classList.add('od-tail-open');
    }
  }

  /* ------------------------------------------------------------ 10. 锁屏 */
  var endEl = null;
  function lockBottom() {
    if (locked) return;
    locked = true;
    HTML.classList.add('od-locked');
    if (!endEl) {
      endEl = D.createElement('div');
      endEl.className = 'od-end';
      endEl.innerHTML =
        '<div class="od-end-mid">' +
        '  <div class="od-end-line">镜子的另一边</div>' +
        '  <div class="od-end-refl">重获新生</div>' +
        '</div>' +
        '<div class="od-end-hint">轻触，翻面</div>';
      D.body.appendChild(endEl);
      endEl.addEventListener('click', flip);
    }
    setTimeout(function () { if (endEl) endEl.classList.add('on'); }, 520);
  }

  /* ------------------------------------------------------------ 11. 翻面 */
  var turn = null;
  function moveTail() {
    if (!tail) return;
    ['#post-comment', '.post-copyright', '.tag_share', '.post-share'].forEach(function (sel) {
      var el = D.querySelector(sel);
      if (el && !tail.contains(el)) tail.appendChild(el);
    });
    try { W.dispatchEvent(new Event('resize')); } catch (e) {}
  }

  function flip() {
    if (flipped) return;
    flipped = true;
    if (endEl) endEl.classList.remove('on');
    S.sea = 1;
    if (!turn) {
      turn = D.createElement('div');
      turn.className = 'od-turn';
      D.body.appendChild(turn);
    }
    HTML.classList.add('od-turning');
    void turn.offsetWidth;
    turn.classList.add('run');

    setTimeout(function () {
      HTML.classList.add('od-flipped');
      inv.style.display = 'block';
      void inv.offsetHeight;
      requestAnimationFrame(function () { inv.classList.add('on'); });
      moveTail();
      measure();
      inv.scrollTop = 0;
      S.act = 3; S.sea = 1; S.ink = 0.62;
      HTML.classList.remove('od-locked');
      if (endEl) endEl.style.display = 'none';
      curAct = 'rev1';
    }, 620);

    setTimeout(function () {
      HTML.classList.remove('od-turning');
      turn.classList.remove('run');
      measure();
    }, 1900);
  }

  W.addEventListener('resize', function () { measure(); }, { passive: true });

  /* ------------------------------------------------------------- 12. 主循环 */
  var lastSea = -1, lastInk = -1;
  function pushVars() {
    var s = Math.round(clamp(S.sea, 0, 1) * 500) / 500;
    var k = Math.round(clamp(S.ink, 0, 1) * 200) / 200;
    if (s !== lastSea) { stage.style.setProperty('--od-sea', s.toFixed(4)); lastSea = s; }
    if (k !== lastInk) { stage.style.setProperty('--od-ink', k.toFixed(4)); lastInk = k; }
  }

  function tick(now) {
    requestAnimationFrame(tick);
    if (!last) last = now;
    var dt = Math.min(0.06, (now - last) / 1000);
    last = now;

    stepTL(dt);

    if (!busy && !flipped) {
      var n = currentName();
      if (n !== curAct) transition(curAct, n);
      else if (n === 'mirror') updateMirror();
    }
    if (!busy && flipped) updateRev();

    pushVars();

    if (!flipped) {
      D.body.setAttribute('data-od-cur', curAct || 'abyss');
      if (!locked && curAct === 'mirror' && !busy && docH() > vh() * 1.5) {
        if (W.pageYOffset + vh() >= docH() - 8) lockBottom();
      }
    }
  }

  /* ------------------------------------------------------------- 13. 启动 */
  measure();
  (function boot() {
    /* 布局还没稳定就从第一幕开始，滚动到位后再由 currentName 接管 */
    var n = trustMeasure() ? currentName() : 'abyss';
    curAct = n;
    applyInstant(n);
    pushVars();
  })();
  requestAnimationFrame(tick);

  if (W.IntersectionObserver) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) e.target.classList.add('in'); });
    }, { rootMargin: '-4% 0px -10% 0px', threshold: 0.01 });
    Object.keys(secs).forEach(function (k) { io.observe(secs[k]); });
  } else {
    Object.keys(secs).forEach(function (k) { secs[k].classList.add('in'); });
  }
  setTimeout(function () {
    Object.keys(secs).forEach(function (k) { secs[k].classList.add('in'); });
    measure();
  }, 1600);
  setTimeout(measure, 2600);
  if (D.fonts && D.fonts.ready) D.fonts.ready.then(measure).catch(function () {});

  W.ODDEBUG = {
    s: S, secs: secs, inv: inv, flip: flip, lock: lockBottom,
    measure: measure, cur: function () { return { act: curAct, flipped: flipped, locked: locked }; }
  };
})();
