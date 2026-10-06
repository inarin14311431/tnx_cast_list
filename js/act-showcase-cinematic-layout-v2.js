import { settleHeight } from "./act-showcase-trailer-settle.js?v=2";

(() => {
  if (document.body?.id !== "act-showcase-page") return;

  const intro = document.querySelector("#cinematic-intro");
  const openingSubtitle = document.querySelector("#opening-subtitle");
  // ACT TRAILER: while the readout is being typed, the frame's visible height and the page scroll both follow the
  // caret's line, from one interpolated value (see updateTrailerFrame and settleHeight).
  const trailerLoops = new WeakMap();

  const enhance = root => {
    const scope = root instanceof Element ? root : intro;
    if (!scope) return;
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
        // typewriter text changes (characterData) are followed by the frame loop, not by this observer
        if (record.type === "characterData") continue;
        let hasElementChange = false;
        for (const node of record.addedNodes || []) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          hasElementChange = true;
          enhance(node);
        }
        for (const node of record.removedNodes || []) {
          if (node.nodeType === Node.ELEMENT_NODE) hasElementChange = true;
        }
        if (hasElementChange) surfaceMayHaveChanged = true;
      }
      if (surfaceMayHaveChanged) syncTrailerScrollSurface();
    });
    observer.observe(intro, {
      subtree: true,
      childList: true
    });
  }

  window.addEventListener("resize", () => {
    const readout = intro?.querySelector(".neotokyo-sequence__screen--trailer .neotokyo-sequence__readout");
    if (readout && readout.dataset.typing !== "true") followTrailerEnd(readout);
  }, { passive: true });

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
      if (readout.dataset.typing === "true") startTrailerLoop(readout);
      else followTrailerEnd(readout);
    });
  }

  // One requestAnimationFrame loop per typed readout. Each frame it
  //  1. reads the caret's line (the end of the already-read text) and turns it into the height the frame should show,
  //  2. moves the frame's current height toward that value (exponential smoothing; no smoothing under
  //     prefers-reduced-motion, where it switches line by line),
  //  3. keeps the frame's bottom in view by setting the page scroll to the same interpolated bottom.
  // The text itself never moves: the whole text is laid out from the start (js/act-showcase-neotokyo.js).
  function startTrailerLoop(readout) {
    if (trailerLoops.has(readout)) return;
    const loop = { frame: 0, current: NaN, last: performance.now() };
    trailerLoops.set(readout, loop);
    const tick = now => {
      loop.frame = 0;
      if (!readout.isConnected) { trailerLoops.delete(readout); return; }
      if (readout.dataset.typing !== "true") { trailerLoops.delete(readout); followTrailerEnd(readout); return; }
      updateTrailerFrame(readout, loop, now);
      loop.frame = requestAnimationFrame(tick);
    };
    loop.frame = requestAnimationFrame(tick);
  }

  function trailerParts(readout) {
    const screen = readout.closest(".neotokyo-sequence__screen--trailer");
    const stage = screen?.closest(".neotokyo-sequence__stage");
    const terminal = readout.closest(".neotokyo-sequence__trailer-terminal");
    return { screen, stage, terminal };
  }

  // The height of the frame (the terminal) that ends at the bottom of the caret's line, with the readout's own
  // bottom padding and the frame's bottom border, so a finished line looks exactly like the final frame.
  function frameHeightForCaret(readout, terminal) {
    const read = readout.querySelector(".neotokyo-sequence__readout-read");
    const textNode = read?.firstChild;
    const readoutStyle = getComputedStyle(readout);
    const lineHeight = parseFloat(readoutStyle.lineHeight) || parseFloat(readoutStyle.fontSize) * 1.95;
    const terminalRect = terminal.getBoundingClientRect();
    let lineBottom;
    const length = textNode?.length || 0;
    if (length > 0) {
      const range = document.createRange();
      range.setStart(textNode, length - 1);
      range.setEnd(textNode, length);
      const rects = [...range.getClientRects()].filter(rect => rect.height > 0);
      const rect = rects.at(-1);
      if (rect) lineBottom = rect.bottom + (lineHeight - rect.height) / 2;
    }
    if (lineBottom === undefined) {
      lineBottom = readout.getBoundingClientRect().top + parseFloat(readoutStyle.paddingTop) + lineHeight;
    }
    const terminalStyle = getComputedStyle(terminal);
    const extra = terminalStyle.boxSizing === "border-box"
      ? 0
      : parseFloat(terminalStyle.paddingTop) + parseFloat(terminalStyle.paddingBottom) + parseFloat(terminalStyle.borderTopWidth) + parseFloat(terminalStyle.borderBottomWidth);
    const paddingBottom = parseFloat(readoutStyle.paddingBottom);
    return {
      height: lineBottom - terminalRect.top + paddingBottom + parseFloat(terminalStyle.borderBottomWidth) - extra,
      lineHeight,
      paddingBottom
    };
  }

  function updateTrailerFrame(readout, loop, now) {
    const { screen, stage, terminal } = trailerParts(readout);
    if (!screen || !stage || !terminal) return;
    stage.classList.add("is-trailer-scroll");
    document.body.classList.add("showcase-trailer-document-scroll");
    readout.scrollTop = 0;

    const { height: target, lineHeight, paddingBottom } = frameHeightForCaret(readout, terminal);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const elapsed = now - loop.last;
    loop.last = now;
    // The reading line must stay in view: its bottom may hang at most one line below the frame's bottom edge
    // (target includes the readout's bottom padding, which is why that padding is added to the allowed lag).
    loop.current = settleHeight(loop.current, target, elapsed, { reduced, maxStep: lineHeight * 0.45, maxLag: lineHeight + paddingBottom });
    terminal.style.height = `${loop.current}px`;
    // The line being typed can be a little ahead of the frame while it catches up: clip to the frame's own bottom edge
    // (clip-path, so the frame's overflow stays visible and the page keeps owning the scrolling; the other three sides
    // are open so its glow is not cut).
    terminal.style.clipPath = "inset(-80px -80px 0 -80px)";
    followFrameBottom(terminal, loop.current);
  }

  // Page scroll that keeps the frame's (interpolated) bottom inside the viewport; never scrolls back up.
  function followFrameBottom(terminal, height) {
    const viewportPadding = Math.max(72, Math.min(140, window.innerHeight * 0.14));
    const bottom = terminal.getBoundingClientRect().top + window.scrollY + height;
    const targetTop = Math.max(0, bottom - (window.innerHeight - viewportPadding));
    // "instant", not "auto": "auto" follows the page's CSS scroll-behavior (smooth), which would restart its animation
    // on every frame and never get anywhere. The frame's bottom is already interpolated, so an instant scroll is smooth.
    if (targetTop > window.scrollY + 0.5) window.scrollTo({ top: targetTop, left: 0, behavior: "instant" });
  }

  // Reading ended (completed, skipped, or no typing at all): the frame goes straight to its natural final height.
  function followTrailerEnd(readout) {
    const { screen, stage, terminal } = trailerParts(readout);
    if (!screen || !stage) return;
    stage.classList.add("is-trailer-scroll");
    document.body.classList.add("showcase-trailer-document-scroll");
    readout.scrollTop = 0;
    if (!terminal) return;
    terminal.style.removeProperty("height");
    terminal.style.removeProperty("clip-path");
    followFrameBottom(terminal, terminal.getBoundingClientRect().height);
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
