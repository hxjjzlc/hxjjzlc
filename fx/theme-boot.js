/* =========================================================
   theme-boot.js —— 在首屏绘制之前把主题定下来，避免闪白
   只用 cookie（主）+ localStorage（备份），纯静态
   ========================================================= */
(function () {
  'use strict';
  var VALID = { rain: 1, ink: 1, sakura: 1, midnight: 1, newyear: 1 };
  var DARK = { rain: 1, midnight: 1, newyear: 1 };

  function cookie(name) {
    var m = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  }

  var theme = '';
  try {
    theme = cookie('hj_theme') || localStorage.getItem('hj_theme') || '';
  } catch (e) { theme = cookie('hj_theme'); }

  if (!VALID[theme]) theme = 'rain';
  if (theme === 'newyear') {
    var unlocked = cookie('hj_newyear') === '1';
    if (!unlocked) {
      try { unlocked = localStorage.getItem('hj_newyear') === '1'; } catch (e2) { /* 无痕模式 */ }
    }
    if (!unlocked) theme = 'rain';
  }

  var html = document.documentElement;
  html.setAttribute('data-hj-theme', theme);
  html.setAttribute('data-hj-dark', DARK[theme] ? '1' : '0');
})();
