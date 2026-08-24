import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { renderSkillEditorSections } from "../js/sheet-skill-renderer.js";

const skill = (overrides = {}) => ({
  _key: "skill-1",
  category: "general",
  name: "技能",
  level: 1,
  free_level: 0,
  skill_kind: "general",
  reason: true,
  passion: false,
  life: false,
  mundane: false,
  description: "",
  timing: "",
  ...overrides
});

test("skill renderer preserves general two-column and ordered group contracts", () => {
  const output = renderSkillEditorSections({
    generalRows: [
      skill({ _key: "g1", name: "医療" }),
      skill({ _key: "g2", name: "交渉" }),
      skill({ _key: "g3", name: "運動", life: true, reason: false })
    ],
    socialRows: [skill({ _key: "s1", category: "social", name: "社会：N◎VA", skill_kind: "proper" })],
    connectionRows: [skill({ _key: "c1", category: "connection", name: "コネ：テスト", skill_kind: "proper" })]
  });

  assert.match(output.generalHtml, /general-skill-column--first/);
  assert.match(output.generalHtml, /general-skill-column--second/);
  assert.match(output.generalHtml, /data-skill-category="social"/);
  assert.match(output.generalHtml, /data-skill-category="connection"/);
  assert.match(output.generalHtml, /data-skill-move="up"/);
  assert.match(output.generalHtml, /data-delete-skill="s1"/);
});

test("skill renderer preserves free level as hidden editor state", () => {
  const output = renderSkillEditorSections({
    generalRows: [skill({ _key: "free-1", name: "射撃", level: 2, free_level: 1 })]
  });
  assert.match(output.generalHtml, /data-f="free_level" type="hidden" value="1"/);
});

test("skill renderer preserves style rows, separators and escaping", () => {
  const separator = skill({ _key: "sep", category: "style", name: "アヤカシ", skill_kind: "none", _rowType: "separator" });
  const style = skill({
    _key: "style-1",
    category: "style",
    name: "<技能>",
    skill_kind: "secret",
    description: "A&B"
  });
  const output = renderSkillEditorSections({
    styleRows: [separator, style],
    isStyleSeparator: item => item._rowType === "separator",
    styleKindLabels: { secret: "秘技" }
  });

  assert.match(output.styleHtml, /data-style-separator="1"/);
  assert.match(output.styleHtml, /data-style-separator-structure="2cell"/);
  assert.match(output.styleHtml, /&lt;技能&gt;/);
  assert.match(output.styleHtml, /A&amp;B/);
  assert.match(output.styleHtml, />秘技<\/option>/);
  assert.match(output.styleHtml, /data-f="reason" type="checkbox" checked/);
});

test("classic sheet delegates skill markup to the renderer module", async () => {
  const source = await readFile(new URL("../js/sheet.js", import.meta.url), "utf8");
  assert.match(source, /renderSkillEditorSections\s*\(/);
  assert.doesNotMatch(source, /function\s+skillTable\s*\(/);
  assert.doesNotMatch(source, /function\s+skillRow\s*\(/);
  assert.doesNotMatch(source, /function\s+rowActions\s*\(/);
  assert.doesNotMatch(source, /function\s+styleSeparatorRow\s*\(/);
});
