import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("mobile editor allows persisted social and connection skills and mutable general skills to be deleted", async () => {
  const skills = await read("js/sheet-mobile-skills.js");
  assert.match(skills, /function canDeleteGeneral\(item\)/);
  assert.match(skills, /isNew\(item\) \|\| item\.category !== "general" \|\| mutableGeneralName\(item\)/);
  assert.match(skills, /if \(!item \|\| !canDeleteGeneral\(item\)\) return;/);
  assert.match(skills, /#mobile-general-delete/);
  assert.match(skills, /deletedIds\.add\(String\(item\.id\)\)/);
});

test("mobile app refreshes the skills module cache key", async () => {
  const app = await read("js/sheet-mobile-app.js");
  assert.match(app, /sheet-mobile-skills\.js\?v=20260821-5/);
});
