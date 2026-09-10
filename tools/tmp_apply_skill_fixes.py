from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    if new in text:
        return
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one replacement, got {count}")
    p.write_text(text.replace(old, new, 1))


replace_once(
    "js/sheet-master-search.js",
    """await waitFor(() => row.querySelector(\"[data-style-field='description']\") || row.querySelector(\"[data-f='description']\"), 1600);""",
    """const structuredDetailReady = await waitFor(() =>
    row.dataset.fullStyleFields === \"1\"
    && row.querySelector(\"[data-style-field='skill']\")
    && row.querySelector(\"[data-style-field='description']\")
    && row.querySelector(\"[data-style-field='page']\"), 1600);"""
)
replace_once(
    "js/sheet-master-search.js",
    """if (!row.querySelector(\"[data-style-field='description']\")) {
    setControl(row.querySelector(\"[data-f='description']\"), buildSkdPlainDescription(rowData));
  }""",
    """if (!structuredDetailReady) {
    setControl(row.querySelector(\"[data-f='description']\"), buildSkdPlainDescription(rowData));
  }"""
)

p = Path("js/sheet-new-character-state.js")
text = p.read_text()
anchor = 'import { appendRows } from "./sheet-row-collection-state.js";\n'
constant = '''\nexport const STARTER_SOCIAL_CONNECTION_ROWS = Object.freeze([\n  ["social", "社会：N◎VA"],\n  ["social", "社会："],\n  ["social", "社会："],\n  ["social", "社会："],\n  ["connection", "コネ："],\n  ["connection", "コネ："],\n  ["connection", "コネ："]\n].map(row => Object.freeze(row)));\n\nexport function appendStarterSocialConnectionRowsIfBothMissing(rows = [], {\n  createSkillRow = defaultCreateSkillRow\n} = {}) {\n  if (typeof createSkillRow !== "function") throw new TypeError("createSkillRow is required");\n  const source = [...rows];\n  const hasSocial = source.some(row => row?.category === "social");\n  const hasConnection = source.some(row => row?.category === "connection");\n  if (hasSocial || hasConnection) return source;\n\n  const sharedTrailingSortOrder = source.length;\n  const starterRows = STARTER_SOCIAL_CONNECTION_ROWS.map(([category, name]) => createSkillRow(category, {\n    name,\n    level: 1,\n    free_level: 0,\n    skill_kind: "proper"\n  }, { sortOrder: sharedTrailingSortOrder }));\n  return appendRows(source, starterRows);\n}\n'''
if "STARTER_SOCIAL_CONNECTION_ROWS" not in text:
    if text.count(anchor) != 1:
        raise SystemExit("sheet-new-character-state.js: import anchor mismatch")
    text = text.replace(anchor, anchor + constant, 1)
old_trailing = '''  const sharedTrailingSortOrder = rows.length;\n  const trailingRows = [\n    ["social", "社会：N◎VA"],\n    ["social", "社会："],\n    ["social", "社会："],\n    ["social", "社会："],\n    ["connection", "コネ："],\n    ["connection", "コネ："],\n    ["connection", "コネ："]\n  ].map(([category, name]) => createSkillRow(category, {\n    name,\n    level: 1,\n    free_level: 0,\n    skill_kind: "proper"\n  }, { sortOrder: sharedTrailingSortOrder }));\n\n  return appendRows(rows, trailingRows);'''
new_trailing = '  return appendStarterSocialConnectionRowsIfBothMissing(rows, { createSkillRow });'
if new_trailing not in text:
    if text.count(old_trailing) != 1:
        raise SystemExit("sheet-new-character-state.js: starter replacement mismatch")
    text = text.replace(old_trailing, new_trailing, 1)
p.write_text(text)

replace_once(
    "js/sheet-skill-renderer.js",
    '  if (!rows.length && !category.startsWith("general")) return "";',
    '  if (!rows.length && category.split(" ")[0] === "style") return "";'
)

