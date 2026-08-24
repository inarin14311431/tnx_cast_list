import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const compactSource = await readFile(new URL("../js/cast-quick-sheet-compact.js", import.meta.url), "utf8");
const paperSource = await readFile(new URL("../js/quick-sheet-paper-layout.js", import.meta.url), "utf8");

test("quick-sheet compaction owns page overflow and page-three attachment", () => {
  assert.match(compactSource, /function compactPages\(\)/);
  assert.match(compactSource, /pageOverflows\(pageTwo\)/);
  assert.match(compactSource, /ensureThirdPageConnected\(\)/);
  assert.match(compactSource, /detachThirdPageIfUnused\(pageThree\)/);
  assert.match(compactSource, /data-quick-sheet-section=\"other-outfits\"/);
});

test("paper layout owns paper counters and stable page-two section order", () => {
  assert.match(paperSource, /function convertCounters\(root\)/);
  assert.match(paperSource, /quick-sheet__paper-counter/);
  assert.match(paperSource, /function reorderPageTwo\(root\)/);
  assert.match(paperSource, /putBeforeFooter\(pageTwo, styleSkills, footer\)/);
  assert.match(paperSource, /putBeforeFooter\(pageTwo, weapons, footer\)/);
  assert.match(paperSource, /putBeforeFooter\(pageTwo, armor, footer\)/);
});

test("both quick-sheet layout layers preserve rerender and detail-toggle recovery", () => {
  assert.match(compactSource, /new MutationObserver\(scheduleCompact\)/);
  assert.match(compactSource, /#quick-sheet-detail-toggle/);
  assert.match(compactSource, /window\.addEventListener\('resize', scheduleCompact\)/);
  assert.match(paperSource, /new MutationObserver\(scheduleNormalize\)/);
  assert.match(paperSource, /#quick-sheet-detail-toggle/);
  assert.match(paperSource, /window\.addEventListener\("resize", scheduleNormalize\)/);
});
