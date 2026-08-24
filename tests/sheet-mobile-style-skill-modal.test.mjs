import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(path, import.meta.url), "utf8");
const skills = await read("../js/sheet-mobile-skills.js");
const actions = await read("../js/sheet-mobile-style-skill-actions.js");
const app = await read("../js/sheet-mobile-app.js");

test("mobile style skill modal exposes explicit cancel and apply actions", () => {
  assert.match(actions, /id = "style-skill-dialog-apply"/);
  assert.match(actions, /apply\.textContent = "反映"/);
  assert.match(actions, /cancel\.textContent = "キャンセル"/);
  assert.match(skills, /#style-skill-dialog-apply/);
  assert.match(skills, /addEventListener\("click", applyStyle\)/);
  assert.match(skills, /addEventListener\("click", cancelStyle\)/);
});

test("style skill detail normalization preserves confrontation and custom select values", () => {
  assert.match(skills, /normalizeStyleSkillRow/);
  assert.match(skills, /function parseDetail\(item\) \{\s*return normalizeStyleSkillRow\(item\);\s*\}/);
  assert.match(skills, /const STYLE_COLUMN_FIELDS = \["timing","target","range","difficulty","confrontation"\]/);
  assert.match(skills, /for \(const key of STYLE_COLUMN_FIELDS\) item\[key\] = detail\[key\] \|\| "";/);
  assert.match(skills, /option\.dataset\.mobileStyleExistingValue = "1"/);
  assert.match(skills, /control\.append\(option\)/);
});

test("new style skills are transient until apply and cancel removes the blank row", () => {
  const add = skills.match(/function addSkill\(category\) \{[\s\S]*?\n\}/)?.[0] || "";
  assert.match(add, /skills\.push\(item\);\s*if \(category === "style"\) \{\s*openStyle\(item\.id\);\s*return;/);
  assert.ok(add.indexOf("openStyle(item.id)") < add.indexOf("dirtyIds.add"), "style row must not be marked dirty before apply");
  assert.match(skills, /function cancelStyle\(\)[\s\S]*if \(item && isNew\(item\)\)[\s\S]*skills = skills\.filter/);
  assert.match(skills, /スタイル技能の名称を入力してください/);
});

test("core mobile style editor owns existing-value hydration", () => {
  assert.doesNotMatch(app, /sheet-mobile-style-existing-values\.js/);
  const actionsIndex = app.indexOf("sheet-mobile-style-skill-actions.js");
  const skillsIndex = app.indexOf("sheet-mobile-skills.js");
  assert.ok(actionsIndex >= 0 && skillsIndex > actionsIndex, "dialog actions must exist before skills bind listeners");
});
