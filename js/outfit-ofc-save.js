import "./outfit-pc-field-policy.js?v=5";
import { normalizeImportedOutfitDetails } from "./outfit-ofc-adapter.js?v=2";
import { outfitSupportsControl, outfitSupportsCsModifier } from "./outfit-contract.js?v=3";
import {
  getOutfitRows,
  outfitSignature,
  rowSignature,
  valueOf
} from "./outfit-ofc-utils.js";

function proxyValue(row, field, fallback) {
  const proxy = row.querySelector(`[data-pc-outfit-proxy="${field}"]`);
  if (!proxy) return fallback;
  if (proxy.dataset.pcOutfitTouched === "1" || String(proxy.value).trim() !== "") return String(proxy.value);
  return fallback;
}

function withoutRetiredModifier(payload) {
  const current = { ...payload };
  delete current.mundane_modifier;
  return current;
}

export function enrichOutfitPayload(items) {
  const rows = getOutfitRows();
  const queues = rowsBySignature(rows);
  const used = new Set();

  return items.map((item, index) => {
    const signature = outfitSignature(item.category, item.name);
    const queue = queues.get(signature) || [];
    let row = queue.find(candidate => !used.has(candidate));
    if (!row) row = rows.find(candidate => !used.has(candidate));
    if (row) used.add(row);

    if (!row) {
      const category = item.category || "other";
      return withoutRetiredModifier({
        ...item,
        defense: "",
        sort_order: Number.isFinite(Number(item.sort_order)) ? Number(item.sort_order) : index,
        ofc_details: normalizeImportedOutfitDetails(category, item.ofc_details || {})
      });
    }

    const details = collectDetails(row);
    const category = valueOf(row, "category") || item.category || "other";
    const electronicControl = String(details.electronic_control || item.electronic_control || "");
    const controlModifier = outfitSupportsControl(category)
      ? Number(valueOf(row, "control_modifier") || item.control_modifier || 0)
      : 0;
    const csModifier = outfitSupportsCsModifier(category)
      ? Number(valueOf(row, "cs_modifier") || item.cs_modifier || 0)
      : 0;

    return withoutRetiredModifier({
      ...item,
      category,
      concealment: String(valueOf(row, "concealment") || ""),
      slot: proxyValue(row, "slot", item.slot || ""),
      electronic_control: electronicControl,
      // Outfit defense is canonical only as structured S/P/I in ofc_details.
      // The legacy combined base column is intentionally cleared for every category.
      defense: "",
      control_modifier: controlModifier,
      cs_modifier: csModifier,
      sort_order: Number.isFinite(Number(item.sort_order)) ? Number(item.sort_order) : index,
      ofc_details: normalizeImportedOutfitDetails(category, details)
    });
  });
}

function collectDetails(row) {
  const details = { ...(globalThis.TNXOutfitOFCState?.getDetails?.(row) || {}) };
  row.querySelectorAll("[data-ofc]").forEach(input => {
    details[input.dataset.ofc] = String(input.value ?? "");
  });

  const category = valueOf(row, "category") || row.closest("table")?.dataset.outfitSchema || "other";
  const concealmentValue = String(valueOf(row, "concealment") || "");
  const defense = {
    defense_s: row.querySelector('[data-ofc="defense_s"]')?.value || details.defense_s || "",
    defense_p: row.querySelector('[data-ofc="defense_p"]')?.value || details.defense_p || "",
    defense_i: row.querySelector('[data-ofc="defense_i"]')?.value || details.defense_i || ""
  };

  return normalizeImportedOutfitDetails(category, {
    ...details,
    site_category: category,
    purchase_target: valueOf(row, "purchase_value"),
    permanent_cost: valueOf(row, "experience_cost"),
    concealment: concealmentValue,
    concealment_penalty: details.concealment_penalty || "",
    attack: valueOf(row, "attack"),
    range_text: valueOf(row, "range"),
    slot: proxyValue(row, "slot", valueOf(row, "slot") || ""),
    description: valueOf(row, "description"),
    ...defense
  });
}

function rowsBySignature(rows) {
  const queues = new Map();
  for (const row of rows) {
    const signature = rowSignature(row);
    if (!queues.has(signature)) queues.set(signature, []);
    queues.get(signature).push(row);
  }
  return queues;
}
