/* =========================================================
   site.js —— 全站彩蛋 / 主题 / 暗门菜单 / MC 成就框 / 烟花
   纯静态：所有状态存在 cookie（主）+ localStorage（备）
   ========================================================= */
(function () {
  'use strict';

  var D = document;
  var H = D.documentElement;
  var COOKIE_DAYS = 3650;           // 十年，等于「永久」
  var IS_HOME = location.pathname === '/' || /\/index\.html$/.test(location.pathname);

  /* ---------- 0. 存取 ---------- */

  function getCookie(name) {
    var m = D.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  }
  function setCookie(name, val, days) {
    var d = new Date();
    d.setTime(d.getTime() + (days || COOKIE_DAYS) * 864e5);
    D.cookie = name + '=' + encodeURIComponent(val) + '; expires=' + d.toUTCString() + '; path=/; SameSite=Lax';
  }
  function storeGet(k) {
    try { return localStorage.getItem(k); } catch (e) { return null; }
  }
  function storeSet(k, v) {
    try { localStorage.setItem(k, v); } catch (e) { /* 无痕模式忽略 */ }
  }
  function readState(key, fallback) {
    return getCookie(key) || storeGet(key) || fallback;
  }
  function writeState(key, val) {
    setCookie(key, val);
    storeSet(key, val);
  }

  /* ---------- 1. 主题 ---------- */

  var THEMES = [
    { id: 'rain',     name: '雨夜霓虹', en: 'RAIN',     dark: true,  desc: '首选项 · 路灯、雨丝和一层冷光',
      sw: 'linear-gradient(140deg,#04060f,#0a1226 55%,#6fe3ff)' },
    { id: 'ink',      name: '水墨禅',   en: 'INK',      dark: false, desc: '宣纸、松烟、一点朱砂',
      sw: 'linear-gradient(140deg,#f7f2e7,#e6d8bf 60%,#a8442a)' },
    { id: 'sakura',   name: '樱花糖',   en: 'SAKURA',   dark: false, desc: '浅粉、糖霜、会落花瓣',
      sw: 'linear-gradient(140deg,#fff6f9,#ffd7e5 60%,#ff6f9c)' },
    { id: 'midnight', name: '深空蓝',   en: 'MIDNIGHT', dark: true,  desc: '没有月亮，只有星屑',
      sw: 'linear-gradient(140deg,#05040f,#1a1440 58%,#a78bfa)' },
    { id: 'newyear',  name: '新年',     en: 'NEW YEAR', dark: true,  locked: true,
      desc: '红与金 · 集齐六片碎纸才开',
      sw: 'linear-gradient(140deg,#2a0606,#7a1409 55%,#ffcf5c)' }
  ];

  function themeById(id) {
    for (var i = 0; i < THEMES.length; i++) if (THEMES[i].id === id) return THEMES[i];
    return null;
  }
  function isNewYearUnlocked() {
    return readState('hj_newyear', '') === '1';
  }

  function applyTheme(id, opts) {
    var t = themeById(id) || THEMES[0];
    if (t.locked && !isNewYearUnlocked()) {
      toast('还差一点', '新年主题还锁着', 'lock');
      return false;
    }
    H.setAttribute('data-hj-theme', t.id);
    H.setAttribute('data-hj-dark', t.dark ? '1' : '0');
    writeState('hj_theme', t.id);
    if (window.HJ && HJ.particles) HJ.particles.setTheme(t.id);
    if (!(opts && opts.silent)) achievement('换个世界', t.name + ' · ' + t.en, 'theme');
    refreshUI();
    try { D.dispatchEvent(new CustomEvent('hj:theme', { detail: { theme: t.id } })); } catch (e) { /* 老浏览器 */ }
    return true;
  }

  /* ---------- 2. 碎片 ---------- */

  var EGGS = [
    { id: 'f1', ch: '旧', token: '5pen',  no: '壹', name: '碎片 · 壹',
      where: '任何一页的 HTML 源码里，某个注释藏了一串 base64。', tip: '旧' },
    { id: 'f2', ch: '辞', token: '6L6e',  no: '贰', name: '碎片 · 贰',
      where: '街机厅里那台会掉星星的机器，接住十三颗。', tip: '辞' },
    { id: 'f3', ch: '迎', token: '6L+O',  no: '叁', name: '碎片 · 叁',
      where: '解密台的凯撒轮盘：把 QHZBHDU 往左推三步。', tip: '迎' },
    { id: 'f4', ch: '新', token: '5paw',  no: '肆', name: '碎片 · 肆',
      where: '《冰箱里的月亮》文末的附注。', tip: '新' },
    { id: 'f5', ch: '团', token: '5Zui',  no: '伍', name: '碎片 · 伍',
      where: '星图上那颗不该存在的第七颗星。', tip: '团' },
    { id: 'f6', ch: '圆', token: '5ZyG',  no: '陆', name: '碎片 · 陆',
      where: '第七夜。集齐五片之后，门才会开。', tip: '圆' }
  ];
  var ORDER = ['f2', 'f1', 'f3', 'f4', 'f5', 'f6'];   // 辞旧迎新团圆

  function eggList() {
    var raw = readState('hj_eggs', '');
    return raw ? raw.split('|').filter(Boolean) : [];
  }
  function hasEgg(id) { return eggList().indexOf(id) >= 0; }
  function eggCount() { return eggList().length; }
  function eggById(id) {
    for (var i = 0; i < EGGS.length; i++) if (EGGS[i].id === id) return EGGS[i];
    return null;
  }
  function eggByChar(ch) {
    for (var i = 0; i < EGGS.length; i++) if (EGGS[i].ch === ch) return EGGS[i];
    return null;
  }

  function addEgg(id, quiet) {
    if (hasEgg(id)) return false;
    var e = eggById(id);
    if (!e) return false;
    var list = eggList();
    list.push(id);
    writeState('hj_eggs', list.join('|'));

    if (!quiet) {
      achievement('进度达成！', e.name + ' 「' + e.ch + '」', 'frag');
      sound('frag');
      burst(window.innerWidth / 2, window.innerHeight * 0.42, 26);
    }
    refreshUI();

    if (eggCount() >= EGGS.length && !isNewYearUnlocked()) {
      setTimeout(complete, quiet ? 300 : 900);
    }
    return true;
  }

  function complete() {
    writeState('hj_newyear', '1');
    refreshUI();
    sound('win');
    fireworks(7200);
    setTimeout(function () {
      achievement('成就已达成！', '新年快乐！', 'lantern');
    }, 420);
    setTimeout(showFinale, 1400);
  }

  function resetEggs() {
    writeState('hj_eggs', '');
    writeState('hj_newyear', '');
    writeState('hj_found', '');
    if (H.getAttribute('data-hj-theme') === 'newyear') applyTheme('rain', { silent: true });
    refreshUI();
    toast('重置完成', '六片碎纸又散了', 'lock');
  }

  /* ---------- 3. 隐藏页面 ---------- */

  /* 只留名字，不写任何说明——进去才知道是什么 */
  var PAGES = [
    { href: '/vault/',   no: '01', name: '一张桌子', icon: '🗝️' },
    { href: '/arcade/',  no: '02', name: '街机厅',   icon: '🕹️' },
    { href: '/atlas/',   no: '03', name: '星图',     icon: '🌌' },
    { href: '/seventh/', no: '04', name: '第七夜',   icon: '🌑' }
  ];

  function foundList() {
    var raw = readState('hj_found', '');
    return raw ? raw.split('|').filter(Boolean) : [];
  }
  function markFound(href) {
    var l = foundList();
    if (l.indexOf(href) < 0) {
      l.push(href);
      writeState('hj_found', l.join('|'));
      if (l.length === 1) achievement('找到一扇门', '不在导航里的那种', 'door');
    }
  }
  function pageLocked(p) {
    return p.href === '/seventh/' && eggCount() < 5;
  }

  /* ---------- 4. MC 成就框 ---------- */

  var toastQueue = [];
  var toastBusy = false;

  var ICONS = {
    frag: '<svg viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">' +
      '<rect width="32" height="32" fill="#2b2318"/><rect x="3" y="3" width="26" height="26" fill="#151009"/>' +
      '<rect x="10" y="6" width="12" height="4" fill="#f4d06f"/><rect x="12" y="10" width="8" height="4" fill="#ffe9a8"/>' +
      '<rect x="11" y="14" width="10" height="4" fill="#f4d06f"/><rect x="13" y="18" width="6" height="4" fill="#d9a93f"/>' +
      '<rect x="15" y="22" width="2" height="5" fill="#f4d06f"/></svg>',
    lantern: '<svg viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">' +
      '<rect width="32" height="32" fill="#3a0d08"/><rect x="2" y="2" width="28" height="28" fill="#5a0d08"/>' +
      '<rect x="8" y="5" width="16" height="3" fill="#ffcf5c"/><rect x="9" y="8" width="14" height="13" fill="#e23b2f"/>' +
      '<rect x="10" y="9" width="3" height="11" fill="#ff7a5d"/><rect x="19" y="9" width="3" height="11" fill="#ff7a5d"/>' +
      '<rect x="12" y="21" width="8" height="2" fill="#ffcf5c"/><rect x="15" y="23" width="2" height="4" fill="#ffcf5c"/>' +
      '<rect x="14" y="27" width="4" height="2" fill="#ffe9a8"/></svg>',
    theme: '<svg viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">' +
      '<rect width="32" height="32" fill="#20142e"/><rect x="3" y="3" width="26" height="26" fill="#120a1c"/>' +
      '<rect x="7" y="7" width="6" height="6" fill="#6fe3ff"/><rect x="15" y="7" width="6" height="6" fill="#b78bff"/>' +
      '<rect x="23" y="7" width="3" height="6" fill="#ffcf5c"/><rect x="7" y="15" width="6" height="6" fill="#ff6f9c"/>' +
      '<rect x="15" y="15" width="6" height="6" fill="#57f2a5"/><rect x="23" y="15" width="3" height="6" fill="#a8442a"/>' +
      '<rect x="7" y="23" width="6" height="3" fill="#4dd0ff"/><rect x="15" y="23" width="6" height="3" fill="#e8e8e8"/></svg>',
    door: '<svg viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">' +
      '<rect width="32" height="32" fill="#1b1208"/><rect x="7" y="4" width="18" height="24" fill="#6b4423"/>' +
      '<rect x="9" y="6" width="14" height="20" fill="#3f2713"/><rect x="11" y="8" width="4" height="16" fill="#4d3018"/>' +
      '<rect x="20" y="16" width="2" height="2" fill="#f4d06f"/></svg>',
    lock: '<svg viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">' +
      '<rect width="32" height="32" fill="#1c1c1c"/><rect x="9" y="14" width="14" height="11" fill="#c9a24a"/>' +
      '<rect x="10" y="15" width="12" height="9" fill="#8a6b2f"/><rect x="12" y="9" width="8" height="5" fill="#c9a24a"/>' +
      '<rect x="14" y="9" width="4" height="5" fill="#1c1c1c"/><rect x="15" y="18" width="2" height="3" fill="#1c1c1c"/></svg>'
  };

  function achievement(header, title, icon) {
    toastQueue.push({ h: header, t: title, i: icon || 'frag' });
    if (!toastBusy) nextToast();
  }

  function nextToast() {
    var job = toastQueue.shift();
    if (!job) { toastBusy = false; return; }
    toastBusy = true;

    var box = D.createElement('div');
    box.className = 'mc-toast';
    box.setAttribute('role', 'status');
    box.innerHTML =
      '<div class="mc-toast-icon">' + (ICONS[job.i] || ICONS.frag) + '</div>' +
      '<div class="mc-toast-text">' +
        '<span class="mc-toast-h"></span>' +
        '<span class="mc-toast-t"></span>' +
      '</div>';
    box.querySelector('.mc-toast-h').textContent = job.h;
    box.querySelector('.mc-toast-t').textContent = job.t;
    box.title = job.h + ' ' + job.t;
    getToasts().appendChild(box);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () { box.classList.add('mc-show'); });
    });

    setTimeout(function () {
      box.classList.remove('mc-show');
      box.classList.add('mc-hide');
      setTimeout(function () {
        if (box.parentNode) box.parentNode.removeChild(box);
        nextToast();
      }, 520);
    }, 4200);
  }

  function getToasts() {
    var el = D.getElementById('hj-toasts');
    if (!el) {
      el = D.createElement('div');
      el.id = 'hj-toasts';
      D.body.appendChild(el);
    }
    return el;
  }

  function toast(header, title, icon) { achievement(header, title, icon || 'frag'); }

  /* ---------- 5. 音效（很轻，失败就算了） ---------- */

  var actx = null;
  function sound(kind) {
    try {
      if (!actx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        actx = new AC();
      }
      if (actx.state === 'suspended') actx.resume();
      var notes = kind === 'win' ? [523.25, 659.25, 783.99, 1046.5]
                : kind === 'frag' ? [659.25, 880]
                : [440, 587.33];
      notes.forEach(function (f, i) {
        var o = actx.createOscillator();
        var g = actx.createGain();
        o.type = 'square';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, actx.currentTime + i * 0.11);
        g.gain.exponentialRampToValueAtTime(0.035, actx.currentTime + i * 0.11 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + i * 0.11 + 0.16);
        o.connect(g); g.connect(actx.destination);
        o.start(actx.currentTime + i * 0.11);
        o.stop(actx.currentTime + i * 0.11 + 0.18);
      });
    } catch (e) { /* 静默 */ }
  }

  /* ---------- 6. 烟花 ---------- */

  var fw = { canvas: null, ctx: null, parts: [], rockets: [], raf: 0, until: 0, dpr: 1 };

  function fwCanvas() {
    if (fw.canvas && fw.canvas.parentNode) return fw.canvas;
    var c = D.createElement('canvas');
    c.id = 'hj-fireworks';
    D.body.appendChild(c);
    fw.canvas = c;
    fw.ctx = c.getContext('2d');
    fwResize();
    window.addEventListener('resize', fwResize);
    return c;
  }
  function fwResize() {
    if (!fw.canvas) return;
    fw.dpr = Math.min(window.devicePixelRatio || 1, 2);
    fw.canvas.width = window.innerWidth * fw.dpr;
    fw.canvas.height = window.innerHeight * fw.dpr;
    fw.ctx.setTransform(fw.dpr, 0, 0, fw.dpr, 0, 0);
  }

  function fireworks(ms) {
    var c = fwCanvas();
    c.classList.add('on');
    fw.until = performance.now() + (ms || 5000);
    if (!fw.raf) loopFireworks();
    /* 先炸两朵，别让人等火箭爬上去 */
    for (var k = 0; k < 2; k++) {
      explode({
        x: window.innerWidth * (0.22 + Math.random() * 0.56),
        y: window.innerHeight * (0.16 + Math.random() * 0.16),
        hue: Math.random() < 0.5 ? 45 : Math.floor(Math.random() * 360)
      });
    }
    for (var i = 0; i < 3; i++) {
      setTimeout(function () { launchRocket(); }, i * 180);
    }
  }

  function launchRocket(x, y) {
    var W = window.innerWidth, Hh = window.innerHeight;
    var hue = Math.floor(Math.random() * 360);
    var gold = Math.random() < 0.45;
    fw.rockets.push({
      x: x || (W * 0.12 + Math.random() * W * 0.76),
      y: Hh + 10,
      vy: -(Hh * 0.011 + Math.random() * 4),
      ty: y || (Hh * 0.16 + Math.random() * Hh * 0.3),
      hue: gold ? 45 : hue,
      trail: []
    });
  }

  function explode(r) {
    var n = 56 + Math.floor(Math.random() * 40);
    var spd = 2.6 + Math.random() * 2.2;
    var gold = r.hue === 45;
    for (var i = 0; i < n; i++) {
      var a = (Math.PI * 2 * i) / n + Math.random() * 0.09;
      var s = spd * (0.45 + Math.random() * 0.9);
      fw.parts.push({
        x: r.x, y: r.y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 1,
        decay: 0.008 + Math.random() * 0.012,
        hue: gold ? 40 + Math.random() * 18 : r.hue + (Math.random() * 40 - 20),
        r: 1.2 + Math.random() * 1.8
      });
    }
  }

  function loopFireworks() {
    var ctx = fw.ctx;
    var W = window.innerWidth, Hh = window.innerHeight;
    var now = performance.now();

    /* 用 destination-out 淡出，保持画布透明，不压暗页面 */
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, 0, W, Hh);
    ctx.globalCompositeOperation = 'lighter';

    for (var i = fw.rockets.length - 1; i >= 0; i--) {
      var r = fw.rockets[i];
      r.y += r.vy;
      r.vy += 0.06;
      ctx.beginPath();
      ctx.fillStyle = 'hsl(' + r.hue + ',100%,78%)';
      ctx.arc(r.x, r.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
      if (r.y <= r.ty || r.vy >= -0.4) {
        explode(r);
        fw.rockets.splice(i, 1);
      }
    }

    for (var j = fw.parts.length - 1; j >= 0; j--) {
      var p = fw.parts[j];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.055;
      p.vx *= 0.988;
      p.vy *= 0.988;
      p.life -= p.decay;
      if (p.life <= 0) { fw.parts.splice(j, 1); continue; }
      ctx.beginPath();
      ctx.fillStyle = 'hsla(' + p.hue + ',100%,' + (60 + p.life * 22) + '%,' + p.life + ')';
      ctx.arc(p.x, p.y, p.r * p.life + 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    if (now < fw.until && Math.random() < 0.035) launchRocket();
    else if (now < fw.until && Math.random() < 0.02) launchRocket();

    if (now < fw.until || fw.parts.length || fw.rockets.length) {
      fw.raf = requestAnimationFrame(loopFireworks);
    } else {
      fw.raf = 0;
      ctx.clearRect(0, 0, W, Hh);
      if (fw.canvas) fw.canvas.classList.remove('on');
    }
  }

  function burst(x, y, n) {
    var c = fwCanvas();
    c.classList.add('on');
    if (!fw.raf) {
      fw.until = Math.max(fw.until, performance.now() + 1400);
      loopFireworks();
    }
    for (var i = 0; i < (n || 24); i++) {
      var a = Math.random() * Math.PI * 2;
      var s = 1.5 + Math.random() * 4;
      fw.parts.push({
        x: x, y: y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 1,
        life: 1,
        decay: 0.018 + Math.random() * 0.012,
        hue: 40 + Math.random() * 200,
        r: 1 + Math.random() * 2
      });
    }
    fw.until = Math.max(fw.until, performance.now() + 1200);
  }

  /* ---------- 7. 除夕倒计时 ---------- */

  var CHUXI = [
    '2027-02-05T23:59:59+08:00',
    '2028-01-24T23:59:59+08:00',
    '2029-02-12T23:59:59+08:00',
    '2030-02-02T23:59:59+08:00'
  ];

  function nextChuxi() {
    var now = Date.now();
    for (var i = 0; i < CHUXI.length; i++) {
      var t = new Date(CHUXI[i]).getTime();
      if (t > now) return t;
    }
    return new Date(CHUXI[CHUXI.length - 1]).getTime();
  }

  function countdownText() {
    var target = nextChuxi();
    var diff = target - Date.now();
    if (diff <= 0) return '除夕已经过了，但烟花不用理由。';
    var d = Math.floor(diff / 864e5);
    var h = Math.floor((diff % 864e5) / 36e5);
    var m = Math.floor((diff % 36e5) / 6e4);
    var s = Math.floor((diff % 6e4) / 1000);
    return '距离下一个除夕还有 <b>' + d + '</b> 天 <b>' + h + '</b> 时 <b>' + m + '</b> 分 <b>' + s + '</b> 秒';
  }

  /* ---------- 8. 终章弹层 ---------- */

  function showFinale() {
    var old = D.getElementById('hj-finale');
    if (old) old.parentNode.removeChild(old);

    var chars = ORDER.map(function (id, i) {
      var e = eggById(id);
      return '<span style="animation-delay:' + (0.15 + i * 0.09).toFixed(2) + 's">' + e.ch + '</span>';
    }).join('');

    var el = D.createElement('div');
    el.id = 'hj-finale';
    el.innerHTML =
      '<div class="hj-finale-card">' +
        '<button class="hj-finale-close" aria-label="关闭">×</button>' +
        '<div class="hj-finale-kicker">A C H I E V E M E N T &nbsp; U N L O C K E D</div>' +
        '<div class="hj-finale-chars">' + chars + '</div>' +
        '<h2 class="hj-finale-title">六片都到齐了</h2>' +
        '<p class="hj-finale-desc">辞旧迎新，团圆。它们本来是一句话，只是被拆得很散。<br>' +
          '除夕那晚，把这六个字拼起来——如果你还记得的话。</p>' +
        '<div class="hj-finale-count">' + countdownText() + '</div>' +
        '<div class="hj-finale-actions">' +
          '<button class="hj-btn hj-btn-primary" data-act="fw">再放一次烟花</button>' +
          '<button class="hj-btn" data-act="theme">收下「新年」主题</button>' +
          '<button class="hj-btn" data-act="close">继续逛</button>' +
        '</div>' +
      '</div>';
    D.body.appendChild(el);

    /* 把烟花画布搬进弹层：背景之上、卡片之下，保证看得见 */
    var fwc = fwCanvas();
    el.appendChild(fwc);
    var card = el.querySelector('.hj-finale-card');
    if (card) { card.style.position = 'relative'; card.style.zIndex = '2'; }

    function close() {
      if (fw.raf) { cancelAnimationFrame(fw.raf); fw.raf = 0; }
      fw.parts = []; fw.rockets = []; fw.until = 0; fw.canvas = null;
      if (el.parentNode) el.parentNode.removeChild(el);
    }
    el.addEventListener('click', function (ev) {
      if (ev.target === el) close();
      var act = ev.target.getAttribute && ev.target.getAttribute('data-act');
      if (!act) return;
      if (act === 'close') close();
      if (act === 'fw') { fireworks(6000); close(); }
      if (act === 'theme') { applyTheme('newyear', { silent: true }); toast('成就已达成！', '新年快乐！', 'lantern'); close(); }
    });
    el.querySelector('.hj-finale-close').addEventListener('click', close);
  }

  /* ---------- 9. 暗门菜单 / 主题面板 ---------- */

  var PAD_SVG = '<svg viewBox="0 0 16 16" width="20" height="20" shape-rendering="crispEdges" aria-hidden="true">' +
    '<rect x="2" y="5" width="12" height="7" fill="#7a5c33"/>' +
    '<rect x="3" y="6" width="10" height="5" fill="#c9a26b"/>' +
    '<rect x="4" y="8" width="3" height="1" fill="#3a2a16"/>' +
    '<rect x="5" y="7" width="1" height="3" fill="#3a2a16"/>' +
    '<rect x="10" y="7" width="1" height="1" fill="#d9534f"/>' +
    '<rect x="11" y="8" width="1" height="1" fill="#f0ad4e"/>' +
    '<rect x="9" y="9" width="1" height="1" fill="#5cb85c"/></svg>';

  var PALETTE_SVG = '<svg viewBox="0 0 16 16" width="20" height="20" shape-rendering="crispEdges" aria-hidden="true">' +
    '<rect x="2" y="2" width="5" height="5" fill="#6fe3ff"/>' +
    '<rect x="9" y="2" width="5" height="5" fill="#b78bff"/>' +
    '<rect x="2" y="9" width="5" height="5" fill="#ff6f9c"/>' +
    '<rect x="9" y="9" width="5" height="5" fill="#ffcf5c"/></svg>';

  function buildFabs() {
    if (D.getElementById('hj-fabs')) return;
    var wrap = D.createElement('div');
    wrap.id = 'hj-fabs';
    wrap.className = 'hj-fabs';
    wrap.innerHTML =
      '<button class="hj-fab" id="hj-game-btn" aria-label="小游戏" aria-expanded="false">' + PAD_SVG + '</button>' +
      '<button class="hj-fab" id="hj-theme-btn" aria-label="换颜色" aria-expanded="false">' + PALETTE_SVG + '</button>';
    D.body.appendChild(wrap);

    var gameBtn = D.getElementById('hj-game-btn');
    var themeBtn = D.getElementById('hj-theme-btn');

    gameBtn.addEventListener('click', function (ev) { ev.stopPropagation(); toggleMenu(); });
    themeBtn.addEventListener('click', function (ev) { ev.stopPropagation(); toggleThemePanel(); });
  }

  function buildMenu() {
    if (D.getElementById('hj-menu')) return;
    var items = PAGES.map(function (p) {
      return '<a class="hj-menu-item" href="' + p.href + '" data-href="' + p.href + '">' +
        '<span class="hj-mi-icon">' + p.icon + '</span>' +
        '<span class="hj-mi-name">' + p.name + '</span>' +
        '<span class="hj-mi-go">→</span></a>';
    }).join('');

    var el = D.createElement('div');
    el.id = 'hj-menu';
    el.className = 'hj-panel hj-panel-mini';
    el.hidden = true;
    el.innerHTML =
      '<div class="hj-panel-head">' +
        '<span class="hj-panel-title">小 游 戏</span>' +
        '<button class="hj-panel-close" aria-label="关闭">×</button>' +
      '</div>' +
      '<div class="hj-menu-list">' + items + '</div>';
    D.body.appendChild(el);

    el.querySelector('.hj-panel-close').addEventListener('click', function () { toggleMenu(false); });
  }

  function buildThemePanel() {
    if (D.getElementById('hj-theme-panel')) return;
    var cur = H.getAttribute('data-hj-theme');
    var rows = THEMES.map(function (t) {
      var locked = t.locked && !isNewYearUnlocked();
      return '<button class="hj-theme-row' + (t.id === cur ? ' is-active' : '') + (locked ? ' is-locked' : '') + '" ' +
        'data-theme-id="' + t.id + '" data-locked="' + (locked ? '1' : '0') + '">' +
        '<span class="hj-swatch" style="background:' + t.sw + '"></span>' +
        '<span><span class="hj-tr-name">' + t.name + (locked ? ' 🔒' : '') + '</span>' +
        '<span class="hj-tr-desc">' + t.desc + '</span></span>' +
        '<span class="hj-tr-lock">' + (t.id === cur ? '当前' : (t.en)) + '</span>' +
      '</button>';
    }).join('');

    var el = D.createElement('div');
    el.id = 'hj-theme-panel';
    el.className = 'hj-panel';
    el.hidden = true;
    el.innerHTML =
      '<div class="hj-panel-head">' +
        '<span class="hj-panel-title">换 个 世 界</span>' +
        '<button class="hj-panel-close" aria-label="关闭">×</button>' +
      '</div>' + rows +
      '<div class="hj-menu-foot">主题存在 cookie 里，有效期十年。<br>换设备要重新选，这是纯静态的代价。</div>';
    D.body.appendChild(el);

    el.addEventListener('click', function (ev) {
      if (ev.target.closest('.hj-panel-close')) { toggleThemePanel(false); return; }
      var row = ev.target.closest('.hj-theme-row');
      if (!row) return;
      var id = row.getAttribute('data-theme-id');
      if (row.getAttribute('data-locked') === '1') {
        toast('还差一点', '集齐六片碎纸才开新年主题', 'lock');
        return;
      }
      applyTheme(id);
      toggleThemePanel(false);
    });
    el.querySelector('.hj-panel-close').addEventListener('click', function () { toggleThemePanel(false); });
  }

  function toggleMenu(force) {
    buildMenu();
    var el = D.getElementById('hj-menu');
    var btn = D.getElementById('hj-game-btn');
    var show = typeof force === 'boolean' ? force : el.hidden;
    if (show) toggleThemePanel(false);
    el.hidden = !show;
    if (btn) btn.setAttribute('aria-expanded', show ? 'true' : 'false');
  }
  function toggleThemePanel(force) {
    buildThemePanel();
    var el = D.getElementById('hj-theme-panel');
    var btn = D.getElementById('hj-theme-btn');
    var show = typeof force === 'boolean' ? force : el.hidden;
    if (show) toggleMenu(false);
    el.hidden = !show;
    if (btn) btn.setAttribute('aria-expanded', show ? 'true' : 'false');
  }

  /* ---------- 10. UI 刷新 ---------- */

  function refreshUI() {
    var n = eggCount();

    var cnt = D.querySelectorAll('[data-hj-egg-count]');
    for (var i = 0; i < cnt.length; i++) cnt[i].textContent = n + ' / 6';

    var slots = D.querySelectorAll('[data-hj-egg-slot]');
    for (var j = 0; j < slots.length; j++) {
      var id = slots[j].getAttribute('data-hj-egg-slot');
      var got = hasEgg(id);
      slots[j].classList.toggle('on', got);
      var chEl = slots[j].querySelector('.hj-egg-ch');
      if (chEl) chEl.textContent = got ? eggById(id).ch : '？';
      slots[j].setAttribute('title', got ? eggById(id).name : '还没找到');
    }

    var tp = D.getElementById('hj-theme-panel');
    if (tp) {
      var rows = tp.querySelectorAll('.hj-theme-row');
      for (var r = 0; r < rows.length; r++) {
        var tid = rows[r].getAttribute('data-theme-id');
        var t = themeById(tid);
        var lock = t.locked && !isNewYearUnlocked();
        rows[r].classList.toggle('is-locked', lock);
        rows[r].setAttribute('data-locked', lock ? '1' : '0');
        rows[r].classList.toggle('is-active', H.getAttribute('data-hj-theme') === tid);
      }
    }
    try { D.dispatchEvent(new CustomEvent('hj:update', { detail: { count: n } })); } catch (e) { /* 老浏览器 */ }
  }

  /* ---------- 11. 主页 ---------- */

  function el(tag, cls, html) {
    var n = D.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  var HERO_LINES = ['滚木。', '你好👋'];
  var TYPE = { i: 0, n: 0, dir: 1, clicks: 0, timer: 0, wild: false, wildTimer: 0 };

  function buildHero() {
    var header = D.getElementById('page-header');
    if (!header || header.classList.contains('hj-hero')) return;
    header.classList.add('hj-hero');

    header.appendChild(el('div', 'hj-hero-art', '<canvas id="hj-hero-canvas"></canvas>'));

    var inner = el('div', 'hj-hero-inner',
      '<div class="hj-hero-fly"><img src="/img/butterfly-flap.svg" alt="" draggable="false"></div>' +
      '<div class="hj-hero-type" id="hj-type">' +
        '<span class="hj-type-text" id="hj-type-text"></span>' +
        '<i class="hj-caret"></i>' +
      '</div>');
    header.appendChild(inner);

    startTyping();
    bindTypeClick();
    startHeroCanvas();
  }

  function typeSpeed() {
    return Math.max(10, 145 / (1 + TYPE.clicks * 0.95));
  }

  function typeTick() {
    var out = D.getElementById('hj-type-text');
    if (!out || TYPE.wild) return;
    var line = Array.from(HERO_LINES[TYPE.i]);

    if (TYPE.dir > 0) {
      TYPE.n++;
      out.textContent = line.slice(0, TYPE.n).join('');
      if (TYPE.n >= line.length) {
        TYPE.dir = -1;
        danceChars(out);
        TYPE.timer = setTimeout(typeTick, Math.max(700, 1900 - TYPE.clicks * 220));
        return;
      }
    } else {
      TYPE.n--;
      out.textContent = line.slice(0, Math.max(0, TYPE.n)).join('');
      if (TYPE.n <= 0) {
        TYPE.dir = 1;
        TYPE.i = (TYPE.i + 1) % HERO_LINES.length;
        TYPE.timer = setTimeout(typeTick, 240);
        return;
      }
    }
    TYPE.timer = setTimeout(typeTick, TYPE.dir > 0 ? typeSpeed() : 30);
  }

  /* 打字完成时，每个字错峰跳一下 */
  function danceChars(out) {
    var s = Array.from(out.textContent || '');
    out.innerHTML = '';
    s.forEach(function (ch, k) {
      var sp = D.createElement('span');
      sp.className = 'hj-tch';
      sp.textContent = ch;
      sp.style.animationDelay = (k * 58) + 'ms';
      out.appendChild(sp);
    });
  }

  function startTyping() {
    if (D.getElementById('hj-type-text')) {
      TYPE.timer = setTimeout(typeTick, 520);
    }
  }

  function bindTypeClick() {
    var box = D.getElementById('hj-type');
    if (!box) return;
    box.addEventListener('click', function () {
      if (TYPE.wild) return;
      TYPE.clicks++;
      box.style.setProperty('--jit', Math.min(10, TYPE.clicks * 1.7).toFixed(1) + 'px');
      box.style.setProperty('--jit-f', Math.max(0.055, 0.36 - TYPE.clicks * 0.052).toFixed(3) + 's');
      box.classList.remove('hj-kick');
      void box.offsetWidth;
      box.classList.add('hj-kick');
      sound('tick');
      if (TYPE.clicks >= 6) goWild();
    });
  }

  /* 终态：字逐颗浮起来，各自的颜色，慢慢飘 */
  function goWild() {
    TYPE.wild = true;
    clearTimeout(TYPE.timer);
    var box = D.getElementById('hj-type');
    if (box) box.classList.add('is-wild');
    looseChars();
    TYPE.wildTimer = setInterval(function () {
      TYPE.i = (TYPE.i + 1) % HERO_LINES.length;
      looseChars();
    }, 3400);
  }

  function looseChars() {
    var out = D.getElementById('hj-type-text');
    if (!out) return;
    var s = Array.from(HERO_LINES[TYPE.i]);
    out.innerHTML = '';
    s.forEach(function (ch, k) {
      var sp = D.createElement('span');
      sp.className = 'hj-tfloat';
      sp.textContent = ch;
      sp.style.color = 'hsl(' + Math.round((k * 52 + Math.random() * 46) % 360) + ', 92%, 68%)';
      sp.style.animationDelay = (k * -0.7 + Math.random() * 0.4).toFixed(2) + 's';
      sp.style.animationDuration = (2.4 + Math.random() * 1.8).toFixed(2) + 's';
      out.appendChild(sp);
    });
  }


  function startHeroCanvas() {
    var cv = D.getElementById('hj-hero-canvas');
    if (!cv) return;
    var ctx = cv.getContext('2d');
    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, Hh = 0, nodes = [], t = 0;
    var accent = '#6fe3ff', accent2 = '#b78bff';

    function colors() {
      var s = getComputedStyle(H);
      accent = (s.getPropertyValue('--hj-accent') || '#6fe3ff').trim();
      accent2 = (s.getPropertyValue('--hj-accent2') || '#b78bff').trim();
    }

    function resize() {
      var box = cv.parentNode.getBoundingClientRect();
      W = box.width; Hh = box.height;
      cv.width = W * DPR; cv.height = Hh * DPR;
      cv.style.width = W + 'px'; cv.style.height = Hh + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      nodes = [];
      var n = Math.min(56, Math.round(W / 26));
      for (var i = 0; i < n; i++) {
        nodes.push({
          x: Math.random() * W,
          y: Math.random() * Hh,
          vx: (Math.random() - 0.5) * 0.18,
          vy: (Math.random() - 0.5) * 0.18,
          r: 0.7 + Math.random() * 1.8,
          ph: Math.random() * Math.PI * 2
        });
      }
    }

    function frame() {
      t += 0.01;
      ctx.clearRect(0, 0, W, Hh);

      /* 光晕 */
      var g = ctx.createRadialGradient(W * 0.72, Hh * 0.26, 0, W * 0.72, Hh * 0.26, Math.max(W, Hh) * 0.5);
      g.addColorStop(0, hexA(accent, 0.16));
      g.addColorStop(0.5, hexA(accent2, 0.07));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, Hh);

      /* 连线 */
      for (var i = 0; i < nodes.length; i++) {
        nodes[i].x += nodes[i].vx;
        nodes[i].y += nodes[i].vy;
        if (nodes[i].x < -20) nodes[i].x = W + 20;
        if (nodes[i].x > W + 20) nodes[i].x = -20;
        if (nodes[i].y < -20) nodes[i].y = Hh + 20;
        if (nodes[i].y > Hh + 20) nodes[i].y = -20;
      }
      ctx.lineWidth = 0.7;
      for (var a = 0; a < nodes.length; a++) {
        for (var b = a + 1; b < nodes.length; b++) {
          var dx = nodes[a].x - nodes[b].x, dy = nodes[a].y - nodes[b].y;
          var d = dx * dx + dy * dy;
          if (d < 20000) {
            var alpha = (1 - d / 20000) * 0.22;
            ctx.strokeStyle = hexA(accent, alpha);
            ctx.beginPath();
            ctx.moveTo(nodes[a].x, nodes[a].y);
            ctx.lineTo(nodes[b].x, nodes[b].y);
            ctx.stroke();
          }
        }
      }
      for (var k = 0; k < nodes.length; k++) {
        var p = nodes[k];
        var tw = 0.45 + 0.45 * Math.sin(t * 1.8 + p.ph);
        ctx.beginPath();
        ctx.fillStyle = hexA(k % 3 === 0 ? accent2 : accent, 0.35 + tw * 0.5);
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        if (p.r > 1.9) {
          ctx.beginPath();
          ctx.fillStyle = hexA(accent, 0.06 * tw);
          ctx.arc(p.x, p.y, p.r * 7, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      requestAnimationFrame(frame);
    }

    function hexA(hex, a) {
      hex = (hex || '#6fe3ff').replace('#', '');
      if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      var n = parseInt(hex, 16);
      if (isNaN(n)) return 'rgba(110,227,255,' + a + ')';
      return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
    }

    resize();
    colors();
    window.addEventListener('resize', resize);
    window.addEventListener('hj:theme', colors);
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) requestAnimationFrame(frame);
  }

  /* ---------- 12. 主题粒子（背景层） ---------- */

  var PT = { cv: null, ctx: null, raf: 0, parts: [], theme: '' };

  function particlesInit() {
    if (PT.cv) return;
    var bg = D.getElementById('hj-bg');
    if (!bg) return;
    var cv = D.createElement('canvas');
    cv.id = 'hj-particles';
    bg.appendChild(cv);
    PT.cv = cv;
    PT.ctx = cv.getContext('2d');
    PT.theme = H.getAttribute('data-hj-theme');
    pResize();
    window.addEventListener('resize', pResize);
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) pLoop();
  }

  function pResize() {
    if (!PT.cv) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    PT.cv.width = window.innerWidth * dpr;
    PT.cv.height = window.innerHeight * dpr;
    PT.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seedParticles();
  }

  function seedParticles() {
    var W = window.innerWidth, Hh = window.innerHeight;
    var th = PT.theme;
    var n = th === 'sakura' ? Math.round(W / 26)
          : th === 'newyear' ? Math.round(W / 34)
          : th === 'midnight' ? Math.round(W / 30)
          : th === 'ink' ? Math.round(W / 60)
          : 0;
    n = Math.min(n, 60);
    PT.parts = [];
    for (var i = 0; i < n; i++) PT.parts.push(makeP(th, true));
  }

  function makeP(th, init) {
    var W = window.innerWidth, Hh = window.innerHeight;
    if (th === 'sakura') {
      return { x: Math.random() * W, y: init ? Math.random() * Hh : -20,
        vy: 0.35 + Math.random() * 0.9, vx: -0.5 + Math.random(),
        r: 3 + Math.random() * 4, rot: Math.random() * 6.28, vr: (-0.5 + Math.random()) * 0.02,
        a: 0.35 + Math.random() * 0.5, ph: Math.random() * 6.28 };
    }
    if (th === 'newyear') {
      return { x: Math.random() * W, y: init ? Math.random() * Hh : Hh + 20,
        vy: -(0.18 + Math.random() * 0.5), vx: -0.2 + Math.random() * 0.4,
        r: 1 + Math.random() * 2.2, phi: Math.random() * 6.28, ph: Math.random() * 6.28,
        a: 0.25 + Math.random() * 0.55 };
    }
    if (th === 'midnight') {
      return { x: Math.random() * W, y: Math.random() * Hh,
        vy: 0, vx: 0, r: 0.6 + Math.random() * 1.3,
        ph: Math.random() * 6.28, a: 0.3 + Math.random() * 0.6 };
    }
    /* ink：极慢的墨点 */
    return { x: Math.random() * W, y: init ? Math.random() * Hh : Hh + 10,
      vy: -(0.06 + Math.random() * 0.2), vx: -0.1 + Math.random() * 0.2,
      r: 1 + Math.random() * 2.4, ph: Math.random() * 6.28, a: 0.08 + Math.random() * 0.14 };
  }

  function pLoop() {
    var ctx = PT.ctx, W = window.innerWidth, Hh = window.innerHeight;
    if (!ctx) return;
    ctx.clearRect(0, 0, W, Hh);
    var th = PT.theme;
    for (var i = 0; i < PT.parts.length; i++) {
      var p = PT.parts[i];
      if (th === 'sakura') {
        p.x += p.vx + Math.sin(p.ph + p.y * 0.01) * 0.5;
        p.y += p.vy;
        p.rot += p.vr;
        if (p.y > Hh + 20) { PT.parts[i] = makeP(th, false); continue; }
        if (p.x < -20) p.x = W + 20;
        if (p.x > W + 20) p.x = -20;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = 'rgba(255,150,185,' + p.a + ')';
        ctx.beginPath();
        ctx.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, 6.2832);
        ctx.fill();
        ctx.restore();
      } else if (th === 'newyear') {
        p.x += p.vx + Math.sin(p.ph + p.y * 0.008) * 0.3;
        p.y += p.vy;
        if (p.y < -20) { PT.parts[i] = makeP(th, false); continue; }
        var tw = 0.5 + 0.5 * Math.sin(p.ph);
        ctx.fillStyle = 'rgba(255,207,92,' + (p.a * tw) + ')';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.2832);
        ctx.fill();
      } else if (th === 'midnight') {
        var tk = 0.35 + 0.65 * Math.abs(Math.sin(p.ph + performance.now() * 0.0003));
        ctx.fillStyle = 'rgba(255,255,255,' + (p.a * tk) + ')';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.2832);
        ctx.fill();
      } else {
        p.x += p.vx; p.y += p.vy;
        if (p.y < -10) { PT.parts[i] = makeP(th, false); continue; }
        ctx.fillStyle = 'rgba(90,70,45,' + p.a + ')';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.2832);
        ctx.fill();
      }
    }
    PT.raf = requestAnimationFrame(pLoop);
  }

  function setThemeParticles(id) {
    PT.theme = id;
    if (PT.cv) seedParticles();
  }

  /* ---------- 13. 初始化 ---------- */

  function ensureBg() {
    if (D.getElementById('hj-bg')) return;
    var bg = D.createElement('div');
    bg.id = 'hj-bg';
    D.body.insertBefore(bg, D.body.firstChild);
  }

  function markPageFound() {
    for (var i = 0; i < PAGES.length; i++) {
      if (location.pathname.indexOf(PAGES[i].href) === 0) {
        markFound(PAGES[i].href);
        return;
      }
    }
  }

  function autoNewYearFireworks() {
    var now = Date.now();
    var start = new Date('2027-02-05T00:00:00+08:00').getTime();
    var end = new Date('2027-02-20T00:00:00+08:00').getTime();
    if (now < start || now > end) return;
    var today = new Date().toISOString().slice(0, 10);
    if (readState('hj_ny_seen', '') === today) return;
    writeState('hj_ny_seen', today);
    setTimeout(function () {
      fireworks(9000);
      achievement('成就已达成！', '新年快乐！', 'lantern');
    }, 1200);
  }

  function init() {
    ensureBg();
    buildFabs();
    buildMenu();
    buildThemePanel();
    markPageFound();
    refreshUI();
    particlesInit();

    D.addEventListener('click', function (ev) {
      var open = ev.target.closest && ev.target.closest('[data-hj-open]');
      if (open) {
        var what = open.getAttribute('data-hj-open');
        if (what === 'menu') toggleMenu(true);
        if (what === 'theme') toggleThemePanel(true);
        return;
      }
      var jump = ev.target.closest && ev.target.closest('[data-hj-jump]');
      if (jump) {
        ev.preventDefault();
        var t = D.getElementById('recent-posts');
        if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (!ev.target.closest('#hj-menu') && !ev.target.closest('#hj-game-btn')) {
        var m = D.getElementById('hj-menu');
        if (m && !m.hidden) toggleMenu(false);
      }
      if (!ev.target.closest('#hj-theme-panel') && !ev.target.closest('#hj-theme-btn')) {
        var p = D.getElementById('hj-theme-panel');
        if (p && !p.hidden) toggleThemePanel(false);
      }
    });

    D.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') { toggleMenu(false); toggleThemePanel(false); }
      if (ev.key === '~' || ev.key === '`') {
        if (!/input|textarea/i.test((D.activeElement || {}).tagName || '')) {
          ev.preventDefault();
          toggleMenu();
        }
      }
    });

    window.addEventListener('scroll', function () {
      var nav = D.getElementById('nav');
      if (nav) nav.classList.toggle('hj-solid', window.scrollY > 40);
    }, { passive: true });

    if (IS_HOME) {
      D.body.classList.add('hj-home');
      buildHero();
      refreshUI();
    }

    /* 首访成就 */
    if (readState('hj_seen', '') !== '1') {
      writeState('hj_seen', '1');
      setTimeout(function () {
        achievement('成就已达成！', '第一次来，欢迎', 'door');
      }, 2600);
    }

    autoNewYearFireworks();
  }

  /* ---------- 14. 对外 API ---------- */

  window.HJ = {
    eggs: EGGS,
    order: ORDER,
    pages: PAGES,
    hasEgg: hasEgg,
    eggCount: eggCount,
    addEgg: addEgg,
    addByChar: function (ch) {
      var e = eggByChar(ch);
      return e ? addEgg(e.id) : false;
    },
    findToken: function (raw) {
      var s = (raw || '').replace(/\s+/g, '');
      if (!s) return null;
      var ch = '';
      try {
        var bin = atob(s);
        if (window.TextDecoder) {
          var bytes = new Uint8Array(bin.length);
          for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          ch = new TextDecoder('utf-8').decode(bytes);
        } else {
          ch = decodeURIComponent(escape(bin));
        }
      } catch (e) { ch = ''; }
      if (!ch || ch.length !== 1) return null;
      return eggByChar(ch);
    },
    reset: resetEggs,
    toast: toast,
    achievement: achievement,
    fireworks: fireworks,
    burst: burst,
    applyTheme: applyTheme,
    themes: THEMES,
    showFinale: showFinale,
    countdown: countdownText,
    isUnlocked: isNewYearUnlocked,
    refreshUI: refreshUI,
    sound: sound,
    particles: { setTheme: setThemeParticles }
  };

  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', init);
  else init();
})();
