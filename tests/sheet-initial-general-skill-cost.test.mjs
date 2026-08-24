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
  paidSocialConnectionInitialCost
} from "../js/sheet-experience-rules.js";

test("initial skill package is 13 fixed General levels plus shared 7 Social Connection levels", () => {
  assert.equal(INITIAL_GENERAL_SKILL_COUNT, 13);
  assert.equal(INITIAL_GENERAL_SKILL_COST, 13 * 10);
  assert.equal(INITIAL_SOCIAL_CONNECTION_SKILL_LEVELS, 7);
  assert.equal(INITIAL_SOCIAL_CONNECTION_SKILL_COST, 7 * 5);
  assert.equal(INITIAL_SKILL_COST, 165);
  assert.equal(INITIAL_GENERAL_SKILL_COST + INITIAL_SOCIAL_CONNECTION_SKILL_COST, INITIAL_SKILL_COST);
  assert.equal(CREATION_ALLOWANCE, 170);
});

test("fixed General allowance cannot be transferred to added skills", () => {
  assert.equal(paidFixedInitialGeneralLevel(1), 0);
  assert.equal(paidFixedInitialGeneralLevel(2), 1);
  assert.equal(paidFixedInitialGeneralLevel(0), 0);
});

test("Social and Connection can redistribute their shared seven-level allowance", () => {
  assert.equal(paidSocialConnectionInitialCost({ social: 25, connection: 10 }), 0);
  assert.equal(paidSocialConnectionInitialCost({ social: 20, connection: 15 }), 0);
  assert.equal(paidSocialConnectionInitialCost({ social: 10, connection: 25 }), 0);
  assert.equal(paidSocialConnectionInitialCost({ social: 30, connection: 10 }), 5);
  assert.equal(INITIAL_SKILL_COST + CREATION_ALLOWANCE, 335);
});

test("desktop and mobile calculators use fixed-General and shared Social Connection rules", async () => {
  const desktop = await readFile(new URL("../js/experience.js", import.meta.url), "utf8");
  const mobile = await readFile(new URL("../js/sheet-mobile-header-exp.js", import.meta.url), "utf8");
  assert.match(desktop, /isInitialGeneralSkill/);
  assert.match(desktop, /paidFixedInitialGeneralLevel/);
  assert.match(desktop, /paidSocialConnectionInitialCost/);
  assert.match(mobile, /isInitialGeneralSkill/);
  assert.match(mobile, /paidFixedInitialGeneralLevel/);
  assert.match(mobile, /paidSocialConnectionInitialCost/);
  assert.match(desktop, /sheet-experience-rules\.js\?v=6/);
  assert.match(mobile, /sheet-experience-rules\.js\?v=6/);
});
