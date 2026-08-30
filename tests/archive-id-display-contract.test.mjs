import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const cast = await readFile(new URL("../cast.html", import.meta.url), "utf8");
const listDisplay = await readFile(new URL("../js/archive-id-list-display.js", import.meta.url), "utf8");
const castDisplay = await readFile(new URL("../js/archive-id-cast-display.js", import.meta.url), "utf8");
const cyberScan = await readFile(new URL("../js/cast-cyberscan.js", import.meta.url), "utf8");

test("archive cards derive the visible code from the raw route ID rather than the masked label", () => {
  assert.match(listDisplay, /new URL\(link\.href, location\.href\)\.searchParams\.get\("id"\)/);
  assert.match(listDisplay, /serial\.textContent = formatter\(rawId\)/);
});

test("archive and cast pages load the shared display-code formatter before their adapters", () => {
  assert.match(index, /archive-id-code\.js\?v=1[\s\S]*archive-id-list-display\.js\?v=1/);
  assert.match(cast, /archive-id-code\.js\?v=1[\s\S]*archive-id-cast-display\.js\?v=1[\s\S]*cast-cyberscan\.js\?v=75/);
});

test("cast detail, mobile view and scan presentation hide the raw route ID", () => {
  assert.match(castDisplay, /const rawId = new URLSearchParams\(location\.search\)\.get\("id"\)/);
  assert.match(castDisplay, /#cast-public-id/);
  assert.match(castDisplay, /\.mobile-cast-topbar > span/);
  assert.match(cyberScan, /const displayId=window\.TNXArchiveId\?\.format\(publicId\)/);
  assert.match(cyberScan, /TARGET: \$\{escapeHtml\(displayId\)\}/);
});
