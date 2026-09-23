(() => {
  if (document.body?.id !== "act-showcase-page") return;

  const intro = document.querySelector("#cinematic-intro");
  const openingSubtitle = document.querySelector("#opening-subtitle");
  const supportsResizeObserver = typeof ResizeObserver === "function";
  const trailerPageTargets = new WeakMap();
  const trailerScrollThrottle = new WeakMap();
  const TRAILER_SCROLL_THROTTLE_MS = 200;
  let trailerFrame = 0;

  const enhance = root => {
    const scope = root instanceof Element ? root : intro;
    if (!scope) return;
    normalizeNodeLabel(scope);
    enhanceTitleScreen(scope);
    attachTrailerFollow(scope);
    polishAssignedPresentation(scope);
    normalizeOpeningSubtitle();
    syncTrailerScrollSurface();
  };

  enhance(intro);

  if (intro) {
    const observer = new MutationObserver(records => {
      let surfaceMayHaveChanged = false;
      for (const record of records) {
        const recordTarget = record.target instanceof Element ? record.target : record.target.parentElement;
        const trailerReadout = recordTarget?.closest?.(
          ".neotokyo-sequence__screen--trailer .neotokyo-sequence__readout"
        );

        if (record.type === "characterData") {
          if (trailerReadout) scheduleTrailerFrame(trailerReadout);
          continue;
        }

        let hasElementChange = false;
        for (const node of record.addedNodes || []) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          hasElementChange = true;
          enhance(node);
        }
        for (const node of record.removedNodes || []) {
          if (node.nodeType === Node.ELEMENT_NODE) hasElementChange = true;
        }

        if (trailerReadout) scheduleTrailerFrame(trailerReadout);
        else if (!supportsResizeObserver) scheduleTrailerFrame(recordTarget);
        if (hasElementChange) surfaceMayHaveChanged = true;
      }
      if (surfaceMayHaveChanged) syncTrailerScrollSurface();
    });
    observer.observe(intro, {
      subtree: true,
      childList: true,
      characterData: true
    });
  }

  window.addEventListener("resize", () => {
    const readout = intro?.querySelector(".neotokyo-sequence__screen--trailer .neotokyo-sequence__readout");
    if (readout) scheduleTrailerFrame(readout);
  }, { passive: true });

  function normalizeNodeLabel(scope) {
    const nodes = scope.matches?.(".neotokyo-sequence__system span")
      ? [scope]
      : [...(scope.querySelectorAll?.(".neotokyo-sequence__system span") || [])];
    for (const node of nodes) {
      if (/NEOTOKYO/i.test(node.textContent || "")) node.textContent = "NODE // TOKYO N◎VA";
    }
  }

  function enhanceTitleScreen(scope) {
    const screens = scope.matches?.(".neotokyo-sequence__screen--title")
      ? [scope]
      : [...(scope.querySelectorAll?.(".neotokyo-sequence__screen--title") || [])];
    for (const screen of screens) {
      const title = screen.querySelector(".neotokyo-sequence__act-title");
      if (!title || screen.querySelector(".neotokyo-sequence__act-subtitle")) continue;
      const text = getMeaningfulSubtitle();
      if (!text) continue;
      const subtitle = document.createElement("p");
      subtitle.className = "neotokyo-sequence__act-subtitle";
      subtitle.textContent = text;
      const rule = screen.querySelector(".neotokyo-title-logo__rule");
      if (rule) rule.before(subtitle);
      else title.insertAdjacentElement("afterend", subtitle);
    }
  }

  function syncTrailerScrollSurface() {
    const stage = intro?.querySelector(".neotokyo-sequence__stage");
    if (!stage) return;
    const screen = stage.querySelector(".neotokyo-sequence__screen--trailer");
    const readout = screen?.querySelector(".neotokyo-sequence__readout");
    const active = Boolean(screen);
    const wasActive = stage.classList.contains("is-trailer-scroll");
    stage.classList.toggle("is-trailer-scroll", active);
    document.body.classList.toggle("showcase-trailer-document-scroll", active);

    if (active !== wasActive) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      if (readout) {
        readout.scrollTop = 0;
        trailerPageTargets.delete(readout);
      }
    }
  }

  function attachTrailerFollow(scope) {
    const readouts = scope.matches?.(".neotokyo-sequence__screen--trailer .neotokyo-sequence__readout")
      ? [scope]
      : [...(scope.querySelectorAll?.(".neotokyo-sequence__screen--trailer .neotokyo-sequence__readout") || [])];
    readouts.forEach(readout => {
      if (readout.dataset.followTyping === "true") return;
      readout.dataset.followTyping = "true";
      if (supportsResizeObserver) {
        const resize = new ResizeObserver(() => scheduleTrailerFrame(readout));
        resize.observe(readout);
      }
      scheduleTrailerFrame(readout);
    });
  }

  function scheduleTrailerFrame(target) {
    const readout = target?.closest?.(".neotokyo-sequence__screen--trailer .neotokyo-sequence__readout")
      || (target?.matches?.(".neotokyo-sequence__screen--trailer .neotokyo-sequence__readout") ? target : null);
    if (!readout) return;
    cancelAnimationFrame(trailerFrame);
    trailerFrame = requestAnimationFrame(() => updateTrailerFrame(readout));
  }

  function updateTrailerFrame(readout) {
    if (!readout?.isConnected) return;
    const screen = readout.closest(".neotokyo-sequence__screen--trailer");
    const stage = screen?.closest(".neotokyo-sequence__stage");
    if (!screen || !stage) return;

    stage.classList.add("is-trailer-scroll");
    document.body.classList.add("showcase-trailer-document-scroll");
    readout.scrollTop = 0;

    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const viewportPadding = Math.max(72, Math.min(140, window.innerHeight * 0.14));
    const readoutBottom = readout.getBoundingClientRect().bottom + window.scrollY;
    const targetTop = Math.max(0, readoutBottom - (window.innerHeight - viewportPadding));
    const previousTarget = trailerPageTargets.get(readout);

    if (targetTop <= window.scrollY + 1) {
      trailerPageTargets.set(readout, targetTop);
      return;
    }
    if (Number.isFinite(previousTarget) && Math.abs(targetTop - previousTarget) <= 1) return;

    trailerPageTargets.set(readout, targetTop);
    scrollTrailerReadoutIntoView(readout, targetTop, reduced);
  }

  // The typewriter grows the readout roughly every 16-34ms, but a smooth scroll takes longer than
  // that to settle. Calling window.scrollTo() on every growth tick was measured (live) to restart
  // the animation as little as ~70ms apart, so it never completed and produced visible jank.
  // Throttling actual smooth scrollTo() calls to once per TRAILER_SCROLL_THROTTLE_MS lets each one
  // mostly settle before the next starts. A call arriving too soon schedules a trailing re-check
  // instead of being dropped, so the readout still catches up once the window elapses, using
  // whatever the latest target is by then rather than the stale one from when it was requested.
  // prefers-reduced-motion jumps ("auto") have no animation to interrupt, so those are unthrottled.
  function scrollTrailerReadoutIntoView(readout, targetTop, reduced) {
    if (reduced) {
      window.scrollTo({ top: targetTop, left: 0, behavior: "auto" });
      return;
    }
    const state = trailerScrollThrottle.get(readout);
    const now = performance.now();
    if (!state || now - state.lastCallAt >= TRAILER_SCROLL_THROTTLE_MS) {
      trailerScrollThrottle.set(readout, { lastCallAt: now });
      window.scrollTo({ top: targetTop, left: 0, behavior: "smooth" });
      return;
    }
    clearTimeout(state.timer);
    state.timer = window.setTimeout(() => scheduleTrailerFrame(readout), TRAILER_SCROLL_THROTTLE_MS - (now - state.lastCallAt));
  }

  function polishAssignedPresentation(scope) {
    const cards = [];
    if (scope.matches?.(".neotokyo-sequence__cast--linked")) cards.push(scope);
    const nearest = scope.closest?.(".neotokyo-sequence__cast--linked");
    if (nearest && !cards.includes(nearest)) cards.push(nearest);
    scope.querySelectorAll?.(".neotokyo-sequence__cast--linked").forEach(card => {
      if (!cards.includes(card)) cards.push(card);
    });

    for (const card of cards) {
      const role = card.querySelector(".neotokyo-sequence__role-slot strong");
      if (role && role.dataset.presentationClean !== "true") {
        role.textContent = String(role.textContent || "").replace(/[◎●]/g, "").trim();
        role.dataset.presentationClean = "true";
      }
    }
  }

  function normalizeOpeningSubtitle() {
    if (!openingSubtitle) return;
    const text = String(openingSubtitle.textContent || "").trim();
    openingSubtitle.hidden = !text || text.toUpperCase() === "CAST SHOWCASE";
  }

  function getMeaningfulSubtitle() {
    const text = String(openingSubtitle?.textContent || "").trim();
    if (!text || text.toUpperCase() === "CAST SHOWCASE") return "";
    return text;
  }
})();
