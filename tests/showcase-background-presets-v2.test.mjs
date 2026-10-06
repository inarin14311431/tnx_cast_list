import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

const expectedPresets = [
  ["nova-central-ring", "トーキョーN◎VA", "nova-central-ring.svg"],
  ["kisarazu-lake-harbor", "木更津湖港湾", "kisarazu-lake-harbor.svg"],
  ["sunrise-megacity", "夜明けのメガシティ", "sunrise-megacity.svg"],
  ["green-area", "グリーンエリア", "green-area.avif"],
  ["industrial-port", "工業港湾地区", "industrial-port.svg"],
  ["executive-lounge", "ホワイトエリア", "executive-lounge.svg"],
  ["cyberspace", "電脳空間", "cyberspace.avif"],
  ["orbital-habitat", "軌道", "orbital-habitat.avif"],
  ["prison-block", "牢獄", "prison-block.avif"],
  ["slum-district", "スラム街", "slum-district.avif"]
];

test("act showcase exposes exactly ten background presets", async () => {
  const source = await read("js/showcase-background-presets.js");
  const presetSection = source.slice(source.indexOf("SHOWCASE_BACKGROUND_PRESETS"), source.indexOf("LEGACY_PRESET_KEY_ALIASES"));
  const presetCount = [...presetSection.matchAll(/Object\.freeze\(\{\s*key:/g)].length;
  assert.equal(presetCount, 10);
  assert.match(source, /new URL\("\.\.\/assets\/showcase\/backgrounds\/", import\.meta\.url\)/);
  assert.match(source, /SHOWCASE_BACKGROUND_ASSET_VERSION = "[^"]+"/);
  assert.match(source, /url\.searchParams\.set\("v", SHOWCASE_BACKGROUND_ASSET_VERSION\)/);

  for (const [key, name, filename] of expectedPresets) {
    assert.ok(presetSection.includes(`key: "${key}"`), `missing preset key: ${key}`);
    assert.ok(presetSection.includes(`name: "${name}"`), `missing preset name: ${name}`);
    assert.ok(presetSection.includes(`assetUrl("${filename}")`), `missing preset asset: ${filename}`);
  }

  for (const retired of ["ネオン・ウォーターフロント", "アーコロジー・ロビー", "レッドエリア裏路地", "スカイラウンジ", "ニューロ・データスペース"]) {
    assert.ok(!source.includes(retired), `retired preset remains: ${retired}`);
  }
});

test("legacy preset key and asset URL resolve to the canonical 木更津湖港湾 preset", async () => {
  const source = await read("js/showcase-background-presets.js");
  assert.match(source, /\["neotokyo-bay",\s*"kisarazu-lake-harbor"\]/);
  assert.match(source, /normalizeAssetUrl\(rawAssetUrl\("neotokyo-bay\.svg"\)\),\s*"kisarazu-lake-harbor"/);
  assert.match(source, /LEGACY_PRESET_KEY_ALIASES\.get\(normalized\) \|\| normalized/);
  assert.match(source, /LEGACY_PRESET_URL_ALIASES\.get\(normalized\)/);
});

test("generator loads a versioned preset picker and no longer labels presets as Supabase-only", async () => {
  const html = await read("showcase-generator.html");
  const picker = await read("js/showcase-background-preset-picker.js");
  assert.match(html, /showcase-background-preset-picker\.js\?v=\d+/);
  assert.match(html, /ACT VISUAL \/ PRESET LIBRARY/);
  assert.ok(!html.includes("ACT VISUAL / SUPABASE STORAGE"));
  assert.match(picker, /showcase-background-presets\.js\?v=\d+/);
});

test("green-area and cyberspace carry the specified descriptions", async () => {
  const source = await read("js/showcase-background-presets.js");
  assert.ok(source.includes('description: "緑化されたテラスと歩行者デッキが続く、治安の安定したグリーンエリアの街路"'));
  assert.ok(source.includes('description: "データの柱と光の回線が格子状に広がる、ウェブ内部の電脳空間"'));
  for (const retired of ["イエローエリア", "封鎖区域", "neon-market.svg", "incident-blockade.svg"]) {
    assert.ok(!source.slice(source.indexOf("SHOWCASE_BACKGROUND_PRESETS"), source.indexOf("LEGACY_PRESET_KEY_ALIASES")).includes(retired), `${retired} must not remain in the preset list`);
  }
});
