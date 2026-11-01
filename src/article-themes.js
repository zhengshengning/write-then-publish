// 长文内置主题：一个主题就是一段作用于 #nice 的 CSS，渲染时 #nice 换成 .article-preview。
// 写法与 markdown-nice 主题一致，可在「主题 CSS」编辑器里查看，也能复制成自定义主题。
(() => {
  const SANS = 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const SERIF = 'Georgia, "Times New Roman", "Songti SC", SimSun, serif';
  const MONO = '"SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace';

  function articleCss({ accent, background = "#fff", font = SANS, h2 = "tag", extra = "" }) {
    const h2Rule = h2 === "tag"
      ? `#nice h2 {
  display: table;
  margin-top: 34px;
  padding: 3px 8px;
  color: var(--article-accent);
  background: color-mix(in srgb, var(--article-accent) 14%, white);
  font-size: 1.16em;
  line-height: 1.45;
}`
      : `#nice h2 {
  margin-top: 34px;
  padding-bottom: 6px;
  border-bottom: 1px solid color-mix(in srgb, var(--article-accent) 30%, white);
  color: var(--article-accent);
  font-size: 1.16em;
  line-height: 1.45;
}`;
    return `/* 全局属性 */
#nice {
  --article-accent: ${accent};
  --article-base-size: 17px;
  color: #1f2937;
  background: ${background};
  font-family: ${font};
  font-size: var(--article-base-size);
  letter-spacing: 0.02em;
  line-height: 2;
}

#nice h1,
#nice h2,
#nice h3,
#nice p,
#nice blockquote,
#nice ul,
#nice pre,
#nice figure,
#nice .article-table-wrap {
  margin: 0 0 24px;
}

/* 一级标题：下划线用真实的 .suffix 元素，复制到公众号后仍在 */
#nice h1 {
  color: #111827;
  font-size: 1.45em;
  line-height: 1.35;
  text-align: center;
}

#nice h1 .suffix {
  display: block;
  width: 64%;
  height: 2px;
  margin: 14px auto 0;
  background: var(--article-accent);
}

/* 二级标题 */
${h2Rule}

/* 三级标题 */
#nice h3 {
  color: var(--article-accent);
  font-size: 1.02em;
}

#nice h4,
#nice h5,
#nice h6 {
  margin: 0 0 16px;
  color: #111827;
  font-size: 1em;
}

#nice h1 .prefix,
#nice h2 .prefix,
#nice h2 .suffix,
#nice h3 .prefix,
#nice h3 .suffix,
#nice h4 .prefix,
#nice h4 .suffix,
#nice h5 .prefix,
#nice h5 .suffix,
#nice h6 .prefix,
#nice h6 .suffix {
  display: none;
}

/* 链接 */
#nice a {
  color: inherit;
  text-decoration: none;
}

/* 列表 */
#nice ul {
  padding-left: 1.4em;
}

#nice li section {
  display: block;
}

/* 加粗 */
#nice strong {
  background: color-mix(in srgb, var(--article-accent) 18%, transparent);
  font-weight: 800;
}

/* 引用 */
#nice blockquote {
  padding: 18px 20px;
  border-left: 4px solid var(--article-accent);
  border-radius: 8px;
  color: #273445;
  background: color-mix(in srgb, var(--article-accent) 10%, white);
  font-style: italic;
}

#nice blockquote p {
  margin: 0;
}

/* 行内代码 */
#nice code {
  padding: 2px 6px;
  border-radius: 4px;
  color: color-mix(in srgb, var(--article-accent) 82%, #111827);
  background: color-mix(in srgb, var(--article-accent) 9%, white);
  font-family: ${MONO};
  font-size: 0.88em;
  letter-spacing: 0;
  overflow-wrap: anywhere;
}

/* 代码块：比正文小一号，手机宽度里一行能放下 50 字符左右；配色由代码主题决定 */
#nice pre {
  overflow: hidden;
  padding: 0;
  border-radius: 10px;
  font-family: ${MONO};
  font-size: 0.76em;
  line-height: 1.7;
  letter-spacing: 0;
  white-space: pre;
}

#nice pre code {
  padding: 12px 16px 14px;
  border-radius: 0;
  background: transparent;
  color: inherit;
  font-size: inherit;
  white-space: inherit;
  overflow-wrap: normal;
}

/* 图片 */
#nice img {
  display: block;
  max-width: 100%;
  border-radius: 8px;
}

/* 表格 */
#nice .article-table-wrap {
  border: 1px solid color-mix(in srgb, var(--article-accent) 26%, #d7dde5);
  border-radius: 8px;
}

#nice table {
  width: 100%;
  min-width: 360px;
  border-collapse: collapse;
  font-size: 0.88em;
  line-height: 1.55;
}

#nice th,
#nice td {
  padding: 10px 12px;
  border-right: 1px solid #e4e8ee;
  border-bottom: 1px solid #e4e8ee;
  text-align: left;
  vertical-align: top;
}

#nice th:last-child,
#nice td:last-child {
  border-right: 0;
}

#nice tbody tr:last-child td {
  border-bottom: 0;
}

#nice th {
  color: var(--article-accent);
  background: color-mix(in srgb, var(--article-accent) 11%, #fff);
  font-weight: 800;
}
${extra}`;
  }

  const markdown = [
    { id: "wechat", name: "微信绿", author: "写了就发", css: articleCss({ accent: "#0f766e" }) },
    { id: "classic", name: "经典蓝", author: "写了就发", css: articleCss({ accent: "#145da0" }) },
    { id: "elegant", name: "优雅", author: "写了就发", css: articleCss({ accent: "#9a3412", background: "#fffdf8", font: SERIF }) },
    { id: "clean", name: "简洁", author: "写了就发", css: articleCss({ accent: "#111827", h2: "line" }) },
    {
      id: "colorful",
      name: "多彩微信",
      author: "写了就发",
      css: articleCss({
        accent: "#0f766e",
        extra: `
/* 二级标题轮换三种颜色 */
#nice h2:nth-of-type(3n + 1) {
  color: #2563eb;
}

#nice h2:nth-of-type(3n + 2) {
  color: #dc2626;
}
`,
      }),
    },
  ];

  // 代码主题沿用 highlight.js 的类名，markdown-nice 的代码主题可以直接套用。
  const code = [
    {
      id: "github-dark",
      name: "GitHub Dark",
      css: `.hljs {
  display: block;
  overflow-x: auto;
  padding: 16px;
  color: #e6edf3;
  background: #0d1117;
}

.hljs-comment {
  color: #8b949e;
  font-style: italic;
}

.hljs-keyword {
  color: #ff7b72;
}

.hljs-string {
  color: #a5d6ff;
}

.hljs-number,
.hljs-literal,
.hljs-attr {
  color: #79c0ff;
}

.hljs-title {
  color: #d2a8ff;
}

.hljs-meta,
.hljs-variable {
  color: #ffa657;
}`,
    },
  ];

  window.WriteThenPublishArticleThemes = { markdown, code };
})();
