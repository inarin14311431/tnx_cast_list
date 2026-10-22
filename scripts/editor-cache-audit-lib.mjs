import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const supportedExtensions = new Set([".html", ".js", ".mjs", ".css"]);

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

function relative(file) {
  return path.relative(root, file).replaceAll(path.sep, "/");
}

function stripQueryAndHash(raw) {
  return String(raw || "").split("#")[0].split("?")[0];
}

export function isExternal(raw) {
  const value = String(raw || "").trim();
  return !value || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(value);
}

/* Each pattern captures the referenced URL as group 1. Shared with content-version-lib.mjs, which
 * rewrites the ?v= inside exactly these matches, so the audit and the generator see the same references. */
const REFERENCE_PATTERNS = {
  html: [
    /<script\b[^>]*\bsrc=["']([^"']+)["']/gi,
    /<link\b[^>]*\bhref=["']([^"']+)["']/gi
  ],
  javascript: [
    /\bimport\s+(?:[^"'()]*?\s+from\s+)?["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\bexport\s+(?:\*|\{[^}]*\})\s+from\s+["']([^"']+)["']/g
  ],
  css: [
    /@import\s+(?:url\(\s*)?["']([^"']+)["']\s*\)?/gi
  ]
};

export function referencePatternsFor(file) {
  const extension = path.extname(file).toLowerCase();
  if (extension === ".html") return REFERENCE_PATTERNS.html;
  if (extension === ".js" || extension === ".mjs") return REFERENCE_PATTERNS.javascript;
  if (extension === ".css") return REFERENCE_PATTERNS.css;
  return [];
}

function referencesFor(file, source) {
  return referencePatternsFor(file).flatMap(pattern => [...source.matchAll(pattern)].map(match => match[1]));
}

export function resolveLocal(importer, raw, baseRoot = root) {
  if (isExternal(raw)) return null;
  const clean = stripQueryAndHash(raw);
  if (!clean) return null;
  const resolved = clean.startsWith("/")
    ? path.resolve(baseRoot, clean.replace(/^\/+/, ""))
    : path.resolve(path.dirname(importer), clean);
  if (resolved !== baseRoot && !resolved.startsWith(baseRoot + path.sep)) return null;
  return resolved;
}

export function versionOf(raw) {
  const matches = [...String(raw || "").matchAll(/[?&]v=([^&#]*)/g)];
  return {
    count: matches.length,
    value: matches.length ? matches[0][1] : null
  };
}

export async function loadEditorCachePolicy() {
  const policyPath = path.join(root, "config/editor-cache-policy.json");
  const policy = JSON.parse(await readFile(policyPath, "utf8"));
  const entries = Array.isArray(policy.scope) ? policy.scope.map(String) : [];
  const enforcement = policy.enforcement && typeof policy.enforcement === "object" ? policy.enforcement : {};
  if (!entries.length) throw new Error("editor cache policy scope must include at least one entry file");
  return { entries, enforcement };
}

export async function collectEditorGraph(entries) {
  const queue = entries.map(entry => path.resolve(root, entry));
  const visited = new Set();
  const files = new Set();
  const edges = [];
  const missing = [];

  while (queue.length) {
    const file = queue.shift();
    if (visited.has(file)) continue;
    visited.add(file);
    if (!await exists(file)) {
      missing.push(relative(file));
      continue;
    }

    const source = await readFile(file, "utf8");
    const fileName = relative(file);
    files.add(fileName);

    for (const raw of referencesFor(file, source)) {
      const target = resolveLocal(file, raw);
      if (!target) continue;
      const targetName = relative(target);
      const version = versionOf(raw);
      edges.push({ from: fileName, raw, to: targetName, version: version.value, versionCount: version.count });
      if (!supportedExtensions.has(path.extname(target).toLowerCase())) continue;
      if (!await exists(target)) {
        missing.push(targetName);
        continue;
      }
      if (!visited.has(target)) queue.push(target);
    }
  }

  return { files, edges, missing: [...new Set(missing)] };
}

export function groupVersions(edges) {
  const grouped = new Map();
  for (const edge of edges) {
    if (!grouped.has(edge.to)) grouped.set(edge.to, []);
    grouped.get(edge.to).push(edge);
  }
  return grouped;
}
