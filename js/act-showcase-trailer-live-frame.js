(() => {
  if (document.body?.id !== "act-showcase-page") return;

  const intro = document.querySelector("#cinematic-intro");
  if (!intro) return;

  const supportsResizeObserver = typeof ResizeObserver === "function";
  const observedReadouts = new WeakSet();
  const lastHeights = new WeakMap();
  const pendingReadouts = new Set();
  let syncScheduled = false;
  let frameScheduled = false;

  const observer = new MutationObserver(records => {
    let structureChanged = false;
    for (const record of records) {
      if (record.type !== "childList") continue;
      const nodes = [...record.addedNodes, ...record.removedNodes];
      if (nodes.some(node => node.nodeType === Node.ELEMENT_NODE)) {
        structureChanged = true;
        break;
      }
    }

    if (structureChanged || !supportsResizeObserver) scheduleSync();
  });
  observer.observe(intro, { subtree: true, childList: true, characterData: !supportsResizeObserver });
  window.addEventListener("resize", scheduleSync, { passive: true });
  scheduleSync();

  function scheduleSync() {
    if (syncScheduled) return;
    syncScheduled = true;
    requestAnimationFrame(() => {
      syncScheduled = false;
      syncAll();
    });
  }

  function scheduleFrame(readout) {
    if (!readout?.isConnected) return;
    pendingReadouts.add(readout);
    if (frameScheduled) return;
    frameScheduled = true;
    requestAnimationFrame(() => {
      frameScheduled = false;
      const readouts = [...pendingReadouts];
      pendingReadouts.clear();
      readouts.forEach(updateFrame);
    });
  }

  function syncAll() {
    const readouts = intro.querySelectorAll(
      ".neotokyo-sequence__screen--trailer .neotokyo-sequence__trailer-terminal .neotokyo-sequence__readout"
    );
    for (const readout of readouts) {
      observeReadout(readout);
      scheduleFrame(readout);
    }
  }

  function observeReadout(readout) {
    if (observedReadouts.has(readout) || !supportsResizeObserver) return;
    observedReadouts.add(readout);
    const resizeObserver = new ResizeObserver(() => scheduleFrame(readout));
    resizeObserver.observe(readout);
  }

  function updateFrame(readout) {
    if (!readout?.isConnected) return;
    const terminal = readout.closest(".neotokyo-sequence__trailer-terminal");
    if (!terminal) return;

    const bar = terminal.querySelector(".neotokyo-sequence__terminal-bar");
    const styles = getComputedStyle(terminal);
    const verticalPadding = numeric(styles.paddingTop) + numeric(styles.paddingBottom);
    const targetHeight = Math.max(
      94,
      Math.ceil(readout.scrollHeight + (bar?.offsetHeight || 0) + verticalPadding + 30)
    );

    if (lastHeights.get(terminal) === targetHeight) return;
    lastHeights.set(terminal, targetHeight);

    terminal.style.minHeight = "94px";
    terminal.style.height = `${targetHeight}px`;
    terminal.style.maxHeight = "none";
    terminal.style.overflow = "visible";
    terminal.style.transition = prefersReducedMotion()
      ? "none"
      : "height .16s cubic-bezier(.22,.61,.36,1)";
    terminal.style.setProperty("--showcase-trailer-live-height", `${targetHeight}px`);
  }

  function numeric(value) {
    const parsed = Number.parseFloat(value || "0");
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function prefersReducedMotion() {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
  }
})();
