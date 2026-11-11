/* 文章详情: 读取 ?slug= 拉取 .md 并渲染（按语言取 posts/en/*.md） */
(function () {
  'use strict';

  const root = document.getElementById('article-root');
  let current = null;   // 当前文章元数据

  function T(k, v) { return window.I18n ? I18n.t(k, v) : k; }
  function lang() { return window.I18n ? I18n.lang : 'zh'; }

  function displayTag(p, t, i) {
    if (lang() === 'en' && p.tags_en && p.tags_en[i]) return p.tags_en[i];
    return t;
  }

  function render(post, md) {
    current = post;
    const suffix = lang() === 'en' ? ' read' : '阅读';
    document.title = Site.field(post, 'title') + ' · 空山';
    const tags = (post.tags || []).map(function (t, i) {
      return '<a class="tag" href="tags.html#' + Site.tagSlug(t) + '">' + displayTag(post, t, i) + '</a>';
    }).join('');

    root.innerHTML =
      '<header class="article-head reveal">' +
        '<div class="meta">' +
          '<span>' + Site.formatDate(post.date) + '</span>' +
          '<span>·</span>' +
          '<span>' + Site.readingTime(md) + suffix + '</span>' +
        '</div>' +
        '<h1>' + Site.field(post, 'title') + '</h1>' +
        '<div class="tags">' + tags + '</div>' +
      '</header>' +
      '<hr class="divider">' +
      '<article class="prose reveal">' + MD.render(md) + '</article>';

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
        });
      }, { threshold: 0.05 });
      root.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
    } else {
      root.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
    }
  }

  function open(slug) {
    return Promise.all([
      Site.getPosts(),
      Site.fetchPost(slug),
    ]).then(function (res) {
      const post = res[0].filter(function (p) { return p.slug === slug; })[0];
      if (!post) throw new Error('文章未在索引中');
      render(post, res[1]);
      window.scrollTo(0, 0);
    });
  }

  function init() {
    const slug = new URLSearchParams(location.search).get('slug');
    if (!slug) {
      root.innerHTML =
        '<p class="empty">' + T('post.noslug') +
        ' <a href="index.html">' + T('post.noslugLink') + '</a></p>';
      return;
    }
    open(slug).catch(function (err) {
      root.innerHTML = '<p class="empty">' + T('post.openFail', { msg: err.message }) + '</p>';
    });

    if (window.I18n) {
      I18n.onChange(function () {
        open(slug).catch(function (err) {
          root.innerHTML = '<p class="empty">' + T('post.openFail', { msg: err.message }) + '</p>';
        });
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
