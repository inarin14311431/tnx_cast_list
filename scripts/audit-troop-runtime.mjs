import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const problems = [];
const exists = async target => { try { await access(target); return true; } catch { return false; } };
const clean = value => String(value || "").split(/[?#]/, 1)[0].replace(/^\.\//, "");

const html = await readFile(path.join(root, "troop.html"), "utf8");
const htmlAssets = [
  ...[...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)].map(match => match[1]),
  ...[...html.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["']/gi)].map(match => match[1])
].filter(value => !/^(?:https?:)?\/\//i.test(value)).map(clean);

for (const asset of htmlAssets) {
  const target = path.resolve(root, asset);
  if (!target.startsWith(`${root}${path.sep}`)) problems.push(`asset escapes repository root: ${asset}`);
  else if (!await exists(target)) problems.push(`missing local asset: ${asset}`);
}

if (htmlAssets.filter(asset => asset === "js/troop.js").length !== 1) {
  problems.push("js/troop.js must be the single module entry point for troop editor runtime");
}

for (const retired of [
  "js/troop-save-v2.js",
  "js/troop-fields-v6.js",
  "css-next/pages/troop-compact-density-v2.css",
  "css-next/pages/troop-density-v3.css",
  "css-next/pages/troop-visual-accent-v5.css",
  "css-next/pages/troop-layout-v6.css"
]) {
  if (htmlAssets.includes(retired)) problems.push(`retired asset must not be loaded: ${retired}`);
  if (await exists(path.join(root, retired))) problems.push(`retired asset file must not exist: ${retired}`);
}

const modules = [
  "js/troop.js",
  "js/troop-editor-ui.js",
  "js/troop-layout-refine.js",
  "js/troop-combo-rule-v2.js",
  "js/troop-combo-codec.js",
  "js/troop-save.js"
];
const sources = Object.fromEntries(await Promise.all(modules.map(async modulePath => [
  modulePath,
  await readFile(path.join(root, modulePath), "utf8")
])));

for (const required of [
  "initializeTroopEditorUi",
  "initializeTroopLayout",
  "refreshTroopAbilityPairs",
  "refreshTroopComboRules",
  "unpackTroopComboRule"
]) {
  if (!sources["js/troop.js"].includes(required)) problems.push(`troop.js must explicitly coordinate ${required}`);
}

for (const modulePath of ["js/troop-editor-ui.js", "js/troop-layout-refine.js", "js/troop-combo-rule-v2.js"]) {
  if (/MutationObserver|stopImmediatePropagation/.test(sources[modulePath])) {
    problems.push(`${modulePath} must not recover editor lifecycle through DOM interception`);
  }
}

if (!/dataset\.troopSaveHandler === "canonical"/.test(sources["js/troop-save.js"])) {
  problems.push("troop-save.js must retain the guarded canonical submit owner");
}
if (!/\.eq\("owner_id", user\.id\)/.test(sources["js/troop-save.js"])) {
  problems.push("troop-save.js update/delete boundary must retain owner filtering");
}

if (problems.length) {
  console.error("Troop runtime audit failed:\n" + problems.map(problem => `- ${problem}`).join("\n"));
  process.exit(1);
}

console.log(`Troop runtime audit passed: ${htmlAssets.length} HTML assets, ${modules.length} coordinated modules, no retired editor observers.`);
