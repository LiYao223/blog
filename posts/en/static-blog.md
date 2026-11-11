When I built this blog I set myself one rule: **zero dependencies, self-contained**. No CDN, no build tooling. Drop in a `.md` file and you have published.

Here is the smallest skeleton that works.

## Directory layout

```text
blog/
├── index.html        # post list
├── post.html         # post detail
├── tags.html         # tag archive
├── about.html        # about
├── assets/
│   ├── css/style.css
│   └── js/
│       ├── markdown.js   # hand-written Markdown renderer
│       └── site.js       # theme / progress bar / helpers
└── posts/
    ├── index.json        # post metadata
    └── *.md              # the writing itself
```

## How the Markdown gets rendered

At the core is a small rendering function: escape the text first to prevent XSS, then walk the lines to recognise block structure, and handle inline formatting last:

```js
function parseInline(raw) {
  // pull inline code out first as a placeholder, so the * rule cannot mangle it
  let work = raw.replace(/`([^`]+)`/g, (_, c) => SENT_S + (codes.push(c) - 1) + SENT_E);
  let s = escapeHtml(work);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
  return s;
}
```

The supported subset: headings, `**bold**`, `*italic*`, inline code, links, images, ordered and unordered lists, blockquotes, fenced code blocks, horizontal rules. Plenty for everyday writing.

## How the post list is assembled

`posts/index.json` holds only metadata; each body lives in its own `.md`:

```json
{
  "slug": "welcome",
  "title": "在留白处落笔",
  "date": "2026-09-01",
  "tags": ["随想", "开篇"],
  "excerpt": "开一个极简个人志……"
}
```

The list page fetches that json and renders cards; the detail page reads `?slug=` and then pulls the matching `.md`.

> Note: because it uses `fetch`, you need to open it **through a local server** (e.g. `python3 -m http.server`). Double-clicking `index.html` gets blocked by the browser's file protocol.

## Why be this "dumb"

There are far cleverer options — Astro, Next.js, Hugo — but each one asks you to understand a system first.

The entire wisdom of this version is that **there is no system**:

- Want to publish? Copy a `.md`, change the slug, add one line of json.
- Want a new look? Change a few variables in `style.css`.
- Want to move? Copy the folder somewhere else and it runs.

For a journal written by one person, **being able to keep writing** matters more than having more features.
