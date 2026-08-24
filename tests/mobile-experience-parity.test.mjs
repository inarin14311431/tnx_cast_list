import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const mobileExp=await readFile(new URL("../js/sheet-mobile-header-exp.js",import.meta.url),"utf8");
const desktopExp=await readFile(new URL("../js/experience.js",import.meta.url),"utf8");
const normalizer=await readFile(new URL("../js/sheet-mobile-skill-kind-normalizer.js",import.meta.url),"utf8");
const app=await readFile(new URL("../js/sheet-mobile-app.js",import.meta.url),"utf8");

test("mobile style skill experience reads the actual rendered kind label",()=>{
  assert.match(mobileExp,/mobile-style-skill-card__secondary span/);
  assert.doesNotMatch(mobileExp,/mobile-edit-card__meta span/);
  assert.match(mobileExp,/秘技:"secret"/);
  assert.match(mobileExp,/奥義:"ultimate"/);
});

test("mobile general skills are normalized to the PC skill-kind rule",()=>{
  assert.match(normalizer,/PROPER_GENERAL_PREFIXES=\["製作：","芸術：","操縦："\]/);
  assert.match(normalizer,/return PROPER_GENERAL_PREFIXES\.some\(prefix=>text\.startsWith\(prefix\)\)\?"proper":"general"/);
  assert.match(normalizer,/tnx:mobile-skills-saved/);
  assert.match(normalizer,/tnx:mobile-skill-kind-normalized/);
});

test("mobile experience gives one free level to each fixed General and a shared seven-level Social Connection pool",()=>{
  assert.match(mobileExp,/isInitialGeneralSkill/);
  assert.match(mobileExp,/paidFixedInitialGeneralLevel/);
  assert.match(mobileExp,/paidSocialConnectionInitialCost\(\{social,connection\}\)/);
  assert.match(mobileExp,/sheet-experience-rules\.js\?v=6/);
});

test("mobile clean display follows persisted cast EXP and saves recalculated EXP",()=>{
  assert.match(mobileExp,/character\.experience_points/);
  assert.match(mobileExp,/calculateLocalTotal\(\)/);
  assert.match(mobileExp,/tnx:mobile-before-save/);
  assert.match(mobileExp,/update\(\{experience_points:total\}\)/);
  assert.match(mobileExp,/levelFromText/);
});

test("desktop and mobile display linked troop EXP separately from cast EXP",()=>{
  assert.match(desktopExp,/from\("troops"\).*select\("experience_spent"\)/s);
  assert.match(desktopExp,/displayTotal\(total\)/);
  assert.match(mobileExp,/from\("troops"\).*select\("experience_spent"\)/s);
  assert.match(mobileExp,/displayTotal\(total\)/);
  assert.match(mobileExp,/`\$\{total\}＋\$\{troopExperience\}`/);
});

test("mobile app loads skill-kind normalization before experience calculation",()=>{
  const normalizeIndex=app.indexOf("sheet-mobile-skill-kind-normalizer.js");
  const expIndex=app.indexOf("sheet-mobile-header-exp.js");
  assert.ok(normalizeIndex>=0&&normalizeIndex<expIndex);
  assert.match(app,/sheet-mobile-header-exp\.js\?v=20260824-1/);
});
