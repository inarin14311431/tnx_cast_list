import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const html = fs.readFileSync("acts.html", "utf8");
const app = fs.readFileSync("js/acts-app.js", "utf8");

test("ACT page uses one state-driven controller", () => {
  const controllerImports = html.match(/acts-app\.js\?v=[1-9]\d*/g) ?? [];
  assert.equal(controllerImports.length, 1);
  assert.doesNotMatch(html, /acts-role\.js|acts-history-enhanced\.js|acts-detail-toggle-fix\.js|acts-ui-fixes\.js|acts-spending\.js/);
  assert.doesNotMatch(app, /MutationObserver/);
  assert.match(app, /const state = \{/);
  assert.match(app, /function renderAll\(\)/);
  assert.match(app, /function renderHistory\(\)/);
  assert.match(app, /function renderSpending\(\)/);
});

test("ACT page keeps browse controls, year grouping, and experience in two primary sections", () => {
  assert.match(html, /act-history-panel--acts/);
  assert.match(html, /<span>01<\/span><h2>参加アクト/);
  assert.match(html, /history-player-filter" hidden/);
  for (const id of ["history-cast-filter", "history-year-filter", "history-query-filter", "history-role-filter", "history-sort-filter", "history-filter-status"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /act-history-panel--experience/);
  assert.match(html, /<span>02<\/span><h2>経験点/);
  assert.doesNotMatch(html, /<span>03<\/span>/);

  assert.match(app, /const groups = new Map\(\)/);
  assert.match(app, /YEAR ARCHIVE/);
  assert.match(app, /const latest = years\[0\]/);
  assert.match(app, /state\.openYears/);
  assert.match(app, /renderYearGroup\(year, groups\.get\(year\), year === latest\)/);
});

test("record renderer exposes compact summary, four canonical facts, and experience actions", () => {
  for (const token of [
    "act-record-summary__cast",
    "data-history-cast=",
    'data-action="toggle-detail"',
    "is-detail-open",
    "act-record__showcase-link",
    "参加日時 DATE",
    "ハンドアウト CAST No.",
    "スタイル ASSIGN STYLE",
    "ルーラー RULER",
    "data-issue-ticket",
    'data-action="save-experience"',
    'data-action="delete-participation"'
  ]) assert.match(app, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("spending cast labels contain cast identity only", () => {
  assert.match(app, /TNXHandleFormat\?\.formatIdentity/);
  const body = app.match(/function populateSpendingCharacterOptions\(\) \{([\s\S]*?)\n\}/)?.[1] ?? "";
  assert.match(body, /fullName\(c\)/);
  assert.doesNotMatch(body, /displayPlayer\(/);
});

test("ACT write actions share one local busy lifecycle boundary", () => {
  assert.match(app, /async function runBusyAction\(task\)/);
  assert.equal((app.match(/setBusy\(true\)/g) ?? []).length, 1);
  assert.equal((app.match(/setBusy\(false\)/g) ?? []).length, 1);
  assert.equal((app.match(/runBusyAction\(async \(\) => \{/g) ?? []).length, 4);
});
