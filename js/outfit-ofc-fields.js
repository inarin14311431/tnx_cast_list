import { valueOf } from "./outfit-ofc-utils.js";

const ROOT_SELECTOR = "#outfit-list";

function parseEmbeddedDetails(row) {
  try {
    const value = JSON.parse(row?.dataset?.outfitOfcDetails || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function normalizeDetails(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return Object.fromEntries(Object.entries(source).map(([key, item]) => [key, String(item ?? "")]));
}

function compactDetails(value) {
  const normalized = normalizeDetails(value);
  return Object.fromEntries(Object.entries(normalized).filter(([, item]) => item !== ""));
}

function resolveRow(rowOrKey) {
  if (typeof rowOrKey !== "string") return rowOrKey || null;
  const root = document.querySelector(ROOT_SELECTOR);
  if (!root) return null;
  return [...root.querySelectorAll("[data-outfit-key]")]
    .find(row => row.dataset.outfitKey === rowOrKey) || null;
}

function collectDetails(row) {
  if (!row) return {};
  const details = normalizeDetails(parseEmbeddedDetails(row));
  row.querySelectorAll("[data-ofc]").forEach(input => {
    details[input.dataset.ofc] = String(input.value ?? "");
  });

  const category = valueOf(row, "category") || "other";
  const concealParts = String(valueOf(row, "concealment") || "").split(/[\/／]/);
  return compactDetails({
    ...details,
    site_category: category,
    purchase_target: valueOf(row, "purchase_value"),
    permanent_cost: valueOf(row, "experience_cost"),
    concealment: concealParts[0] || "",
    concealment_penalty: details.concealment_penalty || concealParts[1] || "",
    attack: valueOf(row, "attack"),
    range_text: valueOf(row, "range"),
    slot: valueOf(row, "slot"),
    description: valueOf(row, "description"),
    defense_s: row.querySelector('[data-ofc="defense_s"]')?.value || details.defense_s || "",
    defense_p: row.querySelector('[data-ofc="defense_p"]')?.value || details.defense_p || "",
    defense_i: row.querySelector('[data-ofc="defense_i"]')?.value || details.defense_i || ""
  });
}

function setDetails(rowOrKey, details = {}) {
  const row = resolveRow(rowOrKey);
  if (!row) return false;

  const merged = { ...parseEmbeddedDetails(row), ...normalizeDetails(details) };
  row.dataset.outfitOfcDetails = JSON.stringify(compactDetails(merged));

  for (const [key, value] of Object.entries(details || {})) {
    const input = row.querySelector(`[data-ofc="${CSS.escape(key)}"]`)
      || row.querySelector(`[data-o="${CSS.escape(key)}"]`);
    if (!input) continue;
    const next = String(value ?? "");
    if (String(input.value ?? "") === next) continue;
    input.value = next;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }
  return true;
}

// Compatibility facade only. Runtime outfit state is owned by sheet.js `outfits`.
globalThis.TNXOutfitOFCState = {
  getDetails: collectDetails,
  setDetails
};

globalThis.TNXOutfitOfcFields = {
  queueEnhance() { return true; }
};
