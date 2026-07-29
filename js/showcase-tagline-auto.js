import { supabase } from "./supabase-client.js";

const selectedCasts = document.querySelector("#selected-casts");
const summaryCache = new Map();
let scanTimer = 0;

if (selectedCasts) {
  const observer = new MutationObserver(scheduleScan);
  observer.observe(selectedCasts, { childList: true, subtree: true });
  scheduleScan();
}

function scheduleScan() {
  window.clearTimeout(scanTimer);
  scanTimer = window.setTimeout(scanRows, 0);
}

function scanRows() {
  selectedCasts?.querySelectorAll('[data-selected-index][data-character-id]:not([data-manual="true"])').forEach(row => {
    const input = row.querySelector('[data-field="tagline"]');
    const characterId = String(row.dataset.characterId || "").trim();
    if (!input || !characterId || input.value.trim()) return;
    applyFirstQuote(row, input, characterId);
  });
}

async function applyFirstQuote(row, input, characterId) {
  if (row.dataset.taglineAutoLoading === "true") return;
  row.dataset.taglineAutoLoading = "true";

  try {
    const quote = await getFirstQuote(characterId);
    if (!quote || !row.isConnected || input.value.trim()) return;

    input.value = quote.slice(0, Number(input.maxLength) || 240);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dataset.autoSource = "summary-first-quote";
  } catch (error) {
    console.warn("Could not derive showcase tagline from character summary.", error);
  } finally {
    delete row.dataset.taglineAutoLoading;
  }
}

async function getFirstQuote(characterId) {
  if (!summaryCache.has(characterId)) {
    summaryCache.set(characterId, loadFirstQuote(characterId));
  }
  return summaryCache.get(characterId);
}

async function loadFirstQuote(characterId) {
  const { data, error } = await supabase
    .from("characters")
    .select("summary")
    .eq("id", characterId)
    .maybeSingle();

  if (error) throw error;
  return extractFirstJapaneseQuote(data?.summary);
}

function extractFirstJapaneseQuote(value) {
  const source = String(value || "");
  const match = source.match(/「([\s\S]*?)」/);
  return match ? match[1].trim() : "";
}
