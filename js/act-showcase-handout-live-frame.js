(() => {
  if (document.body?.id !== "act-showcase-page") return;

  const intro = document.querySelector("#cinematic-intro");
  if (!intro) return;

  const supportsResizeObserver = typeof ResizeObserver === "function";
  const readoutObservers = new WeakMap();
  const lastHeights = new WeakMap();
  const handoutScrollTargets = new WeakMap();
  const pendingReadouts = new Set();
  let activeReadout = null;
  let activeStage = null;
  let syncScheduled = false;
  let readoutFrameScheduled = false;

  const mutationObserver = new MutationObserver(records => {
    let surfaceMayHaveChanged = false;

    for (const record of records) {
      const readout = closestHandoutReadout(record.target);

      if (record.type === "characterData") {
        if (readout) scheduleReadout(readout);
        continue;
      }

      if (record.type === "childList") {
        if (readout) {
          scheduleReadout(readout);
          continue;
        }

        const nodes = [...record.addedNodes, ...record.removedNodes];
        if (nodes.some(node => node.nodeType === Node.ELEMENT_NODE)) surfaceMayHaveChanged = true;
        continue;
      }

      if (record.type === "attributes") {
        const target = record.target instanceof Element ? record.target : null;
        if (target?.classList.contains("neotokyo-sequence__screen")) surfaceMayHaveChanged = true;
      }
    }

    if (surfaceMayHaveChanged) scheduleSync();
  });
  mutationObserver.observe(intro, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["class"]
  });
  window.addEventListener("resize", scheduleSync, { passive: true });
  scheduleSync();

  function scheduleSync() {
    if (syncScheduled) return;
    syncScheduled = true;
    requestAnimationFrame(() => {
      syncScheduled = false;
      syncHandout();
    });
  }

  function scheduleReadout(readout) {
    if (!readout?.isConnected) return;
    pendingReadouts.add(readout);
    if (readoutFrameScheduled) return;
    readoutFrameScheduled = true;
    requestAnimationFrame(() => {
      readoutFrameScheduled = false;
      const readouts = [...pendingReadouts];
      pendingReadouts.clear();
      readouts.forEach(updateReadout);
    });
  }

  function syncHandout() {
    const stage = intro.querySelector(".neotokyo-sequence__stage");
    const screen = intro.querySelector(".neotokyo-sequence__screen--linked");
    const readout = screen?.querySelector(".neotokyo-sequence__handout-panel .neotokyo-sequence__readout");
    const live = Boolean(stage && screen && readout && !screen.classList.contains("is-splitting"));

    if (!live) {
      if (stage?.classList.contains("is-handout-scroll")) stage.classList.remove("is-handout-scroll");
      if (activeStage) handoutScrollTargets.delete(activeStage);
      if (activeReadout) releaseReadout(activeReadout);
      activeReadout = null;
      activeStage = null;
      return;
    }

    if (!stage.classList.contains("is-handout-scroll")) stage.classList.add("is-handout-scroll");
    if (activeReadout !== readout || activeStage !== stage) {
      if (activeReadout) releaseReadout(activeReadout);
      if (activeStage) handoutScrollTargets.delete(activeStage);
      activeReadout = readout;
      activeStage = stage;
      stage.scrollTop = 0;
      handoutScrollTargets.delete(stage);
    }

    observeReadout(readout);
    scheduleReadout(readout);
  }

  function observeReadout(readout) {
    if (readoutObservers.has(readout) || !supportsResizeObserver) return;
    const resizeObserver = new ResizeObserver(() => scheduleReadout(readout));
    readoutObservers.set(readout, resizeObserver);
    resizeObserver.observe(readout);
  }

  function updateReadout(readout) {
    if (!readout?.isConnected || readout !== activeReadout) return;
    const screen = readout.closest(".neotokyo-sequence__screen--linked");
    const stage = screen?.closest(".neotokyo-sequence__stage");
    if (!screen || !stage || stage !== activeStage || screen.classList.contains("is-splitting")) return;

    const styles = getComputedStyle(readout);
    const lineHeight = numeric(styles.lineHeight) || numeric(styles.fontSize) * 1.67 || 24;
    const minHeight = Math.ceil(
      lineHeight * 2 + numeric(styles.paddingTop) + numeric(styles.paddingBottom)
    );
    const targetHeight = Math.max(minHeight, Math.ceil(readout.scrollHeight));
    const previousHeight = lastHeights.get(readout);

    if (previousHeight !== targetHeight) {
      lastHeights.set(readout, targetHeight);
      readout.style.minHeight = `${minHeight}px`;
      readout.style.height = `${targetHeight}px`;
      readout.style.maxHeight = "none";
      readout.style.overflow = "visible";
      readout.style.flex = "0 0 auto";
      readout.style.transition = prefersReducedMotion()
        ? "none"
        : "height .16s cubic-bezier(.22,.61,.36,1)";
      readout.style.setProperty("--showcase-handout-live-height", `${targetHeight}px`);
    }

    followHandout(stage, readout, targetHeight);
  }

  function followHandout(stage, readout, targetHeight) {
    if (!stage?.isConnected || readout !== activeReadout || stage !== activeStage) return;

    const remainingGrowth = Math.max(0, targetHeight - readout.clientHeight);
    const targetTop = Math.max(
      0,
      Math.ceil(stage.scrollHeight - stage.clientHeight + remainingGrowth)
    );
    const previousTarget = handoutScrollTargets.get(stage);

    if (targetTop <= stage.scrollTop + 1) {
      handoutScrollTargets.set(stage, targetTop);
      return;
    }
    if (Number.isFinite(previousTarget) && Math.abs(targetTop - previousTarget) <= 1) return;

    handoutScrollTargets.set(stage, targetTop);
    stage.scrollTo({
      top: targetTop,
      left: 0,
      behavior: prefersReducedMotion() ? "auto" : "smooth"
    });
  }

  function releaseReadout(readout) {
    pendingReadouts.delete(readout);
    lastHeights.delete(readout);
    const resizeObserver = readoutObservers.get(readout);
    resizeObserver?.disconnect();
    readoutObservers.delete(readout);
    for (const property of ["min-height", "height", "max-height", "overflow", "flex", "transition", "--showcase-handout-live-height"]) {
      readout.style.removeProperty(property);
    }
  }

  function closestHandoutReadout(target) {
    const element = target instanceof Element ? target : target?.parentElement;
    return element?.closest?.(".neotokyo-sequence__handout-panel .neotokyo-sequence__readout") || null;
  }

  function numeric(value) {
    const parsed = Number.parseFloat(value || "0");
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function prefersReducedMotion() {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
  }
})();
