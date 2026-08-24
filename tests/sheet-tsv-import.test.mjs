import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  parseSheetTsv,
  buildStyleSkillTsvRow,
  buildOutfitTsvRow,
  resolveImportedDefense
} from "../js/sheet-tsv-import.js";

test("TSV parser preserves legacy header and escaped-newline behavior", () => {
  assert.deepEqual(
    parseSheetTsv(" 名称 \t解説\r\n技能A\t1行目\\n2行目\r\n"),
    [{ "名称": "技能A", "解説": "1行目\n2行目" }]
  );
  assert.deepEqual(parseSheetTsv("   "), []);
});

test("SKD TSV row transformation preserves base identity and style-kind fallback", () => {
  const base = { _key: "skill-key", category: "style", sort_order: 4 };
  assert.deepEqual(
    buildStyleSkillTsvRow({ "名称": "技", "種別": "秘技", "レベル": "2", "解説": "説明" }, {
      base,
      styleKindFromLabel: () => ""
    }),
    { ...base, name: "技", skill_kind: "secret", level: 2, description: "説明" }
  );
  assert.equal(buildStyleSkillTsvRow({ "種別": "奥義" }).skill_kind, "ultimate");
  assert.equal(buildStyleSkillTsvRow({ "種別": "通常" }).skill_kind, "normal");
});

test("OFC defense import prefers explicit SPI and falls back to combined defense", () => {
  assert.deepEqual(resolveImportedDefense({ protecS: "4", protecP: "3", protecI: "2", defense: "9/9/9" }), {
    defense_s: "4", defense_p: "3", defense_i: "2"
  });
  assert.deepEqual(resolveImportedDefense({ defense: "3/2/1" }), {
    defense_s: "3", defense_p: "2", defense_i: "1"
  });
  assert.deepEqual(resolveImportedDefense({ protectionS: "6", defenseP: "5", I: "4" }), {
    defense_s: "6", defense_p: "5", defense_i: "4"
  });
});

test("OFC TSV row transformation preserves canonical base and structured detail mappings", () => {
  const base = { _key: "outfit-key", sort_order: 7, category: "other" };
  const result = buildOutfitTsvRow({
    target: "armours", name: "鎧", purchase: "5", permanent: "2",
    concealA: "12", concealB: "-1", attack: "P+1", range: "近", part: "スーツ",
    control: "-2", electrical_control: "15", defense: "3/2/1",
    page: "123", notes: "説明"
  }, { base });
  assert.deepEqual(result, {
    ...base,
    category: "armor",
    name: "鎧",
    purchase_value: "5",
    experience_cost: 2,
    concealment: "12/-1",
    attack: "P+1",
    range: "近",
    slot: "スーツ",
    control_modifier: -2,
    description: "説明",
    ofc_details: {
      page_number: "123",
      electronic_control: "15",
      defense_s: "3",
      defense_p: "2",
      defense_i: "1"
    }
  });

  const aliases = new Map([
    ["weapons", "weapon"], ["武器", "weapon"], ["armours", "armor"], ["防具", "armor"],
    ["cyberwares", "cyberware"], ["サイバーウェア", "cyberware"], ["trons", "tron"], ["トロン", "tron"],
    ["vehicles", "vehicle"], ["ヴィークル", "vehicle"], ["residences", "residence"],
    ["住居", "residence"], ["住宅", "residence"], ["outfits", "other"], ["装備", "other"], ["unknown", "other"]
  ]);
  for (const [target, category] of aliases) assert.equal(buildOutfitTsvRow({ target }).category, category);
});

test("expanded OFC importer stores canonical SPI in state before async detail controls exist", async () => {
  const source = await readFile(new URL("../js/tsv-import-guide.js", import.meta.url), "utf8");
  assert.match(source, /function resolveOFCDefense/);
  assert.match(source, /split\(\/\[\\\/／\]\//);
  assert.match(source, /TNXOutfitOFCState\?\.setDetails\?\.\(key, detailValues\)/);
  assert.match(source, /defense_s:/);
  assert.match(source, /defense_p:/);
  assert.match(source, /defense_i:/);
});

test("classic editor delegates TSV parsing and row mapping to a DOM-free module", async () => {
  const sheetSource = await readFile(new URL("../js/sheet.js", import.meta.url), "utf8");
  const importSource = await readFile(new URL("../js/sheet-tsv-import.js", import.meta.url), "utf8");

  assert.match(sheetSource, /sheet-tsv-import\.js\?v=1/);
  assert.match(sheetSource, /parseSheetTsv\(\$\("#tsv-text"\)\.value\)/);
  assert.doesNotMatch(sheetSource, /function parseTSV\(/);
  assert.doesNotMatch(importSource, /document\.|window\.|supabase|localStorage|sessionStorage/);
});
