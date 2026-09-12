import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

test("Neon Sign keeps native select popup rows readable", async () => {
  const [themeIndex, nativeControls, archiveHtml] = await Promise.all([
    read("css-next/themes/index.css"),
    read("css-next/themes/spectrum-neon-native-controls.css"),
    read("index.html")
  ]);

  const neonThemeIndex = themeIndex.indexOf("spectrum-neon.css");
  const nativeControlIndex = themeIndex.indexOf("spectrum-neon-native-controls.css");
  assert.ok(neonThemeIndex >= 0 && nativeControlIndex > neonThemeIndex);

  assert.match(nativeControls, /:root\[data-theme="spectrum-neon"\] select\s*\{[\s\S]*?color-scheme:\s*dark/);
  assert.match(nativeControls, /select option,[\s\S]*?select optgroup\s*\{[\s\S]*?background-color:\s*#080b19;[\s\S]*?color:\s*#f7f9ff;/);
  assert.match(nativeControls, /select option:disabled\s*\{[\s\S]*?color:\s*#b5c2dc;/);
  assert.match(archiveHtml, /css-next\/themes\/index\.css\?v=2/);
});
