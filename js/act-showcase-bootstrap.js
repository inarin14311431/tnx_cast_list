const current = new URL(location.href);
if (String(current.searchParams.get("showcaseMode") || "").toLowerCase() === "cinematic") {
  current.searchParams.delete("showcaseMode");
  history.replaceState(history.state, "", `${current.pathname}${current.search}${current.hash}`);
}

await import("./act-showcase-cinematic-enhancer.js?v=3");
await import("./act-showcase-summary-advance-guard.js?v=1");
await import("./act-showcase-finale-enhancer.js?v=1");
await import("./act-showcase-cinematic-polish.js?v=20260910b");
await import("./act-showcase-board-layout.js?v=20260908b");
await import("./act-showcase-story-flow.js?v=20260908b");
await import("./act-showcase-writing-patterns.js?v=20260908b");
await import("./act-showcase-visual-caption-code.js?v=3");
await import("./act-showcase-tagline-quotes.js?v=2");
await import("./act-showcase-cinematic-layout-v2.js?v=6");
await import("./act-showcase-page.js?v=20260910a");
await import("./act-showcase-supporting-cast.js?v=4");
await import("./act-showcase-final-trailer.js?v=1");
await import("./act-showcase-display-normalizer.js?v=1");