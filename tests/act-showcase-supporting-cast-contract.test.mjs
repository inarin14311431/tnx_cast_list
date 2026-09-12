import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

test("generator loads guest persistence before dynamic publishing", async () => {
  const loader = await read("js/showcase-generator-loader.js");
  const guestIndex = loader.indexOf("showcase-guests.js");
  const bridgeIndex = loader.indexOf("showcase-guest-publish-bridge.js");
  const publishIndex = loader.indexOf("showcase-dynamic-publish-v3.js");
  assert.ok(guestIndex >= 0 && bridgeIndex > guestIndex && publishIndex > bridgeIndex);
});

test("guest editor keeps supporting cast separate from participant history", async () => {
  const js = await read("js/showcase-guests.js");
  assert.match(js, /const MAX_GUESTS = 12/);
  assert.match(js, /replace_act_showcase_guests_for_current_user/);
  assert.match(js, /ゲストはハンドアウトのアサイン対象や参加履歴には含まれません/);
});

test("guest database API only exposes guests for public showcases", async () => {
  const sql = await read("supabase/42_act_showcase_guests.sql");
  assert.match(sql, /alter table public\.act_showcase_guests enable row level security/);
  assert.match(sql, /get_public_act_showcase_guests/);
  assert.match(sql, /showcase_public,false\) = true/);
  assert.match(sql, /revoke all on table public\.act_showcase_guests from anon/);
});

test("public showcase loads supporting cast after canonical story layers through entries", async () => {
  const [entry, bootstrap] = await Promise.all([
    read("css-next/pages/act-showcase-entry.css"),
    read("js/act-showcase-bootstrap.js")
  ]);
  const writingCss = entry.indexOf("act-showcase-writing-patterns.css");
  const supportingCss = entry.indexOf("act-showcase-supporting-cast.css");
  const pageJs = bootstrap.indexOf("act-showcase-page.js");
  const supportingJs = bootstrap.indexOf("act-showcase-supporting-cast.js");
  assert.ok(writingCss >= 0 && supportingCss > writingCss);
  assert.ok(pageJs >= 0 && supportingJs > pageJs);
});

test("supporting cast shares public data access and preserves duplicate style distinction", async () => {
  const [js, css] = await Promise.all([
    read("js/act-showcase-supporting-cast.js"),
    read("css-next/pages/act-showcase-supporting-cast.css")
  ]);
  assert.match(js, /public-showcase-service\.js/);
  assert.match(js, /loadPublicShowcaseGuests/);
  assert.match(js, /classList\.toggle\("is-role-primary", primary\)/);
  assert.match(js, /classList\.toggle\("is-role-duplicate", duplicate\)/);
  assert.match(js, /classList\.toggle\("is-assigned-style", primary\)/);
  assert.match(css, /is-assigned-style/);
  assert.doesNotMatch(css, /!important/);
});

test("supporting cast observer stays structural and its text writes are idempotent", async () => {
  const js = await read("js/act-showcase-supporting-cast.js");
  assert.match(js, /observer\.observe\(document\.body, \{ childList: true, subtree: true \}\)/);
  assert.doesNotMatch(js, /attributes:\s*true/);
  assert.match(js, /function setTextIfChanged/);
  assert.match(js, /target\.textContent !== next/);
});

test("final briefing and supporting guests are rendered as separate presentation roles", async () => {
  const js = await read("js/act-showcase-supporting-cast.js");
  assert.match(js, /FINAL BRIEFING/);
  assert.match(js, /GUEST CAST/);
  assert.match(js, /SUPPORTING CHANNEL \/\/ GUEST FILES/);
  assert.match(js, /renderPosterGuests/);
  assert.match(js, /renderSummaryGuests/);
});
