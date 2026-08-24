import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const jsRoot = path.join(root, "js");
const problems = [];
const warnings = [];
const graph = new Map();

const retired = new Set([
  "js/cast-mobile-combos.js",
  "js/cast-quick-outfit-pairs.js",
  "js/transfer-form-prototype.js"
]);

async function exists(target) {
  try { await access(target); return true; } catch { return false; }
}

async function filesUnder(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await filesUnder(full));
    else if (/\.(?:js|mjs)$/.test(entry.name)) result.push(full);
  }
  return result.sort();
}

function relative(file) {
  return path.relative(root, file).replaceAll(path.sep, "/");
}

function importSpecifiers(source) {
  const values = [];
  for (const match of source.matchAll(/\bimport\s+(?:[^"'()]*?\s+from\s+)?["']([^"']+)["']/g)) values.push(match[1]);
  for (const match of source.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g)) values.push(match[1]);
  for (const match of source.matchAll(/\bexport\s+(?:\*|\{[^}]*\})\s+from\s+["']([^"']+)["']/g)) values.push(match[1]);
  return [...new Set(values)];
}

function cleanSpecifier(raw) {
  return String(raw || "").split("#")[0].split("?")[0];
}

async function resolveLocal(importer, raw) {
  const specifier = cleanSpecifier(raw);
  if (!specifier.startsWith(".")) return null;
  const base = path.resolve(path.dirname(importer), specifier);
  const candidates = path.extname(base)
    ? [base]
    : [base, `${base}.js`, `${base}.mjs`, path.join(base, "index.js"), path.join(base, "index.mjs")];
  for (const candidate of candidates) if (await exists(candidate)) return candidate;
  return { missing: base };
}

const files = await filesUnder(jsRoot);
for (const file of files) {
  const name = relative(file);
  const source = await readFile(file, "utf8");
  const dependencies = new Set();

  for (const raw of importSpecifiers(source)) {
    const resolved = await resolveLocal(file, raw);
    if (!resolved) continue;
    if (resolved.missing) {
      problems.push(`${name}: missing import target ${raw}`);
      continue;
    }
    const dependency = relative(resolved);
    dependencies.add(dependency);
    if (retired.has(dependency)) problems.push(`${name}: imports retired runtime ${dependency}`);
  }

  graph.set(name, dependencies);
}

for (const retiredPath of retired) {
  if (await exists(path.join(root, retiredPath))) problems.push(`${retiredPath}: retired runtime file must not exist`);
}

const visiting = new Set();
const visited = new Set();
const stack = [];
const cycleKeys = new Set();

function visit(node) {
  if (visited.has(node)) return;
  if (visiting.has(node)) return;
  visiting.add(node);
  stack.push(node);

  for (const dependency of graph.get(node) || []) {
    if (!graph.has(dependency)) continue;
    const index = stack.indexOf(dependency);
    if (index >= 0) {
      const cycle = [...stack.slice(index), dependency];
      const key = cycle.join(" -> ");
      if (!cycleKeys.has(key)) {
        cycleKeys.add(key);
        warnings.push(`module cycle: ${key}`);
      }
      continue;
    }
    visit(dependency);
  }

  stack.pop();
  visiting.delete(node);
  visited.add(node);
}

for (const node of graph.keys()) visit(node);

if (warnings.length) {
  console.warn("Module graph warnings:");
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (problems.length) {
  console.error("Module dependency graph audit failed:");
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

const edges = [...graph.values()].reduce((sum, dependencies) => sum + dependencies.size, 0);
console.log(`Module dependency graph audit passed: ${graph.size} modules, ${edges} local import edges, ${warnings.length} cycle warning(s).`);
