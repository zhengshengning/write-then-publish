#!/usr/bin/env node
// 从本机的 markdown-nice 仓库生成长文主题包 src/vendor/mdnice-themes.js。
//
// markdown-nice 以 GPL-3.0 发布，和本项目的许可证不兼容：生成的文件只供本地自用，
// 已写进 .gitignore，不要提交、不要部署。线上版读不到这个文件时只显示内置主题。
//
// 用法：node scripts/import-mdnice-themes.mjs [markdown-nice 仓库路径]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.resolve(process.argv[2] || path.join(projectRoot, "../../markdown/markdown-nice"));
const templateDir = path.join(sourceRoot, "src/template");
const output = path.join(projectRoot, "src/vendor/mdnice-themes.js");

if (!fs.existsSync(templateDir)) {
  console.error(`找不到 markdown-nice 模板目录：${templateDir}`);
  process.exit(1);
}

// 模板文件都是 `export default \`...\``，直接按 ES 模块导入，模板字符串里的转义由 Node 处理。
async function loadTemplate(relativePath) {
  const file = path.join(templateDir, relativePath);
  const source = fs.readFileSync(file, "utf8");
  const module = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
  if (typeof module.default !== "string") throw new Error(`${file} 不是 CSS 字符串模板`);
  return module.default;
}

// TEMPLATE_OPTIONS / CODE_OPTIONS 在 constant.js 里是字面量数组，按字段读出来，避免执行整个文件。
function readOptions(name) {
  const constants = fs.readFileSync(path.join(sourceRoot, "src/utils/constant.js"), "utf8");
  const block = constants.match(new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\n\\];`))?.[1];
  if (!block) throw new Error(`constant.js 里没有 ${name}`);
  return [...block.matchAll(/\{([\s\S]*?)\}/g)].map(([, body]) => {
    const field = (key) => body.match(new RegExp(`${key}:\\s*"([^"]*)"`))?.[1] || "";
    return { id: field("id"), name: field("name"), author: field("author") };
  });
}

const markdown = [];
for (const option of readOptions("TEMPLATE_OPTIONS")) {
  // 自定义主题由应用自己管理，这里只取它的注释模板作为空白起点。
  if (option.id === "custom") continue;
  markdown.push({ ...option, css: await loadTemplate(`markdown/${option.id}.js`) });
}

const code = [];
for (const option of readOptions("CODE_OPTIONS")) {
  // 「微信代码主题」依赖 markdown-nice 自己的代码块结构，应用里由内置的默认代码主题代替。
  if (option.id === "wechat") continue;
  code.push({ id: option.id, name: option.name, css: await loadTemplate(`code/${option.id}.js`) });
}

const bundle = {
  source: "https://github.com/mdnice/markdown-nice",
  license: "GPL-3.0",
  basic: await loadTemplate("basic.js"),
  customTemplate: await loadTemplate("markdown/custom.js"),
  markdown,
  code,
};

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(
  output,
  [
    "// 由 scripts/import-mdnice-themes.mjs 生成，请勿手改。",
    "// 主题来自 markdown-nice（GPL-3.0）及各主题作者，仅供本地自用：不要提交、不要部署。",
    `window.WriteThenPublishMdniceThemes = ${JSON.stringify(bundle, null, 2)};`,
    "",
  ].join("\n"),
);
console.log(`已生成 ${path.relative(projectRoot, output)}：${markdown.length} 款正文主题、${code.length} 款代码主题`);
console.log(`来源：${pathToFileURL(sourceRoot).href}`);
