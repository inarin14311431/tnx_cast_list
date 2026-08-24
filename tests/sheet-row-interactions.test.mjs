import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { initSheetRowInteractions } from "../js/sheet-row-interactions.js";

function createRoot() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener(type, handler) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(handler);
    },
    dispatch(type, target) {
      for (const handler of listeners.get(type) || []) handler({ target });
    }
  };
}

function createTarget({ type = "text", value = "", checked = false, matches = [], closest = {} } = {}) {
  return {
    type,
    value,
    checked,
    dataset: {},
    matches(selector) { return matches.includes(selector); },
    closest(selector) { return closest[selector] || null; }
  };
}

test("row interaction initializer is explicit and idempotent per root", () => {
  const root = createRoot();
  assert.equal(initSheetRowInteractions({ root }), true);
  assert.equal(initSheetRowInteractions({ root }), false);
  assert.equal(root.listeners.get("input").length, 1);
  assert.equal(root.listeners.get("click").length, 1);
});

test("skill and outfit inputs are translated into semantic callbacks", () => {
  const root = createRoot();
  const calls = [];
  initSheetRowInteractions({
    root,
    onSkillInput: payload => calls.push(["skill", payload]),
    onOutfitInput: payload => calls.push(["outfit", payload])
  });

  const row = { dataset: { skillKey: "skill-1" } };
  const skillInput = createTarget({
    type: "number",
    value: "3",
    matches: ["[data-f]"],
    closest: { "[data-skill-key]": row }
  });
  skillInput.dataset.f = "level";
  root.dispatch("input", skillInput);

  const card = { dataset: { outfitKey: "outfit-1" } };
  const outfitInput = createTarget({
    type: "text",
    value: "防具A",
    matches: ["[data-o]"],
    closest: { "[data-outfit-key]": card }
  });
  outfitInput.dataset.o = "name";
  root.dispatch("input", outfitInput);

  assert.equal(calls[0][0], "skill");
  assert.equal(calls[0][1].key, "skill-1");
  assert.equal(calls[0][1].field, "level");
  assert.equal(calls[0][1].value, 3);
  assert.equal(calls[1][0], "outfit");
  assert.equal(calls[1][1].key, "outfit-1");
  assert.equal(calls[1][1].field, "name");
  assert.equal(calls[1][1].value, "防具A");
});

test("row action clicks are translated without mutating editor state", () => {
  const root = createRoot();
  const calls = [];
  initSheetRowInteractions({
    root,
    onDeleteSkill: key => calls.push(["delete-skill", key]),
    onMoveSkill: (key, direction) => calls.push(["move-skill", key, direction]),
    onDeleteOutfit: key => calls.push(["delete-outfit", key])
  });

  const deleteSkill = { dataset: { deleteSkill: "skill-a" } };
  root.dispatch("click", createTarget({ closest: { "[data-delete-skill]": deleteSkill } }));

  const moveSkill = { dataset: { skillKey: "skill-b", skillMove: "up" } };
  root.dispatch("click", createTarget({ closest: { "[data-skill-move]": moveSkill } }));

  const deleteOutfit = { dataset: { deleteOutfit: "outfit-a" } };
  root.dispatch("click", createTarget({ closest: { "[data-delete-outfit]": deleteOutfit } }));

  assert.deepEqual(calls, [
    ["delete-skill", "skill-a"],
    ["move-skill", "skill-b", "up"],
    ["delete-outfit", "outfit-a"]
  ]);
});

test("classic sheet delegates row event binding while retaining state mutation", async () => {
  const [sheet, adapter] = await Promise.all([
    readFile(new URL("../js/sheet.js", import.meta.url), "utf8"),
    readFile(new URL("../js/sheet-row-interactions.js", import.meta.url), "utf8")
  ]);

  assert.match(sheet, /initSheetRowInteractions\s*\(/);
  assert.match(sheet, /function handleSkillRowInput\s*\(/);
  assert.match(sheet, /function handleOutfitRowInput\s*\(/);
  assert.doesNotMatch(sheet, /function bindSkillRows\s*\(/);
  assert.doesNotMatch(sheet, /\.oninput\s*=/);
  assert.doesNotMatch(adapter, /\bskills\b|\boutfits\b|recalc\s*\(|markDirty\s*\(/);
});
