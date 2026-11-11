# 空山 · KONGSHAN

一个极简的个人志。纯静态站点，零依赖：原生 HTML / CSS / JavaScript，Markdown 在前端渲染。

线上：https://liyao223.github.io/blog/

## 写作

两件事：往 `posts/` 放一个 `.md`，在 `posts/index.json` 里登记一条元数据。

```json
{
  "slug": "my-post",
  "title": "标题",
  "date": "2026-11-11",
  "tags": ["随想"],
  "excerpt": "一句话摘要"
}
```

英文版可选：`posts/en/<slug>.md` + `title_en` / `excerpt_en` / `tags_en`（顺序与中文标签对应），缺失时自动回退中文。

## 本地写作台

```bash
node server.mjs          # http://127.0.0.1:8080/admin.html
```

编辑后「写入文件」落盘，「发布上线」提交到本仓库，GitHub Pages 约一分钟自动更新。

## 结构

```
index.html / post.html / tags.html / about.html / admin.html
assets/css/style.css, admin.css
assets/js/markdown.js, site.js, i18n.js, home.js, post.js, tags.js, about.js, admin.js
posts/*.md, posts/en/*.md, posts/index.json
server.mjs（本地写作服务，不发布）
github-publish.mjs（GitHub 提交模块，不发布）
```
