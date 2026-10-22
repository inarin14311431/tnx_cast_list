import { createHash } from "node:crypto";
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { referencePatternsFor, resolveLocal, root, versionOf } from "./editor-cache-audit-lib.mjs";

/* Content-hash cache versions (npm run version:update / audit:cache).
 *
 * Every local reference that already carries ?v= (import / export from / import() / <script src> /
 * <link href> / CSS @import, as matched by editor-cache-audit-lib.mjs) gets the first VERSION_LENGTH hex
 * characters of the sha256 of the referenced file. A file's content includes the ?v= of what it
 * references, so files are hashed children first: changing a leaf changes its parents' versions up to
 * the HTML. A cycle among versioned references has no fixed point and is reported instead of resolved.
 *
 * Not managed: references without ?v= (left as they are), external URLs, and URLs built in code
 * (new URL(...), element.href = ..., string arrays); those keep a hand-written ?v=. */

export const VERSION_LENGTH = 8;
const SOURCE_DIRS = [
  { dir: "js", extensions: [".js", ".mjs"] },
  { dir: "css-next", extensions: [".css"] }
];

export function contentVersion(content) {
  return createHash("sha256").update(content).digest("hex").slice(0, VERSION_LENGTH);
}

function relative(baseRoot, file) {
  return path.relative(baseRoot, file).split(path.sep).join("/");
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir, extensions) {
  if (!await exists(dir)) return [];
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full, extensions));
    else if (extensions.includes(path.extname(entry.name).toLowerCase())) files.push(full);
  }
  return files;
}

/* Root-level *.html plus everything under js/ and css-next/, sorted so the output never depends on
 * directory listing order. */
export async function listSourceFiles(baseRoot = root) {
  const html = (await readdir(baseRoot)).filter(name => name.endsWith(".html")).map(name => path.join(baseRoot, name));
  const nested = [];
  for (const { dir, extensions } of SOURCE_DIRS) nested.push(...await walk(path.join(baseRoot, dir), extensions));
  return [...html, ...nested].sort();
}

/* Calls visit(raw, target) for each versioned local reference in source and returns the source with
 * every such ?v= replaced by whatever visit returns (undefined keeps the reference unchanged). */
function rewriteVersionedReferences(file, source, baseRoot, visit) {
  let next = source;
  for (const pattern of referencePatternsFor(file)) {
    next = next.replace(pattern, (match, raw) => {
      if (versionOf(raw).count === 0) return match;
      const target = resolveLocal(file, raw, baseRoot);
      if (!target) return match;
      const version = visit(raw, target);
      if (version === undefined) return match;
      const at = match.indexOf(raw);
      return match.slice(0, at) + raw.replace(/([?&]v=)[^&#]*/, `$1${version}`) + match.slice(at + raw.length);
    });
  }
  return next;
}

/* Returns { files: [{ file, source, next }], references, problems }. next differs from source only for
 * files whose ?v= values are out of date. problems lists cycles, duplicate v= and missing targets;
 * when it is non-empty the plan must not be written. */
export async function planContentVersions(baseRoot = root) {
  const sourceFiles = await listSourceFiles(baseRoot);
  const sources = new Map();
  for (const file of sourceFiles) sources.set(file, await readFile(file, "utf8"));

  const problems = [];
  const finalized = new Map(); // file -> rewritten content (string for sources, Buffer for other files)
  const versions = new Map();
  const visiting = [];
  let references = 0;

  async function versionFor(file, via) {
    if (versions.has(file)) return versions.get(file);
    if (visiting.includes(file)) {
      const cycle = [...visiting.slice(visiting.indexOf(file)), file].map(item => relative(baseRoot, item));
      problems.push(`cycle among versioned references: ${cycle.join(" -> ")}`);
      return null;
    }
    if (!sources.has(file)) {
      if (!await exists(file)) {
        problems.push(`missing local dependency: ${via} -> ${relative(baseRoot, file)}`);
        return null;
      }
      const version = contentVersion(await readFile(file));
      versions.set(file, version);
      return version;
    }
    visiting.push(file);
    const next = await finalize(file);
    visiting.pop();
    const version = next === null ? null : contentVersion(next);
    versions.set(file, version);
    return version;
  }

  async function finalize(file) {
    if (finalized.has(file)) return finalized.get(file);
    const source = sources.get(file);
    // String.replace callbacks cannot await, so resolve every child first, then rewrite synchronously.
    const children = [];
    rewriteVersionedReferences(file, source, baseRoot, (raw, target) => {
      children.push({ raw, target });
      return undefined;
    });
    let failed = false;
    const childVersions = new Map();
    for (const { raw, target } of children) {
      if (versionOf(raw).count > 1) {
        problems.push(`${relative(baseRoot, file)}: duplicate v= parameters in ${raw}`);
        failed = true;
        continue;
      }
      const version = await versionFor(target, relative(baseRoot, file));
      if (version === null) failed = true;
      else childVersions.set(target, version);
    }
    if (failed) {
      finalized.set(file, null);
      return null;
    }
    const next = rewriteVersionedReferences(file, source, baseRoot, (raw, target) => {
      references += 1;
      return childVersions.get(target);
    });
    finalized.set(file, next);
    return next;
  }

  for (const file of sourceFiles) {
    visiting.length = 0;
    await versionFor(file, relative(baseRoot, file));
  }

  const files = sourceFiles.map(file => ({
    file: relative(baseRoot, file),
    path: file,
    source: sources.get(file),
    next: finalized.get(file) ?? sources.get(file)
  }));
  return { files, references, problems: [...new Set(problems)] };
}

export function staleFiles(plan) {
  return plan.files.filter(item => item.next !== item.source);
}
