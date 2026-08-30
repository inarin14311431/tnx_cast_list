import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("cast view returns to its validated source and sends edit back to the current cast", async () => {
  const source = await read("js/cast-ui.js");

  assert.match(source, /url\.origin !== location\.origin/);
  assert.match(source, /"sheet\.html": \["キャスト編集へ", "RETURN TO EDITOR"\]/);
  assert.match(source, /editUrl\.searchParams\.set\("return", `\$\{location\.pathname\}\$\{location\.search\}\$\{location\.hash\}`\)/);
});

test("sheet editor defaults to account but honors cast source and keeps it after save", async () => {
  const loader = await read("js/sheet-open-at-top.js");
  const source = await read("js/sheet-navigation-context.js");

  assert.match(loader, /import\("\.\/sheet-navigation-context\.js\?v=1"\)/);
  assert.match(source, /"account\.html": \["アカウントへ", "RETURN TO ACCOUNT"\]/);
  assert.match(source, /"cast\.html": \["キャスト閲覧へ", "RETURN TO CAST"\]/);
  assert.match(source, /window\.addEventListener\("tnx:character-saved"/);
  assert.match(source, /url\.searchParams\.set\("return", initialReturnValue\)/);
});

test("sheet to cast navigation points back to the current editor context", async () => {
  const source = await read("js/sheet-navigation-context.js");

  assert.match(source, /new URL\("\.\/cast\.html", location\.href\)/);
  assert.match(source, /url\.searchParams\.set\("return", currentSheetHref\(id\)\)/);
  assert.match(source, /new MutationObserver\(\(\) => updateViewLink\(\)\)/);
});
