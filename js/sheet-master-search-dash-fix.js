/* Preserve the OFC dash marker when the master database stores it as null/blank.
 * OFC source cards use a dash for unavailable purchase values. The master sync
 * may normalize that marker to null, so direct completion restores "－" only
 * on outfit rows created by an OFC master-search action. */
(() => {
  const OUTFIT_SELECTOR = "#outfit-list [data-outfit-key]";

  function isOfcDialog() {
    return document.querySelector("#master-search-title")?.textContent?.includes("OFC");
  }

  function outfitKeys() {
    return new Set([...document.querySelectorAll(OUTFIT_SELECTOR)].map(card => card.dataset.outfitKey));
  }

  function selectedCount(button) {
    if (button.matches("[data-result-add]")) return 1;
    return document.querySelectorAll("#master-search-results [data-result-select]:checked").length;
  }

  function restoreDash(card) {
    const purchase = card.querySelector("[data-o='purchase_value']");
    if (!purchase || String(purchase.value || "").trim()) return;
    purchase.value = "－";
    purchase.dispatchEvent(new Event("input", { bubbles: true }));
    purchase.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function repairNewRows(before, expected) {
    const started = performance.now();
    let quietFrames = 0;
    let previousCount = -1;

    while (performance.now() - started < 5000) {
      const added = [...document.querySelectorAll(OUTFIT_SELECTOR)]
        .filter(card => !before.has(card.dataset.outfitKey));

      added.forEach(restoreDash);

      if (added.length === previousCount) quietFrames += 1;
      else quietFrames = 0;
      previousCount = added.length;

      if (added.length >= expected && quietFrames >= 3) return;
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
  }

  document.addEventListener("click", event => {
    const button = event.target.closest("[data-result-add], #master-search-add");
    if (!button || !isOfcDialog()) return;

    const expected = selectedCount(button);
    if (!expected) return;
    const before = outfitKeys();
    repairNewRows(before, expected);
  }, true);
})();

/* Add a single expand/collapse control for every SKD / OFC result description. */
(() => {
  const DIALOG_SELECTOR = "#master-search-dialog";
  const RESULTS_SELECTOR = "#master-search-results";
  const BUTTON_ID = "master-search-details-toggle";
  const STYLE_ID = "master-search-details-toggle-style";

  function resultDetails() {
    return [...document.querySelectorAll(`${RESULTS_SELECTOR} details`)];
  }

  function setButtonLabel(button, expanded) {
    button.dataset.expanded = expanded ? "true" : "false";
    button.setAttribute("aria-pressed", expanded ? "true" : "false");
    button.innerHTML = expanded
      ? "詳細をすべて閉じる <small>COLLAPSE ALL</small>"
      : "詳細をすべて開く <small>EXPAND ALL</small>";
  }

  function syncButton() {
    const button = document.querySelector(`#${BUTTON_ID}`);
    if (!button) return;

    const details = resultDetails();
    const allExpanded = details.length > 0 && details.every(detail => detail.open);
    button.disabled = details.length === 0;
    setButtonLabel(button, allExpanded);
  }

  function toggleAllDetails() {
    const details = resultDetails();
    if (!details.length) return;

    const expand = !details.every(detail => detail.open);
    details.forEach(detail => {
      detail.open = expand;
    });
    syncButton();
  }

  function installStyles() {
    if (document.querySelector(`#${STYLE_ID}`)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .master-search-summary-actions{display:flex;align-items:center;justify-content:flex-end;gap:12px;flex-wrap:wrap}
      #${BUTTON_ID}{min-height:32px;padding:5px 10px;border:1px solid var(--line-muted);color:var(--line);background:rgba(65,232,255,.06);cursor:pointer;font:800 .66rem/1.2 monospace;white-space:nowrap}
      #${BUTTON_ID}:hover:not(:disabled){border-color:var(--line);background:rgba(65,232,255,.14)}
      #${BUTTON_ID}:disabled{opacity:.35;cursor:not-allowed}
      #${BUTTON_ID} small{display:block;margin-top:2px;color:var(--text-muted);font-size:.5rem;letter-spacing:.08em}
      @media(max-width:520px){.master-search-summary-actions{width:100%;justify-content:space-between}#${BUTTON_ID}{flex:1}}
    `;
    document.head.append(style);
  }

  function installToggle() {
    const dialog = document.querySelector(DIALOG_SELECTOR);
    if (!dialog) return false;
    if (dialog.querySelector(`#${BUTTON_ID}`)) return true;

    const summary = dialog.querySelector(".master-search-summary");
    const results = dialog.querySelector(RESULTS_SELECTOR);
    if (!summary || !results) return false;

    installStyles();

    const actions = document.createElement("div");
    actions.className = "master-search-summary-actions";

    const selectionSummary = summary.querySelector("p:last-child");
    if (selectionSummary) actions.append(selectionSummary);

    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.disabled = true;
    button.addEventListener("click", toggleAllDetails);
    setButtonLabel(button, false);
    actions.append(button);
    summary.append(actions);

    results.addEventListener("toggle", syncButton, true);
    new MutationObserver(syncButton).observe(results, { childList: true, subtree: true });
    syncButton();
    return true;
  }

  if (!installToggle()) {
    const observer = new MutationObserver(() => {
      if (!installToggle()) return;
      observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();

/* Load bad-status tooltips without adding another hard-coded script tag to sheet.html. */
(() => {
  const source = new URL("./sheet-master-search-bs-tooltips.js?v=2", document.currentScript?.src || document.baseURI).href;
  if ([...document.scripts].some(script => script.src === source)) return;
  const script = document.createElement("script");
  script.src = source;
  script.async = false;
  document.head.append(script);
})();