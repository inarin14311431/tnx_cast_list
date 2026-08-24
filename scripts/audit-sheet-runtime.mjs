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

const coreCount = localScripts.filter(entry => entry.local === "js/sheet.js").length;
if (coreCount !== 1) problems.push(`sheet.html: js/sheet.js must be loaded exactly once (found ${coreCount})`);

for (const required of [
  "js/sheet-sidebar-actions.js",
  "js/sheet-import-url.js",
  "js/sheet-snapshots.js"
]) {
  if (!localScripts.some(entry => entry.local === required)) {
    problems.push(`sheet.html: required editor module is not loaded: ${required}`);
  }
}

const coreIndex = localScripts.findIndex(entry => entry.local === "js/sheet.js");
for (const dependent of ["js/sheet-sidebar-actions.js", "js/sheet-import-url.js", "js/sheet-snapshots.js"]) {
  const dependentIndex = localScripts.findIndex(entry => entry.local === dependent);
  if (coreIndex >= 0 && dependentIndex >= 0 && dependentIndex < coreIndex) {
    problems.push(`sheet.html: ${dependent} loads before js/sheet.js`);
  }
}

if (problems.length) {
  console.error("Sheet runtime audit failed:\n" + problems.map(problem => `- ${problem}`).join("\n"));
  process.exit(1);
}

console.log(`Sheet runtime audit passed: ${localScripts.length} local scripts, no duplicates or missing assets.`);
