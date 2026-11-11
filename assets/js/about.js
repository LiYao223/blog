/* 关于页: 渲染 about.md（按语言取 about.en.md / about.md） */
(function () {
  'use strict';
  const root = document.getElementById('about-root');

  function T(k, v) { return window.I18n ? I18n.t(k, v) : k; }

  function load() {
    root.innerHTML = '<p class="empty">' + T('about.loading') + '</p>';
    Site.fetchAbout()
      .then(function (md) {
        root.innerHTML = MD.render(md);
        root.classList.add('in');
      })
      .catch(function (err) {
        root.innerHTML = '<p class="empty">' + T('about.error', { msg: err.message }) + '</p>';
      });
  }

  function init() {
    load();
    if (window.I18n) {
      I18n.onChange(function () { load(); });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
