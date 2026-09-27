import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const jsRoot = path.join(root, "js");

function relative(file) {
  return path.relative(root, file).replaceAll(path.sep, "/");
}

async function filesUnder(directory, predicate) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await filesUnder(full, predicate));
    else if (predicate(entry.name, full)) result.push(full);
  }
  return result.sort();
}

function cleanRef(raw) {
  return String(raw || "").split("#")[0].split("?")[0].trim();
}

function resolveScriptRef(htmlFile, raw) {
  const ref = cleanRef(raw);
  if (!ref || /^(?:https?:|data:|javascript:)/i.test(ref)) return null;
  const target = ref.startsWith("/")
    ? path.resolve(root, ref.slice(1))
    : path.resolve(path.dirname(htmlFile), ref);
  if (!target.startsWith(jsRoot + path.sep)) return null;
  return relative(target);
}

function countMatches(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

const rootEntries = await readdir(root, { withFileTypes: true });
const htmlFiles = rootEntries
  .filter(entry => entry.isFile() && entry.name.endsWith(".html"))
  .map(entry => path.join(root, entry.name))
  .sort();
const jsFiles = await filesUnder(jsRoot, name => name.endsWith(".js"));
const jsSources = new Map();
for (const file of jsFiles) jsSources.set(relative(file), await readFile(file, "utf8"));

const pages = [];
for (const file of htmlFiles) {
  const source = await readFile(file, "utf8");
  const scripts = [];
  for (const match of source.matchAll(/<script\b([^>]*)>/gi)) {
    const attributes = match[1];
    const src = attributes.match(/\bsrc=["']([^"']+)["']/i)?.[1];
    if (!src) continue;
    const target = resolveScriptRef(file, src);
    if (!target) continue;
    scripts.push({
      path: target,
      kind: /\btype=["']module["']/i.test(attributes) ? "module" : "classic"
    });
  }
  pages.push({
    page: relative(file),
    total: scripts.length,
    classic: scripts.filter(script => script.kind === "classic").length,
    modules: scripts.filter(script => script.kind === "module").length,
    scripts
  });
}

const aggregate = {
  files: jsFiles.length,
  eventListeners: 0,
  mutationObservers: 0,
  resizeObservers: 0,
  intersectionObservers: 0,
  globalExports: 0
};
const hotspots = [];

for (const [file, source] of jsSources) {
  const metrics = {
    eventListeners: countMatches(source, /\b(?:addEventListener|removeEventListener)\s*\(/g),
    mutationObservers: countMatches(source, /\bnew\s+MutationObserver\b/g),
    resizeObservers: countMatches(source, /\bnew\s+ResizeObserver\b/g),
    intersectionObservers: countMatches(source, /\bnew\s+IntersectionObserver\b/g),
    globalExports: countMatches(source, /\b(?:globalThis|window)\s*\.[A-Za-z_$][\w$]*\s*=/g)
  };
  for (const key of Object.keys(metrics)) aggregate[key] += metrics[key];
  const score = Object.values(metrics).reduce((sum, value) => sum + value, 0);
  if (score > 0) hotspots.push({ file, ...metrics, score });
}

hotspots.sort((a, b) => b.score - a.score || a.file.localeCompare(b.file));

const report = {
  schema: 1,
  pages,
  aggregate,
  hotspots: hotspots.slice(0, 25)
};

if (process.argv.includes("--verbose")) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`JS baseline audit: ${aggregate.files} files, ${pages.length} pages, ${report.hotspots.length} hotspots (use --verbose for the full report)`);
}
