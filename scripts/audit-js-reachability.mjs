import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const jsRoot = path.join(root, "js");
const relative = file => path.relative(root, file).replaceAll(path.sep, "/");

// These modules are genuine runtime entry points but are injected dynamically rather
// than reached through an ES-module import edge that can be resolved statically here.
// Keep this list narrow and require a concrete loader in production code for every item.
const explicitRuntimeRoots = new Set([
  // supabase-client.js injects the VTT exporters on cast/sheet pages.
  "js/cocofolia-export.js",
  "js/udonarium-export.js",
  // tnx-transfer-bookmarklet.js injects the responsibility modules into the target site.
  "js/tnx-transfer-bookmarklet-fixes.js",
  "js/tnx-transfer-common.js",
  "js/tnx-transfer-social-connection.js",
  "js/tnx-transfer-style-skills.js",
  "js/tnx-transfer-general-skills.js",
  "js/tnx-transfer-handle-repair.js"
]);

async function filesUnder(directory, extension) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await filesUnder(full, extension));
    else if (!extension || full.endsWith(extension)) result.push(full);
  }
  return result.sort();
}

function cleanRef(raw) {
  return String(raw || "").split("#")[0].split("?")[0].trim();
}

function resolveJsRef(fromFile, raw) {
  const ref = cleanRef(raw);
  if (!ref || /^(?:https?:|data:|javascript:)/i.test(ref) || !ref.endsWith(".js")) return null;
  let target;
  if (ref.startsWith("/")) target = path.resolve(root, ref.slice(1));
  else if (ref.startsWith("js/")) target = path.resolve(root, ref);
  else target = path.resolve(path.dirname(fromFile), ref);
  if (!target.startsWith(jsRoot + path.sep) && target !== jsRoot) return null;
  return relative(target);
}

const jsFiles = await filesUnder(jsRoot, ".js");
const known = new Set(jsFiles.map(relative));
const edges = new Map([...known].map(name => [name, new Set()]));
const problems = [];

for (const file of jsFiles) {
  const source = await readFile(file, "utf8");
  const from = relative(file);
  const refs = new Set();

  for (const match of source.matchAll(/(?:import|export)\s+(?:[^"']*?\s+from\s+)?["']([^"']+\.js(?:[?#][^"']*)?)["']/g)) refs.add(match[1]);
  for (const match of source.matchAll(/import\s*\(\s*["']([^"']+\.js(?:[?#][^"']*)?)["']\s*\)/g)) refs.add(match[1]);
  for (const match of source.matchAll(/["']((?:\.\.?\/|\/|js\/)[^"']+\.js(?:[?#][^"']*)?)["']/g)) refs.add(match[1]);

  for (const raw of refs) {
    const target = resolveJsRef(file, raw);
    if (target && known.has(target)) edges.get(from).add(target);
  }
}

const rootEntries = await readdir(root, { withFileTypes: true });
const htmlFiles = rootEntries.filter(entry => entry.isFile() && entry.name.endsWith(".html")).map(entry => path.join(root, entry.name));
const runtimeRoots = new Set();
for (const file of htmlFiles) {
  const source = await readFile(file, "utf8");
  for (const match of source.matchAll(/<script\b[^>]*\bsrc=["']([^"']+\.js(?:[?#][^"']*)?)["'][^>]*>/gi)) {
    const target = resolveJsRef(file, match[1]);
    if (target && known.has(target)) runtimeRoots.add(target);
  }
}

for (const entry of explicitRuntimeRoots) {
  if (!known.has(entry)) problems.push(`explicit runtime root is missing: ${entry}`);
  else runtimeRoots.add(entry);
}

const reachable = new Set();
const queue = [...runtimeRoots];
while (queue.length) {
  const current = queue.shift();
  if (reachable.has(current)) continue;
  reachable.add(current);
  for (const next of edges.get(current) || []) if (!reachable.has(next)) queue.push(next);
}

const unreachable = [...known].filter(name => !reachable.has(name)).sort();
if (unreachable.length) {
  problems.push(...unreachable.map(name => `unreachable JavaScript module: ${name}`));
}

if (problems.length) {
  console.error("JavaScript reachability audit failed:\n" + problems.map(problem => `- ${problem}`).join("\n"));
  process.exit(1);
}

console.log(`JavaScript reachability audit passed: ${known.size} files, ${runtimeRoots.size} runtime roots, ${reachable.size} reachable.`);
