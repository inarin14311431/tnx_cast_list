import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("troop migration enforces owner RLS and public read", () => {
  const sql = read("supabase/28_troops.sql");
  assert.match(sql, /alter table public\.troops enable row level security/i);
  assert.match(sql, /visibility = 'public' or owner_id = auth\.uid\(\)/i);
  assert.match(sql, /owner_id = auth\.uid\(\)/i);
  assert.match(sql, /linked character must be owned by troop owner/i);
});

test("troop v2 migration adds combos and spent experience", () => {
  const sql = read("supabase/29_troop_rules_v2.sql");
  assert.match(sql, /combos jsonb/i);
  assert.match(sql, /experience_spent integer/i);
  assert.match(sql, /utsuwa_attribute text/i);
});

test("troop rules use one style, derived stats, max members and EXP", () => {
  const html = read("troop.html");
  const js = read("js/troop.js");
  const cssEntry = read("css-next/pages/troop-entry.css");
  assert.match(html, /CSはトループレベルと同値/);
  assert.match(html, /ARは1/);
  assert.match(html, /troop-entry\.css\?v=1/);
  assert.match(cssEntry, /troop-screen\.css\?v=2[^\n]*layer\(troop-screen\)/);
  assert.doesNotMatch(html, /troop-(?:compact-density-v2|density-v3|visual-accent-v5|layout-v6)\.css/);
  assert.match(html, /id="troop-style"/);
  assert.doesNotMatch(html, /id="troop-style-2"/);
  assert.doesNotMatch(html, /troop-member-current/);
  assert.match(html, /消費経験点/);
  assert.match(js, /record\?\.\[key\]\?\.\[0\].*\+ level/);
  assert.match(js, /record\?\.\[key\]\?\.\[1\].*\+ level/);
});

test("troop abilities use four compact two-digit pairs followed by CS", () => {
  const html = read("troop.html");
  const js = read("js/troop.js");
  const layout = read("js/troop-layout-refine.js");
  const css = read("css-next/pages/troop-screen.css");
  assert.match(html, /troop\.js\?v=6/);
  assert.match(js, /refreshTroopAbilityPairs\("#troop-ability-preview", "#troop-level"\)/);
  assert.match(js, /refreshTroopAbilityPairs\("#troop-abilities-view", "#troop-level-view"\)/);
  assert.doesNotMatch(layout, /installStylesheet|troop-density-v3\.css/);
  assert.match(layout, /export function refreshTroopAbilityPairs/);
  assert.match(layout, /troop-ability-grid--compact-pairs/);
  assert.match(layout, /<i>／<\/i>/);
  assert.match(layout, /createElement\("article"\)[\s\S]*troop-cs-card/);
  assert.match(layout, /cs\.querySelector\("strong"\)\.textContent/);
  assert.match(css, /grid-template-columns:repeat\(4,minmax\(68px,1fr\)\) minmax\(46px,\.62fr\)/);
  assert.match(css, /min-width:5\.2ch/);
  assert.match(css, /font-variant-numeric:tabular-nums/);
});

