(() => {
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

    document.querySelector(".cast-tabs")?.setAttribute("role", "tablist");

    if (options.focus) targetTab.focus();
    return true;
  }

  function initializeTabs() {
    const selected = document.querySelector(`${TAB_SELECTOR}.is-active`)?.dataset.tab;
    activateTab(selected || "session");
  }

  document.addEventListener("click", event => {
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeTabs, { once: true });
  } else {
    initializeTabs();
  }
})();
