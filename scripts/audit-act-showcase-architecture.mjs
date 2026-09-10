import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const read = file => readFile(path.join(root, file), "utf8");
const exists = async file => {
  try { await access(path.join(root, file)); return true; } catch { return false; }
};

const html = await read("act-showcase.html");
const bootstrap = await read("js/act-showcase-bootstrap.js");
const page = await read("js/act-showcase-page.js");
const standard = await read("js/act-showcase-standard.js");
const supporting = await read("js/act-showcase-supporting-cast.js");
const service = await read("js/public-showcase-service.js");
const layout = await read("js/act-showcase-cinematic-layout-v2.js");
const polish = await read("js/act-showcase-cinematic-polish.js");
const presentation = await read("css-next/pages/act-showcase-presentation-tuning.css");
const cinematicCss = await read("css-next/pages/act-showcase-cinematic-v2.css");
const entryCss = await read("css-next/pages/act-showcase-entry.css");

const localStyles = [...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi)]
  .map(match => match[1])
  .filter(href => href.startsWith("./css-next/"));
if (localStyles.length !== 1 || !/^\.\/css-next\/pages\/act-showcase-entry\.css(?:\?|$)/.test(localStyles[0] || "")) {
  failures.push(`act-showcase.html must expose one local CSS entry, found: ${localStyles.join(", ") || "none"}`);
}

const localScripts = [...html.matchAll(/<script\b([^>]*)\bsrc=["']([^"']+)["'][^>]*>/gi)]
  .filter(match => match[2].startsWith("./js/"));
if (localScripts.length !== 1 || !/act-showcase-bootstrap\.js(?:\?|$)/.test(localScripts[0]?.[2] || "")) {
  failures.push(`act-showcase.html must expose one JS bootstrap, found ${localScripts.length}`);
}
if (localScripts.length === 1 && !/type=["']module["']/i.test(localScripts[0][1])) {
  failures.push("act-showcase bootstrap must be loaded as type=module");
}

const cssImports = [...entryCss.matchAll(/@import\s+["']([^"']+)["']/g)].map(match => match[1].split(/[?#]/, 1)[0]);
if (!cssImports.length) failures.push("act-showcase-entry.css must own the page stylesheet import order");
if (new Set(cssImports).size !== cssImports.length) failures.push("act-showcase-entry.css contains duplicate imports");
if (!cssImports.some(value => value.endsWith("act-showcase-cinematic-v2.css"))) {
  failures.push("act-showcase-entry.css must include the cinematic-v2 owner stylesheet");
}

const requiredBootstrapModules = [
  "act-showcase-cinematic-enhancer.js",
  "act-showcase-cinematic-polish.js",
  "act-showcase-cinematic-layout-v2.js",
  "act-showcase-page.js",
  "act-showcase-supporting-cast.js"
];
for (const moduleName of requiredBootstrapModules) {
  if (!bootstrap.includes(`./${moduleName}`)) failures.push(`bootstrap is missing ${moduleName}`);
}
if (/\bbgSample\b/.test(bootstrap)) failures.push("bootstrap must not synthesize the legacy bgSample route flag");

for (const retired of [
  "js/showcase-mode-compat.js",
  "js/act-showcase-background-resolver.js",
  "js/act-showcase-reduced-motion-sequence-bridge.js"
]) {
  if (await exists(retired)) failures.push(`${retired} is retired and must not exist`);
  if (html.includes(path.basename(retired)) || bootstrap.includes(path.basename(retired))) {
    failures.push(`${retired} must not be wired into ACT SHOWCASE`);
  }
}

const jsDirectory = path.join(root, "js");
for (const entry of await readdir(jsDirectory, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith(".js")) continue;
  if (!/(?:^act-showcase|^showcase-)/.test(entry.name)) continue;
  const source = await read(`js/${entry.name}`);
  if (/\bwindow\.fetch\s*=/.test(source)) failures.push(`js/${entry.name}: window.fetch reassignment is forbidden`);
  if (/\bwindow\.matchMedia\s*=/.test(source)) failures.push(`js/${entry.name}: window.matchMedia reassignment is forbidden`);
  if (/URLSearchParams\.prototype/.test(source)) failures.push(`js/${entry.name}: URLSearchParams prototype mutation is forbidden`);
}

for (const [name, source] of [
  ["act-showcase-page.js", page],
  ["act-showcase-standard.js", standard],
  ["act-showcase-supporting-cast.js", supporting]
]) {
  if (/\/rest\/v1\/rpc\/get_public_act_showcase/.test(source) || /\.rpc\(["']get_public_act_showcase["']/.test(source)) {
    failures.push(`${name}: public showcase RPC must be owned by public-showcase-service.js`);
  }
  if (!source.includes("public-showcase-service.js")) failures.push(`${name}: must use public-showcase-service.js`);
}
if (!/showcaseRequests\s*=\s*new Map\(\)/.test(service) || !/cachedRequest\(showcaseRequests/.test(service)) {
  failures.push("public-showcase-service.js must deduplicate the main public showcase request");
}
if (!service.includes("get_public_act_showcase") || !service.includes("get_public_act_showcase_guests")) {
  failures.push("public-showcase-service.js must own both public showcase read RPCs");
}

if (/poster-v2-nav/.test(page)) failures.push("act-showcase-page.js must not render fake poster navigation");
if (/observer\.observe\(document\.documentElement/.test(layout)) failures.push("cinematic layout observer must stay scoped to the intro");
if (/typographyObserver\.observe\(document\.body/.test(polish)) failures.push("cinematic typography observer must stay scoped to ACT roots");

if (/white-space\s*:\s*nowrap/.test(presentation)) {
  failures.push("presentation-tuning.css must not own title nowrap; cinematic-v2 owns title fitting");
}
if (/neotokyo-sequence__screen--trailer/.test(presentation)) {
  failures.push("presentation-tuning.css must not own trailer sizing or scrolling");
}
if (!/neotokyo-sequence__stage\.is-trailer-scroll\{[\s\S]*?overflow-y\s*:\s*auto/.test(cinematicCss)) {
  failures.push("cinematic-v2.css must own trailer scrolling on the NeoTokyo stage");
}
if (!/act-title--logo\.showcase-fit-title\{[\s\S]*?white-space\s*:\s*normal/.test(cinematicCss)) {
  failures.push("cinematic-v2.css must own multiline-safe cinematic title fitting");
}

if (failures.length) {
  console.error("ACT showcase architecture audit failed:\n" + failures.map(item => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log(`ACT showcase architecture audit passed: 1 CSS entry, 1 module bootstrap, ${cssImports.length} ordered CSS modules, centralized public data access, no retired browser API patches, and explicit title/trailer ownership.`);
