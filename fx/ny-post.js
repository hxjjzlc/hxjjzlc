/* =========================================================
   ny-post.js —— 《新年快乐》文章闸门
   · 未到 2027-02-06 00:00 (+08)：正文清空，只留标题和评论区
   · 到点：暗金纸面 + 红包雨 + 飘落吉字 + 点破撒金 + 贺卡入口
   · 正文以 base64 存放，翻 HTML 源码看不到
   ========================================================= */
(function () {
  'use strict';

  var OPEN_AT = Date.parse('2027-02-06T00:00:00+08:00'); // 丁未年正月初一
  var END_AT  = Date.parse('2027-02-20T23:59:59+08:00'); // 正月十五

  var LETTER =
    '5aSW6Z2i5aSn5qaC6L+Y5pyJ5Lq65Zyo5pS+54Ku44CC5L2g5Y+v6IO95piv6KKr5ZC16YaS55qE77yM5Lmf5Y+v6IO95qC55pys6L+Y5rKh' +
    '552h4oCU4oCU5LiN566h5piv5ZOq5LiA56eN77yM5YWI5oqK5omL5py65pS+5L2O5LiA54K577yM6K6p55y8552b5q2H5LiA5Lya5YS/' +
    '44CCCgrov5nkuIDlubTkuI3nrpfovbvjgILmnInkurrlnKjnrYnkuIDkuKrnrZTlpI3vvIzmnInkurrlnKjnrYnkuIDlvKDljJbp' +
    'qozljZXvvIzmnInkurrlj6rmmK/nrYnkuIDkuKrkuI3nlKjml6notbfnmoTml6nmmajjgILmiJHkuI3nn6XpgZPkvaDlnKjlk6rkuIDn' +
    'p43ph4zvvIzkvYbkvaDog73otbDliLDov5nkuKrpobXpnaLvvIzor7TmmI7kvaDoh7PlsJHov5jmnInlipvmsJTmjInlha3kuKrlrZfj' +
    'gIIKCuaJgOS7pe+8jOaEv+S9oOaKiumavui/h+eahOS6i+ivtOW+l+WHuuWPo++8jOaKiumrmOWFtOeahOS6i+iusOW+l+S9j+OAguaE' +
    'v+S9oOS7iuW5tOWwkeS4gOeCueOAjOWFtuWunuaIkeaXqeWwseefpemBk+OAje+8jOWkmuS4gOeCueOAjOi/mOWlveaIkeayoemUmei/' +
    'h+OAjeOAguaEv+S9oOi6q+i+ueeahOS6uuS4jeW/heS9oOino+mHiuWkquWkmuWwseiDveaHgu+8jOS5n+aEv+S9oOWBtuWwlOWPr+S7' +
    'peS4jeino+mHiuOAggoK5oS/5L2g5oOz5Y6755qE5Zyw5pa56YO95pyJ6L2m77yM5oOz6KeB55qE5Lq66YO95Zyo562J5L2g44CC5oS/' +
    '5L2g55qE54yr5LiN55Sf55eF77yM5L2g55qE5Luj56CB6IO96LeR6YCa77yM5L2g55qE5a2Y5qy+5q+U5L2g6aKE5pyf55qE5aSa5LiA' +
    '5L2N5pWw44CCCgrmlrDlubTlv6vkuZDjgII=';

  var WISH = [
    '恭喜发财，利是拿来', '新年快乐，暴富', '今年不许生病', '万事顺遂',
    '红包里没钱，只有祝福', '吃好睡好，别的再说', '少熬夜，多喝水',
    '愿你今年被好好对待', '想做的事都做成了', '该见的人都见到了'
  ];

  var GLYPH = ['福', '春', '喜', '新', '年', '吉', '祥', '乐'];

  var DOC = document.documentElement;
  var host = document.getElementById('article-container');
  if (!host) return;

  /* ---------------- 未到初一：这一页什么都没有 ---------------- */
  if (Date.now() < OPEN_AT) {
    host.innerHTML = '';
    var st = document.createElement('style');
    st.id = 'ny-blank';
    st.textContent =
      '#post-copyright,#pagination,.post-copyright{display:none!important}' +
      '#article-container{min-height:1px;padding:0!important;margin:0!important;background:none!important;box-shadow:none!important}';
    document.head.appendChild(st);
    DOC.setAttribute('data-ny-closed', '1');
    return;
  }

  /* ---------------- 到点了：揭晓 ---------------- */
  DOC.setAttribute('data-ny-open', '1');

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function decode(b64) {
    try {
      var bin = atob(b64);
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new TextDecoder('utf-8').decode(bytes);
    } catch (e) { return ''; }
  }

  var css = document.createElement('style');
  css.id = 'ny-style';
  css.textContent = [
    'html[data-ny-open] #post-info .post-title{',
    'background:linear-gradient(100deg,#fff6e0 0%,#ffd08a 24%,#fffaf0 42%,#d99b4e 64%,#fff6e0 82%);',
    'background-size:280% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;',
    'animation:nyShine 6s linear infinite;filter:drop-shadow(0 0 20px rgba(255,190,110,.22))}',
    '@keyframes nyShine{from{background-position:0 0}to{background-position:-280% 0}}',

    'html[data-ny-open] #article-container{position:relative;z-index:1;overflow:hidden;',
    'background:linear-gradient(168deg,#1a0b09 0%,#120706 46%,#0c0504 100%)!important;',
    'border:1px solid rgba(201,162,107,.22);border-radius:6px;',
    'padding:clamp(26px,4vw,46px)!important;color:#e9dcc4;',
    'box-shadow:0 26px 80px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,215,160,.07)!important}',

    'html[data-ny-open] #article-container::before{content:"";position:absolute;left:-30%;right:-30%;top:-40%;',
    'height:120%;pointer-events:none;z-index:0;',
    'background:radial-gradient(60% 46% at 50% 0%,rgba(190,26,32,.32),transparent 68%),',
    'radial-gradient(38% 34% at 84% 90%,rgba(150,100,30,.18),transparent 70%);',
    'animation:nyBreath 7s ease-in-out infinite}',
    '@keyframes nyBreath{0%,100%{opacity:.72;transform:translateY(0)}50%{opacity:1;transform:translateY(10px)}}',

    'html[data-ny-open] .ny-p{position:relative;z-index:2;margin:0 0 1.5em;',
    'font-size:clamp(15px,1.65vw,16.5px);line-height:2.05;color:#e6d8c0;',
    'opacity:0;transform:translateY(16px);animation:nyUp .95s cubic-bezier(.22,.72,.2,1) forwards}',
    '@keyframes nyUp{to{opacity:1;transform:none}}',
    'html[data-ny-open] .ny-p.ny-last{color:#ffe7b8;letter-spacing:.34em;font-size:1.12em;',
    'text-shadow:0 0 22px rgba(255,200,120,.3)}',

    'html[data-ny-open] .ny-rule{position:relative;z-index:2;height:1px;margin:38px 0 30px;',
    'background:linear-gradient(90deg,transparent,#5a3a1e 20%,#c9a26b 50%,#5a3a1e 80%,transparent);opacity:.55}',

    'html[data-ny-open] .ny-cta{position:relative;z-index:2;text-align:center;margin:6px 0 0}',
    'html[data-ny-open] .ny-cta a{display:inline-block;padding:13px 32px;color:#ffe7b8;text-decoration:none;',
    'border:1px solid #7a4a22;letter-spacing:.32em;font-size:14px;',
    'background:linear-gradient(180deg,rgba(179,18,26,.34),rgba(179,18,26,.08));transition:.28s}',
    'html[data-ny-open] .ny-cta a:hover{border-color:#d9b678;box-shadow:0 0 40px rgba(201,162,107,.22);transform:translateY(-1px)}',
    'html[data-ny-open] .ny-cta span{display:block;margin-top:13px;font-size:11.5px;color:#7d6c5c;letter-spacing:.2em}',
    'html[data-ny-open] .ny-sign{position:relative;z-index:2;margin-top:22px;text-align:right;',
    'font-size:12.5px;color:#7a6a58;letter-spacing:.2em}',

    '#ny-cv{position:fixed;inset:0;z-index:2;pointer-events:none}',
    '#ny-toast{position:fixed;left:50%;bottom:11vh;z-index:99;padding:11px 22px;white-space:nowrap;',
    'max-width:86vw;overflow:hidden;text-overflow:ellipsis;border:1px solid #6b3a1c;',
    'background:rgba(20,8,6,.94);color:#ffe7b8;font-size:13.5px;letter-spacing:.16em;pointer-events:none;',
    'opacity:0;transform:translateX(-50%) translateY(8px);transition:opacity .32s,transform .32s}',
    '#ny-toast.on{opacity:1;transform:translateX(-50%) translateY(0)}'
  ].join('');
  document.head.appendChild(css);

  var text = decode(LETTER);
  var paras = text.split(/\n{2,}/).filter(function (s) { return s.trim(); });

  var html = paras.map(function (s, i) {
    var last = i === paras.length - 1;
    return '<p class="ny-p' + (last ? ' ny-last' : '') + '" style="animation-delay:' +
      (0.12 + i * 0.18).toFixed(2) + 's">' + esc(s.trim()) + '</p>';
  }).join('');

  html += '<div class="ny-rule"></div>';
  html += '<div class="ny-cta"><a href="/card/">写一张贺卡 →</a><span>' +
    (Date.now() <= END_AT ? '初一开门，到十五关门' : '门已经关了，明年早点来') +
    '</span></div>';
  html += '<div class="ny-sign">—— 来自一台还在转的服务器</div>';

  host.innerHTML = html;

  /* ---------------- 满屏红包 + 吉字 + 金粉 ---------------- */
  var cv = document.createElement('canvas');
  cv.id = 'ny-cv';
  document.body.appendChild(cv);
  var g = cv.getContext('2d');

  var W = 0, VH = 0;
  var dpr = Math.min(2, window.devicePixelRatio || 1);
  var boxes = [], glyphs = [], dust = [];

  function resize() {
    W = window.innerWidth;
    VH = window.innerHeight;
    cv.width = Math.floor(W * dpr);
    cv.height = Math.floor(VH * dpr);
    cv.style.width = W + 'px';
    cv.style.height = VH + 'px';
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  function mkBox(seed) {
    var size = 26 + Math.random() * 26;
    return {
      x: Math.random() * W,
      y: seed ? (Math.random() * (VH + 160) - 100) : -size * 2,
      w: size, h: size * 1.32,
      vy: 34 + Math.random() * 62,
      vx: (Math.random() - 0.5) * 14,
      rot: (Math.random() - 0.5) * 0.9,
      vr: (Math.random() - 0.5) * 0.6,
      sway: Math.random() * Math.PI * 2,
      sw: 0.6 + Math.random() * 1.2,
      pop: 0
    };
  }

  function mkGlyph(seed) {
    var size = 20 + Math.random() * 44;
    return {
      ch: GLYPH[Math.floor(Math.random() * GLYPH.length)],
      x: Math.random() * W,
      y: seed ? Math.random() * VH : -size * 2,
      s: size,
      vy: 24 + Math.random() * 44,
      vx: (Math.random() - 0.5) * 10,
      rot: (Math.random() - 0.5) * 1.1,
      vr: (Math.random() - 0.5) * 0.45,
      sway: Math.random() * Math.PI * 2,
      sw: 0.4 + Math.random() * 0.9,
      a: 0.12 + Math.random() * 0.24
    };
  }

  var i;
  for (i = 0; i < 18; i++) boxes.push(mkBox(true));
  for (i = 0; i < 10; i++) glyphs.push(mkGlyph(true));

  function roundRect(x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  function packet(b) {
    g.save();
    g.globalAlpha *= 0.8;
    g.translate(b.x, b.y);
    g.rotate(b.rot);
    var w = b.w, h = b.h;

    g.shadowColor = 'rgba(0,0,0,.45)';
    g.shadowBlur = 12;
    g.shadowOffsetY = 4;
    var grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#d8262c');
    grd.addColorStop(0.55, '#b3121a');
    grd.addColorStop(1, '#8a0c12');
    g.fillStyle = grd;
    roundRect(-w / 2, -h / 2, w, h, w * 0.1);
    g.fill();

    g.shadowColor = 'transparent';
    g.shadowBlur = 0;
    g.shadowOffsetY = 0;

    g.strokeStyle = 'rgba(240,205,140,.55)';
    g.lineWidth = Math.max(1, w * 0.035);
    roundRect(-w / 2 + w * 0.08, -h / 2 + h * 0.1, w * 0.84, h * 0.8, w * 0.08);
    g.stroke();

    g.beginPath();
    g.moveTo(-w * 0.42, -h * 0.1);
    g.quadraticCurveTo(0, h * 0.18, w * 0.42, -h * 0.1);
    g.strokeStyle = 'rgba(255,225,170,.5)';
    g.stroke();

    g.fillStyle = 'rgba(255,232,190,.9)';
    g.font = '600 ' + Math.round(w * 0.42) + 'px "Noto Serif SC","Songti SC",STSong,serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('福', 0, h * 0.18);
    g.restore();
  }

  var last = performance.now();

  function loop(t) {
    var dt = Math.min(48, t - last) / 1000;
    last = t;
    g.clearRect(0, 0, W, VH);

    var k, gph;
    for (k = glyphs.length - 1; k >= 0; k--) {
      gph = glyphs[k];
      gph.y += gph.vy * dt;
      gph.sway += gph.sw * dt;
      gph.x += (gph.vx + Math.sin(gph.sway) * 8) * dt;
      gph.rot += gph.vr * dt;
      if (gph.y - gph.s > VH + 40 || gph.x < -120 || gph.x > W + 120) {
        glyphs[k] = mkGlyph(false);
        continue;
      }
      g.save();
      g.globalAlpha = gph.a;
      g.translate(gph.x, gph.y);
      g.rotate(gph.rot);
      g.fillStyle = '#ffcf85';
      g.font = '600 ' + gph.s + 'px "Noto Serif SC","Songti SC",STSong,serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.shadowColor = 'rgba(255,180,80,.35)';
      g.shadowBlur = 18;
      g.fillText(gph.ch, 0, 0);
      g.restore();
    }

    for (k = boxes.length - 1; k >= 0; k--) {
      var b = boxes[k];
      if (b.pop > 0) {
        b.pop -= dt * 2.6;
        if (b.pop <= 0) { boxes.splice(k, 1); continue; }
        g.save();
        g.globalAlpha = Math.max(0, b.pop);
        b.w *= 1.02;
        b.h *= 1.02;
        packet(b);
        g.restore();
        continue;
      }
      b.y += b.vy * dt;
      b.sway += b.sw * dt;
      b.x += (b.vx + Math.sin(b.sway) * 12) * dt;
      b.rot += b.vr * dt;
      if (b.y - b.h > VH + 40) {
        if (boxes.length < 22) boxes[k] = mkBox(false);
        else boxes.splice(k, 1);
        continue;
      }
      packet(b);
    }

    for (k = dust.length - 1; k >= 0; k--) {
      var p = dust[k];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 260 * dt;
      p.life -= dt;
      if (p.life <= 0) { dust.splice(k, 1); continue; }
      g.globalAlpha = Math.max(0, p.life / p.max);
      g.fillStyle = p.c;
      g.fillRect(p.x, p.y, p.s, p.s);
      g.globalAlpha = 1;
    }

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  /* ---------------- 点破红包 ---------------- */
  var toastEl = document.createElement('div');
  toastEl.id = 'ny-toast';
  document.body.appendChild(toastEl);
  var toastTimer = 0;

  function toast(s) {
    toastEl.textContent = s;
    toastEl.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('on'); }, 1900);
  }

  document.addEventListener('pointerdown', function (ev) {
    var t = ev.target;
    if (t && t.closest && t.closest('a,button,input,textarea,select,label')) return;

    for (var k = boxes.length - 1; k >= 0; k--) {
      var b = boxes[k];
      if (b.pop > 0) continue;
      if (Math.abs(ev.clientX - b.x) < b.w * 0.85 && Math.abs(ev.clientY - b.y) < b.h * 0.85) {
        b.pop = 1;
        for (var j = 0; j < 16; j++) {
          dust.push({
            x: b.x, y: b.y,
            vx: (Math.random() - 0.5) * 300,
            vy: (Math.random() - 0.7) * 280,
            s: 2 + Math.random() * 3,
            c: Math.random() < 0.5 ? '#ffd98a' : '#ffffff',
            life: 0.8 + Math.random() * 0.5,
            max: 1.3
          });
        }
        toast(WISH[Math.floor(Math.random() * WISH.length)]);
        break;
      }
    }
  }, { passive: true });
})();
