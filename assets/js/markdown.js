/* 零依赖 Markdown 渲染器 (子集: 标题/段落/列表/引用/代码块/粗斜体/链接/图片/分割线/删除线)
   安全: 所有文本先转义, 仅生成白名单标签, 杜绝 XSS */
(function (global) {
  'use strict';

  function escapeHtml(s) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // 行内解析: raw 为未转义文本
  function parseInline(raw) {
    const codes = [];
    // 先抽出行内代码, 避免内部被粗斜体规则误伤
    let work = raw.replace(/`([^`]+)`/g, function (_, c) {
      codes.push(c);
      return '' + (codes.length - 1) + '';
    });
    let s = escapeHtml(work);

    // 图片
    s = s.replace(
      /!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g,
      function (_, alt, src, title) {
        return (
          '<img src="' + src + '" alt="' + alt + '"' +
          (title ? ' title="' + title + '"' : '') + '>'
        );
      }
    );
    // 链接
    s = s.replace(
      /\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g,
      function (_, t, href, title) {
        const ext = /^https?:\/\//.test(href) ? ' target="_blank" rel="noopener"' : '';
        return (
          '<a href="' + href + '"' + (title ? ' title="' + title + '"' : '') +
          ext + '>' + t + '</a>'
        );
      }
    );
    // 粗体
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    // 斜体
    s = s.replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, '$1<em>$2</em>');
    s = s.replace(/(^|[^_])_([^_\s][^_]*?)_/g, '$1<em>$2</em>');
    // 删除线
    s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    // 还原行内代码
    s = s.replace(/(\d+)/g, function (_, i) {
      return '<code>' + escapeHtml(codes[+i]) + '</code>';
    });
    return s;
  }

  function parse(md) {
    const lines = String(md).replace(/\r\n/g, '\n').split('\n');
    let html = '';
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // 代码围栏 ```
      if (/^```/.test(line)) {
        const lang = line.slice(3).trim();
        let code = '';
        i++;
        while (i < lines.length && !/^```/.test(lines[i])) {
          code += lines[i] + '\n';
          i++;
        }
        i++; // 跳过结束围栏
        html +=
          '<pre><code' + (lang ? ' class="language-' + lang + '"' : '') + '>' +
          escapeHtml(code.replace(/\n$/, '')) +
          '</code></pre>';
        continue;
      }

      // 空行
      if (/^\s*$/.test(line)) { i++; continue; }

      // 标题
      const h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        const lv = h[1].length;
        html += '<h' + lv + '>' + parseInline(h[2].trim()) + '</h' + lv + '>';
        i++;
        continue;
      }

      // 分割线
      if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
        html += '<hr>';
        i++;
        continue;
      }

      // 引用
      if (/^>\s?/.test(line)) {
        let quote = '';
        while (i < lines.length && /^>\s?/.test(lines[i])) {
          quote += lines[i].replace(/^>\s?/, '') + '\n';
          i++;
        }
        html += '<blockquote>' + parse(quote) + '</blockquote>';
        continue;
      }

      // 无序列表
      if (/^\s*[-*+]\s+/.test(line)) {
        let items = '';
        while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
          items += '<li>' + parseInline(lines[i].replace(/^\s*[-*+]\s+/, '')) + '</li>';
          i++;
        }
        html += '<ul>' + items + '</ul>';
        continue;
      }

      // 有序列表
      if (/^\s*\d+\.\s+/.test(line)) {
        let items = '';
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
          items += '<li>' + parseInline(lines[i].replace(/^\s*\d+\.\s+/, '')) + '</li>';
          i++;
        }
        html += '<ol>' + items + '</ol>';
        continue;
      }

      // 段落: 聚合并遇到块级起始或空行结束
      let para = '';
      while (
        i < lines.length &&
        !/^\s*$/.test(lines[i]) &&
        !/^(#{1,6})\s/.test(lines[i]) &&
        !/^```/.test(lines[i]) &&
        !/^>\s?/.test(lines[i]) &&
        !/^\s*[-*+]\s+/.test(lines[i]) &&
        !/^\s*\d+\.\s+/.test(lines[i]) &&
        !/^\s*([-*_])(\s*\1){2,}\s*$/.test(lines[i])
      ) {
        para += (para ? '\n' : '') + lines[i];
        i++;
      }
      html += '<p>' + parseInline(para).replace(/\n/g, '<br>') + '</p>';
    }
    return html;
  }

  global.MD = { render: parse };
})(window);
