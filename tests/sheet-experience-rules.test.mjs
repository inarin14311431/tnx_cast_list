import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  CREATION_ALLOWANCE,
  INITIAL_GENERAL_SKILL_COUNT,
  INITIAL_GENERAL_SKILL_COST,
  INITIAL_SOCIAL_CONNECTION_SKILL_LEVELS,
  INITIAL_SOCIAL_CONNECTION_SKILL_COST,
  INITIAL_SKILL_COST,
  paidFixedInitialGeneralLevel,
  paidSocialConnectionInitialCost,
  paidSkillLevel,
  resolveCanonicalCurrent,
  steppedExperienceCost
} from "../js/sheet-experience-rules.js";

test("paid skill level excludes imported free levels without going negative", () => {
  assert.equal(paidSkillLevel(1, 1), 0);
  assert.equal(paidSkillLevel(3, 1), 2);
  assert.equal(paidSkillLevel(2, 9), 0);
  assert.equal(paidSkillLevel(2, -1), 2);
});

test("construction constants model 13 fixed General plus shared 7 Social Connection levels", () => {
  assert.equal(INITIAL_GENERAL_SKILL_COUNT, 13);
  assert.equal(INITIAL_GENERAL_SKILL_COST, 130);
  assert.equal(INITIAL_SOCIAL_CONNECTION_SKILL_LEVELS, 7);
  assert.equal(INITIAL_SOCIAL_CONNECTION_SKILL_COST, 35);
  assert.equal(INITIAL_SKILL_COST, 165);
  assert.equal(CREATION_ALLOWANCE, 170);
});

test("each fixed initial General skill gets exactly its first level free", () => {
  assert.equal(paidFixedInitialGeneralLevel(1), 0);
  assert.equal(paidFixedInitialGeneralLevel(2), 1);
  assert.equal(paidFixedInitialGeneralLevel(3), 2);
});

test("Social and Connection share one flexible seven-level pool", () => {
  assert.equal(paidSocialConnectionInitialCost({ social: 25, connection: 10 }), 0);
  assert.equal(paidSocialConnectionInitialCost({ social: 20, connection: 15 }), 0);
  assert.equal(paidSocialConnectionInitialCost({ social: 10, connection: 25 }), 0);
  assert.equal(paidSocialConnectionInitialCost({ social: 30, connection: 10 }), 5);
  assert.equal(paidSocialConnectionInitialCost({ social: 20, connection: 20 }), 5);
});

test("canonical current value wins over stale growth and falls back when absent", () => {
  assert.equal(resolveCanonicalCurrent({ baseline: 6, current: 8, growth: 0 }), 8);
  assert.equal(resolveCanonicalCurrent({ baseline: 6, current: "", growth: 2 }), 8);
  assert.equal(resolveCanonicalCurrent({ baseline: 6, current: null, growth: 3 }), 9);
});

test("stepped experience cost follows ability and control thresholds", () => {
  assert.equal(steppedExperienceCost(6, 8, 10), 40);
  assert.equal(steppedExperienceCost(9, 11, 10), 60);
  assert.equal(steppedExperienceCost(15, 17, 16), 60);
  assert.equal(steppedExperienceCost(8, 7, 10), 0);
});

test("desktop and mobile calculators share exact initial experience rules", async () => {
  const desktop = await readFile(new URL("../js/experience.js", import.meta.url), "utf8");
  const mobile = await readFile(new URL("../js/sheet-mobile-header-exp.js", import.meta.url), "utf8");
  assert.match(desktop, /general-skill-catalog\.js/);
  assert.match(desktop, /sheet-experience-rules\.js\?v=6/);
  assert.match(desktop, /paidFixedInitialGeneralLevel/);
  assert.match(desktop, /paidSocialConnectionInitialCost\(\{social,connection\}\)/);
  assert.match(mobile, /general-skill-catalog\.js/);
  assert.match(mobile, /sheet-experience-rules\.js\?v=6/);
  assert.match(mobile, /paidFixedInitialGeneralLevel/);
  assert.match(mobile, /paidSocialConnectionInitialCost\(\{social,connection\}\)/);
  assert.match(mobile, /current:character\[`\$\{key\}_base`\]/);
  assert.match(mobile, /current:character\[`\$\{key\}_control_base`\]/);
  assert.match(mobile, /select\("id,skill_kind,free_level"\)/);
});
