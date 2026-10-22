/* =============================================================================
   odyssey.js · 四渡 · 镜湖 的文章主控
   -----------------------------------------------------------------------------
   做四件事：
   1. 把 Markdown 里的幕标记（:::act xxx / <!-- act:xxx -->）拆成一幕一幕；
   2. 滚动 → 场景状态机 → 时间线转场（每一幕之间是"过渡"，不是"切换"）；
   3. 影蚀一幕的墨污染：鼠标附着、久留变多、净水里很慢地洗掉、太脏就看不见字；
   4. 镜面一幕：血海升降 → 锁屏 → 翻面（整页转 180°，世界与文字一起倒过来），
      反面的四幕按相反顺序播放，走到最后的彼岸才把评论、分享、版权交还给你。
   ============================================================================= */
(function () {
  'use strict';
  var D = document, W = window, HTML = D.documentElement;
  var root = D.getElementById('article-container') || D.querySelector('.post-content');
  if (!root) return;

  var ACTS = ['abyss', 'ink', 'blood', 'mirror', 'rev1', 'rev2', 'rev3', 'rev4'];

  /* ------------------------------------------------------------- 1. 拆幕 */
  /* 三条来路都收：构建期过滤器产出的 div、HTML 注释、以及正文里原样残留的
     ":::act 名字" 段落。最后一条是运行时兜底——Hexo 过滤器没被加载时
     （hexo server 忘了重启、文章走接口导入之类），页面照样能自愈。 */
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
    if (root.querySelector('.od-mark')) return;     /* 过滤器已经干过活了 */
    var VALID = new RegExp('^(' + ACTS.join('|') + ')$', 'i');
    var cand = root.querySelectorAll('p, div, li, pre, h1, h2, h3, h4, h5, h6');
    var hits = [];
    for (var i = 0; i < cand.length; i++) {
      var el = cand[i];
      if (el.classList && el.classList.contains('od-mark')) continue;
      /* 只认"叶子块"：容器 div 的 textContent 会连正文一起拼进来 */
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
    return;                                   /* 不是多幕文章，直接退出 */
  }

  /* 万一被 markdown 包进段落里，提到容器顶层 */
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

  /* --------------------------------------------- 2. 反面专用的滚动世界 */
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

  /* ------------------------------------------------------------- 3. 画布 */
  var stage = D.createElement('div');
  stage.id = 'od-stage';
  var canvas = D.createElement('canvas');
  canvas.className = 'od-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  stage.appendChild(canvas);
  D.body.appendChild(stage);

  /* GL 起不来（老显卡 / 关了硬件加速 / 驱动拒绝 WebGL2）时把异常吞掉，
     让拆幕、排版、翻转这些和显卡无关的部分照常工作 */
  var E = null;
  try {
    E = (W.ODGL && W.ODGL.create(canvas)) || null;
  } catch (err) {
    E = null;
    if (W.console) console.error('[odyssey] WebGL 初始化失败，退回静态主题:', err);
  }
  var S = E ? E.s : {
    act: 0, camTop: 0, spin: 0, grow: 1, ash: 0, ink: 0, blood: 0, sea: 0,
    sun: 1, mx: 0, my: 0, wash: 0, bedRise: 0
  };
  if (!E) HTML.classList.add('od-no-gl');
  HTML.classList.add('od-mode');
  HTML.setAttribute('data-hj-dark', '1');

  /* ------------------------------------------------------------- 4. 状态 */
  var FORWARD = ['abyss', 'ink', 'blood', 'mirror'];
  var BACKWARD = ['rev1', 'rev2', 'rev3', 'rev4'];
  var curAct = null, busy = false, tl = null;
  var topMode = false, spinBase = 0, wasCam = false;
  var locked = false, flipped = false, tailOpen = false;
  var mx = 0, my = 0, tmx = 0, tmy = 0;
  var inkLoad = 0, lastPoke = 0, dwellT = 0, last = 0;
  var TOP = {};

  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 2.2); }

  /* 相对滚动容器内容的绝对偏移（避开 position 祖先与 transform 的干扰） */
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

  /* ------------------------------------------------------------- 5. 时间线 */
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

  /* ------------------------------------------------------------- 6. 转场表 */
  var T = {
    /* 彼岸 → 影蚀：除了湖，全都变成飞灰散掉 */
    'abyss>ink': [
      { at: 0.00, key: 'ash', to: 1, dur: 1.55 },
      { at: 0.05, key: 'grow', to: 0, dur: 1.45 },
      { at: 0.12, key: 'sun', to: 0, dur: 1.05 },
      { at: 0.15, key: 'bedRise', to: 0, dur: 0.30 },
      { at: 0.90, fn: function () { S.act = 1; S.ash = 1; S.grow = 0; } },
      { at: 0.95, key: 'ink', to: 1, dur: 1.60 },
      { at: 0.95, key: 'wash', to: 0.55, dur: 1.20 }
    ],
    /* 影蚀 → 彼岸：湖底抬起来，花木再长一遍，镜头从俯视旋回侧视 */
    'ink>abyss': [
      { at: 0.00, fn: function () { S.act = 0; S.ash = 0; S.grow = 0; S.camTop = 0.55; S.bedRise = 0; } },
      { at: 0.00, key: 'ink', to: 0, dur: 1.25 },
      { at: 0.18, key: 'bedRise', to: 1, dur: 1.70 },
      { at: 0.46, key: 'grow', to: 1, dur: 2.70 },
      { at: 0.46, key: 'camTop', to: 0, dur: 2.30 },
      { at: 0.72, key: 'sun', to: 1, dur: 1.50 },
      { at: 0.00, key: 'wash', to: 0.15, dur: 0.90 }
    ],
    /* 影蚀 → 血雨：先被墨浸满整屏，墨褪下去的时候已经是血 */
    'ink>blood': [
      { at: 0.00, key: 'ink', to: 1.80, dur: 0.95 },
      { at: 0.00, key: 'ash', to: 1, dur: 0.70 },
      { at: 0.95, fn: function () { S.act = 2; S.grow = 0; S.ash = 1; if (E) E.clearBlood(); } },
      { at: 1.00, key: 'ink', to: 0.08, dur: 1.35 },
      { at: 1.00, key: 'blood', to: 1, dur: 1.25 }
    ],
    /* 血雨 → 影蚀：血迹抹掉，露出清水 */
    'blood>ink': [
      { at: 0.00, fn: function () { S.act = 1; S.grow = 0; S.ash = 1; S.ink = 0.30; if (E) E.clearBlood(); } },
      { at: 0.00, key: 'blood', to: 0, dur: 1.15 },
      { at: 0.00, key: 'ink', to: 1, dur: 1.45 },
      { at: 0.22, key: 'wash', to: 0.55, dur: 1.00 }
    ],
    /* 血雨 → 镜面：血填满，成了血海 */
    'blood>mirror': [
      { at: 0.00, key: 'sea', to: 1, dur: 1.75 },
      { at: 0.10, key: 'blood', to: 0.45, dur: 1.30 },
      { at: 0.55, key: 'ink', to: 0.90, dur: 1.10 },
      { at: 1.10, fn: function () { S.act = 3; S.blood = 0.35; S.ink = 0.90; } }
    ],
    'mirror>blood': [
      { at: 0.00, fn: function () { S.act = 2; } },
      { at: 0.00, key: 'sea', to: 0, dur: 1.10 },
      { at: 0.10, key: 'ink', to: 0.08, dur: 1.05 },
      { at: 0.10, key: 'blood', to: 1, dur: 1.15 }
    ],
    '*>abyss': [
      { at: 0.00, fn: function () { S.act = 0; S.ash = 0; S.grow = 0; S.sea = 0; S.blood = 0; S.ink = 0; S.bedRise = 1; } },
      { at: 0.25, key: 'grow', to: 1, dur: 2.50 },
      { at: 0.45, key: 'camTop', to: 0, dur: 2.10 },
      { at: 0.75, key: 'sun', to: 1, dur: 1.40 }
    ],
    '*>ink': [
      { at: 0.00, fn: function () { S.act = 1; S.ash = 1; S.grow = 0; S.sea = 0; S.blood = 0; S.sun = 0; } },
      { at: 0.00, key: 'ink', to: 1, dur: 1.30 }
    ],
    '*>blood': [
      { at: 0.00, fn: function () { S.act = 2; S.ash = 1; S.grow = 0; S.sea = 0; S.ink = 0.10; S.sun = 0; } },
      { at: 0.00, key: 'blood', to: 1, dur: 1.20 }
    ],
    '*>mirror': [
      { at: 0.00, fn: function () { S.act = 3; S.ink = 0.90; S.blood = 0.35; S.grow = 0; S.ash = 1; S.sun = 0; } },
      { at: 0.00, key: 'sea', to: 1, dur: 1.60 }
    ]
  };

  function applyInstant(name) {
    var base = {
      abyss:  { act: 0, camTop: 0, spin: 0, grow: 1, ash: 0, ink: 0, blood: 0, sea: 0, sun: 1, wash: 0, bedRise: 0 },
      ink:    { act: 1, camTop: 0, spin: 0, grow: 0, ash: 1, ink: 1, blood: 0, sea: 0, sun: 0, wash: 0.55, bedRise: 0 },
      blood:  { act: 2, camTop: 0, spin: 0, grow: 0, ash: 1, ink: 0.08, blood: 1, sea: 0, sun: 0, wash: 0, bedRise: 0 },
      mirror: { act: 3, camTop: 0, spin: 0, grow: 0, ash: 1, ink: 0.90, blood: 0.35, sea: 1, sun: 0, wash: 0, bedRise: 0 }
    }[name];
    if (!base) return;
    for (var k in base) S[k] = base[k];
  }

  function transition(from, to) {
    var seq = T[from + '>' + to] || T['*>' + to];
    curAct = to;
    /* 离开彼岸时把俯视收回：后面几幕都是贴着地面的视角 */
    if (from === 'abyss' && to !== 'abyss' && topMode) {
      topMode = false;
      topBtn.classList.remove('on');
      topBtn.setAttribute('aria-pressed', 'false');
    }
    if (!seq || !from) { applyInstant(to); if (to === 'mirror') S.sea = 1; return; }
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
  function currentName() {
    var order = flipped ? BACKWARD : FORWARD;
    var y = curScroll() + vh() * 0.42;
    var name = order[0];
    for (var i = 0; i < order.length; i++) {
      if (secs[order[i]] && TOP[order[i]] <= y + 2) name = order[i];
    }
    return name;
  }
  /* 一幕内部的进度 0..1（从这一幕顶端开始算，别提前半屏） */
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

  /* ------------------------------------------------------------- 8. 镜面幕 */
  function updateMirror() {
    var p = actProgress('mirror');
    var sea = 0, cam = 0, ink = 0.92;
    if (p < 0.12) {
      sea = 1;
    } else if (p < 0.46) {
      sea = 1 - ease((p - 0.12) / 0.34) * 0.97;
    } else if (p < 0.72) {
      sea = 0.03;
    } else if (p < 0.88) {
      /* 侧视的镜头一摆 */
      sea = 0.03;
      cam = Math.sin((p - 0.72) / 0.16 * Math.PI) * 0.55;
    } else {
      sea = ease((p - 0.88) / 0.12);
    }
    S.sea = sea;
    S.camTop = cam;
    S.ink = ink;
    if (p > 0.97) lockBottom();
  }

  /* --------------------------------------------------------- 9. 反面的四幕 */
  function seg(name) {
    var el = secs[name];
    if (!el) return 0;
    var top = TOP[name] || 0;
    var h = el.offsetHeight || 0;
    var span = Math.max(1, h - vh() * 0.35);
    return clamp((curScroll() - top) / span, 0, 1);
  }
  function updateRev() {
    var p1 = seg('rev1'), p2 = seg('rev2'), p3 = seg('rev3'), p4 = seg('rev4');

    /* 一 · 血海下降 */
    S.sea = 1 - easeOut(p1) * 0.96;

    /* 二 · 俯视 */
    S.camTop = p2 > 0 ? ease(clamp(p2 * 1.25, 0, 1)) : 0;

    /* 三 · 墨褪 + 湖底上升 */
    S.ink = 0.92 * (1 - ease(clamp(p3 * 1.1, 0, 1)));
    S.bedRise = ease(clamp(p3 * 1.15, 0, 1));
    S.blood = 0.30 * (1 - clamp(p1 * 2.2, 0, 1));

    /* 四 · 彼岸：从侧视长到天上 */
    if (p4 > 0) {
      S.grow = ease(clamp(p4 * 1.25, 0, 1));
      S.ash = 1 - clamp(p4 * 2.0, 0, 1);
      S.sun = ease(clamp(p4 * 1.5, 0, 1));
      S.camTop = ease(clamp(1 - (p4 - 0.42) / 0.5, 0, 1));
      S.sea = 0;
    }

    /* 配色看当下更像哪一幕 */
    if (S.grow > 0.12) S.act = 0;
    else if (S.sea > 0.30) S.act = 3;
    else S.act = 1;

    /* 走到最后的彼岸：把评论/分享/版权交出来 */
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
      S.act = 3; S.sea = 1; S.ink = 0.92; S.blood = 0.30;
      S.grow = 0; S.camTop = 0; S.ash = 1; S.sun = 0; S.bedRise = 0;
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

  /* ------------------------------------------------------------- 12. 俯视键 */
  var ui = D.createElement('div');
  ui.className = 'od-ui';
  ui.innerHTML =
    '<button class="od-btn od-btn-top" type="button" aria-pressed="false">' +
    '<span class="od-btn-i"></span><span class="od-btn-t">俯视</span></button>';
  D.body.appendChild(ui);
  var topBtn = ui.querySelector('.od-btn-top');
  topBtn.addEventListener('click', function () {
    if (busy) return;
    topMode = !topMode;
    topBtn.setAttribute('aria-pressed', topMode ? 'true' : 'false');
    topBtn.classList.toggle('on', topMode);
    spinBase = curScroll();
  });

  /* ------------------------------------------------------------- 13. 指针 */
  W.addEventListener('pointermove', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    tmx = (e.clientX / W.innerWidth) * 2 - 1;
    tmy = (e.clientY / W.innerHeight) * 2 - 1;

    /* 墨的附着：只有影蚀一幕，且点在墨里才沾 */
    if (S.act === 1 && !busy && !flipped && E) {
      var now = performance.now();
      if (now - lastPoke > 55) {
        lastPoke = now;
        var u = e.clientX / W.innerWidth;
        var v = 1 - e.clientY / W.innerHeight;
        var sp = Math.min(6, Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0));
        E.poke(u + (Math.random() - 0.5) * 0.012, v + (Math.random() - 0.5) * 0.012, 0.032 + sp * 0.012);
        inkLoad = Math.min(1.3, inkLoad + 0.004 + sp * 0.0035);
      }
    }
  }, { passive: true });

  W.addEventListener('resize', function () { measure(); if (E) E.resize(); }, { passive: true });

  /* --------------------------------------------------------- 14. 墨吃字 */
  (function eatText() {
    var sec = secs.ink;
    if (!sec) return;
    var ps = sec.querySelectorAll('p');
    var seed = 20261023;
    function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
    [].slice.call(ps).forEach(function (p, i) {
      if (i % 3 === 2) return;
      var nodes = [], walker = D.createTreeWalker(p, NodeFilter.SHOW_TEXT, null), n;
      while ((n = walker.nextNode())) { if (n.nodeValue && n.nodeValue.trim().length > 8) nodes.push(n); }
      if (!nodes.length) return;
      var t = nodes[Math.floor(rnd() * nodes.length)];
      var s = t.nodeValue, len = 2 + Math.floor(rnd() * 4);
      var at = 3 + Math.floor(rnd() * Math.max(1, s.length - len - 3));
      if (at + len >= s.length) return;
      var span = D.createElement('span');
      span.className = 'od-eat';
      span.textContent = s.slice(at, at + len);
      span.style.transitionDelay = (rnd() * 1.6).toFixed(2) + 's';
      var after = t.splitText(at);
      after.nodeValue = after.nodeValue.slice(len);
      t.parentNode.insertBefore(span, after);
    });
  })();

  /* ------------------------------------------------------------- 15. 主循环 */
  function tick(now) {
    requestAnimationFrame(tick);
    if (!last) last = now;
    var dt = Math.min(0.06, (now - last) / 1000);
    last = now;

    mx += (tmx - mx) * Math.min(1, dt * 3.2);
    my += (tmy - my) * Math.min(1, dt * 3.2);
    S.mx = mx; S.my = my;

    stepTL(dt);

    if (!busy && !flipped) {
      var n = currentName();
      if (n !== curAct) transition(curAct, n);
      else if (n === 'mirror') updateMirror();
      else if (n === 'abyss') S.sea = Math.max(0, S.sea - dt * 2);
    }
    if (!busy && flipped) updateRev();

    /* 俯视：世界跟着滚动顺时针转；非俯视把太阳给回来 */
    var camF = clamp(S.camTop, 0, 1);
    if (camF > 0.04) {
      if (!wasCam) { wasCam = true; spinBase = curScroll(); }
      S.spin = -(curScroll() - spinBase) * 0.0013 * camF;
    } else {
      wasCam = false;
      S.spin += (0 - S.spin) * Math.min(1, dt * 2.2);
    }
    if (!flipped && !busy && S.act === 0) {
      var wantTop = topMode ? 1 : 0;
      var d = wantTop - S.camTop;
      if (Math.abs(d) > 0.004) S.camTop += d * Math.min(1, dt * 3.4);
      if (Math.abs(wantTop - S.camTop) < 0.01) S.camTop = wantTop;
      S.sun = clamp(S.sun + (1 - S.camTop - S.sun) * Math.min(1, dt * 2), 0, 1);
    }

    /* 墨：待着不动也会多；泡在干净的水里洗得很慢 */
    if (!flipped && S.act === 1 && !busy) {
      dwellT += dt;
      if (dwellT > 1.8) {
        dwellT = 0;
        inkLoad = Math.min(1.36, inkLoad + 0.007);
        if (E) {
          var edge = Math.floor(Math.random() * 4);
          var u = edge < 2 ? Math.random() : (edge === 2 ? 0.02 : 0.98);
          var v = edge < 2 ? (edge === 0 ? 0.02 : 0.98) : Math.random();
          E.poke(u, v, 0.05 + Math.random() * 0.06);
        }
      }
      /* 指针沉到画面下半 = 泡进湖里 */
      var washing = my > 0.15 ? 1 : 0;
      inkLoad -= dt * (0.008 + washing * 0.022);
      if (inkLoad < 0) inkLoad = 0;
      S.wash = 0.30 + washing * 0.55;
    } else {
      inkLoad -= dt * 0.25;
      if (inkLoad < 0) inkLoad = 0;
    }
    if (inkLoad > 0.70) D.body.classList.add('od-drown'); else D.body.classList.remove('od-drown');
    D.body.style.setProperty('--od-ink', inkLoad.toFixed(3));

    if (!flipped) {
      D.body.setAttribute('data-od-cur', curAct || 'abyss');
      if (!locked && curAct === 'mirror' && !busy && docH() > vh() * 1.5) {
        if (W.pageYOffset + vh() >= docH() - 8) lockBottom();
      }
    }

    if (E) {
      try { E.render(now); }
      catch (err) {
        /* 显卡/驱动不认这套 shader 时，别让整页跟着死：退成静态天光，文字照样读 */
        E = null;
        HTML.classList.add('od-no-gl');
        if (W.console) console.error('[odyssey] render stopped:', err);
      }
    }
  }

  /* ------------------------------------------------------------- 16. 启动 */
  measure();
  (function boot() {
    var n = currentName();
    /* 布局还没稳定时 offsetTop 可能全是 0，currentName 会误判成最后一幕
       （一进来就是锁屏的血海）。这里先用测量结果是否可信来兜一下：
       可信 = 后面几幕的偏移确实比第一幕大。 */
    var trust = TOP.mirror != null && TOP.mirror > (TOP.abyss || 0) + 40;
    if (!trust) n = 'abyss';
    curAct = n;
    applyInstant(n);
    if (n === 'mirror') S.sea = 1;
    topBtn.classList.toggle('on', topMode);
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

  /* 给控制台留一个把手（调参 / 排错用，不影响阅读） */
  W.ODDEBUG = {
    s: S, secs: secs, inv: inv, flip: flip, lock: lockBottom,
    measure: measure, cur: function () { return { act: curAct, flipped: flipped, locked: locked }; }
  };
})();
