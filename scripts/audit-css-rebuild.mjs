import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const violations = [];

async function exists(file) {
  try { await access(file); return true; } catch { return false; }
}
async function filesUnder(directory, extension) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await filesUnder(full, extension));
    else if (!extension || full.endsWith(extension)) result.push(full);
  }
  return result.sort();
}
const relative = file => path.relative(root, file).replaceAll(path.sep, "/");

const cssRoot = path.join(root, "css-next");
const cssFiles = await filesUnder(cssRoot, ".css");
for (const file of cssFiles) {
  const source = await readFile(file, "utf8");
  if (/!important\b/i.test(source)) violations.push(`${relative(file)}: !important is forbidden`);
}

const commonEntry = await readFile(path.join(cssRoot, "index.css"), "utf8");
if (/@import\s+url\(["']\.\/(?:editor|pages)\//.test(commonEntry)) {
  violations.push("css-next/index.css: editor/page CSS must be owned by page entries");
}
if (/themes\//.test(commonEntry)) {
  violations.push("css-next/index.css: theme CSS must load through the final theme bundle");
}

const activePages = [
  "404.html", "account.html", "acts.html", "backup.html", "cast.html", "combos.html",
  "index.html", "login.html", "manual-data-import.html", "mobile-transfer.html",
  "password-reset.html", "register.html", "sheet-mobile-new.html", "sheet-mobile.html",
  "sheet.html", "showcase-generator.html", "statistics.html", "transfer.html",
  "troop.html", "troops.html"
];

for (const page of activePages) {
  const file = path.join(root, page);
  if (!await exists(file)) {
    violations.push(`${page}: active page is missing`);
    continue;
  }
  const source = await readFile(file, "utf8");
  const head = source.match(/<head>[\s\S]*?<\/head>/i)?.[0] || "";
  const stylesheets = [...head.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi)].map(match => match[1]);
  if (stylesheets.length !== 2) violations.push(`${page}: expected exactly two stylesheet links, got ${stylesheets.length}`);
  if (!stylesheets[0]?.startsWith("./css-next/pages/") || !/-entry\.css(?:\?|$)/.test(stylesheets[0] || "")) {
    violations.push(`${page}: first stylesheet must be a css-next/pages/*-entry.css file`);
  }
  if (stylesheets.at(-1) !== "./css-next/themes/index.css?v=1") {
    violations.push(`${page}: final stylesheet must be css-next/themes/index.css?v=1`);
  }
  const entry = stylesheets[0]?.split("?")[0];
  if (entry && entry.startsWith("./")) {
    const target = path.resolve(root, entry);
    if (!await exists(target)) violations.push(`${page}: missing page entry ${entry}`);
  }
  if (/<style\b/i.test(source)) violations.push(`${page}: inline style blocks are forbidden`);
  if (/\sstyle=["']/i.test(source)) violations.push(`${page}: inline style attributes are forbidden`);
  if (/href=["']\.\/css\//i.test(source)) violations.push(`${page}: legacy css/ stylesheet reference remains`);
}

const jsFiles = await filesUnder(path.join(root, "js"), ".js");
for (const file of jsFiles) {
  const source = await readFile(file, "utf8");
  if (/createElement\(\s*["']style["']\s*\)/i.test(source)) violations.push(`${relative(file)}: runtime <style> generation is forbidden`);
  if (/createElement\(\s*["']link["']\s*\)[\s\S]{0,240}(?:stylesheet|\.css)/i.test(source)) violations.push(`${relative(file)}: runtime stylesheet link generation is forbidden`);
}

if (violations.length) {
  console.error("CSS architecture audit failed:\n" + violations.map(item => `- ${item}`).join("\n"));
  process.exit(1);
}
console.log(`CSS architecture audit passed: ${cssFiles.length} CSS files, ${activePages.length} production pages, no runtime CSS generation.`);
