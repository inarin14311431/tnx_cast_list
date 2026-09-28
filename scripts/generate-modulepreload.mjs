import { readdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");

const MARKER_START = "<!-- modulepreload:start -->";
const MARKER_END = "<!-- modulepreload:end -->";

async function exists(target) {
  try { await access(target); return true; } catch { return false; }
}

function cleanSpecifier(raw) {
  const withoutHash = String(raw || "").split("#")[0];
  const queryIndex = withoutHash.indexOf("?");
  return queryIndex === -1
    ? { clean: withoutHash, query: "" }
    : { clean: withoutHash.slice(0, queryIndex), query: withoutHash.slice(queryIndex) };
}

/* Static import/export-from specifiers only. The lazy `[^"'()]*?` class between
 * `import`/`export ... from` and the quoted specifier cannot cross a `(`, so it never
 * matches a dynamic `import(...)` call - dynamic imports are intentionally excluded. */
function staticSpecifiers(source) {
  const values = [];
  for (const match of source.matchAll(/\bimport\s+(?:[^"'()]*?\s+from\s+)?["']([^"']+)["']/g)) values.push(match[1]);
  for (const match of source.matchAll(/\bexport\s+(?:\*|\{[^}]*\})\s+from\s+["']([^"']+)["']/g)) values.push(match[1]);
  return values;
}

async function resolveLocal(importerFile, raw) {
  const { clean, query } = cleanSpecifier(raw);
  if (!clean.startsWith(".")) return null;
  const base = path.resolve(path.dirname(importerFile), clean);
  const candidates = path.extname(base)
    ? [base]
    : [base, `${base}.js`, `${base}.mjs`, path.join(base, "index.js"), path.join(base, "index.mjs")];
  for (const candidate of candidates) if (await exists(candidate)) return { file: candidate, query };
  return { missing: base, query };
}

function findModuleEntries(html) {
  const entries = [];
  for (const tag of html.matchAll(/<script\b[^>]*>/g)) {
    const tagText = tag[0];
    if (!/type=["']module["']/.test(tagText)) continue;
    const srcMatch = tagText.match(/src=["']([^"']+)["']/);
    if (srcMatch) entries.push(srcMatch[1]);
  }
  return entries;
}

function hrefFor(resolvedFile, query) {
  return `./${path.relative(root, resolvedFile).split(path.sep).join("/")}${query}`;
}

async function crawlHtml(htmlFile, htmlPath, entries) {
  const queryByFile = new Map();
  const order = [];
  const visited = new Set();
  const conflicts = [];
  const missing = [];

  async function visit(resolvedFile, query) {
    const known = queryByFile.get(resolvedFile);
    if (known === undefined) {
      queryByFile.set(resolvedFile, query);
      order.push(resolvedFile);
    } else if (known !== query) {
      conflicts.push({ file: path.relative(root, resolvedFile).split(path.sep).join("/"), urls: [known, query].sort() });
    }

    if (visited.has(resolvedFile)) return;
    visited.add(resolvedFile);

    const source = await readFile(resolvedFile, "utf8");
    for (const raw of staticSpecifiers(source)) {
      const resolved = await resolveLocal(resolvedFile, raw);
      if (!resolved) continue;
      if (resolved.missing) {
        missing.push(`${path.relative(root, resolvedFile).split(path.sep).join("/")}: missing import target ${raw}`);
        continue;
      }
      await visit(resolved.file, resolved.query);
    }
  }

  const entryFiles = new Set();
  for (const entryHref of entries) {
    const resolved = await resolveLocal(htmlPath, entryHref);
    if (!resolved) continue;
    if (resolved.missing) {
      missing.push(`${htmlFile}: missing module entry ${entryHref}`);
      continue;
    }
    entryFiles.add(resolved.file);
    await visit(resolved.file, resolved.query);
  }

  /* Entries are already fetched by their own <script type="module" src> tag, so only their
   * transitive static dependencies need a modulepreload hint - not the entry file itself. */
  const links = order
    .filter(file => !entryFiles.has(file))
    .map(file => `  <link rel="modulepreload" href="${hrefFor(file, queryByFile.get(file))}">`);
  return { links, conflicts, missing };
}

/* Restores the original indentation on both sides of the inserted block so a
 * generated diff never touches formatting outside the marker region. */
function applyMarkers(html, links) {
  const headMatch = html.match(/<head\b[^>]*>[\s\S]*?<\/head>/i);
  if (!headMatch) return null;
  const head = headMatch[0];

  let before, after, afterHasOwnIndent;
  if (head.includes(MARKER_START) && head.includes(MARKER_END)) {
    const startIndex = head.indexOf(MARKER_START);
    const endIndex = head.indexOf(MARKER_END) + MARKER_END.length;
    before = head.slice(0, startIndex);
    after = head.slice(endIndex);
    afterHasOwnIndent = true;
  } else {
    const scriptMatch = head.match(/<script\b/);
    const insertAt = scriptMatch ? scriptMatch.index : head.search(/<\/head>/i);
    if (insertAt === -1) return null;
    before = head.slice(0, insertAt);
    after = head.slice(insertAt);
    afterHasOwnIndent = false;
  }
  const indent = (before.match(/[ \t]*$/) || [""])[0];

  const block = [MARKER_START, ...links, `${indent}${MARKER_END}`].join("\n");
  const nextHead = before + block + (afterHasOwnIndent ? "" : `\n${indent}`) + after;
  return html.slice(0, headMatch.index) + nextHead + html.slice(headMatch.index + head.length);
}

const htmlFiles = (await readdir(root)).filter(name => name.endsWith(".html")).sort();

const allConflicts = [];
const allMissing = [];
const results = [];

for (const htmlFile of htmlFiles) {
  const htmlPath = path.join(root, htmlFile);
  const html = await readFile(htmlPath, "utf8");
  const entries = findModuleEntries(html);
  if (!entries.length) continue;

  const { links, conflicts, missing } = await crawlHtml(htmlFile, htmlPath, entries);
  for (const conflict of conflicts) allConflicts.push({ htmlFile, ...conflict });
  for (const item of missing) allMissing.push(`${htmlFile} -> ${item}`);
  results.push({ htmlFile, htmlPath, html, links });
}

if (allConflicts.length) {
  console.error("modulepreload generation failed: the same file is imported with different URLs.");
  for (const conflict of allConflicts) {
    console.error(`- ${conflict.htmlFile}: ${conflict.file} is imported as both ${conflict.urls[0]} and ${conflict.urls[1]}`);
  }
  process.exit(1);
}

if (allMissing.length) {
  console.error("modulepreload generation failed: unresolved import targets.");
  for (const item of allMissing) console.error(`- ${item}`);
  process.exit(1);
}

if (CHECK) {
  const stale = [];
  for (const { htmlFile, html, links } of results) {
    const next = applyMarkers(html, links);
    if (next === null) {
      stale.push(`${htmlFile}: no <head> or <script> found to anchor modulepreload links`);
      continue;
    }
    if (next !== html) stale.push(htmlFile);
  }
  if (stale.length) {
    console.error("modulepreload links are out of date. Run: npm run preload:update");
    for (const item of stale) console.error(`- ${item}`);
    process.exit(1);
  }
  console.log(`modulepreload check passed: ${results.length} HTML entr${results.length === 1 ? "y" : "ies"} up to date.`);
  process.exit(0);
}

let changed = 0;
for (const { htmlFile, htmlPath, html, links } of results) {
  const next = applyMarkers(html, links);
  if (next === null) {
    console.error(`${htmlFile}: no <head> or <script> found to anchor modulepreload links`);
    process.exit(1);
  }
  if (next !== html) {
    await writeFile(htmlPath, next, "utf8");
    changed++;
  }
}

console.log(`modulepreload updated: ${changed}/${results.length} HTML file(s) changed.`);
