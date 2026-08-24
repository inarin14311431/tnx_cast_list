import test from "node:test";
import assert from "node:assert/strict";
import { paidFixedInitialGeneralLevel, paidSocialConnectionInitialCost, CREATION_ALLOWANCE } from "../js/sheet-experience-rules.js";

test("TNX-000029 remains 15 XP under the exact initial acquisition rules", () => {
  const fixedGeneralGrowth = paidFixedInitialGeneralLevel(2) * 10;
  const addedProperGeneral = (3 + 1 + 3) * 5;
  // Social 5 + Connection 3 = 8 total levels, so one level exceeds the shared 7-level initial pool.
  const socialConnection = paidSocialConnectionInitialCost({ social: 5 * 5, connection: 3 * 5 });
  const styleSkills = 100;
  const outfits = 35;
  const abilityAndControl = 0;
  const total = fixedGeneralGrowth + addedProperGeneral + socialConnection + styleSkills + outfits + abilityAndControl - CREATION_ALLOWANCE;

  assert.equal(fixedGeneralGrowth, 10);
  assert.equal(addedProperGeneral, 35);
  assert.equal(socialConnection, 5);
  assert.equal(total, 15);
});