test("troop read view mirrors the full editor structure", () => {
  const html = read("troop.html");
  const css = read("css-next/pages/troop-screen.css");
  assert.match(html, /id="troop-view" class="troop-view-readonly"/);
  assert.match(html, /troop-view-form-grid--basic/);
  assert.match(html, /troop-view-form-grid--management/);
  assert.match(html, /troop-view-general-field-heads/);
  assert.match(html, /troop-view-style-field-heads/);
  assert.match(html, /troop-view-outfit-fields/);
  assert.match(css, /grid-template-columns:minmax\(0,4fr\) minmax\(0,6fr\)/);
  assert.match(css, /#troop-view\.troop-view-readonly:not\(\[hidden\]\)[\s\S]*width:100%/);
  assert.doesNotMatch(css, /troop-sheet--compact/);
});

test("troop editor separates management and basic data", () => {
  const html = read("troop.html");
  assert.match(html, /管理機能 <small>MANAGEMENT<\/small>/);
  assert.match(html, /基本情報 <small>BASIC DATA<\/small>/);
  assert.match(html, /公開状況/);
  assert.match(html, /紐づけキャスト/);
  assert.match(html, /名称/);
  assert.match(html, /トループレベル/);
  assert.match(html, /最大人数/);
});

test("troop general skills are selected and named skills support details", () => {
  const ui = read("js/troop-editor-ui.js");
  assert.match(ui, /GENERAL_MASTER_ROWS/);
  assert.match(ui, /dataGeneralSkillSelect|generalSkillSelect/i);
  assert.match(ui, /製作：/);
  assert.match(ui, /芸術：/);
  assert.match(ui, /操縦：/);
  assert.match(ui, /troop-general-skill-detail/);
});

test("troop general skills omit social connection and per-row EXP", () => {
  const html = read("troop.html");
  const js = read("js/troop.js");
  const ui = read("js/troop-editor-ui.js");
  assert.doesNotMatch(html, /社会・コネ|社会、コネ/);
  assert.match(ui, /OPEN_PREFIXES = \["製作：", "芸術：", "操縦："\]/);
  assert.doesNotMatch(ui, /OPEN_PREFIXES = \[[^\]]*社会：/);
  assert.doesNotMatch(ui, /OPEN_PREFIXES = \[[^\]]*コネ：/);
  assert.doesNotMatch(js, /data-field="exp"/);
  assert.match(js, /data-field="timing"[\s\S]*data-field="confrontation"/);
  assert.match(js, /troop-view-general-row/);
  assert.doesNotMatch(html, /troop-view-general-field-heads[^\n]*EXP/);
});

test("troop suits use outline and filled suit toggles", () => {
  const ui = read("js/troop-editor-ui.js");
  const css = read("css-next/pages/troop-base.css");
  assert.match(ui, /off:"♡", on:"♥"/);
  assert.match(ui, /off:"♤", on:"♠"/);
  assert.match(css, /attr\(data-off\)/);
  assert.match(css, /attr\(data-on\)/);
});

test("utsuwa attribute is strictly hidden except for utsuwa", () => {
  const html = read("troop.html");
  const js = read("js/troop.js");
  const css = read("css-next/pages/troop-base.css");
  assert.match(html, /id="troop-utsuwa-wrap" hidden/);
  assert.match(js, /hidden = !isUtsuwa/);
  assert.match(css, /#troop-editor \[hidden\][^{]*\{display:none\}/);
});

test("troop styles use explicit cascade layers without important overrides", () => {
  const html = read("troop.html");
  const registryHtml = read("troops.html");
  const detailEntry = read("css-next/pages/troop-entry.css");
  const registryEntry = read("css-next/pages/troops-entry.css");
  const sources = [
    "troops.css", "troop-base.css", "troops-registry-base.css", "troop-layout.css",
    "troop-combo-dialog.css", "troop-combo-rules.css", "troop-screen.css",
    "troops-registry.css"
  ].map(file => read(`css-next/pages/${file}`));

  assert.match(html, /troop-entry\.css\?v=1/);
  assert.match(registryHtml, /troops-entry\.css\?v=1/);
  assert.match(detailEntry, /@layer app, troop-base, troop-layout, troop-dialog, troop-combo, troop-screen/);
  assert.match(detailEntry, /troop-base\.css\?v=1[^\n]*layer\(troop-base\)/);
  assert.match(registryEntry, /@layer app, troop-base, troop-registry/);
  assert.match(registryEntry, /troops-registry-base\.css\?v=1[^\n]*layer\(troop-base\)/);
  assert.match(registryEntry, /troops-registry\.css\?v=1[^\n]*layer\(troop-registry\)/);
  sources.forEach(source => assert.doesNotMatch(source, /!important/));
});

test("troop general and style skills keep normal EXP rules", () => {
  const js = read("js/troop.js");
  const save = read("js/troop-save.js");
  assert.match(js, /GENERAL_KIND_COST = \{ general:10, proper:5, social:5, connection:5 \}/);
  assert.match(js, /STYLE_COST = \{ none:0, normal:10, secret:20, ultimate:50, direction:2 \}/);
  assert.match(js, /if \(level >= 4\) boxes\.forEach\(box => box\.checked = true\)/);
  assert.match(save, /length > 2/);
  assert.match(save, /length > 1/);
});

test("troop combos reuse the combo card dialog and select owned skills", () => {
  const html = read("troop.html");
  const ui = read("js/troop-editor-ui.js");
  assert.match(html, /class="combo-dialog"/);
  assert.match(html, /id="troop-combo-skill-options"/);
  assert.match(html, /name="ability_choice"/);
  assert.match(ui, /ownedSkillNames/);
  assert.match(ui, /name="skill_choice"/);
  assert.match(ui, /querySelectorAll\('input\[name="ability_choice"\]:checked'\)/);
  assert.match(ui, /join\(","\)/);
  assert.match(ui, /target_value/);
  assert.match(ui, /act_use_limit/);
});

test("troop outfits expose attack and SPI values", () => {
  const js = read("js/troop.js");
  const save = read("js/troop-save.js");
  assert.match(js, /data-field="attack"/);
  assert.match(js, /data-field="defense_s"/);
  assert.match(js, /data-field="defense_p"/);
  assert.match(js, /data-field="defense_i"/);
  assert.match(save, /\["name","attack","defense_s","defense_p","defense_i","notes"\]/);
  assert.match(js, /troop-view-outfit-row/);
  assert.match(js, /item\.defense_s \?\? item\.s/);
});

test("troop read combos have one renderer and clipboard controls", () => {
  const html = read("troop.html");
  const js = read("js/troop.js");
  const comboRules = read("js/troop-combo-rule-v2.js");
  const copy = read("js/troop-combo-copy.js");
  assert.match(html, /troop-combo-copy\.js\?v=2/);
  assert.match(js, /function renderComboList/);
  assert.match(js, /class="troop-view-combo"/);
  assert.doesNotMatch(comboRules, /initializePublicComboView|renderPublicCombos/);
  assert.match(copy, /#troop-combos-view article/);
  assert.match(copy, /navigator\.clipboard\.writeText/);
  assert.doesNotMatch(copy, /import\("\.\/troop-layout-refine/);
});

test("troop editor runtime uses explicit initializers without DOM recovery observers", () => {
  const html = read("troop.html");
  const js = read("js/troop.js");
  const ui = read("js/troop-editor-ui.js");
  const layout = read("js/troop-layout-refine.js");
  const comboRules = read("js/troop-combo-rule-v2.js");
  assert.match(js, /initializeTroopLayout\(editor\)/);
  assert.match(js, /initializeTroopEditorUi\(\)/);
  assert.match(ui, /export function initializeTroopEditorUi/);
  assert.match(layout, /export function initializeTroopLayout/);
  assert.match(comboRules, /export function initializeTroopComboRules/);
  assert.doesNotMatch(`${ui}\n${layout}\n${comboRules}`, /MutationObserver|stopImmediatePropagation/);
  assert.doesNotMatch(html, /troop-(?:editor-ui|layout-refine|fields-v6|combo-rule-v2)\.js/);
});

test("cast troop modal uses editor section colors and compact CS pairs", () => {
  const cast = read("js/cast-troops-link.js");
  const castHtml = read("cast.html");
  const castEntry = read("css-next/pages/cast-entry.css");
  const css = read("css-next/pages/cast-troop-modal.css");
  assert.match(castHtml, /cast-entry\.css\?v=2/);
  assert.match(castEntry, /cast-troop-modal\.css\?v=5[^\n]*layer\(cast-troop-modal\)/);
  assert.match(castHtml, /cast-troops-link\.js\?v=7/);
  assert.match(castHtml, /troop-combo-copy\.js\?v=2/);
  assert.match(cast, /cast-troop-block--abilities/);
  assert.match(cast, /cast-troop-block--combos/);
  assert.match(cast, /cast-troop-ability-pair--cs/);
  assert.match(cast, /<span>トループ<\/span><small>TROOP<\/small>/);
  assert.match(cast, /watchDesktopExperience\(expText\)/);
  assert.match(cast, /castStatus\.textContent\?\.trim\(\) === "ACCESS GRANTED"/);
  assert.doesNotMatch(cast, /<span>トループ \$\{troops\.length\}<\/span>/);
  assert.match(cast, /<i>／<\/i>/);
  assert.match(css, /--troop-abilities:#d4a43d/);
  assert.match(css, /--troop-general:#cf6874/);
  assert.match(css, /--troop-style-skills:#49aaa3/);
  assert.match(css, /--troop-combos:#cf873b/);
  assert.match(css, /repeat\(4,minmax\(76px,1fr\)\) minmax\(48px,\.62fr\)/);
});

test("account and cast have responsive troop navigation adapters", () => {
  const cast = read("js/cast-troops-link.js");
  const castHtml = read("cast.html");
  const castEntry = read("css-next/pages/cast-entry.css");
  const mobileCss = read("css-next/pages/troop-layout.css");
  assert.match(read("js/account-mobile-editor-links.js"), /troops\.html/);
  assert.match(read("js/cast-mobile-level-labels.js"), /cast-troops-link\.js/);
  assert.match(cast, /matchMedia\("\(min-width: 761px\)"\)/);
  assert.match(cast, /cast-troop-dialog/);
  assert.match(cast, /showModal\(\)/);
  assert.match(cast, /troops\.length === 1.*troop\.html/s);
  assert.match(cast, /troops\.html\?character=/);
  assert.match(castHtml, /cast-entry\.css/);
  assert.match(castEntry, /cast-troop-modal\.css/);
  assert.match(mobileCss, /body\[data-page="troop\.html"\].*troop-vitals/s);
});