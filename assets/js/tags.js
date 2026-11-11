/* 标签聚合页: 按标签分组列出文章 + 语言切换重渲染 */
(function () {
  'use strict';

  const el = document.getElementById('tag-groups');
  let posts = [];

  function T(k, v) { return window.I18n ? I18n.t(k, v) : k; }
  function lang() { return window.I18n ? I18n.lang : 'zh'; }

  function displayTag(p, t, i) {
    if (lang() === 'en' && p.tags_en && p.tags_en[i]) return p.tags_en[i];
    return t;
  }

  function render(list) {
    const map = {};
    const labels = {};
    list.forEach(function (p) {
      (p.tags || []).forEach(function (t, i) {
        (map[t] = map[t] || []).push(p);
        if (!labels[t]) labels[t] = displayTag(p, t, i);
      });
    });
    const tags = Object.keys(map).sort(function (a, b) { return map[b].length - map[a].length; });
    if (!tags.length) {
      el.innerHTML = '<p class="empty">' + T('tags.empty') + '</p>';
      return;
    }
    el.innerHTML = tags.map(function (t) {
      const items = map[t].map(function (p) {
        return (
          '<li><a href="post.html?slug=' + p.slug + '">' +
            '<span class="t">' + Site.field(p, 'title') + '</span>' +
            '<span class="d">' + Site.formatDate(p.date) + '</span>' +
          '</a></li>'
        );
      }).join('');
      return (
        '<section class="tag-group" id="tag-' + Site.tagSlug(t) + '">' +
          '<h3>' + labels[t] + ' · ' + map[t].length + '</h3>' +
          '<ul>' + items + '</ul>' +
        '</section>'
      );
    }).join('');
  }

  function scrollToHash() {
    const hash = decodeURIComponent(location.hash.replace(/^#/, ''));
    if (!hash) return;
    const target = document.getElementById('tag-' + Site.tagSlug(hash));
    if (target) setTimeout(function () { target.scrollIntoView({ behavior: 'smooth' }); }, 120);
  }

  function init() {
    Site.getPosts()
      .then(function (list) {
        posts = list;
        render(posts);
        scrollToHash();
      })
      .catch(function (err) {
        el.innerHTML = '<p class="empty">' + T('tags.error', { msg: err.message }) + '</p>';
      });

    if (window.I18n) {
      I18n.onChange(function () {
        if (!posts.length) return;
        render(posts);
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
