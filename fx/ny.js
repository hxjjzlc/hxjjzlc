/* =========================================================
   ny.js —— 新年时间闸门（2027 丁未年）
   · 初一一到，文章自己揭晓；十五一过，贺卡工坊关灯
   · 未到时间访问工坊 → 返回一个和站内一样的 404
   ========================================================= */
(function (w) {
  'use strict';

  var START = Date.parse('2027-02-06T00:00:00+08:00'); // 正月初一
  var END   = Date.parse('2027-02-20T23:59:59+08:00'); // 正月十五

  function now() { return Date.now(); }
  function open() { return now() >= START && now() <= END; }
  function before() { return now() < START; }
  function gone() { return now() > END; }

  function leftMs() { return Math.max(0, START - now()); }

  function humanLeft() {
    var ms = leftMs();
    if (ms <= 0) return '就在今天';
    var d = Math.floor(ms / 86400000);
    var h = Math.floor((ms % 86400000) / 3600000);
    var m = Math.floor((ms % 3600000) / 60000);
    if (d > 0) return d + ' 天 ' + h + ' 小时';
    if (h > 0) return h + ' 小时 ' + m + ' 分';
    return m + ' 分钟';
  }

  var NOT_FOUND_CSS =
    'html[data-404],html[data-404] body{height:100%;margin:0;background:#0a0a0c!important}' +
    'html[data-404] body{color:#d9d3c7;display:flex;align-items:center;justify-content:center;' +
    'font:16px/1.7 "Noto Serif SC","Songti SC",STSong,serif;letter-spacing:.04em;overflow:hidden}' +
    'html[data-404] .nf{text-align:center;padding:40px;animation:nf .5s ease both}' +
    '@keyframes nf{from{opacity:0}to{opacity:1}}' +
    'html[data-404] .nf-n{font-size:clamp(72px,16vw,150px);line-height:1;font-weight:700;letter-spacing:.06em;' +
    'background:linear-gradient(180deg,#6b6b73,#2e2e33);-webkit-background-clip:text;background-clip:text;color:transparent}' +
    'html[data-404] .nf p{color:#7b7570;margin:18px 0 28px}' +
    'html[data-404] .nf a{color:#c9a26b;text-decoration:none;border-bottom:1px solid #4a3a26;padding-bottom:2px}' +
    'html[data-404] .nf a:hover{color:#f0d9a8}';

  function notFound() {
    try {
      window.__NY_404__ = true;
      document.documentElement.setAttribute('data-404', '1');
      var st = document.createElement('style');
      st.textContent = NOT_FOUND_CSS;
      document.head.appendChild(st);
      document.body.innerHTML =
        '<div class="nf"><div class="nf-n">404</div>' +
        '<p>你来早了，或者来晚了。<br>这里现在什么都没有。</p>' +
        '<a href="/">← 回首页</a></div>';
      document.title = '404';
      try { window.scrollTo(0, 0); } catch (e) { /* 忽略 */ }
    } catch (e) {
      location.replace('/404.html');
    }
  }

  w.NY = {
    START: START,
    END: END,
    open: open,
    before: before,
    gone: gone,
    leftMs: leftMs,
    humanLeft: humanLeft,
    notFound: notFound
  };
})(window);
