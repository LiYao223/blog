/* 首页: 渲染文章列表 + 标签筛选 + ?tag= 预筛选 + 语言切换重渲染 */
(function () {
  'use strict';

  const listEl = document.getElementById('post-list');
  const filterEl = document.getElementById('filters');
  let allPosts = [];
  let activeTag = null;
  let tagList = [];      // 当前语言下的标签顺序, 用于切换语言时保持筛选位置
  let tagLabel = {};     // 规范标签 -> 当前语言显示名

  function T(k, v) { return window.I18n ? I18n.t(k, v) : k; }

  function lang() { return window.I18n ? I18n.lang : 'zh'; }

  function title(p) { return Site.field(p, 'title'); }
  function excerpt(p) { return Site.field(p, 'excerpt'); }

  function displayTag(p, t, i) {
    if (lang() === 'en' && p.tags_en && p.tags_en[i]) return p.tags_en[i];
    return t;
  }

  function collect() {
    const counts = {};
    const labels = {};
    allPosts.forEach(function (p) {
      (p.tags || []).forEach(function (t, i) {
        counts[t] = (counts[t] || 0) + 1;
        if (!labels[t]) labels[t] = displayTag(p, t, i);
      });
    });
    tagLabel = labels;
    tagList = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
    return counts;
  }

  function card(p) {
    const tags = (p.tags || []).map(function (t, i) {
      return '<a class="tag" href="tags.html#' + Site.tagSlug(t) + '">' + displayTag(p, t, i) + '</a>';
    }).join('');
    /* 外层不能用 <a>: 标签链接会嵌套, 浏览器会把 DOM 拆碎(整卡点击改用事件委托) */
    return (
      '<article class="post-card reveal" data-tags="' + (p.tags || []).join('|') + '" data-slug="' + p.slug + '">' +
        '<div class="meta"><span>' + Site.formatDate(p.date) + '</span></div>' +
        '<h2><a href="post.html?slug=' + p.slug + '">' + title(p) + '</a></h2>' +
        '<p class="excerpt">' + (excerpt(p) || '') + '</p>' +
        '<div class="tags">' + tags + '</div>' +
      '</article>'
    );
  }

  function renderList() {
    const filtered = activeTag
      ? allPosts.filter(function (p) { return (p.tags || []).indexOf(activeTag) !== -1; })
      : allPosts;
    if (!filtered.length) {
      listEl.innerHTML = '<p class="empty">' + T('list.empty') + '</p>';
      return;
    }
    listEl.innerHTML = filtered.map(card).join('');

    // 新注入的卡片需要重新观察淡入
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
        });
      }, { threshold: 0.08 });
      listEl.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
    } else {
      listEl.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
    }
  }

  function renderFilters() {
    const counts = collect();
    let html = '<button class="pill active" data-tag="">' + T('filter.all') + ' ' + allPosts.length + '</button>';
    html += tagList.map(function (t) {
      return '<button class="pill" data-tag="' + t + '">' + tagLabel[t] + ' ' + counts[t] + '</button>';
    }).join('');
    filterEl.innerHTML = html;

    filterEl.querySelectorAll('.pill').forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterEl.querySelectorAll('.pill').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        activeTag = btn.getAttribute('data-tag') || null;
        // 更新地址栏, 便于分享/刷新保持
        const url = activeTag ? '?tag=' + Site.tagSlug(activeTag) : '?';
        history.replaceState(null, '', url);
        renderList();
      });
    });
  }

  function syncActivePill() {
    filterEl.querySelectorAll('.pill').forEach(function (b) { b.classList.remove('active'); });
    const sel = activeTag
      ? filterEl.querySelector('.pill[data-tag="' + activeTag + '"]')
      : filterEl.querySelector('.pill[data-tag=""]');
    if (sel) sel.classList.add('active');
  }

  function load() {
    return Site.getPosts().then(function (posts) { allPosts = posts; });
  }

  function init() {
    // 整卡点击跳转 (点标签链接除外) —— 替代原先的 <a> 包裹整卡
    listEl.addEventListener('click', function (ev) {
      if (ev.target.closest('.tag')) return;
      const card = ev.target.closest('.post-card');
      if (card && card.dataset.slug) location.href = 'post.html?slug=' + card.dataset.slug;
    });

    const params = new URLSearchParams(location.search);
    const pre = params.get('tag');
    load()
      .then(function () {
        renderFilters();
        if (pre && tagList.indexOf(pre) !== -1) activeTag = pre;
        syncActivePill();
        renderList();
      })
      .catch(function (err) {
        listEl.innerHTML =
          '<p class="empty">' + T('list.error', { msg: err.message }) +
          '<br>' + T('list.hint') + '</p>';
      });

    // 语言切换: 保持筛选位置, 整体重渲染
    if (window.I18n) {
      I18n.onChange(function () {
        if (!allPosts.length) {
          listEl.innerHTML = '<p class="empty">' + T('list.loading') + '</p>';
          return;
        }
        const idx = activeTag ? tagList.indexOf(activeTag) : -1;
        renderFilters();
        activeTag = idx > -1 && tagList[idx] ? tagList[idx] : null;
        syncActivePill();
        renderList();
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
