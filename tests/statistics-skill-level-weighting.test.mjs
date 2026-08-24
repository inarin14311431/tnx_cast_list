import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../js/statistics-general-level.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../statistics.html", import.meta.url), "utf8");

test("general skill statistics are weighted by skill level", () => {
  assert.match(source, /generalSkillLevels/);
  assert.match(source, /incrementBy\(generalSkillLevels, name, skillLevel\)/);
  assert.match(source, /SL合計/);
  assert.match(html, /技能レベル合計/);
});
