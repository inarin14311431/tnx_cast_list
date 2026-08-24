import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const castSource = await readFile(path.join(root, "cast.html"), "utf8");

function localScriptPath(raw) {
  const value = String(raw || "").trim();
  if (!value || /^(?:https?:|data:)/i.test(value) || value.includes("${")) return null;
  return value.split("#")[0].split("?")[0].replace(/^\.\//, "");
}

const scripts = [...castSource.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*><\/script>/gi)]
  .map(match => localScriptPath(match[1]))
  .filter(Boolean)
  .filter(script => script.startsWith("js/"));

const idOwners = new Map();
const eventOwners = new Map();
const perScript = new Map();
const observerCounts = new Map();
const documentListenerCounts = new Map();
const windowListenerCounts = new Map();

function addOwner(map, key, script) {
  if (!map.has(key)) map.set(key, new Set());
  map.get(key).add(script);
}

function registerId(script, id) {
  if (!id) return;
  addOwner(idOwners, id, script);
  if (!perScript.has(script)) perScript.set(script, new Set());
  perScript.get(script).add(id);
}

function countMatches(source, expression) {
  return [...source.matchAll(expression)].length;
}

for (const script of scripts) {
  const source = await readFile(path.join(root, script), "utf8");
  const variableIds = new Map();

  for (const match of source.matchAll(/(?:document\.)?getElementById\s*\(\s*["']([^"']+)["']\s*\)/g)) registerId(script, match[1]);
  for (const match of source.matchAll(/(?:document\.)?querySelector(?:All)?\s*\(\s*["']#([A-Za-z0-9_:-]+)[^"']*["']\s*\)/g)) registerId(script, match[1]);

  for (const match of source.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:document\.)?getElementById\s*\(\s*["']([^"']+)["']\s*\)/g)) {
    variableIds.set(match[1], match[2]);
    registerId(script, match[2]);
  }
  for (const match of source.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:document\.)?querySelector\s*\(\s*["']#([A-Za-z0-9_:-]+)[^"']*["']\s*\)/g)) {
    variableIds.set(match[1], match[2]);
    registerId(script, match[2]);
  }

  for (const [variable, id] of variableIds) {
    const escaped = variable.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\b${escaped}\\??\\.addEventListener\\s*\\(\\s*["']([^"']+)["']`, "g");
    for (const match of source.matchAll(re)) addOwner(eventOwners, `${id}::${match[1]}`, script);
  }

  observerCounts.set(script, countMatches(source, /new\s+MutationObserver\s*\(/g));
  documentListenerCounts.set(script, countMatches(source, /document\.addEventListener\s*\(/g));
  windowListenerCounts.set(script, countMatches(source, /window\.addEventListener\s*\(/g));
}

const sharedIds = [...idOwners.entries()]
  .filter(([, owners]) => owners.size > 1)
  .sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0], "ja"));
const sharedEvents = [...eventOwners.entries()]
  .filter(([, owners]) => owners.size > 1)
  .sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0], "ja"));
const busiestScripts = [...perScript.entries()]
  .sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0], "ja"))
  .slice(0, 12);
const lifecycleScripts = scripts
  .map(script => ({
    script,
    observers: observerCounts.get(script) || 0,
    documentListeners: documentListenerCounts.get(script) || 0,
    windowListeners: windowListenerCounts.get(script) || 0
  }))
  .filter(item => item.observers || item.documentListeners || item.windowListeners)
  .sort((a, b) => (b.observers + b.documentListeners + b.windowListeners) - (a.observers + a.documentListeners + a.windowListeners));

console.log(`Cast DOM ownership report: ${scripts.length} scripts, ${idOwners.size} literal DOM ids detected.`);
console.log(`Shared DOM ids: ${sharedIds.length}`);
for (const [id, owners] of sharedIds) console.log(`  #${id} <- ${[...owners].join(", ")}`);
console.log(`Duplicate literal event ownership: ${sharedEvents.length}`);
for (const [key, owners] of sharedEvents) {
  const [id, event] = key.split("::");
  console.log(`  #${id} [${event}] <- ${[...owners].join(", ")}`);
}
console.log("Lifecycle registrations:");
for (const item of lifecycleScripts) console.log(`  ${item.script}: MutationObserver=${item.observers}, document listeners=${item.documentListeners}, window listeners=${item.windowListeners}`);
console.log("Top scripts by literal DOM-id reach:");
for (const [script, ids] of busiestScripts) console.log(`  ${script}: ${ids.size}`);

// Inventory only. Shared access and observers can be intentional.
// Use this report to select one cast-view ownership boundary at a time.
