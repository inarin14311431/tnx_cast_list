import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const jsRoot = path.join(root, "js");
const relative = file => path.relative(root, file).replaceAll(path.sep, "/");

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

const reachable = new Set();
const queue = [...runtimeRoots];
while (queue.length) {
  const current = queue.shift();
  if (reachable.has(current)) continue;
  reachable.add(current);
  for (const next of edges.get(current) || []) if (!reachable.has(next)) queue.push(next);
}

const unreachable = [...known].filter(name => !reachable.has(name)).sort();
console.log(`JS reachability report: ${known.size} files, ${runtimeRoots.size} HTML roots, ${reachable.size} reachable, ${unreachable.length} candidates.`);
if (unreachable.length) {
  console.log("Unreachable candidates (report only; standalone/bookmarklet/compat modules require manual classification):");
  unreachable.forEach(name => console.log(`- ${name}`));
}
