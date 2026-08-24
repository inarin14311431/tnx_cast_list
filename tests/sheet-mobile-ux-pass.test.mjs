import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const app = await read("js/sheet-mobile-app.js");
const ui = await read("js/sheet-mobile-ui.js");
const ux = await read("js/sheet-mobile-ux.js");
const css = await read("css-next/pages/sheet-mobile-ux.css");

test("mobile UX layer loads after feature editors", () => {
  const uxIndex = app.indexOf("sheet-mobile-ux.js");
  assert.ok(uxIndex > app.indexOf("sheet-mobile-skills.js"));
  assert.ok(uxIndex > app.indexOf("sheet-mobile-outfit.js"));
  assert.ok(uxIndex > app.indexOf("sheet-mobile-profile.js"));
});

test("shared UI no longer deletes feature apply buttons", () => {
  assert.doesNotMatch(ui, /style-skill-dialog-apply[^\n]*remove\(/);
  assert.doesNotMatch(ui, /mobile-ability-dialog-apply[^\n]*remove\(/);
  assert.match(ui, /removeLegacyChromeMutations/);
});

test("ability, CS and general skill dialogs get explicit cancel and apply actions", () => {
  assert.match(ux, /#mobile-ability-dialog/);
  assert.match(ux, /#mobile-cs-dialog/);
  assert.match(ux, /#mobile-general-dialog/);
  assert.match(ux, /cancel\.textContent="キャンセル"/);
  assert.match(ux, /apply\.textContent="反映"/);
  assert.match(ux, /event\.stopImmediatePropagation\(\)/);
});

test("new general skill cancel cleans the transient row without confirmation", () => {
  assert.match(ux, /pendingGeneralNew/);
  assert.match(ux, /mobileSilentDelete/);
  assert.match(ui, /source\.dataset\.mobileSilentDelete==="1"/);
  assert.match(ux, /restoreSaveVisual\(pendingGeneralSaveState\)/);
});

test("navigation shows all sections in a wrapped grid and keeps active highlighting", () => {
  assert.match(css, /\.mobile-sheet-nav\{[\s\S]*display:grid/);
  assert.match(css, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /overflow:visible/);
  assert.doesNotMatch(css, /overflow-x:auto/);
  assert.match(ux, /IntersectionObserver/);
  assert.match(ux, /aria-current/);
  const activate = ux.match(/const activate=id=>\{[\s\S]*?\n  \};/)?.[0] || "";
  assert.doesNotMatch(activate, /scrollIntoView/);
});

test("style skills and outfits hide reorder arrows outside reorder mode", () => {
  assert.match(ux, /#mobile-style-skills-section/);
  assert.match(ux, /#mobile-outfits-section/);
  assert.match(css, /:not\(\.is-reorder-mode\)[\s\S]*mobile-style-skill-row__actions/);
  assert.match(css, /:not\(\.is-reorder-mode\)[\s\S]*mobile-outfit-order-row__actions/);
});

test("fixed actions prioritize save and visibility returns to profile", () => {
  assert.match(ux, /moveVisibilityToProfile/);
  assert.match(css, /\.mobile-sheet-actions\{[\s\S]*grid-template-columns:64px minmax\(78px,.8fr\) minmax\(128px,1.55fr\)/);
  assert.match(css, /\.mobile-profile-visibility/);
});

test("saved status stays quiet and mobile list typography is readable", () => {
  assert.match(css, /mobile-sheet-status\[data-state="saved"\]\{display:none\}/);
  assert.match(css, /mobile-general-display-name\{font-size:12px/);
  assert.match(css, /mobile-style-skill-card__primary \.mobile-edit-card__name\{font-size:13px/);
});
