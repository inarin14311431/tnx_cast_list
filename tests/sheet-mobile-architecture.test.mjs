import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../sheet-mobile.html", import.meta.url), "utf8");
const app = await readFile(new URL("../js/sheet-mobile-app.js", import.meta.url), "utf8");
const runtime = await readFile(new URL("../js/sheet-mobile-runtime.js", import.meta.url), "utf8");
const coordinator = await readFile(new URL("../js/sheet-mobile-save-coordinator.js", import.meta.url), "utf8");
const profile = await readFile(new URL("../js/sheet-mobile.js", import.meta.url), "utf8");
const style = await readFile(new URL("../js/sheet-mobile-style.js", import.meta.url), "utf8");
const ability = await readFile(new URL("../js/sheet-mobile-ability.js", import.meta.url), "utf8");
const styleCompat = await readFile(new URL("../js/sheet-mobile-style-existing-values.js", import.meta.url), "utf8");
const outfit = await readFile(new URL("../js/sheet-mobile-outfit.js", import.meta.url), "utf8");
const combos = await readFile(new URL("../js/sheet-mobile-combos.js", import.meta.url), "utf8");
const snapshots = await readFile(new URL("../js/sheet-mobile-snapshots.js", import.meta.url), "utf8");
const image = await readFile(new URL("../js/sheet-mobile-image.js", import.meta.url), "utf8");
const exp = await readFile(new URL("../js/sheet-mobile-header-exp.js", import.meta.url), "utf8");
const uiCss = await readFile(new URL("../css-next/pages/sheet-mobile-ui.css", import.meta.url), "utf8");
const skillsCss = await readFile(new URL("../css-next/pages/sheet-mobile-skills.css", import.meta.url), "utf8");
const outfitCss = await readFile(new URL("../css-next/pages/sheet-mobile-outfit.css", import.meta.url), "utf8");

const standalonePageSelector = className => new RegExp(`(?:^|})\\s*body\\[data-page=["']sheet-mobile\\.html["']\\]\\s+\\.${className}\\{`);

test("mobile editor footer always opens explicit mobile cast view", () => {
  assert.match(html, /id="mobile-view-link"[^>]+href="\.\/cast\.html\?mobile=1"/);
  assert.match(profile, /cast\.html\?id=\$\{id\}&mobile=1/);
});

test("mobile editor keeps one application entry point", () => {
  const appScripts = [...html.matchAll(/<script[^>]+type="module"[^>]+src="([^"]+)"/g)].map(match => match[1]);
  assert.equal(appScripts.length, 1);
  assert.match(appScripts[0], /sheet-mobile-app\.js/);
  assert.match(app, /sheet-mobile-save-coordinator\.js/);
  assert.match(app, /sheet-mobile\.js/);
  assert.match(app, /sheet-mobile-style\.js/);
  assert.match(app, /sheet-mobile-ability\.js/);
  assert.match(app, /sheet-mobile-skills\.js/);
  assert.match(app, /sheet-mobile-outfit\.js/);
  assert.match(app, /sheet-mobile-combos\.js/);
  assert.match(app, /sheet-mobile-snapshots\.js/);
  assert.match(app, /sheet-mobile-image\.js/);
});

test("shared runtime and save coordinator load before mobile feature modules", () => {
  const imports = [...app.matchAll(/import\s+["']([^"']+)["']/g)].map(match => match[1].split("?")[0]);
  const runtimeIndex = imports.findIndex(value => value.endsWith("sheet-mobile-runtime.js"));
  const coordinatorIndex = imports.findIndex(value => value.endsWith("sheet-mobile-save-coordinator.js"));
  const firstFeatureIndex = imports.findIndex(value => /sheet-mobile-(?:profile|style|ability|skills|outfit|combos|snapshots|image)\.js$/.test(value));
  assert.ok(runtimeIndex >= 0 && runtimeIndex < firstFeatureIndex);
  assert.ok(coordinatorIndex >= 0 && coordinatorIndex < firstFeatureIndex);
});

