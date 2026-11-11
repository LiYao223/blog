/* 写作台: 可视化编辑 .md 与 posts/index.json
   保存优先级: 本地写作服务 API (server.mjs) > File System Access API > 下载 */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  var state = {
    posts: [],
    slug: null,
    originalSlug: null,
    dirHandle: null,
    api: false,
    dirty: false,
    loaded: false
  };

  var DRAFT = 'kongshan-draft:';

  /* ---------- 小工具 ---------- */
  function today() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function parseTags(s) {
    return String(s || '').split(/[,，、]/).map(function (t) { return t.trim(); }).filter(Boolean);
  }
  function tagsText(arr) { return (arr || []).join(', '); }
  function debounce(fn, ms) {
    var t; return function () { clearTimeout(t); var a = arguments, self = this; t = setTimeout(function () { fn.apply(self, a); }, ms); };
  }
  function tip(msg, isError) {
    var el = $('action-tip');
    el.textContent = msg || '';
    el.style.color = isError ? '#a32d2d' : '';
  }
  function setDirty(v) {
    state.dirty = v;
    var s = $('save-state');
    s.textContent = v ? '未保存的改动' : '已同步';
    s.className = 'save-state' + (v ? ' dirty' : '');
  }

  /* ---------- 读取当前表单 ---------- */
  function collect() {
    var d = {
      slug: $('f-slug').value.trim(),
      title: $('f-title').value.trim(),
      date: $('f-date').value || today(),
      tags: parseTags($('f-tags').value),
      excerpt: $('f-excerpt').value.trim(),
      title_en: $('f-title-en').value.trim(),
      tags_en: parseTags($('f-tags-en').value),
      excerpt_en: $('f-excerpt-en').value.trim()
    };
    return d;
  }

  function entryOf(d) {
    var e = {
      slug: d.slug,
      title: d.title,
      date: d.date,
      tags: d.tags,
      excerpt: d.excerpt
    };
    // 英文字段留空就不写进 json, 让读者端自动回退中文
    if (d.title_en) e.title_en = d.title_en;
    if (d.tags_en && d.tags_en.length) e.tags_en = d.tags_en;
    if (d.excerpt_en) e.excerpt_en = d.excerpt_en;
    return e;
  }

  function validate(d) {
    if (!d.slug) return '文件名 slug 不能为空';
    if (!/^[a-z0-9][a-z0-9-]*$/.test(d.slug)) return 'slug 只能用小写字母、数字和连字符，且以字母或数字开头';
    if (!d.title) return '标题不能为空';
    var clash = state.posts.filter(function (p) { return p.slug === d.slug && p.slug !== state.originalSlug; });
    if (clash.length) return 'slug「' + d.slug + '」已经被《' + clash[0].title + '》占用了';
    if (d.tags_en.length && d.tags_en.length !== d.tags.length) {
      return '英文标签数量要和中文一致（' + d.tags.length + ' 个），目前是 ' + d.tags_en.length + ' 个';
    }
    return null;
  }

  /* ---------- 预览 ---------- */
  var renderPreview = debounce(function () {
    var md = $('editor').value;
    $('preview').innerHTML = md.trim()
      ? MD.render(md)
      : '<p class="placeholder">左边写，这里就会实时显示排版后的样子。</p>';
    var chars = md.replace(/\s/g, '').length;
    var mins = md.trim() ? Site.readingTime(md) : '—';
    $('counter').textContent = chars + ' 字 · ' + (md.trim() ? mins + '阅读' : '未开始');
  }, 120);

  function update() {
    renderPreview();
    setDirty(true);
    scheduleDraft();
  }

  /* ---------- 草稿（防止误关丢东西） ---------- */
  var scheduleDraft = debounce(function () {
    if (!state.slug || !state.loaded) return;
    try {
      localStorage.setItem(DRAFT + state.slug, JSON.stringify({
        fields: collect(),
        body: $('editor').value,
        bodyEn: $('editor-en').value
      }));
    } catch (e) {}
  }, 500);

  function loadDraft(slug) {
    try {
      var raw = localStorage.getItem(DRAFT + slug);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function clearDraft(slug) {
    try { localStorage.removeItem(DRAFT + slug); } catch (e) {}
  }

  /* ---------- 表单填充 / 清空 ---------- */
  function fillMeta(p) {
    $('f-title').value = p.title || '';
    $('f-slug').value = p.slug || '';
    $('f-date').value = p.date || today();
    $('f-tags').value = tagsText(p.tags);
    $('f-excerpt').value = p.excerpt || '';
    $('f-title-en').value = p.title_en || '';
    $('f-tags-en').value = tagsText(p.tags_en);
    $('f-excerpt-en').value = p.excerpt_en || '';
  }

  function newPost(withFeedback) {
    state.slug = null;
    state.originalSlug = null;
    fillMeta({ date: today() });
    $('editor').value = '';
    $('editor-en').value = '';
    markActive(null);
    renderPreview();
    setDirty(false);
    tip(withFeedback ? '已新建空白文章：填好标题和 slug 就能保存。' : '新文章：填好标题和 slug 就能保存。');

    if (!withFeedback) return;

    // 可见反馈: 闪一下表单 + 滚到顶部 + 光标落到标题框
    var card = document.querySelector('.meta-card');
    var title = $('f-title');
    if (card) {
      card.classList.remove('flash');
      void card.offsetWidth;
      card.classList.add('flash');
      if (card.scrollIntoView) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (title) {
      try { title.focus({ preventScroll: true }); } catch (e) { title.focus(); }
    }
  }

  function openPost(slug) {
    var post = state.posts.filter(function (p) { return p.slug === slug; })[0];
    if (!post) return;
    Promise.all([
      fetch('posts/' + slug + '.md', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.text() : ''; }).catch(function () { return ''; }),
      fetch('posts/en/' + slug + '.md', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.text() : ''; }).catch(function () { return ''; })
    ]).then(function (r) {
      state.slug = slug;
      state.originalSlug = slug;
      fillMeta(post);
      markActive(slug);

      var draft = loadDraft(slug);
      if (draft) {
        var d = draft.fields || {};
        fillMeta({
          title: d.title != null ? d.title : post.title,
          slug: slug, date: d.date || post.date,
          tags: d.tags || post.tags, excerpt: d.excerpt != null ? d.excerpt : post.excerpt,
          title_en: d.title_en || post.title_en, tags_en: d.tags_en || post.tags_en,
          excerpt_en: d.excerpt_en || post.excerpt_en
        });
        $('editor').value = draft.body != null ? draft.body : r[0];
        $('editor-en').value = draft.bodyEn != null ? draft.bodyEn : r[1];
        tip('恢复了上次没保存的草稿（点「写入文件」才会落到硬盘）。');
      } else {
        $('editor').value = r[0];
        $('editor-en').value = r[1];
        tip('');
      }
      state.loaded = true;
      renderPreview();
      setDirty(!!draft);
    });
  }

  /* ---------- 左侧列表 ---------- */
  function markActive(slug) {
    Array.prototype.forEach.call(document.querySelectorAll('#post-list-admin li'), function (li) {
      li.classList.toggle('active', li.getAttribute('data-slug') === slug);
    });
  }

  function renderList() {
    var ul = $('post-list-admin');
    if (!state.posts.length) { ul.innerHTML = '<li class="side-empty">还没有文章</li>'; return; }
    ul.innerHTML = state.posts.map(function (p) {
      return '<li data-slug="' + p.slug + '">' +
        '<span class="t">' + (p.title || p.slug) + '</span>' +
        '<span class="d">' + (p.date || '') + ' · ' + (p.tags || []).join('/') + '</span>' +
      '</li>';
    }).join('');
    Array.prototype.forEach.call(ul.querySelectorAll('li'), function (li) {
      li.addEventListener('click', function () {
        if (state.dirty && !confirm('当前文章有未保存的改动，要丢弃并打开别的吗？')) return;
        openPost(li.getAttribute('data-slug'));
      });
    });
    markActive(state.slug);
  }

  /* ---------- 工具条 ---------- */
  function insert(before, after, placeholder) {
    var ta = $('editor');
    var s = ta.selectionStart, e = ta.selectionEnd;
    var sel = ta.value.slice(s, e) || placeholder || '';
    ta.value = ta.value.slice(0, s) + before + sel + after + ta.value.slice(e);
    ta.focus();
    ta.selectionStart = s + before.length;
    ta.selectionEnd = s + before.length + sel.length;
    update();
  }

  function linePrefix(ch) {
    var ta = $('editor');
    var s = ta.selectionStart;
    var start = ta.value.lastIndexOf('\n', s - 1) + 1;
    // 已有时取消
    if (ta.value.slice(start, start + ch.length) === ch) {
      ta.value = ta.value.slice(0, start) + ta.value.slice(start + ch.length);
      ta.selectionStart = ta.selectionEnd = Math.max(start, s - ch.length);
    } else {
      ta.value = ta.value.slice(0, start) + ch + ta.value.slice(start);
      ta.selectionStart = ta.selectionEnd = s + ch.length;
    }
    ta.focus();
    update();
  }

  var TOOLS = {
    h2: function () { linePrefix('## '); },
    h3: function () { linePrefix('### '); },
    quote: function () { linePrefix('> '); },
    ul: function () { linePrefix('- '); },
    ol: function () { linePrefix('1. '); },
    bold: function () { insert('**', '**', '加粗'); },
    italic: function () { insert('*', '*', '斜体'); },
    strike: function () { insert('~~', '~~', '删除线'); },
    code: function () { insert('`', '`', 'code'); },
    fence: function () { insert('\n```\n', '\n```\n', '代码'); },
    link: function () { insert('[', '](https://)', '链接文字'); },
    hr: function () { insert('\n\n---\n\n', '', ''); }
  };

  function bindToolbar() {
    $('toolbar').addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('button[data-act]') : null;
      if (!btn) return;
      var fn = TOOLS[btn.getAttribute('data-act')];
      if (fn) fn();
    });
  }

  /* ---------- 保存通道 1: 本地写作服务 API ---------- */
  async function apiSave(files, deletes) {
    var res = await fetch('api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: files, deletes: deletes || [] })
    });
    var data = null;
    try { data = await res.json(); } catch (e) {}
    if (!res.ok || !data || !data.ok) {
      throw new Error((data && data.error) || ('HTTP ' + res.status));
    }
    return data;
  }

  function savePayload(d) {
    var renamed = state.originalSlug && state.originalSlug !== d.slug;
    var files = [{ path: 'posts/' + d.slug + '.md', content: $('editor').value.replace(/\s*$/, '') + '\n' }];
    var deletes = [];
    if ($('editor-en').value.trim()) {
      files.push({ path: 'posts/en/' + d.slug + '.md', content: $('editor-en').value.replace(/\s*$/, '') + '\n' });
    }
    if (renamed) {
      deletes.push('posts/' + state.originalSlug + '.md');
      if (!$('editor-en').value.trim()) deletes.push('posts/en/' + state.originalSlug + '.md');
    }
    return { files: files, deletes: deletes };
  }

  /* ---------- 写盘: File System Access API ---------- */
  function supportsFS() { return typeof window.showDirectoryPicker === 'function'; }

  async function ensureDir() {
    if (!state.dirHandle) {
      state.dirHandle = await window.showDirectoryPicker({ id: 'kongshan-blog', mode: 'readwrite' });
      return state.dirHandle;
    }
    var opt = { mode: 'readwrite' };
    var cur = await state.dirHandle.queryPermission(opt);
    if (cur !== 'granted' && (await state.dirHandle.requestPermission(opt)) !== 'granted') {
      throw new Error('没有拿到文件夹的写入权限');
    }
    return state.dirHandle;
  }

  async function fileHandle(dir, path, create) {
    var parts = path.split('/');
    var d = dir;
    for (var i = 0; i < parts.length - 1; i++) {
      d = create
        ? await d.getDirectoryHandle(parts[i], { create: true })
        : await d.getDirectoryHandle(parts[i]);
    }
    return d.getFileHandle(parts[parts.length - 1], { create: !!create });
  }

  async function writeText(dir, path, text) {
    var fh = await fileHandle(dir, path, true);
    var w = await fh.createWritable();
    await w.write(text);
    await w.close();
  }

  async function readTextOptional(dir, path) {
    try {
      var fh = await fileHandle(dir, path, false);
      return await (await fh.getFile()).text();
    } catch (e) { return null; }
  }

  async function removeOptional(dir, path) {
    try {
      var parts = path.split('/');
      var d = dir;
      for (var i = 0; i < parts.length - 1; i++) d = await d.getDirectoryHandle(parts[i]);
      await d.removeEntry(parts[parts.length - 1]);
    } catch (e) { /* 文件本来就不存在 */ }
  }

  function mergeList(list, entry, originalSlug) {
    var out = list.slice();
    var idx = -1;
    if (originalSlug) idx = out.findIndex(function (p) { return p.slug === originalSlug; });
    if (idx === -1) idx = out.findIndex(function (p) { return p.slug === entry.slug; });
    if (idx > -1) out[idx] = entry; else out.unshift(entry);
    return out;
  }

  async function saveToDisk() {
    var d = collect();
    var err = validate(d);
    if (err) { tip(err, true); return; }

    /* 通道 1: 本地写作服务 API —— 直接保存, 无需授权 */
    if (state.api) {
      tip('保存中…');
      try {
        var payload = savePayload(d);
        var raw = await fetch('posts/index.json', { cache: 'no-cache' })
          .then(function (r) { return r.ok ? r.text() : null; }).catch(function () { return null; });
        var list;
        try { list = raw ? JSON.parse(raw) : state.posts.slice(); }
        catch (e) { tip('index.json 解析失败，已改用页面内存里的数据', true); list = state.posts.slice(); }
        list = mergeList(list, entryOf(d), state.originalSlug);
        payload.files.push({ path: 'posts/index.json', content: JSON.stringify(list, null, 2) + '\n' });
        await apiSave(payload.files, payload.deletes);
        state.posts = list;
        state.slug = d.slug;
        state.originalSlug = d.slug;
        clearDraft(d.slug);
        renderList();
        markActive(d.slug);
        setDirty(false);
        tip('已保存到 posts/' + d.slug + '.md（写作服务直写，站点即刻可读）');
      } catch (e) {
        tip('保存失败：' + e.message, true);
      }
      return;
    }

    /* 通道 2: File System Access API */
    if (!supportsFS()) {
      tip('没有检测到写作服务（server.mjs），且此浏览器不支持直接写文件。请改用 http://127.0.0.1:8080/admin.html 打开，或用「下载」按钮拿回文件。', true);
      return;
    }
    tip('请选择 blog 文件夹…');
    var dir;
    try {
      dir = await ensureDir();
    } catch (e) {
      if (e && e.name === 'AbortError') { tip('已取消'); return; }
      tip('打开文件夹失败：' + e.message, true); return;
    }

    try {
      var entry = entryOf(d);
      var renamed = state.originalSlug && state.originalSlug !== d.slug;

      await writeText(dir, 'posts/' + d.slug + '.md', $('editor').value.replace(/\s*$/, '') + '\n');

      if ($('editor-en').value.trim()) {
        await writeText(dir, 'posts/en/' + d.slug + '.md', $('editor-en').value.replace(/\s*$/, '') + '\n');
      } else if (renamed) {
        await removeOptional(dir, 'posts/en/' + state.originalSlug + '.md');
      }

      var raw = await readTextOptional(dir, 'posts/index.json');
      var list;
      try { list = raw ? JSON.parse(raw) : state.posts.slice(); }
      catch (e) { tip('index.json 解析失败，已改用页面内存里的数据', true); list = state.posts.slice(); }
      list = mergeList(list, entry, state.originalSlug);
      await writeText(dir, 'posts/index.json', JSON.stringify(list, null, 2) + '\n');

      if (renamed) await removeOptional(dir, 'posts/' + state.originalSlug + '.md');

      state.posts = list;
      state.slug = d.slug;
      state.originalSlug = d.slug;
      clearDraft(d.slug);
      renderList();
      markActive(d.slug);
      setDirty(false);
      tip('已写入 posts/' + d.slug + '.md 和 posts/index.json');
    } catch (e) {
      tip('写入失败：' + e.message, true);
    }
  }

  /* ---------- 下载降级 ---------- */
  function download(name, text) {
    var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
  }

  function downloadMd() {
    var d = collect();
    if (!d.slug) { tip('先填文件名 slug', true); return; }
    download(d.slug + '.md', $('editor').value.replace(/\s*$/, '') + '\n');
    tip('已下载 ' + d.slug + '.md（放到 posts/ 下覆盖即可）');
  }

  function downloadJson() {
    var d = collect();
    var err = validate(d);
    if (err) { tip(err, true); return; }
    var list = mergeList(state.posts, entryOf(d), state.originalSlug);
    download('index.json', JSON.stringify(list, null, 2) + '\n');
    tip('已下载 index.json（放到 posts/ 下覆盖即可）');
  }

  /* ---------- 删除 ---------- */
  async function removePost() {
    if (!state.originalSlug) { tip('先打开一篇要删除的文章', true); return; }
    if (!confirm('确定删除《' + ($('f-title').value || state.originalSlug) + '》？文件会从硬盘移除。')) return;
    var slug = state.originalSlug;
    if (state.api) {
      try {
        var list = state.posts.filter(function (p) { return p.slug !== slug; });
        await apiSave([{ path: 'posts/index.json', content: JSON.stringify(list, null, 2) + '\n' }],
          ['posts/' + slug + '.md', 'posts/en/' + slug + '.md']);
        state.posts = list;
      } catch (e) {
        tip('删除失败：' + e.message, true);
        return;
      }
    } else if (supportsFS()) {
      try {
        var dir = await ensureDir();
        await removeOptional(dir, 'posts/' + slug + '.md');
        await removeOptional(dir, 'posts/en/' + slug + '.md');
        var raw = await readTextOptional(dir, 'posts/index.json');
        var list = raw ? JSON.parse(raw) : state.posts.slice();
        list = list.filter(function (p) { return p.slug !== slug; });
        await writeText(dir, 'posts/index.json', JSON.stringify(list, null, 2) + '\n');
        state.posts = list;
      } catch (e) {
        tip('删除失败：' + e.message, true);
        return;
      }
    } else {
      tip('浏览器不支持直接写盘，请手动删除文件；这里只更新了列表的内存数据。', true);
    }
    clearDraft(slug);
    state.posts = state.posts.filter(function (p) { return p.slug !== slug; });
    renderList();
    newPost();
    tip('已删除《' + slug + '》');
  }

  /* ---------- 绑定 ---------- */
  function bind() {
    ['f-title', 'f-slug', 'f-date', 'f-tags', 'f-excerpt', 'f-title-en', 'f-tags-en', 'f-excerpt-en', 'editor', 'editor-en']
      .forEach(function (id) { $(id).addEventListener('input', update); });

    bindToolbar();
    $('btn-new').addEventListener('click', function () {
      if (state.dirty && !confirm('有未保存的改动，确定新建吗？')) return;
      newPost(true);
    });
    $('btn-save').addEventListener('click', saveToDisk);

    /* 发布上线: 由本地写作服务提交到 GitHub Pages */
    $('btn-publish').addEventListener('click', async function () {
      if (!state.api) {
        tip('发布需要本地写作服务：请用 http://127.0.0.1:8080/admin.html 打开。', true);
        return;
      }
      var btn = $('btn-publish');
      btn.disabled = true;
      tip('正在提交到 GitHub…');
      try {
        var res = await fetch('api/publish', { method: 'POST' });
        var data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || ('HTTP ' + res.status));
        tip(data.changed
          ? '已提交 ' + data.changed + ' 个文件，Pages 约 1 分钟后更新：' + data.url
          : '线上已是最新，没有需要发布的改动。');
      } catch (e) {
        tip('发布失败：' + e.message, true);
      } finally {
        btn.disabled = false;
      }
    });
    $('btn-draft').addEventListener('click', function () {
      scheduleDraft();
      tip('草稿已存在本机浏览器里，关掉页面也不会丢。');
    });
    $('btn-download-md').addEventListener('click', downloadMd);
    $('btn-download-json').addEventListener('click', downloadJson);
    $('btn-delete').addEventListener('click', removePost);

    window.addEventListener('beforeunload', function (e) {
      if (!state.dirty) return;
      e.preventDefault();
      e.returnValue = '';
    });

    // 快捷键
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveToDisk();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault(); TOOLS.bold();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault(); TOOLS.italic();
      }
    });
  }

  function markMode() {
    var badge = $('mode-badge');
    if (!badge) return;
    badge.hidden = false;
    badge.textContent = state.api ? '在线保存 · 已连接写作服务' : '本地模式';
    var note = document.querySelector('.side-note p:nth-of-type(2)');
    if (note && state.api) {
      note.innerHTML = '<strong>怎么存</strong><br>已连接写作服务：点「写入文件」即直接保存到硬盘 <code>posts/</code>，无需选文件夹，任何浏览器都可用。';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    bind();
    newPost();
    fetch('api/ping', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (j && j.ok) { state.api = true; markMode(); }
      })
      .catch(function () {});
    Site.getPosts()
      .then(function (posts) {
        state.posts = posts;
        state.loaded = true;
        renderList();
        if (posts.length) openPost(posts[0].slug);
      })
      .catch(function (err) {
        $('post-list-admin').innerHTML = '<li class="side-empty">读取失败：' + err.message + '</li>';
      });
  });

  // 供测试与调试使用
  window.Admin = {
    collect: collect, validate: validate, entryOf: entryOf,
    mergeList: mergeList, parseTags: parseTags, tagsText: tagsText
  };
})();
