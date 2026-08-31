import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sheetPath = path.join(root, "sheet.html");
const source = await readFile(sheetPath, "utf8");
const problems = [];

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

function localScriptPath(raw) {
  const value = String(raw || "").trim();
  if (!value || /^(?:https?:|data:)/i.test(value) || value.includes("${")) return null;
  return value.split("#")[0].split("?")[0].replace(/^\.\//, "");
}

const scriptEntries = [...source.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*><\/script>/gi)]
  .map((match, index) => ({ index, raw: match[1], local: localScriptPath(match[1]) }));
const localScripts = scriptEntries.filter(entry => entry.local);
const seen = new Map();

for (const entry of localScripts) {
  const duplicate = seen.get(entry.local);
  if (duplicate !== undefined) {
    problems.push(`sheet.html: duplicate script ${entry.local} at positions ${duplicate + 1} and ${entry.index + 1}`);
  } else {
    seen.set(entry.local, entry.index);
  }

  const target = path.resolve(root, entry.local);
  if (!target.startsWith(root + path.sep) && target !== root) {
    problems.push(`sheet.html: script escapes repository root: ${entry.raw}`);
  } else if (!await exists(target)) {
    problems.push(`sheet.html: missing local script ${entry.local}`);
  }
}

const appCount = localScripts.filter(entry => entry.local === "js/sheet-app.js").length;
if (appCount !== 1) problems.push(`sheet.html: js/sheet-app.js must be loaded exactly once (found ${appCount})`);

const appSource = await readFile(path.join(root, "js", "sheet-app.js"), "utf8");
const composedModules = [...appSource.matchAll(/["']\.\/([^"']+\.js)(?:\?[^"']*)?["']/g)]
  .map(match => `js/${match[1]}`)
  .filter(modulePath => modulePath !== "js/app-events.js");
const composedSeen = new Set();
for (const modulePath of composedModules) {
  if (composedSeen.has(modulePath)) problems.push(`js/sheet-app.js: duplicate composed module ${modulePath}`);
  composedSeen.add(modulePath);
  if (!await exists(path.join(root, modulePath))) problems.push(`js/sheet-app.js: missing composed module ${modulePath}`);
  if (localScripts.some(entry => entry.local === modulePath)) {
    problems.push(`sheet runtime: ${modulePath} is loaded both directly and through js/sheet-app.js`);
  }
}

const coreCount = composedModules.filter(modulePath => modulePath === "js/sheet.js").length;
if (coreCount !== 1) problems.push(`js/sheet-app.js: js/sheet.js must be composed exactly once (found ${coreCount})`);

for (const required of [
  "js/sheet-sidebar-actions.js",
  "js/sheet-import-url.js",
  "js/sheet-snapshots.js"
]) {
  const reachable = localScripts.some(entry => entry.local === required) || composedModules.includes(required);
  if (!reachable) problems.push(`sheet runtime: required editor module is not reachable: ${required}`);
}

const coreIndex = composedModules.indexOf("js/sheet.js");
const snapshotIndex = composedModules.indexOf("js/sheet-snapshots.js");
if (coreIndex < 0 || snapshotIndex < 0 || snapshotIndex < coreIndex) {
  problems.push("js/sheet-app.js: sheet-snapshots.js must compose after js/sheet.js");
}

if (problems.length) {
  console.error("Sheet runtime audit failed:\n" + problems.map(problem => `- ${problem}`).join("\n"));
  process.exit(1);
}

console.log(`Sheet runtime audit passed: ${localScripts.length} direct scripts, ${composedModules.length} composed modules, no duplicates or missing assets.`);
