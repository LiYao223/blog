搭这个博客时，我给自己定了一条规矩：**零依赖、自包含**。不引任何 CDN，不装构建工具，丢个 `.md` 文件就能发文。

下面把最小可用的骨架拆给你看。

## 目录结构

```text
blog/
├── index.html        # 文章列表
├── post.html         # 文章详情
├── tags.html         # 标签分类
├── about.html        # 关于
├── assets/
│   ├── css/style.css
│   └── js/
│       ├── markdown.js   # 自写 Markdown 渲染器
│       └── site.js       # 主题/进度条/工具
└── posts/
    ├── index.json        # 文章元数据
    └── *.md              # 正文
```

## Markdown 怎么渲染

核心是一个轻量的渲染函数，先把文本转义防 XSS，再按行识别块级结构，最后处理行内格式：

```js
function parseInline(raw) {
  // 行内代码先抽出来当占位符，避免被 * 规则误伤
  let work = raw.replace(/`([^`]+)`/g, (_, c) => SENT_S + (codes.push(c) - 1) + SENT_E);
  let s = escapeHtml(work);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
  return s;
}
```

支持的子集：标题、`**粗体**`、`*斜体*`、行内代码、链接、图片、有序/无序列表、引用、代码块、分割线。日常写作足够。

## 文章是怎么列出来的

`posts/index.json` 只存元数据，正文各自是独立 `.md`：

```json
{
  "slug": "welcome",
  "title": "在留白处落笔",
  "date": "2026-09-01",
  "tags": ["随想", "开篇"],
  "excerpt": "开一个极简个人志……"
}
```

列表页 `fetch` 这个 json 渲染卡片；详情页读 `?slug=` 再去拉对应的 `.md`。

> 注意：因为用了 `fetch`，需要**通过本地服务器**打开（如 `python3 -m http.server`），直接双击 `index.html` 会被浏览器的文件协议拦住。

## 为什么要这么"笨"

更聪明的方案很多——Astro、Next.js、Hugo……但它们都要求你先理解一套系统。

而这个版本的全部智慧，就是**没有系统**：

- 想发文？复制一份 `.md`，改个 slug，填一行 json。
- 想换皮？改 `style.css` 里的几个变量。
- 想搬走？连文件夹一起拷，哪儿都能跑。

对一个人写的个人志来说，**能一直写下去**，比功能多更重要。
