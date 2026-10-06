import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../act-showcase.html", import.meta.url), "utf8");
const bootstrap = await readFile(new URL("../js/act-showcase-bootstrap.js", import.meta.url), "utf8");
const entryCss = await readFile(new URL("../css-next/pages/act-showcase-entry.css", import.meta.url), "utf8");
const loader = await readFile(new URL("../js/showcase-generator-loader.js", import.meta.url), "utf8");
const subtitle = await readFile(new URL("../js/showcase-act-subtitle.js", import.meta.url), "utf8");
const page = await readFile(new URL("../js/act-showcase-page.js", import.meta.url), "utf8");
const cinematic = await readFile(new URL("../js/act-showcase-cinematic-layout-v2.js", import.meta.url), "utf8");
const neotokyo = await readFile(new URL("../js/act-showcase-neotokyo.js", import.meta.url), "utf8");
const css = await readFile(new URL("../css-next/pages/act-showcase-cinematic-v2.css", import.meta.url), "utf8");
const neotokyoCss = await readFile(new URL("../css-next/pages/act-showcase-neotokyo.css", import.meta.url), "utf8");
const presentation = await readFile(new URL("../css-next/pages/act-showcase-presentation-tuning.css", import.meta.url), "utf8");
const emphasisCss = await readFile(new URL("../css-next/pages/act-showcase-visual-emphasis.css", import.meta.url), "utf8");

test("generator separates ACT title and subtitle before dynamic publishing", () => {
  const subtitleImport = loader.search(/import\("\.\/showcase-act-subtitle\.js\?v=\d+"\)/);
  const publisherImport = loader.search(/import\("\.\/showcase-dynamic-publish-v3\.js\?v=\d+"\)/);
  assert.ok(subtitleImport >= 0);
  assert.ok(publisherImport > subtitleImport);
  assert.match(subtitle, /subtitleInput\.id = "act-subtitle"/);
  assert.match(subtitle, /subtitleLabel\.append\("サブタイトル"\)/);
  assert.match(subtitle, /node\.textContent = "アクトタイトル"/);
  assert.match(subtitle, /doc\.querySelector\("\.hero h1 span"\)/);
  assert.match(subtitle, /showcaseData\?\.heroSubTitle/);
});

test("legacy trailer helper wording is no longer presented in the generator", () => {
  assert.match(subtitle, /helper\.textContent = "ACT TRAILER"/);
  assert.doesNotMatch(subtitle, /helper\.textContent = "プレアクトで読み上げるトレーラー"/);
});

test("published background is owned by the primary showcase model and renderer", () => {
  assert.match(page, /loadPublicShowcase\(slug\)/);
  assert.match(page, /background: safeImageUrl\(data\.background\)/);
  assert.match(page, /applyBackground\(model\.background\)/);
  assert.match(page, /const selected = background \|\| POSTER_SAMPLE_BACKGROUND/);
  assert.match(page, /classList\.toggle\("showcase-poster-sample-background", !background\)/);
  assert.doesNotMatch(bootstrap, /act-showcase-background-resolver/);
});

