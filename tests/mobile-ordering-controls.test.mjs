import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("mobile style skills expose ordering controls for normal skills and separators", async () => {
  const source = await read("../js/sheet-mobile-skills.js");
  assert.match(source, /data-style-order-id=/);
  assert.match(source, /data-move-style="up"/);
  assert.match(source, /data-move-style="down"/);
  assert.match(source, /function moveStyleItem\(id, direction\)/);
  assert.match(source, /moveAdjacentRow\(list, String\(id\), direction/);
  assert.match(source, /item\.sort_order = i \* 10/);
  assert.match(source, /dirtyIds\.add\(String\(item\.id\)\)/);
});

test("mobile outfits reorder one flat list regardless of category", async () => {
  const source = await read("../js/sheet-mobile-outfit.js");
  assert.match(source, /function moveOutfit\(id, direction\)/);
  assert.match(source, /data-move-outfit="up"/);
  assert.match(source, /data-move-outfit="down"/);
  assert.match(source, /moveAdjacentRow\(sortedVisibleOutfits\(\), String\(id\), direction/);
  assert.match(source, /item\.sort_order = i \* 10/);
  assert.match(source, /dirtyIds\.add\(String\(item\.id\)\)/);
  assert.doesNotMatch(source, /groupByCategory|categoryGroups|groupedOutfits/);
});

test("mobile skill and outfit ordering share the classic row movement primitive", async () => {
  const skills = await read("../js/sheet-mobile-skills.js");
  const outfits = await read("../js/sheet-mobile-outfit.js");
  assert.match(skills, /import \{ moveAdjacentRow \} from "\.\/sheet-row-collection-state\.js\?v=2"/);
  assert.match(outfits, /import \{ moveAdjacentRow \} from "\.\/sheet-row-collection-state\.js\?v=2"/);
  assert.doesNotMatch(skills, /\[list\[index\], list\[target\]\]/);
  assert.doesNotMatch(outfits, /\[list\[index\], list\[target\]\]/);
});

test("mobile ordering assets use direct cache versions without a runtime rewrite helper", async () => {
  const app = await read("../js/sheet-mobile-app.js");
  const html = await read("../sheet-mobile.html");
  assert.match(app, /sheet-mobile-skills\.js\?v=[0-9-]+/);
  assert.match(app, /sheet-mobile-outfit\.js\?v=[0-9-]+/);
  assert.doesNotMatch(app, /sheet-mobile-ordering-style-refresh/);
  assert.match(html, /sheet-mobile-skills\.css\?v=6/);
  assert.match(html, /sheet-mobile-outfit\.css\?v=9/);
});