replace_once(
    "js/sheet.js",
    'import { buildNewCharacterSkills } from "./sheet-new-character-state.js?v=1";',
    'import { buildNewCharacterSkills, appendStarterSocialConnectionRowsIfBothMissing } from "./sheet-new-character-state.js?v=2";'
)
replace_once(
    "js/sheet.js",
    """ensureGeneralMasterRows(); addInitialGeneralBlankSlots();
    outfits = bundle.outfits.map(normalizeLoadedOutfit);""",
    """ensureGeneralMasterRows(); addInitialGeneralBlankSlots();
    skills = appendStarterSocialConnectionRowsIfBothMissing(skills);
    outfits = bundle.outfits.map(normalizeLoadedOutfit);"""
)

p = Path("tests/sheet-new-character-state.test.mjs")
text = p.read_text()
text = text.replace(
    'import { buildNewCharacterSkills } from "../js/sheet-new-character-state.js";',
    'import { buildNewCharacterSkills, appendStarterSocialConnectionRowsIfBothMissing } from "../js/sheet-new-character-state.js";'
).replace(
    'assert.match(sheetSource, /sheet-new-character-state\\.js\\?v=1/);',
    'assert.match(sheetSource, /sheet-new-character-state\\.js\\?v=2/);'
)
marker = 'test("legacy empty social and connection state restores only the canonical starter package", () => {'
if marker not in text:
    text += '''\n\ntest("legacy empty social and connection state restores only the canonical starter package", () => {\n  key = 0;\n  const existing = [makeRow("general", { name: "医療" })];\n  const restored = appendStarterSocialConnectionRowsIfBothMissing(existing, { createSkillRow: makeRow });\n  assert.deepEqual(restored.filter(row => row.category === "social").map(row => row.name), ["社会：N◎VA", "社会：", "社会：", "社会："]);\n  assert.deepEqual(restored.filter(row => row.category === "connection").map(row => row.name), ["コネ：", "コネ：", "コネ："]);\n  assert.equal(restored.length, existing.length + 7);\n});\n\ntest("starter recovery does not invent rows when either social or connection data already exists", () => {\n  key = 0;\n  const socialOnly = [makeRow("social", { name: "社会：企業" })];\n  const connectionOnly = [makeRow("connection", { name: "コネ：テスト" })];\n  assert.equal(appendStarterSocialConnectionRowsIfBothMissing(socialOnly, { createSkillRow: makeRow }).length, 1);\n  assert.equal(appendStarterSocialConnectionRowsIfBothMissing(connectionOnly, { createSkillRow: makeRow }).length, 1);\n});\n'''
p.write_text(text)

p = Path("tests/sheet-skill-renderer.test.mjs")
text = p.read_text()
marker = 'test("skill renderer keeps social and connection frames when either category is empty", () => {'
if marker not in text:
    text += '''\n\ntest("skill renderer keeps social and connection frames when either category is empty", () => {\n  const output = renderSkillEditorSections({\n    generalRows: [skill({ _key: "g-empty-groups", name: "医療" })],\n    socialRows: [],\n    connectionRows: []\n  });\n  assert.match(output.generalHtml, /data-skill-category="social"/);\n  assert.match(output.generalHtml, /data-skill-category="connection"/);\n  assert.match(output.generalHtml, />社会 <small>SOCIAL<\\/small>/);\n  assert.match(output.generalHtml, />コネクション <small>CONNECTIONS<\\/small>/);\n});\n'''
p.write_text(text)

p = Path("tests/master-search-selection.test.mjs")
text = p.read_text()
marker = "test('SKD master apply waits for full structured detail controls before mapping all fields'"
if marker not in text:
    text += '''\n\ntest('SKD master apply waits for full structured detail controls before mapping all fields', async () => {\n  const source = await read('js/sheet-master-search.js');\n  assert.match(source, /row\\.dataset\\.fullStyleFields === "1"/);\n  assert.match(source, /data-style-field='skill'/);\n  assert.match(source, /data-style-field='page'/);\n  for (const mapping of [\n    'skill: rowData.skill',\n    'limit: rowData.limit_text',\n    'timing: rowData.timing',\n    'target: rowData.target',\n    'range: rowData.range_text',\n    'difficulty: rowData.difficulty',\n    'confrontation: rowData.confrontation',\n    'description: rowData.description',\n    'page: rowData.page_number'\n  ]) assert.ok(source.includes(mapping), `missing SKD mapping: ${mapping}`);\n  assert.match(source, /if \\(!structuredDetailReady\\)/);\n  assert.match(source, /buildSkdPlainDescription\\(rowData\\)/);\n});\n'''
p.write_text(text)