test("cinematic title is multiline-safe and renders a separate subtitle", () => {
  assert.match(cinematic, /neotokyo-sequence__act-subtitle/);
  assert.match(css, /white-space:normal/);
  assert.match(css, /act-title--logo\.showcase-fit-title\{[\s\S]*?white-space:normal/);
  assert.match(css, /act-title--logo\.showcase-fit-title\[data-fit="medium"\]/);
  assert.match(css, /\.neotokyo-sequence__act-subtitle\s*\{/);
  assert.match(css, /font:700 clamp\(1\.35rem,2\.5vw,2\.85rem\)/);
  assert.doesNotMatch(presentation, /white-space\s*:\s*nowrap/);
});

test("cinematic trailer grows its frame and lets the browser page own follow scrolling", () => {
  assert.match(neotokyoCss, /body\.showcase-neotokyo-intro-active\{overflow:hidden\}/);
  assert.match(cinematic, /syncTrailerScrollSurface/);
  assert.match(cinematic, /stage\.classList\.toggle\("is-trailer-scroll", active\)/);
  assert.match(cinematic, /document\.body\.classList\.toggle\("showcase-trailer-document-scroll", active\)/);
  assert.match(cinematic, /readout\.getBoundingClientRect\(\)\.bottom \+ window\.scrollY/);
  assert.match(cinematic, /window\.scrollTo\(\{ top: targetTop, left: 0, behavior: "auto" \}\)/);
  assert.match(cinematic, /window\.scrollTo\(\{ top: targetTop, left: 0, behavior: "smooth" \}\)/);
  assert.match(cinematic, /record\.type === "characterData"[\s\S]*scheduleTrailerFrame\(trailerReadout\)/);
  assert.match(emphasisCss, /showcase-trailer-document-scroll[\s\S]*\.cinematic-intro\.neotokyo-sequence\{[\s\S]*position:relative[\s\S]*overflow:visible/);
  assert.match(emphasisCss, /showcase-trailer-document-scroll[\s\S]*stage\.is-trailer-scroll\{[\s\S]*overflow:visible/);
  assert.match(emphasisCss, /showcase-trailer-document-scroll[\s\S]*screen--trailer\{[\s\S]*max-height:none[\s\S]*overflow:visible/);
  assert.match(emphasisCss, /showcase-trailer-document-scroll[\s\S]*readout\.is-terminal-readout\{[\s\S]*max-height:none[\s\S]*overflow:visible/);
  assert.doesNotMatch(cinematic, /readout\.scrollTo\(/);
  assert.doesNotMatch(cinematic, /stage\.scrollTo\(/);
  assert.doesNotMatch(cinematic, /window\.scrollBy\(/);
});

test("finished poster page stays out of the scrollable flow for the whole neotokyo intro, not just while overflow:hidden holds", () => {
  // body.showcase-neotokyo-intro-active{overflow:hidden} (act-showcase-neotokyo.css) normally keeps
  // #act-showcase-root - already unhidden and fully built behind the intro - unreachable, because
  // #cinematic-intro is a fixed, opaque, full-viewport overlay the whole time. The trailer
  // document-scroll phase above switches the intro to position:relative and the body to
  // overflow-y:auto so the browser viewport can follow the growing trailer text; that also makes
  // #act-showcase-root a normal, scrollable sibling right after the intro's own (now shorter) box.
  // A free user scroll (wheel/trackpad/scrollbar), which the auto-follow scrollTo() calls never
  // clamp, could then scroll straight past the intro and reveal the finished page underneath -
  // most visibly its own giant "05 / FINAL TRANSMISSION" ACT TRAILER recap
  // (poster-v2-trailer-stage). Removing #act-showcase-root from the render tree for as long as
  // showcase-neotokyo-intro-active is set removes it from the scrollable area entirely, regardless
  // of which intro phase (or overflow value) is currently active. Live-verified: before this rule,
  // scrolling the window during the ACT TRAILER screen exposed the finished page below the intro;
  // after it, the document has no scrollable area beyond the intro's own height until the intro
  // sequence actually finishes.
  assert.match(emphasisCss, /:root\[data-showcase-theme\] body#act-showcase-page\.showcase-neotokyo-intro-active #act-showcase-root\{\s*display:none;\s*\}/);
});

test("trailer scroll-follow throttles smooth scrollTo calls so each has time to settle", () => {
  // Measured live: window.scrollTo({behavior:"smooth"}) was called as little as ~70ms apart while
  // the typewriter grew the readout, restarting the animation before it ever settled and producing
  // visible jank. scrollTrailerReadoutIntoView() throttles actual smooth calls to once per
  // TRAILER_SCROLL_THROTTLE_MS; a call that arrives sooner schedules a trailing re-check instead of
  // firing immediately. Extracted from the real source (not hand-copied) so this tracks the shipped
  // throttle/skip decision, not a duplicate of it.
  assert.match(cinematic, /const TRAILER_SCROLL_THROTTLE_MS = 200/);
  const start = cinematic.indexOf("function scrollTrailerReadoutIntoView");
  assert.notEqual(start, -1, "scrollTrailerReadoutIntoView not found");
  const end = cinematic.indexOf("\n  function polishAssignedPresentation", start);
  const source = cinematic.slice(start, end);

  const calls = [];
  let now = 0;
  let pendingTimeout = null;
  const factory = new Function(
    "trailerScrollThrottle",
    "TRAILER_SCROLL_THROTTLE_MS",
    "window",
    "performance",
    "scheduleTrailerFrame",
    `${source}\nreturn scrollTrailerReadoutIntoView;`
  );
  const trailerScrollThrottle = new WeakMap();
  const fakeWindow = {
    scrollTo: value => calls.push({ t: now, ...value }),
    setTimeout: (fn, ms) => { pendingTimeout = { fn, fireAt: now + ms }; return 1; },
    clearTimeout: () => { pendingTimeout = null; }
  };
  const fn = factory(trailerScrollThrottle, 200, fakeWindow, { now: () => now }, () => calls.push({ t: now, rescheduled: true }));
  const readout = {};

  fn(readout, 100, false);
  assert.equal(calls.length, 1, "first call should scroll immediately");
  assert.equal(calls[0].behavior, "smooth");

  now = 70;
  fn(readout, 140, false);
  assert.equal(calls.length, 1, "a call within the throttle window must not scroll again yet");
  assert.ok(pendingTimeout, "a trailing re-check must be scheduled instead");

  now = pendingTimeout.fireAt;
  pendingTimeout.fn();
  assert.equal(calls.length, 2, "the trailing re-check should eventually fire");
  assert.equal(calls[1].rescheduled, true);

  now = 500;
  fn(readout, 999, true);
  assert.equal(calls.length, 3, "prefers-reduced-motion jumps are never throttled");
  assert.equal(calls[2].behavior, "auto");
  assert.equal(calls[2].top, 999);
});

test("assigned cast removes suit marks only from the participation slot and keeps three full style cards", () => {
  assert.match(cinematic, /neotokyo-sequence__role-slot strong/);
  assert.match(cinematic, /replace\(\/\[◎●\]\/g, ""\)/);
  assert.doesNotMatch(cinematic, /fitAssignedTagline|tagline\.style\.fontSize/);
  assert.match(css, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /min-height:46px/);
  assert.match(css, /span\.is-role-primary/);
  assert.match(css, /white-space:nowrap/);
});

test("cinematic presentation does not render fake navigation", () => {
  assert.doesNotMatch(page, /poster-v2-nav/);
  assert.doesNotMatch(css, /poster-v2-nav\{display:none!important\}/);
});

test("trailer screen no longer builds a third ACT TRAILER label duplicating the eyebrow and PRE-ACT READOUT micro line", () => {
  // js/act-showcase-neotokyo.js's showTrailer() used to build a .neotokyo-sequence__trailer-definition
  // paragraph ("ACT TRAILER" + "プレアクトで読み上げるトレーラー"), which js/act-showcase-cinematic-
  // layout-v2.js's simplifyTrailer() deleted synchronously (before first paint) on every render. Its
  // content was already fully redundant with the still-present eyebrow ("03 // ACT TRAILER") and micro
  // line ("PRE-ACT READOUT / PUBLIC BROADCAST"), confirmed by live rendering before removing it, so
  // neither side of the build-then-delete pair exists anymore.
  assert.doesNotMatch(neotokyo, /neotokyo-sequence__trailer-definition/);
  assert.doesNotMatch(cinematic, /simplifyTrailer|neotokyo-sequence__trailer-definition|cinematic-trailer-band/);
  assert.match(neotokyo, /textNode\("p", "neotokyo-sequence__eyebrow", "03 \/\/ ACT TRAILER"\)/);
  assert.match(neotokyo, /textNode\("p", "neotokyo-sequence__micro", "PRE-ACT READOUT \/ PUBLIC BROADCAST"\)/);
});

test("opening and title stages use the published background without forcing a zoom crop", () => {
  assert.match(css, /var\(--showcase-background\)/);
  assert.match(css, /background-size:cover,contain/);
  assert.match(css, /background-size:contain/);
});

test("finished cinematic sequence does not schedule an automatic page scroll", () => {
  assert.doesNotMatch(cinematic, /getFinalCastTarget/);
  assert.doesNotMatch(cinematic, /scrollIntoView/);
  assert.doesNotMatch(cinematic, /scrollend/);
  assert.doesNotMatch(cinematic, /showcase-cast-entry-pending/);
  assert.doesNotMatch(cinematic, /showcase-cast-entry-reveal/);
  assert.doesNotMatch(cinematic, /setTimeout\([^\n]*2000/);
});

test("cinematic presentation is wired through one CSS entry and one module bootstrap", () => {
  const localCss = [...html.matchAll(/href="(\.\/css-next\/[^"]+)"/g)].map(match => match[1]);
  const localScripts = [...html.matchAll(/src="(\.\/js\/[^"]+)"/g)].map(match => match[1]);
  assert.equal(localCss.length, 1);
  assert.match(localCss[0], /^\.\/css-next\/pages\/act-showcase-entry\.css\?v=[A-Za-z0-9._-]+$/);
  assert.equal(localScripts.length, 1);
  assert.match(localScripts[0], /^\.\/js\/act-showcase-bootstrap\.js\?v=[A-Za-z0-9._-]+$/);
  assert.match(entryCss, /act-showcase-cinematic-v2\.css\?v=[A-Za-z0-9._-]+/);
  assert.match(bootstrap, /act-showcase-cinematic-layout-v2\.js\?v=[A-Za-z0-9._-]+/);
  assert.match(bootstrap, /act-showcase-page\.js\?v=/);
  assert.doesNotMatch(bootstrap, /showcase-mode-compat/);
  assert.doesNotMatch(bootstrap, /act-showcase-background-resolver/);
  assert.doesNotMatch(bootstrap, /reduced-motion-sequence-bridge/);
});
