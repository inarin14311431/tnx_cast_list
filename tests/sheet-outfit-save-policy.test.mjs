import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createBlankOutfit } from "../js/sheet-row-factory.js";

const sheetSource = await readFile(new URL("../js/sheet.js", import.meta.url), "utf8");
const rendererSource = await readFile(new URL("../js/sheet-outfit-renderer.js", import.meta.url), "utf8");
const payloadSource = await readFile(new URL("../js/sheet-save-payload.js", import.meta.url), "utf8");

function functionBlock(source, name, nextName) {
  assert.ok(nextName, `${name} block needs an explicit next function boundary`);
  const match = source.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n}\\n\\n(?:export )?(?:async )?function ${nextName}`));
  assert.ok(match, `${name} block should exist`);
  return match[0];
}

function trailingFunctionBlock(source, name) {
  const match = source.match(new RegExp(`function ${name}\\([\\s\\S]*$`));
  assert.ok(match, `${name} block should exist`);
  return match[0];
}

test("new outfit state keeps canonical modifiers but does not seed retired compatibility fields", () => {
  const outfit = createBlankOutfit({ key: "policy-test", sortOrder: 0 });
  assert.equal("control_modifier" in outfit, true);
  assert.equal("cs_modifier" in outfit, true);
  assert.equal("defense" in outfit, false);
  assert.equal("control_value" in outfit, false);
  assert.equal("cs_value" in outfit, false);
  assert.equal("mundane_modifier" in outfit, false);
});

test("complete renderer emits no hidden legacy outfit transport fields", () => {
  assert.doesNotMatch(sheetSource, /function compatibilityOutfitFields/);
  const block = trailingFunctionBlock(rendererSource, "renderOutfitFields");
  assert.doesNotMatch(block, /type="hidden" data-o="defense"/);
  assert.doesNotMatch(block, /type="hidden" data-o="control_modifier"/);
  assert.doesNotMatch(block, /type="hidden" data-o="cs_modifier"/);
  assert.doesNotMatch(block, /data-o="mundane_modifier"/);
});

test("renderer exposes canonical category-owned control and CS fields", () => {
  const block = trailingFunctionBlock(rendererSource, "renderOutfitFields");
  assert.match(block, /armor:\s*\[[\s\S]*field\(outfit, "control_modifier", "制御値"/);
  assert.match(block, /tron:\s*\[[\s\S]*field\(outfit, "cs_modifier", "CS修正"/);
  assert.match(block, /vehicle:\s*\[[\s\S]*field\(outfit, "control_modifier", "制御値"[\s\S]*field\(outfit, "cs_modifier", "CS修正"/);
  assert.doesNotMatch(block, /data-o="defense"|mundane_modifier/);
});

test("classic sheet delegates outfit serialization to the payload contract", () => {
  const collect = functionBlock(sheetSource, "collectOutfits", "openImport");
  assert.match(collect, /buildOutfitSavePayloads\(outfits\)/);
  assert.doesNotMatch(collect, /payload\.defense|mundane_modifier/);

  const builder = payloadSource.match(/export function buildOutfitSavePayloads\([\s\S]*$/)?.[0] || "";
  assert.ok(builder, "buildOutfitSavePayloads block should exist");
  assert.match(builder, /category === "armor"\) payload\.control_modifier/);
  assert.match(builder, /category === "tron"\) payload\.cs_modifier/);
  assert.match(builder, /category === "vehicle"[\s\S]*payload\.control_modifier[\s\S]*payload\.cs_modifier/);
  assert.doesNotMatch(builder, /payload\.defense|mundane_modifier/);
});

test("classic OFC TSV fallback no longer seeds combined defense", () => {
  assert.doesNotMatch(sheetSource, /defense:\s*row\.defense/);
});

test("character control payload remains semantically unchanged by save refactor", () => {
  assert.match(payloadSource, /payload\[`\$\{key\}_control_manual`\] = 0/);
  assert.match(payloadSource, /payload\[`\$\{key\}_control`\] = controlFinal/);
  assert.doesNotMatch(payloadSource, /payload\[`\$\{controlKey\}_manual`\]/);
});
