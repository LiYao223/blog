/* i18n: 中 / 英 双语切换 (零依赖) */
(function () {
  'use strict';

  var KEY = 'kongshan-lang';

  var DICT = {
    zh: {
      'nav.posts': '文章',
      'nav.tags': '标签',
      'nav.about': '关于',
      'nav.theme': '切换主题',
      'nav.lang': '切换语言',

      'hero.title': '空山',
      'hero.tagline': '一 个 人 的 极 简 个 人 志',
      'hero.intro': '在喧嚣里留一块空地。这里收着随想、阅读、技术与生活——不追热点，只写值得慢读的。',

      'filter.all': '全部',

      'list.loading': '正在载入文章…',
      'list.empty': '这个标签下还没有文章。',
      'list.error': '文章读取失败：{msg}',
      'list.hint': '请通过本地服务器访问（如 python3 -m http.server），而非直接双击打开文件。',

      'post.back': '← 返回文章',
      'post.loading': '正在载入…',
      'post.noslug': '缺少文章参数。',
      'post.noslugLink': '回到文章列表选择。',
      'post.openFail': '无法打开这篇文章：{msg}',

      'tags.title': '标签',
      'tags.loading': '正在载入…',
      'tags.empty': '还没有标签。',
      'tags.error': '标签读取失败：{msg}',

      'about.eyebrow': 'ABOUT · 关 于 这 里',
      'about.loading': '正在载入…',
      'about.error': '关于页读取失败：{msg}',

      'footer': '空山 · 以静写心 · © 2026',

      'title.home': '空山 · 极简个人志',
      'title.post': '空山 · 阅读',
      'title.tags': '标签 · 空山',
      'title.about': '关于 · 空山',
      'desc.home': '一个人的极简个人志 —— 随想、阅读、技术与生活的留白处。',
      'desc.post': '空山 · 极简个人志文章详情',
      'desc.tags': '空山 · 文章标签分类',
      'desc.about': '关于空山 · 极简个人志'
    },

    en: {
      'nav.posts': 'Posts',
      'nav.tags': 'Tags',
      'nav.about': 'About',
      'nav.theme': 'Toggle theme',
      'nav.lang': 'Switch language',

      'hero.title': '空山',
      'hero.tagline': 'A MINIMAL PERSONAL JOURNAL',
      'hero.intro': 'A clearing kept out of the noise. Notes on thought, reading, craft and daily life — no chasing the feed, only what is worth reading slowly.',

      'filter.all': 'All',

      'list.loading': 'Loading posts…',
      'list.empty': 'No posts under this tag yet.',
      'list.error': 'Failed to load posts: {msg}',
      'list.hint': 'Please open this site through a local server (e.g. python3 -m http.server), not by double-clicking the file.',

      'post.back': '← Back to posts',
      'post.loading': 'Loading…',
      'post.noslug': 'Missing post parameter.',
      'post.noslugLink': 'Return to the post list.',
      'post.openFail': 'Could not open this post: {msg}',

      'tags.title': 'Tags',
      'tags.loading': 'Loading…',
      'tags.empty': 'No tags yet.',
      'tags.error': 'Failed to load tags: {msg}',

      'about.eyebrow': 'ABOUT · THIS PLACE',
      'about.loading': 'Loading…',
      'about.error': 'Failed to load the about page: {msg}',

      'footer': 'Kongshan · Written in stillness · © 2026',

      'title.home': 'Kongshan · A Minimal Personal Journal',
      'title.post': 'Kongshan · Reading',
      'title.tags': 'Tags · Kongshan',
      'title.about': 'About · Kongshan',
      'desc.home': 'A minimal personal journal — the white space between thought, reading, craft and daily life.',
      'desc.post': 'Kongshan · post',
      'desc.tags': 'Kongshan · posts by tag',
      'desc.about': 'About Kongshan · a minimal personal journal'
    }
  };

  var listeners = [];
  var lang = 'zh';

  function detect() {
    var saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) {}
    if (saved === 'zh' || saved === 'en') return saved;
    var nav = (navigator.language || navigator.userLanguage || '').toLowerCase();
    if (nav.indexOf('zh') === 0) return 'zh';
    if (nav.indexOf('en') === 0) return 'en';
    return 'zh';
  }

  function t(key, vars) {
    var table = DICT[lang] || DICT.zh;
    var s = table[key];
    if (s == null) s = (DICT.zh[key] != null ? DICT.zh[key] : key);
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        s = s.split('{' + k + '}').join(vars[k]);
      });
    }
    return s;
  }

  /* 取当前语言下的内容字段: title -> title_en */
  function field(obj, name) {
    if (!obj) return '';
    if (lang === 'en' && obj[name + '_en'] != null && obj[name + '_en'] !== '') {
      return obj[name + '_en'];
    }
    return obj[name] != null ? obj[name] : '';
  }

  function readingTime(text) {
    var cn = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    var en = (text.match(/[a-zA-Z]+/g) || []).length;
    var mins = Math.max(1, Math.round(cn / 350 + en / 200));
    return lang === 'en' ? mins + ' min' : mins + ' 分钟';
  }

  function applyStatic() {
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';

    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n]'), function (el) {
      var key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n-html]'), function (el) {
      var key = el.getAttribute('data-i18n-html');
      el.innerHTML = t(key);
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n-title]'), function (el) {
      document.title = t(el.getAttribute('data-i18n-title'));
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n-desc]'), function (el) {
      el.setAttribute('content', t(el.getAttribute('data-i18n-desc')));
    });

    var btn = document.getElementById('lang-toggle');
    if (btn) {
      btn.textContent = lang === 'en' ? '中' : 'EN';
      btn.setAttribute('aria-label', t('nav.lang'));
      btn.setAttribute('title', t('nav.lang'));
    }
  }

  function setLang(next, silent) {
    var changed = next !== lang;
    lang = (next === 'en') ? 'en' : 'zh';
    try { localStorage.setItem(KEY, lang); } catch (e) {}
    applyStatic();
    if (!silent) {
      listeners.forEach(function (fn) {
        try { fn(lang, changed); } catch (e) { /* ignore */ }
      });
    }
  }

  function onChange(fn) {
    if (typeof fn === 'function') listeners.push(fn);
  }

  function init() {
    lang = detect();
    applyStatic();
    var btn = document.getElementById('lang-toggle');
    if (btn) {
      btn.addEventListener('click', function () {
        setLang(lang === 'en' ? 'zh' : 'en');
      });
    }
  }

  window.I18n = {
    init: init,
    t: t,
    setLang: setLang,
    onChange: onChange,
    field: field,
    readingTime: readingTime,
    get lang() { return lang; }
  };
})();
