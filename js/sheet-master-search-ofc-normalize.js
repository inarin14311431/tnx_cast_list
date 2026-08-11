/* OFC-specific direct-add normalization only.
 * Source cards use a dash for unavailable purchase values. The master table can
 * contain null/blank after synchronization, so newly-added OFC rows restore it. */
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

async function normalizeNewRows(before, expected) {
  const started = performance.now();
  let quietFrames = 0;
  let previousCount = -1;

  while (performance.now() - started < 5000) {
    const added = [...document.querySelectorAll(OUTFIT_SELECTOR)]
      .filter(card => !before.has(card.dataset.outfitKey));

    added.forEach(restoreDash);
    quietFrames = added.length === previousCount ? quietFrames + 1 : 0;
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
  normalizeNewRows(outfitKeys(), expected);
}, true);
