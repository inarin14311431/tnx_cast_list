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
const withoutComments = source => source.replace(/\/\*[\s\S]*?\*\//g, "");
const stripQueryHash = value => value.split(/[?#]/, 1)[0];

const cssRoot = path.join(root, "css-next");
const cssFiles = await filesUnder(cssRoot, ".css");
const cssContentOwners = new Map();
for (const file of cssFiles) {
  const source = await readFile(file, "utf8");
  if (/!important\b/i.test(source)) violations.push(`${relative(file)}: !important is forbidden`);

  const contentKey = source.trim();
  if (contentKey) {
    const firstOwner = cssContentOwners.get(contentKey);
    if (firstOwner) {
      violations.push(`${relative(file)}: duplicates stylesheet content owned by ${firstOwner}`);
    } else {
      cssContentOwners.set(contentKey, relative(file));
    }
  }
}

const commonEntry = withoutComments(await readFile(path.join(cssRoot, "index.css"), "utf8"));
if (/@import\s+url\(["']\.\/(?:editor|pages)\//.test(commonEntry)) {
  violations.push("css-next/index.css: editor/page CSS must be owned by page entries");
}
if (/@import[^;]*themes\//.test(commonEntry)) {
  violations.push("css-next/index.css: theme CSS must load through the final theme bundle");
}

const rootEntries = await readdir(root, { withFileTypes: true });
const htmlPages = rootEntries.filter(entry => entry.isFile() && entry.name.endsWith(".html")).map(entry => entry.name);
const cssRoots = new Set();
let themeEnabledCount = 0;
for (const page of htmlPages) {
  const file = path.join(root, page);
  const source = await readFile(file, "utf8");
  const head = source.match(/<head>[\s\S]*?<\/head>/i)?.[0] || "";
  const stylesheets = [...head.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi)].map(match => match[1]);

  for (const href of stylesheets) {
    const localHref = stripQueryHash(href);
    if (!localHref.startsWith("./css-next/")) continue;
    const cssFile = path.resolve(root, localHref);
    if (!await exists(cssFile)) {
      violations.push(`${page}: missing stylesheet ${localHref}`);
      continue;
    }
    cssRoots.add(cssFile);
  }

  if (!source.includes('data-css-system="next"')) continue;
  if (/href=["']\.\/css\//i.test(source)) violations.push(`${page}: legacy css/ stylesheet reference remains`);

  const hasThemeBundle = source.includes("./css-next/themes/index.css?v=1");
  if (!hasThemeBundle) continue;
  themeEnabledCount += 1;
  if (stylesheets.length !== 2) violations.push(`${page}: expected exactly two stylesheet links, got ${stylesheets.length}`);
  if (!stylesheets[0]?.startsWith("./css-next/pages/") || !/-entry\.css(?:\?|$)/.test(stylesheets[0] || "")) {
    violations.push(`${page}: first stylesheet must be a css-next/pages/*-entry.css file`);
  }
  if (stylesheets.at(-1) !== "./css-next/themes/index.css?v=1") {
    violations.push(`${page}: final stylesheet must be css-next/themes/index.css?v=1`);
  }
  const entry = stylesheets[0]?.split("?")[0];
  if (entry && entry.startsWith("./") && !await exists(path.resolve(root, entry))) {
    violations.push(`${page}: missing page entry ${entry}`);
  }
  if (/<style\b/i.test(source)) violations.push(`${page}: inline style blocks are forbidden`);
  if (/\sstyle=["']/i.test(source)) violations.push(`${page}: inline style attributes are forbidden`);
}

const reachableCss = new Set();
const pendingCss = [...cssRoots];
while (pendingCss.length) {
  const file = pendingCss.pop();
  if (!file || reachableCss.has(file)) continue;
  reachableCss.add(file);

  const source = withoutComments(await readFile(file, "utf8"));
  const imports = [...source.matchAll(/@import\s+(?:url\(\s*)?["']([^"']+)["']\s*\)?[^;]*;/gi)].map(match => match[1]);
  for (const importHref of imports) {
    const localHref = stripQueryHash(importHref);
    if (/^(?:[a-z]+:|\/\/|data:)/i.test(localHref)) continue;
    const importedFile = path.resolve(path.dirname(file), localHref);
    if (!importedFile.startsWith(cssRoot + path.sep) && importedFile !== cssRoot) continue;
    if (!await exists(importedFile)) {
      violations.push(`${relative(file)}: missing imported stylesheet ${localHref}`);
      continue;
    }
    pendingCss.push(importedFile);
  }
}

for (const file of cssFiles) {
  if (!reachableCss.has(file)) violations.push(`${relative(file)}: stylesheet is unreachable from production HTML roots`);
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
console.log(`CSS architecture audit passed: ${cssFiles.length} CSS files, ${themeEnabledCount} theme-enabled pages, all CSS reachable with no duplicate stylesheet owners or runtime CSS generation.`);
