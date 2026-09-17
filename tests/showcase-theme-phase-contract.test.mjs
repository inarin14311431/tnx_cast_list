import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");
const [entry, phase, legibility, scene, emphasis] = await Promise.all([
  read("css-next/pages/act-showcase-entry.css"),
  read("css-next/pages/act-showcase-theme-phase-contract.css"),
  read("css-next/pages/act-showcase-theme-legibility.css"),
  read("css-next/pages/act-showcase-theme-scene-contract.css"),
  read("css-next/pages/act-showcase-visual-emphasis.css")
]);

test("phase contract is followed by legibility, scene completion, and final visual emphasis", () => {
  const phaseIndex = entry.indexOf("act-showcase-theme-phase-contract.css");
  const legibilityIndex = entry.indexOf("act-showcase-theme-legibility.css");
  const sceneIndex = entry.indexOf("act-showcase-theme-scene-contract.css");
  const emphasisIndex = entry.indexOf("act-showcase-visual-emphasis.css");
  assert.ok(phaseIndex >= 0 && legibilityIndex > phaseIndex && sceneIndex > legibilityIndex && emphasisIndex > sceneIndex);
  assert.match(entry.trim().split("\n").at(-1), /act-showcase-visual-emphasis\.css\?v=/);
  assert.doesNotMatch(`${phase}\n${legibility}\n${scene}\n${emphasis}`, /!important/);
});

test("legacy id-specific cinematic rules are deliberately matched by the phase contract", () => {
  assert.match(phase, /:root\[data-showcase-theme\] body#act-showcase-page \.cinematic-intro\.neotokyo-sequence/);
  assert.match(phase, /screen--title/);
  assert.match(phase, /neotokyo-sequence__ruler-credit/);
  assert.match(phase, /neotokyo-sequence__search--linked\.is-found/);
  assert.match(phase, /screen--finale[\s\S]*neotokyo-finale__cast-card/);
});

test("live trailer cannot escape its frame on desktop", () => {
  assert.match(phase, /stage\.is-trailer-scroll\{[\s\S]*overflow:hidden/);
  assert.match(phase, /screen--trailer\{[\s\S]*height:min\(92svh,760px\)[\s\S]*overflow:hidden/);
  assert.match(phase, /trailer-terminal\{[\s\S]*max-height:min\(58svh,560px\)[\s\S]*overflow:hidden/);
  assert.match(phase, /readout\.is-terminal-readout\{[\s\S]*max-height:min\(46svh,440px\)[\s\S]*overflow:auto/);
  assert.match(phase, /overscroll-behavior:contain/);
});

test("Dossier phase surfaces remove dark islands from title, matching, and assignment bay", () => {
  const dossier = phase.slice(phase.indexOf('data-showcase-theme="intron"'));
  assert.match(dossier, /screen--title/);
  assert.match(dossier, /search--linked\.is-found/);
  assert.match(dossier, /neotokyo-finale__cast-card/);
  assert.match(dossier, /background:rgba\(255,255,255,.96\)/);
  assert.match(dossier, /ruler-name[\s\S]*color:#171717/);
  assert.match(dossier, /search--linked\.is-found>strong\{color:#356d52;text-shadow:none\}/);
  assert.match(legibility, /data-showcase-theme="intron"[\s\S]*--showcase-readable-text:#171717/);
});

test("assigned casts and guest casts share the same theme token family", () => {
  assert.match(phase, /neotokyo-finale__cast-card[\s\S]*var\(--showcase-surface-rgb\)/);
  assert.match(phase, /poster-supporting-cast/);
  assert.match(phase, /poster-supporting-card/);
  assert.match(phase, /var\(--showcase-primary-rgb\)/);
  assert.match(phase, /var\(--showcase-secondary-rgb\)/);
  assert.match(phase, /var\(--showcase-tertiary-rgb\)/);
});

test("legibility layer changes contrast only and keeps phase layout ownership intact", () => {
  assert.match(legibility, /final legibility layer/i);
  assert.match(legibility, /neotokyo-sequence__screen--title/);
  assert.match(legibility, /neotokyo-sequence__ruler-credit/);
  assert.doesNotMatch(legibility, /stage\.is-trailer-scroll[\s\S]*overflow/);
  assert.doesNotMatch(legibility, /screen--trailer[\s\S]*height:min\(92svh,760px\)/);
});