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

test("sheet to cast navigation preserves the editor as the immediate return source", async () => {
  const source = await read("js/sheet-navigation-context.js");

  assert.match(source, /new URL\("\.\/cast\.html", location\.href\)/);
  assert.match(source, /url\.searchParams\.set\("return", currentSheetHref\(id\)\)/);
  assert.match(source, /new MutationObserver\(\(\) => updateViewLink\(\)\)/);
});

test("account cast actions return to account", async () => {
  const source = await read("js/account-action-icons.js");

  assert.match(source, /const ACCOUNT_RETURN = ['"]\.\/account\.html['"]/);
  assert.match(source, /cast\.html\?id=/);
  assert.match(source, /sheet\.html\?id=/);
  assert.match(source, /sheet-mobile\.html\?id=/);
  assert.match(source, /url\.searchParams\.set\(['"]return['"], ACCOUNT_RETURN\)/);
});

test("PC and mobile editor switches preserve their immediate source", async () => {
  const route = await read("js/mobile-editor-route.js");
  const app = await read("js/sheet-mobile-app.js");
  const mobile = await read("js/sheet-mobile-navigation-context.js");

  assert.match(route, /url\.searchParams\.set\("return", currentPageHref\(\)\)/);
  assert.match(app, /sheet-mobile-navigation-context\.js\?v=1/);
  assert.match(mobile, /target\.searchParams\.set\("return", currentMobileHref\(\)\)/);
  assert.match(mobile, /mobileView\) target\.searchParams\.set\("mobile", "1"\)/);
  assert.match(mobile, /url\.origin !== location\.origin/);
});

test("new mobile cast editor returns to account rather than the creation form", async () => {
  const source = await read("js/sheet-mobile-new.js");
  assert.match(source, /target\.searchParams\.set\("return",`\$\{SITE_BASE_PATH\}account\.html`\)/);
});

test("troop list keeps filters across detail round trips", async () => {
  const source = await read("js/troops.js");
  assert.match(source, /TROOP_LIST_STATE_KEY = "tnx-troop-list-state"/);
  assert.match(source, /sessionStorage\.setItem\(TROOP_LIST_STATE_KEY/);
  assert.match(source, /history\.replaceState\(history\.state/);
});

test("authentication return redirect stays inside the site", async () => {
  const auth = await read("js/auth-state.js");
  const login = await read("js/login.js");
  assert.match(auth, /loginUrl\.searchParams\.set\("return", currentPath\)/);
  assert.match(login, /candidate\.origin === window\.location\.origin/);
  assert.match(login, /candidate\.pathname\.startsWith\(SITE_BASE_PATH\)/);
});
