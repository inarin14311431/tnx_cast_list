import test from "node:test";
import assert from "node:assert/strict";
import { packTroopComboRule, TROOP_COMBO_RULE_PREFIX, unpackTroopComboRule } from "../js/troop-combo-codec.js";

test("troop combo rule codec round-trips expected value and confrontation", () => {
  const packed = packTroopComboRule({ expected_value:"18", confrontation:"〈回避〉" });
  assert.ok(packed.startsWith(TROOP_COMBO_RULE_PREFIX));
  assert.deepEqual(unpackTroopComboRule(packed), {
    expected_value:"18",
    confrontation:"〈回避〉"
  });
});

test("troop combo rule codec accepts numeric legacy values", () => {
  assert.deepEqual(unpackTroopComboRule("15"), {
    expected_value:"15",
    confrontation:""
  });
  assert.deepEqual(unpackTroopComboRule("legacy text"), {
    expected_value:"",
    confrontation:""
  });
});

test("troop combo rule codec migrates old difficulty payloads and rejects malformed data", () => {
  assert.deepEqual(unpackTroopComboRule(`${TROOP_COMBO_RULE_PREFIX}{"difficulty":"21","confrontation":"自我"}`), {
    expected_value:"21",
    confrontation:"自我"
  });
  assert.deepEqual(unpackTroopComboRule(`${TROOP_COMBO_RULE_PREFIX}{broken`), {
    expected_value:"",
    confrontation:""
  });
});
