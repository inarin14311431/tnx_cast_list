import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sheetSource = await readFile(path.join(root, "sheet.html"), "utf8");

function localScriptPath(raw) {
  const value = String(raw || "").trim();
  if (!value || /^(?:https?:|data:)/i.test(value) || value.includes("${")) return null;
  return value.split("#")[0].split("?")[0].replace(/^\.\//, "");
}

const scripts = [...sheetSource.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*><\/script>/gi)]
  .map(match => localScriptPath(match[1]))
  .filter(Boolean)
  .filter(script => script.startsWith("js/"));

const idOwners = new Map();
const eventOwners = new Map();
const perScript = new Map();

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

for (const script of scripts) {
  const source = await readFile(path.join(root, script), "utf8");
  const variableIds = new Map();

  for (const match of source.matchAll(/(?:document\.)?getElementById\s*\(\s*["']([^"']+)["']\s*\)/g)) {
    registerId(script, match[1]);
  }
  for (const match of source.matchAll(/(?:document\.)?querySelector(?:All)?\s*\(\s*["']#([A-Za-z0-9_:-]+)["']\s*\)/g)) {
    registerId(script, match[1]);
  }
  for (const match of source.matchAll(/(?:document\.)?querySelector(?:All)?\s*\(\s*["'][^"']*\[id=["']?([A-Za-z0-9_:-]+)["']?\][^"']*["']\s*\)/g)) {
    registerId(script, match[1]);
  }

  for (const match of source.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:document\.)?getElementById\s*\(\s*["']([^"']+)["']\s*\)/g)) {
    variableIds.set(match[1], match[2]);
    registerId(script, match[2]);
  }
  for (const match of source.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:document\.)?querySelector\s*\(\s*["']#([A-Za-z0-9_:-]+)["']\s*\)/g)) {
    variableIds.set(match[1], match[2]);
    registerId(script, match[2]);
  }

  for (const [variable, id] of variableIds) {
    const escaped = variable.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\b${escaped}\\??\\.addEventListener\\s*\\(\\s*["']([^"']+)["']`, "g");
    for (const match of source.matchAll(re)) {
      addOwner(eventOwners, `${id}::${match[1]}`, script);
    }
  }

  for (const match of source.matchAll(/getElementById\s*\(\s*["']([^"']+)["']\s*\)\??\.addEventListener\s*\(\s*["']([^"']+)["']/g)) {
    registerId(script, match[1]);
    addOwner(eventOwners, `${match[1]}::${match[2]}`, script);
  }
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

console.log(`Sheet DOM ownership report: ${scripts.length} scripts, ${idOwners.size} literal DOM ids detected.`);
console.log(`Shared DOM ids: ${sharedIds.length}`);
for (const [id, owners] of sharedIds) {
  console.log(`  #${id} <- ${[...owners].join(", ")}`);
}
console.log(`Duplicate literal event ownership: ${sharedEvents.length}`);
for (const [key, owners] of sharedEvents) {
  const [id, event] = key.split("::");
  console.log(`  #${id} [${event}] <- ${[...owners].join(", ")}`);
}
console.log("Top scripts by literal DOM-id reach:");
for (const [script, ids] of busiestScripts) {
  console.log(`  ${script}: ${ids.size}`);
}

// This is an inventory report, not a gate. Shared DOM access can be intentional.
// Refactor work should use this output to pick one ownership boundary at a time.
