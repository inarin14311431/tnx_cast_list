import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createBlankSkill } from "../js/sheet-row-factory.js";
import {
  reconcileGeneralMasterRows,
  appendGeneralBlankSlots,
  orderGeneralRows
} from "../js/sheet-general-skill-state.js";

const SUITS = ["reason", "passion", "life", "mundane"];
const MASTER = [
  ["医療", "reason", "general"],
  ["射撃", "reason", "general"],
  ["製作：", "reason", "proper"]
];

function factory() {
  let sequence = 0;
  return (category, { sortOrder = 0 } = {}) => createBlankSkill(category, {
    key: `test-${++sequence}`,
    sortOrder
  });
}

test("general master reconciliation creates missing rows and preserves unrelated rows", () => {
  const make = factory();
  const social = { ...make("social"), name: "社会：N◎VA" };
  const custom = { ...make("general"), name: "芸術：料理", level: 2 };

  const result = reconcileGeneralMasterRows([social, custom], {
    masterRows: MASTER,
    suits: SUITS,
    createBlankSkill: make
  });

  assert.equal(result.filter(row => row.category === "general" && row._fixedMaster).length, MASTER.length);
  assert.ok(result.includes(social));
  assert.ok(result.includes(custom));
  assert.deepEqual(
    result.filter(row => row._fixedMaster).map(row => [row.name, row.level, row.skill_kind]),
    [["医療", 0, "general"], ["射撃", 0, "general"], ["製作：", 0, "proper"]]
  );
});

test("duplicate master rows merge suits, levels and free levels into the strongest row", () => {
  const make = factory();
  const weaker = {
    ...make("general"), name: "医療", level: 1, free_level: 1,
    reason: true, passion: false, life: false, mundane: false
  };
  const stronger = {
    ...make("general"), name: "医療", level: 2, free_level: 5,
    reason: false, passion: true, life: false, mundane: false
  };

  const result = reconcileGeneralMasterRows([weaker, stronger], {
    masterRows: [["医療", "reason", "general"]],
    suits: SUITS,
    createBlankSkill: make
  });

  const medical = result.filter(row => row.category === "general" && row.name === "医療");
  assert.equal(medical.length, 1);
  assert.equal(medical[0], stronger);
  assert.equal(medical[0].reason, true);
  assert.equal(medical[0].passion, true);
  assert.equal(medical[0].level, 2);
  assert.equal(medical[0].free_level, 2);
  assert.equal(medical[0]._fixedMaster, true);
});

test("master level is raised to selected suit count and free level is clamped", () => {
  const make = factory();
  const medical = {
    ...make("general"), name: "医療", level: 1, free_level: 8,
    reason: true, passion: true, life: true, mundane: false
  };

  const [result] = reconcileGeneralMasterRows([medical], {
    masterRows: [["医療", "reason", "general"]],
    suits: SUITS,
    createBlankSkill: make
  });

  assert.equal(result.level, 3);
  assert.equal(result.free_level, 3);
});

test("initial blank slots keep column metadata, zero level and sequential sort order", () => {
  const make = factory();
  const seed = [{ ...make("social", { sortOrder: 0 }), name: "社会：N◎VA" }];
  const result = appendGeneralBlankSlots(seed, {
    columns: ["left", "left", "right", "right"],
    createBlankSkill: make
  });
  const slots = result.slice(1);

  assert.deepEqual(slots.map(row => row._slotColumn), ["left", "left", "right", "right"]);
  assert.deepEqual(slots.map(row => row.sort_order), [1, 2, 3, 4]);
  for (const row of slots) {
    assert.equal(row.category, "general");
    assert.equal(row.name, "");
    assert.equal(row.level, 0);
    assert.equal(row.free_level, 0);
    assert.equal(row.skill_kind, "proper");
    assert.equal(row._blankSlot, true);
  }
});

test("general ordering follows master order and keeps custom rows stable at the end", () => {
  const rows = [
    { category: "general", name: "芸術：料理" },
    { category: "social", name: "社会：N◎VA" },
    { category: "general", name: "射撃" },
    { category: "general", name: "コネではない独自技能" },
    { category: "general", name: "医療" }
  ];

  const result = orderGeneralRows(rows, MASTER);
  assert.deepEqual(result.map(row => row.name), ["医療", "射撃", "芸術：料理", "コネではない独自技能"]);
});

test("general skill state helper stays DOM-free and sheet delegates state rules to it", async () => {
  const helperSource = await readFile(new URL("../js/sheet-general-skill-state.js", import.meta.url), "utf8");
  const sheetSource = await readFile(new URL("../js/sheet.js", import.meta.url), "utf8");

  assert.doesNotMatch(helperSource, /document\.|window\.|supabase|localStorage|sessionStorage/);
  assert.match(sheetSource, /sheet-general-skill-state\.js\?v=1/);
  assert.match(sheetSource, /reconcileGeneralMasterRows\(skills/);
  assert.match(sheetSource, /appendGeneralBlankSlots\(skills/);
  assert.match(sheetSource, /orderGeneralRows\(skills, GENERAL_MASTER\)/);
});
