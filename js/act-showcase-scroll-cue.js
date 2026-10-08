(() => {
  const intro = document.querySelector("#cinematic-intro");
  if (!intro) return;

  // The handout -> assignment screen scrolls inside itself on a phone. While there is more below the fold the
  // screen carries data-scroll-cue="1" (CSS draws a soft fade and a down arrow at its bottom edge); the mark goes
  // away as soon as the end is reached, and never appears where the screen does not scroll (desktop).
  const SCREEN = ".neotokyo-sequence__screen--linked.is-splitting";
  const ROOM = 6;
  const REVEAL_MS = 800;
  const TAP_MS = 500;
  const TOUCH_SLOP = 8;
  const RECENT_MS = 600;
  const MAX_WAIT_MS = 4000;
  const CUE_TAP_HEIGHT = 48;
  const tracked = new WeakSet();
  const revealed = new WeakSet();
  const manual = new WeakSet();
  const lastTop = new WeakMap();
  const touchOrigin = new WeakMap();
  let frame = 0;
  let job = null;
  let jobFrame = 0;
  let assignedTop = null;
  let userAt = -Infinity;
  let waitTimer = 0;

  // ?debug=cue shows the state of the automatic scroll at the bottom of the screen; nothing is drawn otherwise.
  const debug = new URLSearchParams(location.search).get("debug") === "cue";
  let badge = null;
  const report = (state, reason = "") => {
    if (!debug) return;
    if (!badge) {
      badge = document.createElement("div");
      badge.setAttribute("data-cue-debug", "");
      badge.setAttribute("aria-hidden", "true");
      badge.style.cssText = "position:fixed;left:6px;bottom:2px;z-index:99999;pointer-events:none;color:#9fe;font:10px/1.2 monospace;background:rgba(0,0,0,.6);padding:1px 4px";
      document.body.append(badge);
    }
    const text = reason ? `${state}(${reason})` : state;
    badge.textContent = `cue: ${text}`;
    badge.setAttribute("data-cue-state", text);
  };

  const reduced = () => window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true
    || document.body.classList.contains("showcase-neotokyo-reduced");
  const finished = () => intro.getAttribute("aria-hidden") === "true";
  const scrolls = screen => /^(auto|scroll)$/.test(getComputedStyle(screen).overflowY);

  const refresh = () => {
    frame = 0;
    for (const screen of intro.querySelectorAll(SCREEN)) {
      if (!tracked.has(screen)) {
        tracked.add(screen);
        lastTop.set(screen, screen.scrollTop);
        screen.addEventListener("scroll", () => { noteScroll(screen); queue(); }, { passive: true });
        sizeWatcher?.observe(screen);
        const layout = screen.querySelector(".neotokyo-sequence__linked-layout");
        if (layout) sizeWatcher?.observe(layout);
      }
      if (screen.classList.contains("is-assigned") && !revealed.has(screen)) {
        revealed.add(screen);
        report("waiting");
        requestAnimationFrame(() => requestAnimationFrame(() => attemptReveal(screen, performance.now())));
      }
      const more = screen.scrollHeight - screen.clientHeight - screen.scrollTop > ROOM;
      const next = scrolls(screen) && more;
      if (screen.hasAttribute("data-scroll-cue") !== next) {
        if (next) screen.setAttribute("data-scroll-cue", "1");
        else screen.removeAttribute("data-scroll-cue");
      }
    }
  };

  const anchorOf = screen => screen.querySelector(".neotokyo-sequence__link-bridge") || screen.querySelector(".neotokyo-sequence__assign-panel");
  const anchorTarget = (screen, maxTop) => {
    const anchor = anchorOf(screen);
    if (!anchor) return null;
    const shift = anchor.getBoundingClientRect().top - screen.getBoundingClientRect().top - 12;
    return Math.max(0, Math.min(maxTop, Math.round(screen.scrollTop + shift)));
  };
  const cardInView = screen => {
    const card = screen.querySelector(".neotokyo-sequence__assign-panel") || anchorOf(screen);
    if (!card) return false;
    const frameBox = screen.getBoundingClientRect();
    const top = card.getBoundingClientRect().top;
    return top >= frameBox.top && top < frameBox.bottom - 40;
  };

  // A reader scrolling by hand: a drag past the touch slop, the wheel, or a scroll that we did not cause.
  // A bare touchstart / pointerdown (a tap) is not scrolling.
  function markManual(screen) {
    manual.add(screen);
    userAt = performance.now();
    if (job?.screen === screen) stopJob("skipped", "manual");
  }
  function noteScroll(screen) {
    const top = screen.scrollTop;
    const before = lastTop.get(screen) ?? top;
    lastTop.set(screen, top);
    if (Math.abs(top - before) <= 1) return;
    if (assignedTop !== null && Math.abs(top - assignedTop) <= 1.5) return;
    markManual(screen);
  }

  // Once the cast card is in place, bring the LINKING divider and the top of the assignment card into view
  // (rAF-interpolated scrollTop, ~800ms). It waits while the reader is mid-scroll, runs once even after a manual
  // scroll if the card is still out of view, and is skipped under reduced motion or once the intro is skipped or
  // finished. It stops the moment the reader scrolls or advances.
  function attemptReveal(screen, since) {
    waitTimer = 0;
    if (!screen.isConnected) return;
    if (finished()) return report("skipped", "finished");
    if (reduced()) return report("skipped", "reduced");
    const idle = performance.now() - userAt;
    if (idle < RECENT_MS) {
      if (performance.now() - since > MAX_WAIT_MS) return report("skipped", "manual");
      report("waiting");
      waitTimer = setTimeout(() => attemptReveal(screen, since), RECENT_MS - idle + 20);
      return;
    }
    if (!scrolls(screen)) return report("skipped", "no-room");
    const maxTop = screen.scrollHeight - screen.clientHeight;
    if (maxTop <= ROOM) return report("skipped", "no-room");
    if (!anchorOf(screen)) return report("skipped", "no-anchor");
    if (manual.has(screen) && cardInView(screen)) return report("skipped", "manual");
    const to = anchorTarget(screen, maxTop);
    if (to === null || to <= screen.scrollTop + 2) return report("skipped", "no-room");
    startJob(screen, to, REVEAL_MS, "reveal");
  }

  function startJob(screen, to, ms, kind) {
    cancelJob();
    job = { screen, from: screen.scrollTop, to, ms, kind, start: performance.now() };
    report("revealing");
    jobFrame = requestAnimationFrame(stepJob);
  }

  function stepJob(now) {
    jobFrame = 0;
    const current = job;
    if (!current) return;
    const { screen } = current;
    if (!screen.isConnected || finished()) return stopJob("skipped", "finished");
    if (userAt > current.start) return stopJob("skipped", "manual");
    if (current.kind === "reveal" && reduced()) return stopJob("skipped", "reduced");
    const progress = Math.min(1, (now - current.start) / current.ms);
    const eased = progress < 0.5 ? 4 * progress ** 3 : 1 - ((-2 * progress + 2) ** 3) / 2;
    assignedTop = current.from + (current.to - current.from) * eased;
    screen.scrollTop = assignedTop;
    assignedTop = screen.scrollTop;
    if (progress < 1) jobFrame = requestAnimationFrame(stepJob);
    else stopJob("done");
  }

  function cancelJob() {
    job = null;
    if (jobFrame) cancelAnimationFrame(jobFrame);
    jobFrame = 0;
  }
  function stopJob(state, reason) {
    cancelJob();
    report(state, reason);
  }

  // Tapping the arrow at the bottom edge scrolls to the top of the assignment card (or to the end once past it).
  function tapCue(screen) {
    const maxTop = screen.scrollHeight - screen.clientHeight;
    let to = anchorTarget(screen, maxTop);
    if (to === null || to <= screen.scrollTop + 2) to = maxTop;
    if (to <= screen.scrollTop + 2) return;
    if (waitTimer) { clearTimeout(waitTimer); waitTimer = 0; }
    if (reduced()) {
      cancelJob();
      assignedTop = to;
      screen.scrollTop = to;
      report("done");
      return;
    }
    startJob(screen, to, TAP_MS, "tap");
  }

  const screenOf = event => (event.target instanceof Element ? event.target.closest(SCREEN) : null);
  const isControl = event => event.target instanceof Element && event.target.closest(".neotokyo-sequence__advance, .neotokyo-sequence__skip");

  intro.addEventListener("touchstart", event => {
    const screen = screenOf(event);
    if (screen && !isControl(event) && event.touches?.length) touchOrigin.set(screen, event.touches[0].clientY);
  }, { capture: true, passive: true });
  intro.addEventListener("touchmove", event => {
    const screen = screenOf(event);
    if (!screen || !event.touches?.length) return;
    const origin = touchOrigin.get(screen);
    if (origin !== undefined && Math.abs(event.touches[0].clientY - origin) > TOUCH_SLOP) markManual(screen);
    else if (manual.has(screen)) userAt = performance.now();
  }, { capture: true, passive: true });
  intro.addEventListener("wheel", event => {
    const screen = screenOf(event);
    if (screen && event.deltaY !== 0) markManual(screen);
  }, { capture: true, passive: true });

  // Advancing or skipping must switch screens at once, not wait for a scroll to finish.
  intro.addEventListener("click", event => {
    if (isControl(event)) {
      if (waitTimer) { clearTimeout(waitTimer); waitTimer = 0; }
      if (job) stopJob("skipped", "finished");
      return;
    }
    const screen = screenOf(event);
    if (!screen || event.target !== screen || !screen.hasAttribute("data-scroll-cue")) return;
    if (event.clientY < screen.getBoundingClientRect().bottom - CUE_TAP_HEIGHT) return;
    // The stage advances on any tap outside a button; the arrow only scrolls.
    event.stopPropagation();
    tapCue(screen);
  }, { capture: true });

  function queue() {
    if (!frame) frame = requestAnimationFrame(refresh);
  }

  const sizeWatcher = typeof ResizeObserver === "function" ? new ResizeObserver(queue) : null;
  const hasStructuralElementMutation = records => records.some(record => record.type === "attributes"
    || [...record.addedNodes, ...record.removedNodes].some(item => item.nodeType === Node.ELEMENT_NODE));
  new MutationObserver(records => {
    if (hasStructuralElementMutation(records)) queue();
  }).observe(intro, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  addEventListener("resize", queue, { passive: true });
  queue();
})();
