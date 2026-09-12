import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  formatShowcaseFullName,
  formatShowcaseHandle,
  formatShowcaseTagline,
  normalizeShowcaseDisplayQuotes
} from "../js/showcase-display-format.js";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

test("showcase handle formatting removes nested outer quotes before adding one pair", () => {
  assert.equal(formatShowcaseHandle("地球王"), "“地球王”");
  assert.equal(formatShowcaseHandle("“地球王”"), "“地球王”");
  assert.equal(formatShowcaseHandle("““地球王””"), "“地球王”");
  assert.equal(formatShowcaseHandle('"地球王"'), "“地球王”");
  assert.equal(formatShowcaseFullName("“地球王”", "天王寺京羅"), "“地球王” 天王寺京羅");
  assert.equal(normalizeShowcaseDisplayQuotes("““地球王”” 天王寺京羅"), "“地球王” 天王寺京羅");
});

test("showcase taglines always use one Japanese quote pair", () => {
  assert.equal(formatShowcaseTagline("真実はここにある"), "「真実はここにある」");
  assert.equal(formatShowcaseTagline("“真実はここにある”"), "「真実はここにある」");
  assert.equal(formatShowcaseTagline("「“真実はここにある”」"), "「真実はここにある」");
});

test("mode-specific publish saves guests before standard or cinematic publishing", async () => {
  const [loader, bridge] = await Promise.all([
    read("js/showcase-generator-loader.js"),
    read("js/showcase-guest-publish-bridge.js")
  ]);
  const guestIndex = loader.indexOf("showcase-guests.js");
  const bridgeIndex = loader.indexOf("showcase-guest-publish-bridge.js");
  const publishIndex = loader.indexOf("showcase-dynamic-publish-v3.js");
  assert.ok(guestIndex >= 0 && bridgeIndex > guestIndex && publishIndex > bridgeIndex);
  assert.match(bridge, /\[data-publish-mode\]/);
  assert.match(bridge, /replace_act_showcase_guests_for_current_user/);
  assert.match(bridge, /replayButton = button/);
  assert.match(bridge, /button\.click\(\)/);
});

test("generated showcase source is normalized before download or dynamic publish reads srcdoc", async () => {
  const [loader, normalizer] = await Promise.all([
    read("js/showcase-generator-loader.js"),
    read("js/showcase-output-normalizer.js")
  ]);
  assert.match(loader, /showcase-output-normalizer\.js\?v=1/);
  assert.match(normalizer, /\.cast-card__name/);
  assert.match(normalizer, /\.cast-card__tagline/);
  assert.match(normalizer, /formatShowcaseTagline/);
  assert.match(normalizer, /preview\.srcdoc =/);
});

test("standard showcase explicitly loads and renders public guests", async () => {
  const [html, guestJs] = await Promise.all([
    read("act-showcase-standard.html"),
    read("js/act-showcase-standard-guests.js")
  ]);
  assert.match(html, /act-showcase-standard-guests\.js\?v=1/);
  assert.match(guestJs, /loadPublicShowcaseGuests/);
  assert.match(guestJs, /standard-showcase-guests/);
  assert.match(guestJs, /formatShowcaseFullName/);
  assert.match(guestJs, /formatShowcaseTagline/);
});

test("both public showcase modes load the display normalizer", async () => {
  const [standardHtml, cinematicBootstrap, normalizer] = await Promise.all([
    read("act-showcase-standard.html"),
    read("js/act-showcase-bootstrap.js"),
    read("js/act-showcase-display-normalizer.js")
  ]);
  assert.match(standardHtml, /act-showcase-display-normalizer\.js\?v=1/);
  assert.match(cinematicBootstrap, /act-showcase-display-normalizer\.js\?v=1/);
  assert.match(normalizer, /poster-supporting-card h3/);
  assert.match(normalizer, /poster-supporting-card blockquote/);
  assert.match(normalizer, /formatShowcaseTagline/);
});
