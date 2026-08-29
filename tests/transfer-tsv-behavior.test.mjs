import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/transfer-tsv-export.js", import.meta.url), "utf8");
const start = source.indexOf("function normalizeOutfit");
const end = source.indexOf("async function writeClipboard");
assert.ok(start >= 0 && end > start, "transfer formatter core must remain executable independently of browser I/O");

const sandbox = {
  location: { href: "https://example.test/cast.html?id=TNX-0001#section" }
};
vm.runInNewContext(`
  const FORMAT = "TNX_CAST_TRANSFER_TSV";
  const VERSION = "1";
  const STYLE_DETAIL_PREFIX = "@@TNX_STYLE_DETAIL_V1@@";
  const GENERAL_ORDER = ["医療","射撃","知覚","電脳","製作：","心理","自我","交渉","芸術：","運動","回避","白兵","操縦：","信用","圧力","隠密"];
  ${source.slice(start, end)}
  globalThis.transferCore = { createTransferTsv, outfitTransferFields, parseDefense, escapeCell };
`, sandbox);

const { createTransferTsv, outfitTransferFields, parseDefense, escapeCell } = sandbox.transferCore;

function baseCharacter(overrides = {}) {
  return {
    character_name: "テストキャスト",
    style_1: "カブキ", style_1_mark: "◎", style_1_attribute: "", divine_1: "チャイ",
    style_2: "カタナ", style_2_mark: "●", style_2_attribute: "", divine_2: "死の舞踏",
    style_3: "ニューロ", style_3_mark: "", style_3_attribute: "", divine_3: "電脳神",
    reason_value: 7, reason_control: 12,
    passion_value: 8, passion_control: 11,
    life_value: 6, life_control: 13,
    mundane_value: 5, mundane_control: 10,
    cs: 9,
    ...overrides
  };
}

function parseTsv(tsv) {
  return tsv.split("\n").slice(1).map(line => {
    const [, , section, index, field, value] = line.split("\t");
    return { section, index, field, value };
  });
}

function fieldValue(rows, section, index, field) {
  return rows.find(row => row.section === section && row.index === String(index) && row.field === field)?.value;
}

test("transfer TSV escapes cells and strips URL fragments", () => {
  assert.equal(escapeCell("A\\B\tC\nD"), "A\\\\B\\tC\\nD");
  const rows = parseTsv(createTransferTsv({
    character: baseCharacter({ profile: "1行目\t値\n2行目\\末尾" }),
    skills: [], outfits: []
  }));
  assert.equal(fieldValue(rows, "base", 0, "profile"), "1行目\\t値\\n2行目\\\\末尾");
  assert.equal(fieldValue(rows, "base", 0, "source_url"), "https://example.test/cast.html?id=TNX-0001");
});

test("transfer TSV keeps canonical general-skill ordering and style kind normalization", () => {
  const rows = parseTsv(createTransferTsv({
    character: baseCharacter(),
    skills: [
      { category: "general", name: "白兵", level: 2, reason: false, passion: true, life: false, mundane: false, sort_order: 0 },
      { category: "general", name: "医療", level: 1, reason: true, passion: false, life: false, mundane: false, sort_order: 10 },
      { category: "style", name: "演出専用", skill_kind: "none", level: 1, reason: true, passion: false, life: false, mundane: false, _styleDetail: { timing: "常時", description: "説明" } }
    ],
    outfits: []
  }));
  assert.equal(fieldValue(rows, "general", 0, "name"), "医療");
  assert.equal(fieldValue(rows, "general", 1, "name"), "白兵");
  assert.equal(fieldValue(rows, "style_skill", 0, "kind"), "なし");
  assert.equal(fieldValue(rows, "style_skill", 0, "timing"), "常時");
});

test("armor transfer prioritizes OFC control and SPI fields", () => {
  const fields = outfitTransferFields({
    category: "armor",
    name: "テスト防具",
    defense: "S 1 / P 2 / I 3",
    control_modifier: "-9",
    description: "防御S：4\n防御P：5\n防御I：6",
    ofc_details: { control_value: "-2", defense_s: "10", defense_p: "20", defense_i: "30" }
  });
  assert.equal(fields.control, "-2");
  assert.equal(fields.protecS, "10");
  assert.equal(fields.protecP, "20");
  assert.equal(fields.protecI, "30");
});

test("weapon transfer uses OFC parry as the transfer defense field", () => {
  const fields = outfitTransferFields({
    category: "weapon",
    name: "テスト武器",
    defense: "99",
    ofc_details: { parry: "5" }
  });
  assert.equal(fields.defense, "5");
});

test("legacy defense text still parses both labeled and positional forms", () => {
  assert.deepEqual({ ...parseDefense("S:11 P:12 I:13") }, { s: "11", p: "12", i: "13" });
  assert.deepEqual({ ...parseDefense("21/23/22") }, { s: "21", p: "22", i: "23" });
});

test("transfer TSV refuses bundles without a cast name", () => {
  assert.throws(
    () => createTransferTsv({ character: baseCharacter({ character_name: "   " }), skills: [], outfits: [] }),
    /キャスト名が入力されていません/
  );
});
