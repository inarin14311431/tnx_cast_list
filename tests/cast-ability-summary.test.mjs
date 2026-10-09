import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { abilityLabel, abilityValues, createAbilitySummary } from "../js/ability-summary-view.js";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

class FakeElement {
  children = [];
  attributes = {};
  textContent = "";
  className = "";
  constructor(tag) { this.tag = tag; }
  append(...children) { this.children.push(...children); }
  setAttribute(name, value) { this.attributes[name] = value; }
}
const doc = { createElement: tag => new FakeElement(tag) };

test("ability list values come from the character; missing values are an em dash", () => {
  assert.deepEqual(abilityValues({ reason_value: 8, passion_value: 5, life_value: 2, mundane_value: 6 }), ["8", "5", "2", "6"]);
  assert.deepEqual(abilityValues({ reason_value: 0, passion_value: null, life_value: "", mundane_value: undefined }), ["0", "—", "—", "—"]);
  assert.deepEqual(abilityValues(null), ["—", "—", "—", "—"]);
  assert.equal(abilityLabel(["8", "5", "2", "6"]), "理性 8、感情 5、生命 2、外界 6");
});

test("the list uses the editor's markup: label, then four suit/value items (no control values)", () => {
  const summary = createAbilitySummary(doc, ["8", "5", "2", "6"]);
  assert.equal(summary.className, "sheet-ability-summary");
  assert.equal(summary.attributes["aria-label"], "理性 8、感情 5、生命 2、外界 6");
  const [label, ...items] = summary.children;
  assert.equal(label.textContent, "ABILITIES");
  assert.deepEqual(items.map(item => item.children[0].textContent), ["♠", "♣", "♥", "♦"]);
  assert.deepEqual(items.map(item => item.children[1].textContent), ["8", "5", "2", "6"]);
  for (const item of items) {
    assert.equal(item.className, "sheet-ability-summary__item");
    assert.equal(item.children[0].className, "sheet-ability-summary__suit");
    assert.equal(item.children[0].attributes["aria-hidden"], "true");
  }
});

test("the public cast view attaches the list to the general and style skill panel headings and shares the editor's CSS", () => {
  const script = read("js/cast-ability-summary.js");
  assert.match(script, /#skills-container"\)\?\.closest\("\.data-panel"\)/);
  assert.match(script, /#style-skill-panel/);
  assert.match(script, /:scope > \.data-panel__header/);
  assert.match(script, /tnx:style-skills-rendered/);
  assert.match(script, /summary\.hidden = required > heading\.clientWidth/);
  assert.doesNotMatch(script, /addEventListener\("(?:click|mouseover|mouseenter)"/);
  assert.match(read("cast.html"), /<script type="module" src="\.\/js\/cast-ability-summary\.js\?v=\d+"><\/script>/);
  assert.match(read("css-next/pages/cast-entry.css"), /@import url\("\.\.\/components\/sheet-ability-summary\.css\?v=1"\)/);
  assert.match(read("css-next/components/sheet-ability-summary.css"), /pointer-events: none/);
  assert.match(read("css-next/pages/cast-view-details.css"), /\.data-panel__header\.has-ability-summary\{[^}]*display:flex/);
});
