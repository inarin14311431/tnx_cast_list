(() => {
  function initializeCastTabs() {
    const root = document.documentElement;
    if (root.dataset.castTabsInitialized === "1") return;
    root.dataset.castTabsInitialized = "1";

    const TAB_SELECTOR = ".cast-tab[data-tab]";
    const PANEL_SELECTOR = ".cast-tab-panel[data-panel]";

    function activateTab(tabName, options = {}) {
      const tabs = [...document.querySelectorAll(TAB_SELECTOR)];
      const panels = [...document.querySelectorAll(PANEL_SELECTOR)];
      const targetTab = tabs.find(tab => tab.dataset.tab === tabName);
      const targetPanel = panels.find(panel => panel.dataset.panel === tabName);
      if (!targetTab || !targetPanel) return false;

      tabs.forEach(tab => {
        const active = tab === targetTab;
        tab.classList.toggle("is-active", active);
        tab.setAttribute("role", "tab");
        tab.setAttribute("aria-selected", String(active));
        tab.tabIndex = active ? 0 : -1;
      });

      panels.forEach(panel => {
        const active = panel === targetPanel;
        panel.classList.toggle("is-active", active);
        panel.setAttribute("role", "tabpanel");
        panel.setAttribute("aria-hidden", String(!active));
      });

      document.querySelector(".cast-tab-list")?.setAttribute("role", "tablist");
      if (options.focus) targetTab.focus();
      return true;
    }

    function initializeTabs() {
      const selected = document.querySelector(`${TAB_SELECTOR}.is-active`)?.dataset.tab;
      activateTab(selected || "session");
    }

    document.addEventListener("click", event => {
      const jump = event.target.closest('[data-cast-jump="combo"]');
      if (jump) {
        event.preventDefault();
        activateTab("session");
        requestAnimationFrame(() => {
          document.querySelector("#cast-combo-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
        return;
      }

      const tab = event.target.closest(TAB_SELECTOR);
      if (!tab) return;
      event.preventDefault();
      activateTab(tab.dataset.tab);
    });

    document.addEventListener("keydown", event => {
      const current = event.target.closest(TAB_SELECTOR);
      if (!current || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;

      const tabs = [...document.querySelectorAll(TAB_SELECTOR)];
      const currentIndex = tabs.indexOf(current);
      if (currentIndex < 0 || !tabs.length) return;

      event.preventDefault();
      let nextIndex = currentIndex;
      if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = tabs.length - 1;
      activateTab(tabs[nextIndex].dataset.tab, { focus: true });
    });

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initializeTabs, { once: true });
    else initializeTabs();
  }

  initializeCastTabs();
})();

(() => {
  function initializeCastSummaryControl() {
    const panel = document.querySelector("#cast-summary-panel");
    const summary = document.querySelector("#cast-summary");
    const toggle = document.querySelector("#cast-summary-toggle");
    const hero = document.querySelector(".cast-hero");
    if (!panel || !summary || !toggle || panel.dataset.summaryControlInitialized === "1") return;
    panel.dataset.summaryControlInitialized = "1";

    let measureFrame = 0;

    function setExpanded(expanded) {
      panel.classList.toggle("is-expanded", expanded);
      hero?.classList.toggle("is-summary-expanded", expanded);
      toggle.setAttribute("aria-expanded", String(expanded));
      toggle.innerHTML = expanded
        ? "<span>折りたたむ</span><small>COLLAPSE</small>"
        : "<span>全文表示</span><small>EXPAND</small>";
    }

    function measure() {
      measureFrame = 0;
      const hasSummary = Boolean(summary.textContent.trim());
      panel.hidden = !hasSummary;
      if (!hasSummary) {
        setExpanded(false);
        toggle.hidden = true;
        return;
      }
      if (panel.classList.contains("is-expanded")) {
        toggle.hidden = false;
        return;
      }
      toggle.hidden = summary.scrollHeight <= summary.clientHeight + 1;
    }

    function scheduleMeasure() {
      if (measureFrame) cancelAnimationFrame(measureFrame);
      measureFrame = requestAnimationFrame(measure);
    }

    toggle.addEventListener("click", () => {
      setExpanded(!panel.classList.contains("is-expanded"));
      scheduleMeasure();
    });

    new MutationObserver(() => {
      setExpanded(false);
      scheduleMeasure();
    }).observe(summary, { childList: true, characterData: true, subtree: true });

    window.addEventListener("resize", scheduleMeasure, { passive: true });
    scheduleMeasure();
  }

  initializeCastSummaryControl();
})();

(() => {
  function initializeCastDescriptionControls() {
    const root = document.documentElement;
    if (root.dataset.castDescriptionControlsInitialized === "1") return;
    root.dataset.castDescriptionControlsInitialized = "1";

    const STYLE_FIELD_SELECTOR = ".style-description-expandable";
    const OUTFIT_FIELD_SELECTOR = ".outfit-description-expandable";

    function resizeDescriptionField(field, expanded) {
      field.classList.toggle("is-expanded", expanded);
      field.closest("tr")?.classList.toggle("is-description-expanded", expanded);
      field.scrollTop = 0;
      field.scrollLeft = 0;
      field.setAttribute("aria-expanded", String(expanded));
      field.dataset.descriptionExpanded = expanded ? "1" : "0";

      if (!expanded) {
        field.style.removeProperty("height");
        return;
      }

      field.style.setProperty("height", "auto", "important");
      requestAnimationFrame(() => {
        if (!field.isConnected || field.dataset.descriptionExpanded !== "1") return;
        field.style.setProperty("height", `${Math.max(35, field.scrollHeight + 2)}px`, "important");
      });
    }

    function setDescriptionFields(scope, selector, expanded) {
      [...scope.querySelectorAll(selector)].forEach(field => resizeDescriptionField(field, expanded));
    }

    function updateButton(button, expanded) {
      if (!button) return;
      button.textContent = expanded ? "縮小" : "全表示";
      button.setAttribute("aria-pressed", String(expanded));
      button.setAttribute("aria-label", expanded ? "すべての解説を縮小" : "すべての解説を表示");
    }

    function descriptionScope(field) {
      const outfitSection = field.closest(".cast-outfit-section");
      const styleSection = field.closest(".style-skill-view-editorlike, .style-skill-section-v47, .skill-section");
      return {
        scope: outfitSection || styleSection,
        selector: outfitSection ? OUTFIT_FIELD_SELECTOR : STYLE_FIELD_SELECTOR
      };
    }

    function syncAllState(scope, selector) {
      if (!scope) return;
      const fields = [...scope.querySelectorAll(selector)];
      const allExpanded = fields.length > 0 && fields.every(field => field.classList.contains("is-expanded"));
      scope.classList.toggle("is-description-all-expanded", allExpanded);
      updateButton(scope.querySelector(".style-description-toggle-all"), allExpanded);
    }

    function isScrollbarInteraction(event, field) {
      if (event.target !== field || field.scrollHeight <= field.clientHeight + 1) return false;
      const scrollbarWidth = Math.max(12, field.offsetWidth - field.clientWidth);
      return event.offsetX >= field.clientWidth - scrollbarWidth;
    }

    document.addEventListener("click", event => {
      const button = event.target.closest(".style-description-toggle-all");
      if (button) {
        const outfitSection = button.closest(".cast-outfit-section");
        const styleSection = button.closest(".style-skill-view-editorlike, .style-skill-section-v47, .skill-section");
        const scope = outfitSection || styleSection;
        if (!scope) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const selector = outfitSection ? OUTFIT_FIELD_SELECTOR : STYLE_FIELD_SELECTOR;
        const expanded = !scope.classList.contains("is-description-all-expanded");
        setDescriptionFields(scope, selector, expanded);
        scope.classList.toggle("is-description-all-expanded", expanded);
        updateButton(button, expanded);

        if (!outfitSection) {
          const table = scope.querySelector(".style-skill-view-table");
          table?.style.removeProperty("min-width");
          table?.querySelector("col.style-col-description")?.style.removeProperty("width");
        }
        return;
      }

      const cell = event.target.closest(".style-view-cell--description");
      const field = cell?.querySelector(`${STYLE_FIELD_SELECTOR}, ${OUTFIT_FIELD_SELECTOR}`);
      if (!field) return;
      if (isScrollbarInteraction(event, field)) return;

      const { scope, selector } = descriptionScope(field);
      if (!scope) return;

      const expanded = !field.classList.contains("is-expanded");
      resizeDescriptionField(field, expanded);
      syncAllState(scope, selector);
    }, true);

    document.addEventListener("keydown", event => {
      const field = event.target.closest?.(`${STYLE_FIELD_SELECTOR}, ${OUTFIT_FIELD_SELECTOR}`);
      if (!field || !["Enter", " "].includes(event.key)) return;
      event.preventDefault();
      const { scope, selector } = descriptionScope(field);
      resizeDescriptionField(field, !field.classList.contains("is-expanded"));
      syncAllState(scope, selector);
    }, true);

    function prepareDescriptionFields() {
      document.querySelectorAll(`${STYLE_FIELD_SELECTOR}, ${OUTFIT_FIELD_SELECTOR}`).forEach(field => {
        if (field.dataset.descriptionClickReady === "1") return;
        field.dataset.descriptionClickReady = "1";
        field.tabIndex = 0;
        field.setAttribute("role", "button");
        field.setAttribute("aria-expanded", String(field.classList.contains("is-expanded")));
        field.setAttribute("title", "クリックでこの解説だけ全文表示／折りたたみ");
      });
    }

    new MutationObserver(prepareDescriptionFields).observe(document.body, { childList: true, subtree: true });
    prepareDescriptionFields();
  }

  initializeCastDescriptionControls();
})();

(() => {
  function initializeCastPanelCollapse() {
    const root = document.querySelector("#cast-content");
    if (!root || root.dataset.castPanelCollapseInitialized === "1") return;
    root.dataset.castPanelCollapseInitialized = "1";

    function setupPanel(panel) {
      if (panel.dataset.collapseReady) return;
      const header = panel.querySelector(":scope > .data-panel__header");
      if (!header) return;

      header.setAttribute("role", "button");
      header.tabIndex = 0;
      header.setAttribute("aria-expanded", "true");

      const toggle = () => {
        const collapsed = panel.classList.toggle("is-collapsed");
        header.setAttribute("aria-expanded", String(!collapsed));
      };

      header.addEventListener("click", toggle);
      header.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggle();
        }
      });

      panel.dataset.collapseReady = "1";
    }

    const setup = () => {
      document.querySelectorAll("#tab-session .data-panel, #tab-outfits .data-panel, #tab-profile .data-panel")
        .forEach(setupPanel);
    };

    new MutationObserver(setup).observe(root, { childList: true, subtree: true });
    setup();
  }

  initializeCastPanelCollapse();
})();

