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
await import("./act-showcase-page.js?v=6982507f");
await import("./act-showcase-scenario-writer.js?v=3042484a");
await import("./act-showcase-supporting-cast.js?v=1f97f956");
await import("./act-showcase-final-trailer.js?v=7572720a");
await import("./act-showcase-display-normalizer.js?v=2388bd0e");