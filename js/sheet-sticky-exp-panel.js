(() => {
  const root = document.documentElement;
  const header = document.querySelector(".sheet-header");
  const layout = document.querySelector(".sheet-layout");
  const panel = document.querySelector(".exp-panel");
  const saveButton = document.querySelector("#save-button");
  const visibilityControl = document.querySelector("#visibility")?.closest("label");
  const isNewCharacter = !new URLSearchParams(window.location.search).get("id");
  const desktop = window.matchMedia("(min-width:981px)");

  let framePending = false;
  let userInteracted = false;
  let arrangingPanel = false;

  const enforcePanelOrder = () => {
    if (arrangingPanel || !panel || !saveButton || !visibilityControl) return;
    if (visibilityControl.parentElement !== panel || saveButton.parentElement !== panel) return;
    if (visibilityControl.nextElementSibling === saveButton) return;
    arrangingPanel = true;
    panel.insertBefore(visibilityControl, saveButton);
    arrangingPanel = false;
  };

  const markUserInteraction = () => {
    userInteracted = true;
  };

  if (isNewCharacter) {
    ["wheel", "touchstart", "pointerdown", "keydown"].forEach(type => {
      window.addEventListener(type, markUserInteraction, { passive: true, once: true });
    });
  }

  const resetToTop = () => {
    if (!isNewCharacter || userInteracted) return;
    const active = document.activeElement;
    if (active && active !== document.body && typeof active.blur === "function") active.blur();
    window.scrollTo(0, 0);
    root.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  };

  if (isNewCharacter && "scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }

  const updateOffset = () => {
    const height = Math.ceil(header?.getBoundingClientRect().height || 0);
    root.style.setProperty("--sheet-editor-sticky-offset", `${Math.max(18, height + 16)}px`);
  };

  const updatePanelPosition = () => {
    framePending = false;
    enforcePanelOrder();
    if (!panel || !layout || !desktop.matches) {
      root.style.setProperty("--sheet-editor-exp-shift", "0px");
      return;
    }

    const offset = parseFloat(getComputedStyle(root).getPropertyValue("--sheet-editor-sticky-offset")) || 18;
    const layoutTop = layout.getBoundingClientRect().top + window.scrollY;
    const desired = Math.max(0, window.scrollY + offset - layoutTop);
    const available = Math.max(0, layout.scrollHeight - panel.offsetHeight);
    const shift = Math.min(desired, available);
    root.style.setProperty("--sheet-editor-exp-shift", `${Math.round(shift)}px`);
  };

  const queuePanelUpdate = () => {
    if (framePending) return;
    framePending = true;
    requestAnimationFrame(updatePanelPosition);
  };

  enforcePanelOrder();
  updateOffset();
  updatePanelPosition();
  resetToTop();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    enforcePanelOrder();
    resetToTop();
    queuePanelUpdate();
  }));

  window.addEventListener("scroll", queuePanelUpdate, { passive: true });
  window.addEventListener("resize", () => {
    updateOffset();
    queuePanelUpdate();
  }, { passive: true });
  window.addEventListener("load", () => {
    enforcePanelOrder();
    resetToTop();
    queuePanelUpdate();
  }, { once: true });

  window.addEventListener("tnx:general-master-ready", () => {
    enforcePanelOrder();
    resetToTop();
    requestAnimationFrame(() => {
      enforcePanelOrder();
      resetToTop();
      queuePanelUpdate();
    });
  });

  if (panel) {
    new MutationObserver(() => {
      enforcePanelOrder();
      queuePanelUpdate();
    }).observe(panel, { childList: true });
  }

  if (header && "ResizeObserver" in window) {
    new ResizeObserver(() => {
      updateOffset();
      queuePanelUpdate();
    }).observe(header);
  }

  if (layout && "ResizeObserver" in window) {
    const observer = new ResizeObserver(queuePanelUpdate);
    observer.observe(layout);
    if (panel) observer.observe(panel);
  }
})();
