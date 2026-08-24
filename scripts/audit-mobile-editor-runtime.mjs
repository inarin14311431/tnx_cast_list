import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const htmlPath = path.join(root, "sheet-mobile.html");
const appPath = path.join(root, "js/sheet-mobile-app.js");
const problems = [];

async function exists(target) {
  try { await access(target); return true; } catch { return false; }
}

function localPath(raw) {
  const value = String(raw || "").trim();
  if (!value || /^(?:https?:|data:)/i.test(value)) return null;
  return value.split("#")[0].split("?")[0].replace(/^\.\//, "");
}

const html = await readFile(htmlPath, "utf8");
const app = await readFile(appPath, "utf8");

const assets = [
  ...[...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)].map(match => match[1]),
  ...[...html.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["']/gi)].map(match => match[1])
].map(localPath).filter(Boolean);

for (const asset of assets) {
  const target = path.resolve(root, asset);
  if (!target.startsWith(root + path.sep) && target !== root) problems.push(`sheet-mobile.html asset escapes repository root: ${asset}`);
  else if (!await exists(target)) problems.push(`sheet-mobile.html missing local asset: ${asset}`);
}

const appImports = [...app.matchAll(/import\s+["']([^"']+)["'];?/g)].map(match => match[1]);
const seen = new Set();
for (const raw of appImports) {
  const local = localPath(raw);
  if (!local) continue;
  const normalized = local.startsWith("js/") ? local : `js/${local.replace(/^\.\//, "")}`;
  if (seen.has(normalized)) problems.push(`sheet-mobile-app.js duplicate import: ${normalized}`);
  seen.add(normalized);
  const target = path.resolve(root, normalized);
  if (!await exists(target)) problems.push(`sheet-mobile-app.js missing import target: ${normalized}`);
}

for (const required of [
  "js/sheet-mobile-runtime.js",
  "js/sheet-mobile-save-coordinator.js",
  "js/sheet-mobile.js",
  "js/sheet-mobile-skills.js",
  "js/sheet-mobile-outfit.js",
  "js/sheet-mobile-combos.js",
  "js/sheet-mobile-snapshots.js",
  "js/sheet-mobile-image.js"
]) {
  if (!seen.has(required)) problems.push(`sheet-mobile-app.js required module is not imported: ${required}`);
}

const normalizedImports = appImports.map(value => {
  const local = localPath(value);
  return local ? (local.startsWith("js/") ? local : `js/${local.replace(/^\.\//, "")}`) : "";
});
const runtimeIndex = normalizedImports.indexOf("js/sheet-mobile-runtime.js");
const coordinatorIndex = normalizedImports.indexOf("js/sheet-mobile-save-coordinator.js");
const featureIndexes = normalizedImports
  .map((value, index) => ({ value, index }))
  .filter(({ value }) => /^js\/sheet-mobile-(?:profile|style|ability|skills|outfit|combos|snapshots|image|import|summary-text|header-exp|ui)\.js$/.test(value))
  .map(({ index }) => index);
const firstFeatureIndex = featureIndexes.length ? Math.min(...featureIndexes) : -1;
if (runtimeIndex < 0) problems.push("sheet-mobile-app.js must import sheet-mobile-runtime.js explicitly");
else if (firstFeatureIndex >= 0 && runtimeIndex > firstFeatureIndex) problems.push("sheet-mobile-runtime.js must load before feature modules");
if (coordinatorIndex < 0) problems.push("sheet-mobile-app.js must import sheet-mobile-save-coordinator.js explicitly");
else if (firstFeatureIndex >= 0 && coordinatorIndex > firstFeatureIndex) problems.push("sheet-mobile-save-coordinator.js must load before feature modules");

const runtimeSource = await readFile(path.join(root, "js/sheet-mobile-runtime.js"), "utf8");
if (!/requireAuth\(\)/.test(runtimeSource) || !/from\(["']characters["']\)/.test(runtimeSource)) {
  problems.push("sheet-mobile-runtime.js must own authentication and character lookup");
}

for (const modulePath of normalizedImports.filter(value => value && value !== "js/sheet-mobile-runtime.js" && value !== "js/sheet-mobile-save-coordinator.js")) {
  const target = path.join(root, modulePath);
  if (!await exists(target)) continue;
  const source = await readFile(target, "utf8");
  if (/\brequireAuth\b/.test(source)) problems.push(`${modulePath} must use shared mobile runtime instead of requireAuth`);
  if (/from\(["']characters["']\)\.select\(/.test(source)) problems.push(`${modulePath} must use shared mobile runtime instead of independent character lookup`);
}

const coordinatorSource = await readFile(path.join(root, "js/sheet-mobile-save-coordinator.js"), "utf8");
if (!/tnx:mobile-before-save/.test(coordinatorSource) || !/Promise\.all\(tasks\)/.test(coordinatorSource)) {
  problems.push("sheet-mobile-save-coordinator.js must own coordinated feature flush before base save replay");
}

for (const id of [
  "mobile-profile",
  "mobile-styles-section",
  "mobile-ability-section",
  "mobile-general",
  "mobile-style-skills-section",
  "mobile-outfits-section",
  "mobile-view-link",
  "mobile-save"
]) {
  if (!html.includes(`id="${id}"`)) problems.push(`sheet-mobile.html missing required DOM id: ${id}`);
}

const viewLink = html.match(/<a\b[^>]*id=["']mobile-view-link["'][^>]*href=["']([^"']+)["']/i)?.[1] || "";
if (!/[?&]mobile=1(?:&|$)/.test(viewLink)) problems.push("mobile-view-link default href must force mobile=1");

if (problems.length) {
  console.error("Mobile editor runtime audit failed:\n" + problems.map(problem => `- ${problem}`).join("\n"));
  process.exit(1);
}

console.log(`Mobile editor runtime audit passed: ${assets.length} HTML assets, ${appImports.length} app imports, shared context and save ownership verified.`);
