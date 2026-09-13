import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ticket = await readFile(new URL("../js/experience-ticket.js", import.meta.url), "utf8");
const acts = await readFile(new URL("../js/acts-app.js", import.meta.url), "utf8");
const css = await readFile(new URL("../css-next/pages/experience-ticket.css", import.meta.url), "utf8");
const entry = await readFile(new URL("../css-next/pages/acts-entry.css", import.meta.url), "utf8");
const html = await readFile(new URL("../acts.html", import.meta.url), "utf8");

test("experience ticket reads the cast name from the current act-history record contract", () => {
  assert.match(acts, /data-history-cast=/);
  assert.match(ticket, /record\.dataset\.historyCast/);
  assert.match(ticket, /\.act-record-summary__cast/);
  assert.match(ticket, /\.act-character-toggle__name/);
});

test("experience point value is slightly smaller and has enough line height to avoid top clipping", () => {
  assert.match(css, /\.experience-ticket__value-row > strong \{[^}]*font-size:\s*clamp\(3\.3rem,\s*9\.5vw,\s*6\.35rem\);[^}]*line-height:\s*\.84;/s);
  assert.match(css, /@media \(max-width:\s*640px\)[\s\S]*\.experience-ticket__value-row > strong \{\s*font-size:\s*clamp\(2\.5rem,\s*14vw,\s*3\.8rem\);/);
});

test("experience ticket cache versions are refreshed through the canonical acts entry", () => {
  assert.match(entry, /experience-ticket\.css\?v=5/);
  assert.match(html, /acts-entry\.css\?v=18/);
  assert.match(html, /experience-ticket\.js\?v=7/);
});
