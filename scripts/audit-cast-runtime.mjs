import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const htmlPath = path.join(root, "cast.html");
const html = fs.readFileSync(htmlPath, "utf8");
const scripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*><\/script>/gi)]
  .map(match => match[1]);
const localScripts = scripts.filter(src => !/^(?:https?:)?\/\//i.test(src));
const clean = src => src.split(/[?#]/, 1)[0].replace(/^\.\//, "");
const cleanScripts = localScripts.map(clean);
const errors = [];

const duplicates = cleanScripts.filter((src, index) => cleanScripts.indexOf(src) !== index);
if (duplicates.length) errors.push(`duplicate script references: ${[...new Set(duplicates)].join(", ")}`);

for (const src of cleanScripts) {
  const resolved = path.resolve(root, src);
  if (!resolved.startsWith(root + path.sep)) {
    errors.push(`script escapes repository root: ${src}`);
    continue;
  }
  if (!fs.existsSync(resolved)) errors.push(`missing local script: ${src}`);
}

const compositionRoot = "js/cast-app.js";
if (cleanScripts.filter(src => src === compositionRoot).length !== 1) {
  errors.push(`${compositionRoot} must be loaded exactly once by cast.html`);
}

const appSource = fs.readFileSync(path.join(root, compositionRoot), "utf8");
const composedScripts = [...appSource.matchAll(/["'](\.\/cast[^"']*\.js(?:\?[^"']*)?)["']/g)]
  .map(match => clean(match[1]));
const composedDuplicates = composedScripts.filter((src, index) => composedScripts.indexOf(src) !== index);
if (composedDuplicates.length) errors.push(`duplicate composition imports: ${[...new Set(composedDuplicates)].join(", ")}`);

for (const src of composedScripts) {
  const resolved = path.resolve(root, "js", path.basename(src));
  if (!fs.existsSync(resolved)) errors.push(`missing composed runtime: ${src}`);
}

const core = "cast.js";
if (composedScripts.filter(src => src === core).length !== 1) {
  errors.push(`js/${core} must be composed exactly once by ${compositionRoot}`);
}

const coreIndex = composedScripts.indexOf(core);
for (const dependent of [
  "cast-compact-skills.js",
  "cast-ui.js",
  "cast-style-skills.js",
  "cast-outfits.js",
  "cast-mobile.js"
]) {
  const index = composedScripts.indexOf(dependent);
  if (index < 0) errors.push(`js/${dependent} must be owned by ${compositionRoot}`);
  else if (coreIndex >= 0 && index < coreIndex) errors.push(`js/${dependent} must remain after js/${core}`);
}

for (const retired of ["js/cast-mobile-combos.js", "js/cast-quick-outfit-pairs.js"]) {
  if (cleanScripts.includes(retired) || composedScripts.includes(retired.replace(/^js\//, ""))) {
    errors.push(`retired runtime must not be loaded: ${retired}`);
  }
  if (fs.existsSync(path.join(root, retired))) errors.push(`retired runtime file must not exist: ${retired}`);
}

const castSource = fs.readFileSync(path.join(root, "js/cast.js"), "utf8");
const compactSource = fs.readFileSync(path.join(root, "js/cast-quick-sheet-compact.js"), "utf8");
const mobileSource = fs.readFileSync(path.join(root, "js/cast-mobile.js"), "utf8");

if (!castSource.includes("formatPurchasePair(outfit)")) {
  errors.push("cast.js must own quick-sheet purchase pair rendering");
}
if (!castSource.includes("formatConcealmentPair(outfit)")) {
  errors.push("cast.js must own quick-sheet concealment pair rendering");
}
if (/\bcs_value\b/.test(castSource)) {
  errors.push("cast.js must not use legacy cs_value in public rendering");
}
if (/cast-quick-outfit-pairs/.test(compactSource)) {
  errors.push("quick-sheet compaction must not import the retired outfit patch");
}
if (/\[\"cs_value\",\"CS\"\]/.test(mobileSource)) {
  errors.push("mobile cast must not expose legacy cs_value/CS outfit fields");
}
if (!mobileSource.includes('["cs_modifier","CS修正"]')) {
  errors.push("mobile cast must expose canonical CS修正 where applicable");
}

if (errors.length) {
  console.error("cast runtime audit failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`cast runtime audit passed: ${cleanScripts.length} HTML scripts, ${composedScripts.length} composed modules`);
cleanScripts.forEach((src, index) => console.log(`H${String(index + 1).padStart(2, "0")}. ${src}`));
composedScripts.forEach((src, index) => console.log(`C${String(index + 1).padStart(2, "0")}. js/${src}`));
