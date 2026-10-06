import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  affiliationForCast,
  buildVisualCaption,
  buildVisualCode,
  buildVisualMeta,
  findAssignedStyle,
  roleForCast
} from "../js/act-showcase-visual-caption.js";

const styles = [{ label: "アヤカシ" }, { label: "カゲ" }];
const meta = [{ label: "年齢", value: "20" }, { label: "所属", value: "九龍" }];

test("assigned style + affiliation", () => {
  const cast = { participationRole: "カゲ", styles, meta };
  assert.equal(buildVisualCaption(cast, "白鳥").meta, "ENTRY STYLE // カゲ  /  AFFILIATION // 九龍");
});

test("assigned style without affiliation", () => {
  const cast = { participationRole: "カゲ", styles, meta: [{ label: "所属", value: "—" }, { label: "年齢", value: "20" }] };
  assert.equal(buildVisualCaption(cast, "白鳥").meta, "ENTRY STYLE // カゲ  /  CAST VISUAL CHANNEL");
});

test("affiliation without an assigned style", () => {
  assert.equal(buildVisualCaption({ styles, meta }, "白鳥").meta, "AFFILIATION // 九龍  /  CAST VISUAL CHANNEL");
  // a role that matches no displayed style is not an assigned style
  assert.equal(buildVisualCaption({ participationRole: "存在しない", styles, meta }, "白鳥").meta, "AFFILIATION // 九龍  /  CAST VISUAL CHANNEL");
});

test("neither assigned style nor affiliation", () => {
  assert.equal(buildVisualCaption({ styles, meta: [] }, "白鳥").meta, "CAST VISUAL // PUBLIC ARCHIVE  /  SIGNAL:OPEN");
  assert.equal(buildVisualMeta(), "CAST VISUAL // PUBLIC ARCHIVE  /  SIGNAL:OPEN");
});

test("role resolution matches the supporting-cast rules", () => {
  assert.equal(roleForCast({ participationRole: " カゲ " }), "カゲ");
  assert.equal(roleForCast({ participation_role: "カゲ" }), "カゲ");
  assert.equal(roleForCast({ styles: [{ label: "アヤカシ" }, { label: "カゲ", handoutRole: true }] }), "カゲ");
  assert.equal(roleForCast({ styles: [{ label: "カゲ", handout_role: true }] }), "カゲ");
  assert.equal(roleForCast({ styles }), "");
  // symbols and spacing are ignored, and only the first match is the assigned style
  assert.equal(findAssignedStyle(["ア ヤカシ◎", "カゲ", "カゲ"], "アヤカシ"), "ア ヤカシ◎");
  assert.equal(findAssignedStyle(["カゲ", "カゲ"], "カゲ"), "カゲ");
  assert.equal(findAssignedStyle(["カゲ"], ""), "");
});

test("affiliation is read from the first six displayed profile rows only", () => {
  const filler = Array.from({ length: 6 }, (_, index) => ({ label: `項目${index}`, value: "x" }));
  assert.equal(affiliationForCast({ meta: [...filler, { label: "所属", value: "九龍" }] }), "");
  assert.equal(affiliationForCast({ meta: [{ label: "Affiliation", value: "九龍" }] }), "九龍");
  assert.equal(affiliationForCast({ meta: [{ label: "所属", value: "" }, { label: "所属", value: "二番目" }] }), "二番目");
});

test("identity code keeps the existing FNV-1a hash of the public name", () => {
  const reference = value => {
    let hash = 2166136261;
    for (const character of String(value || "PUBLIC CAST")) {
      hash ^= character.codePointAt(0) || 0;
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    const hex = hash.toString(16).toUpperCase().padStart(8, "0");
    return `VISUAL TRACE // NX-${hex.slice(0, 4)}-${hex.slice(4)} // NODE:PUBLIC`;
  };
  for (const name of ["白鳥 澪", "“ハル” 白鳥 澪", "CAST", ""]) assert.equal(buildVisualCode(name), reference(name));
  assert.match(buildVisualCode("白鳥"), /^VISUAL TRACE \/\/ NX-[0-9A-F]{4}-[0-9A-F]{4} \/\/ NODE:PUBLIC$/);
  assert.equal(buildVisualCode("白鳥"), buildVisualCode("白鳥"));
});

test("page and supporting-cast share the same role/style rules", async () => {
  const [page, supporting] = await Promise.all([
    readFile(new URL("../js/act-showcase-page.js", import.meta.url), "utf8"),
    readFile(new URL("../js/act-showcase-supporting-cast.js", import.meta.url), "utf8")
  ]);
  assert.match(supporting, /import \{ normalizeStyleKey, roleForCast \} from "\.\/act-showcase-visual-caption\.js/);
  assert.doesNotMatch(supporting, /function roleForCast|function normalizeStyle\(/);
  assert.match(page, /import \{ buildVisualCaption \} from "\.\/act-showcase-visual-caption\.js/);
});
