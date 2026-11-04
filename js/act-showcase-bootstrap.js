// modulepreload: eager
// Starts the two public data requests (the showcase and its guests) before anything else is loaded. They used to start only when
// the page module, the 11th of the modules below, had been loaded: on a slow line that was 7.6 s after the first byte. The requests
// are cached by js/public-showcase-service.js under the same module URL, so the page and the supporting cast take these very promises.
// A failure here is not reported: the cache forgets it and the page asks again, and shows the error itself.
import { loadPublicShowcase, loadPublicShowcaseGuests, normalizeShowcaseSlug } from "./public-showcase-service.js?v=5da4463c";
import { showLoadError } from "./act-showcase-load-error.js?v=5fbf444f";

const earlySlug = normalizeShowcaseSlug(new URLSearchParams(location.search).get("id"));
if (earlySlug) {
  for (const load of [loadPublicShowcase, loadPublicShowcaseGuests]) Promise.resolve(load(earlySlug)).catch(() => {});
}

// A module that does not load (a dropped connection, a missing file) used to end the chain below for good, and the visitor stayed on the
// loading screen. Now the failure is shown, with a link that reloads the page.
try {
  await import("./act-showcase-theme-runtime.js?v=442d4e30");

  const current = new URL(location.href);
  if (String(current.searchParams.get("showcaseMode") || "").toLowerCase() === "cinematic") {
    current.searchParams.delete("showcaseMode");
    history.replaceState(history.state, "", `${current.pathname}${current.search}${current.hash}`);
  }

  await import("./act-showcase-cinematic-enhancer.js?v=1cd28c99");
  await import("./act-showcase-summary-advance-guard.js?v=c8e75e0e");
  await import("./act-showcase-finale-enhancer.js?v=a8439be7");
  await import("./act-showcase-cinematic-polish.js?v=a8c449c6");
  await import("./act-showcase-board-layout.js?v=1430eeec");
  await import("./act-showcase-story-flow.js?v=91d027c5");
  await import("./act-showcase-scroll-cue.js?v=85c66d25");
  await import("./act-showcase-writing-patterns.js?v=155018b2");
  await import("./act-showcase-cinematic-layout-v2.js?v=110b2f05");
  await import("./act-showcase-handout-live-frame.js?v=a6de4993");
  await import("./act-showcase-page.js?v=8b2b8f5d");
  await import("./act-showcase-scenario-writer.js?v=14650d23");
  await import("./act-showcase-supporting-cast.js?v=478738af");
  await import("./act-showcase-final-trailer.js?v=970cf2ea");
  await import("./act-showcase-display-normalizer.js?v=2388bd0e");
} catch (error) {
  console.error(error);
  showLoadError("ページの読み込みに失敗しました。通信状態を確認して、再読み込みしてください。");
}
