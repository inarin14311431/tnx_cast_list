/* Master-search result presentation only.
 * Keeps expand/collapse behavior separate from data normalization and access logic. */
const dialog = document.querySelector("#master-search-dialog");
const results = dialog?.querySelector("#master-search-results");
const summary = dialog?.querySelector(".master-search-summary");

if (dialog && results && summary) {
  const BUTTON_ID = "master-search-details-toggle";
  const resultDetails = () => [...results.querySelectorAll("details")];
  function setButtonLabel(button, expanded) {
    button.dataset.expanded = expanded ? "true" : "false";
    button.setAttribute("aria-pressed", expanded ? "true" : "false");
    button.innerHTML = expanded ? "詳細をすべて閉じる <small>COLLAPSE ALL</small>" : "詳細をすべて開く <small>EXPAND ALL</small>";
  }
  function syncButton() {
    const button = dialog.querySelector(`#${BUTTON_ID}`); if (!button) return;
    const details = resultDetails(); const allExpanded = details.length > 0 && details.every(detail => detail.open);
    button.disabled = details.length === 0; setButtonLabel(button, allExpanded);
  }
  function toggleAllDetails() { const details = resultDetails(); if (!details.length) return; const expand = !details.every(detail => detail.open); details.forEach(detail => { detail.open = expand; }); syncButton(); }
  if (!dialog.querySelector(`#${BUTTON_ID}`)) {
    const actions = document.createElement("div"); actions.className = "master-search-summary-actions";
    const selectionSummary = summary.querySelector("p:last-child"); if (selectionSummary) actions.append(selectionSummary);
    const button = document.createElement("button"); button.id = BUTTON_ID; button.type = "button"; button.disabled = true; button.addEventListener("click", toggleAllDetails); setButtonLabel(button, false); actions.append(button); summary.append(actions);
  }
  results.addEventListener("toggle", syncButton, true); new MutationObserver(syncButton).observe(results, { childList: true }); syncButton();
}
