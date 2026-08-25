import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const problems = [];
const themeDirectory = path.join(root, "css-next", "themes");

async function exists(target) {
  try { await access(target); return true; } catch { return false; }
}
async function filesUnder(directory, extension) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await filesUnder(full, extension));
    else if (!extension || full.endsWith(extension)) result.push(full);
  }
  return result.sort();
}
const relative = file => path.relative(root, file).replaceAll(path.sep, "/");

await import(pathToFileURL(path.join(root, "js", "theme-registry.js")));
const registry = globalThis.TNX_THEME_REGISTRY;
if (!registry || !Array.isArray(registry.themes)) problems.push("js/theme-registry.js: canonical registry is unavailable");
const themes = registry?.themes || [];
const themeIds = themes.map(theme => theme.id);
const idSet = new Set(themeIds);
const labels = new Set();
for (const theme of themes) {
  if (!/^[a-z][a-z0-9-]*$/.test(theme.id)) problems.push(`theme id is invalid: ${theme.id}`);
  if (!String(theme.label || "").trim()) problems.push(`theme ${theme.id}: label is empty`);
  if (labels.has(theme.label)) problems.push(`theme label is duplicated: ${theme.label}`);
  labels.add(theme.label);
  if (!new Set(["light", "dark"]).has(theme.colorScheme)) problems.push(`theme ${theme.id}: colorScheme must be light or dark`);
}
if (idSet.size !== themeIds.length) problems.push("js/theme-registry.js: duplicate theme id");
if (!idSet.has(registry?.defaultId)) problems.push("js/theme-registry.js: default theme is not registered");

const manifestPath = path.join(themeDirectory, "index.css");
const manifest = await readFile(manifestPath, "utf8");
const imports = [...manifest.matchAll(/@import\s+url\(["']\.\/([^?"']+)(?:\?[^"']*)?["']\)/g)].map(match => match[1]);
const importSet = new Set(imports);
for (const imported of imports) if (!await exists(path.join(themeDirectory, imported))) problems.push(`css-next/themes/index.css: missing import ${imported}`);
const themeCssFiles = (await filesUnder(themeDirectory, ".css")).filter(file => file !== manifestPath);
for (const file of themeCssFiles) {
  const local = path.relative(themeDirectory, file).replaceAll(path.sep, "/");
  if (!importSet.has(local)) problems.push(`${relative(file)}: not imported by css-next/themes/index.css`);
}
for (const imported of importSet) {
  if (!themeCssFiles.some(file => path.relative(themeDirectory, file).replaceAll(path.sep, "/") === imported)) problems.push(`css-next/themes/index.css: orphan import ${imported}`);
}

const definitionCounts = new Map(themeIds.map(id => [id, 0]));
for (const file of themeCssFiles) {
  const source = await readFile(file, "utf8");
  for (const match of source.matchAll(/data-theme=["']([^"']+)["']/g)) if (!definitionCounts.has(match[1])) problems.push(`${relative(file)}: unregistered theme selector ${match[1]}`);
  for (const match of source.matchAll(/:root\[data-theme=["']([^"']+)["']\]\s*\{([^}]*)\}/g)) {
    if (match[2].includes("--color-bg:") && definitionCounts.has(match[1])) definitionCounts.set(match[1], definitionCounts.get(match[1]) + 1);
  }
}
for (const [id, count] of definitionCounts) if (count !== 1) problems.push(`theme ${id}: primary token definition count is ${count}, expected 1`);

const allCssFiles = await filesUnder(path.join(root, "css-next"), ".css");
for (const file of allCssFiles) {
  if (file.startsWith(themeDirectory + path.sep)) continue;
  const source = await readFile(file, "utf8");
  if (/data-theme\s*=/.test(source)) problems.push(`${relative(file)}: theme identity selector must live under css-next/themes`);
}

const rootEntries = await readdir(root, { withFileTypes: true });
const htmlFiles = rootEntries.filter(entry => entry.isFile() && entry.name.endsWith(".html")).map(entry => path.join(root, entry.name));
let activePageCount = 0;
for (const file of htmlFiles) {
  const source = await readFile(file, "utf8");
  if (!source.includes("./css-next/themes/index.css?v=1")) continue;
  activePageCount += 1;
  const assets = [...source.matchAll(/<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+)["'][^>]*>/gi)].map(match => match[1]);
  const stylesheets = assets.filter(asset => /\.css(?:\?|$)/.test(asset));
  const registryIndex = assets.findIndex(asset => asset === "./js/theme-registry.js?v=1");
  const controllerIndex = assets.findIndex(asset => asset === "./js/css-next-theme.js?v=8");
  const scopeIndex = assets.findIndex(asset => asset === "./js/theme-scope.js?v=1");
  if (!(registryIndex >= 0 && controllerIndex > registryIndex && scopeIndex > controllerIndex)) problems.push(`${relative(file)}: theme scripts are missing or out of order`);
  if (stylesheets.filter(asset => asset === "./css-next/themes/index.css?v=1").length !== 1) problems.push(`${relative(file)}: final theme bundle must be linked exactly once`);
  if (stylesheets.at(-1) !== "./css-next/themes/index.css?v=1") problems.push(`${relative(file)}: final stylesheet must be css-next/themes/index.css?v=1`);
  if (stylesheets.some(asset => ((asset.startsWith("./css-next/themes/") && asset !== "./css-next/themes/index.css?v=1") || /css-next\/tokens\/[^?]*theme[^?]*\.css/.test(asset)))) problems.push(`${relative(file)}: page links an individual theme stylesheet`);
}

const controller = await readFile(path.join(root, "js", "css-next-theme.js"), "utf8");
for (const marker of ["TNX_THEME_REGISTRY", "registry.themes", "registry.defaultId", "populateThemeOptions"]) if (!controller.includes(marker)) problems.push(`js/css-next-theme.js: registry-driven controller missing ${marker}`);
if (/const\s+(?:THEMES|THEME_OPTIONS)\s*=/.test(controller)) problems.push("js/css-next-theme.js: duplicate hard-coded theme registry remains");
const scope = await readFile(path.join(root, "js", "theme-scope.js"), "utf8");
for (const marker of ["themeSurface", "themeBadge", "themeControl", "MutationObserver"]) if (!scope.includes(marker)) problems.push(`js/theme-scope.js: missing scope contract ${marker}`);
const neon = await readFile(path.join(themeDirectory, "spectrum-neon.css"), "utf8");
for (const marker of ['[data-theme-surface="panel"]', '[data-theme-surface="card"]', '[data-theme-badge="1"]', '[data-theme-control="1"]']) if (!neon.includes(marker)) problems.push(`css-next/themes/spectrum-neon.css: missing semantic scope ${marker}`);

if (problems.length) {
  console.error("Theme system audit failed:\n" + problems.map(problem => `- ${problem}`).join("\n"));
  process.exit(1);
}
console.log(`Theme system audit passed: ${themes.length} themes, ${themeCssFiles.length} theme stylesheets, ${activePageCount} active pages.`);
