/* 共享脚本: 语言 / 主题切换 / 阅读进度 / 滚动淡入 / 数据工具 */
(function () {
  'use strict';

  /* ---------- 主题切换 (明/暗, 持久化) ---------- */
  const root = document.documentElement;
  const KEY = 'kongshan-theme';

  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.textContent = t === 'dark' ? '☀' : '☾';
      const label = window.I18n ? I18n.t('nav.theme') : '切换主题';
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
    }
  }

  function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) {}
    if (!saved) {
      saved = window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark' : 'light';
    }
    applyTheme(saved);
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.addEventListener('click', function () {
        const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        try { localStorage.setItem(KEY, next); } catch (e) {}
      });
    }
    // 语言切换后刷新按钮的无障碍标签
    if (window.I18n) {
      I18n.onChange(function () { applyTheme(root.getAttribute('data-theme')); });
    }
  }

  /* ---------- 阅读进度条 ---------- */
  function initProgress() {
    const bar = document.getElementById('progress');
    if (!bar) return;
    const onScroll = function () {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const pct = max > 0 ? (h.scrollTop || document.body.scrollTop) / max : 0;
      bar.style.transform = 'scaleX(' + pct + ')';
    };
    document.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- 滚动淡入 ---------- */
  function initReveal() {
    const els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || !els.length) {
      els.forEach((el) => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    els.forEach((el) => io.observe(el));
  }

  /* ---------- 数据工具 ---------- */
  function getPosts() {
    return fetch('posts/index.json', { cache: 'no-cache' })
      .then((r) => {
        if (!r.ok) throw new Error('index.json 读取失败');
        return r.json();
      })
      .then((list) =>
        list.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
      );
  }

  function formatDate(d) {
    // 2026-09-01 -> 2026.09.01
    return String(d).replace(/-/g, '.');
  }

  function readingTime(text) {
    if (window.I18n) return I18n.readingTime(text);
    const cn = (text.match(/[一-龥]/g) || []).length;
    const en = (text.match(/[a-zA-Z]+/g) || []).length;
    const mins = Math.max(1, Math.round(cn / 350 + en / 200));
    return mins + ' 分钟';
  }

  /* 取当前语言下的字段: title -> title_en */
  function field(obj, name) {
    if (window.I18n) return I18n.field(obj, name);
    return obj ? (obj[name] || '') : '';
  }

  /* 按当前语言取正文: 英文优先 posts/en/<slug>.md, 缺失则回退中文 */
  function fetchPost(slug) {
    const base = 'posts/' + slug + '.md';
    const en = 'posts/en/' + slug + '.md';
    const order = (window.I18n && I18n.lang === 'en') ? [en, base] : [base, en];
    function attempt(i) {
      if (i >= order.length) {
        return Promise.reject(new Error('文章文件不存在'));
      }
      return fetch(order[i], { cache: 'no-cache' }).then(function (r) {
        if (!r.ok) return attempt(i + 1);
        return r.text();
      });
    }
    return attempt(0);
  }

  /* 关于页正文: about.en.md / about.md */
  function fetchAbout() {
    const order = (window.I18n && I18n.lang === 'en') ? ['about.en.md', 'about.md'] : ['about.md', 'about.en.md'];
    function attempt(i) {
      if (i >= order.length) return Promise.reject(new Error('about.md 不存在'));
      return fetch(order[i], { cache: 'no-cache' }).then(function (r) {
        if (!r.ok) return attempt(i + 1);
        return r.text();
      });
    }
    return attempt(0);
  }

  function tagSlug(t) {
    return encodeURIComponent(t);
  }

  /* ---------- 启动 ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    if (window.I18n) I18n.init();   // 先定语言, 再应用主题文案
    initTheme();
    initProgress();
    initReveal();
  });

  window.Site = {
    getPosts: getPosts,
    formatDate: formatDate,
    readingTime: readingTime,
    tagSlug: tagSlug,
    field: field,
    fetchPost: fetchPost,
    fetchAbout: fetchAbout,
  };
})();