test("shared mobile context owns authentication and character lookup", () => {
  assert.match(runtime, /requireAuth\(\)/);
  assert.match(runtime, /from\("characters"\)/);
  assert.match(runtime, /contextPromise/);
  for (const source of [profile, style, ability, styleCompat, outfit, combos, snapshots, image, exp]) {
    assert.match(source, /getMobileEditorContext/);
    assert.doesNotMatch(source, /requireAuth/);
    assert.doesNotMatch(source, /from\(["']characters["']\)\.select/);
  }
});

test("mobile save coordinator owns cross-feature flush ordering", () => {
  assert.match(coordinator, /tnx:mobile-before-save/);
  assert.match(coordinator, /detail = \{ add\(task\)/);
  assert.match(coordinator, /await Promise\.all\(tasks\)/);
  assert.match(coordinator, /button\.click\(\)/);
  assert.doesNotMatch(coordinator, /character_outfits|character_skills|character_combos/);
});

test("style feature keeps persona-key exclusivity, Utsuwa attributes and ability patching", () => {
  assert.match(style, /MARKS=\["","◎","●","◎●"\]/);
  assert.match(style, /UTSUWA_ATTRIBUTES/);
  assert.match(style, /normalizeLoadedMarks/);
  assert.match(style, /tnx:mobile-style-patch/);
  assert.match(style, /adjustBaseline/);
});

test("ability feature keeps style baselines, breakdown display, CS and coordinated save", () => {
  assert.match(ability, /styleBaseline/);
  assert.match(ability, /displayBreakdown/);
  assert.match(ability, /growthOptions/);
  assert.match(ability, /modifierOptions/);
  assert.match(ability, /tnx:mobile-style-patch/);
  assert.match(ability, /tnx:mobile-before-save/);
  assert.match(ability, /collectAbilityPayload/);
  assert.match(ability, /cs_base/);
});

test("mobile general skill experience fallback matches PC proper-skill inference", () => {
  assert.match(exp, /function inferGeneralKind\(name,category,storedKind=""\)/);
  assert.match(exp, /category!=="general"\)return "proper"/);
  assert.match(exp, /includes\("："\)\?"proper":"general"/);
  assert.match(exp, /kind=inferGeneralKind\(name,category,meta\.kind\)/);
});

test("snapshot feature keeps create, restore, delete and dirty-state safeguards", () => {
  assert.match(snapshots, /MAX_SNAPSHOTS=10/);
  assert.match(snapshots, /create_character_snapshot/);
  assert.match(snapshots, /restore_character_snapshot/);
  assert.match(snapshots, /from\("character_snapshots"\)\.delete\(\)/);
  assert.match(snapshots, /if\(dirty\(\)\)/);
});

test("image feature keeps upload, focus save, clear and owned-storage cleanup", () => {
  assert.match(image, /storage\.from\(BUCKET\)\.upload/);
  assert.match(image, /update\(\{image_url:next\}\)/);
  assert.match(image, /update\(\{image_url:""\}\)/);
  assert.match(image, /removeOwned/);
  assert.match(image, /MAX_SOURCE=20\*1024\*1024/);
  assert.match(image, /MAX_OUTPUT=1024\*1024/);
});

test("common editor component styles stay in UI stylesheet", () => {
  for (const selector of ["mobile-section-add", "mobile-unsaved-label", "mobile-danger-action", "mobile-editor-policy-note"]) {
    assert.match(uiCss, new RegExp(`\\.${selector}`));
  }

  assert.doesNotMatch(skillsCss, standalonePageSelector("mobile-danger-action"));
  assert.doesNotMatch(skillsCss, standalonePageSelector("mobile-unsaved-label"));
  assert.doesNotMatch(outfitCss, standalonePageSelector("mobile-unsaved-label"));
});