(() => {
  function initializeCastPublicId() {
    const root = document.documentElement;
    const sourceId = new URLSearchParams(window.location.search).get("id")?.trim() ?? "";
    if (!sourceId || root.dataset.castPublicIdInitialized === "1") return;
    root.dataset.castPublicIdInitialized = "1";

    const publicIdElement = document.querySelector("#cast-public-id");
    const statusElement = document.querySelector("#cast-status");
    const accessTargetElement = document.querySelector(".cast-access-target");
    const displayId = obfuscatePublicId(sourceId);
    let updating = false;

    function obfuscatePublicId(value) {
      const source = `TNX_CAST_ARCHIVE::${String(value ?? "")}`;
      let hash = 0x811c9dc5;
      for (let index = 0; index < source.length; index++) {
        hash ^= source.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
      }
      return `TNX-${(hash >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
    }

    function replaceVisibleId(element) {
      if (!element?.textContent.includes(sourceId)) return;
      element.textContent = element.textContent.replaceAll(sourceId, displayId);
    }

    function refreshDisplay() {
      if (updating) return;
      updating = true;
      if (publicIdElement && publicIdElement.textContent !== displayId) publicIdElement.textContent = displayId;
      replaceVisibleId(statusElement);
      replaceVisibleId(accessTargetElement);
      updating = false;
    }

    const observer = new MutationObserver(refreshDisplay);
    if (publicIdElement) observer.observe(publicIdElement, { childList: true, characterData: true, subtree: true });
    if (statusElement) observer.observe(statusElement, { childList: true, characterData: true, subtree: true });
    if (accessTargetElement) observer.observe(accessTargetElement, { childList: true, characterData: true, subtree: true });
    refreshDisplay();
  }

  initializeCastPublicId();
})();
