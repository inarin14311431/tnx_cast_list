import {
  normalizeOutfitCategory,
  outfitSupportsControl,
  outfitSupportsCsModifier
} from "./outfit-contract.js";
import { splitLegacyConcealment } from "./outfit-legacy-compat.js";

export { splitLegacyConcealment };

export function normalizeOutfitForView(outfit = {}) {
  const category = normalizeOutfitCategory(outfit.category);
  const details = normalizeDetails(outfit.ofc_details);
  const concealment = splitLegacyConcealment(first(details.concealment, outfit.concealment));
  const control = outfitSupportsControl(category) ? first(outfit.control_modifier) : "";
  const cs = outfitSupportsCsModifier(category) ? first(outfit.cs_modifier) : "";

  return {
    ...outfit,
    category,
    ofc_details: details,
    concealment: concealment.value,
    concealment_penalty: first(details.concealment_penalty, outfit.concealment_penalty, concealment.modifier),
    attack: first(outfit.attack, details.attack),
    parry: first(outfit.parry, details.parry),
    range: first(outfit.range, details.range_text),
    speed: first(outfit.speed, details.speed),
    // electronic_control is canonical in ofc_details. The top-level column is legacy read-only fallback.
    electronic_control: first(details.electronic_control, outfit.electronic_control),
    control_modifier: control,
    cs_modifier: cs,
    defense_s: first(outfit.defense_s, details.defense_s),
    defense_p: first(outfit.defense_p, details.defense_p),
    defense_i: first(outfit.defense_i, details.defense_i),
    tron_software: first(outfit.tron_software, details.tron_software),
    tron_support: first(outfit.tron_support, details.tron_support),
    tron_hardware: first(outfit.tron_hardware, details.tron_hardware),
    crew: first(outfit.crew, details.crew),
    sf: first(outfit.sf, details.sf),
    ianus_surface: first(outfit.ianus_surface, details.ianus_surface),
    ianus_deep: first(outfit.ianus_deep, details.ianus_deep),
    ianus_none: first(outfit.ianus_none, details.ianus_none),
    residence_entry: first(outfit.residence_entry, details.residence_entry),
    residence_electric: first(outfit.residence_electric, details.residence_electric),
    residence_area: first(outfit.residence_area, details.residence_area),
    page_number: first(outfit.page_number, details.page_number)
  };
}

export function normalizeOutfitListForView(outfits) {
  return Array.isArray(outfits) ? outfits.map(normalizeOutfitForView) : [];
}

export function formatPurchasePair(outfit) {
  const normalized = normalizeOutfitForView(outfit);
  const details = normalized.ofc_details;
  return pair(first(details.purchase_target, normalized.purchase_value), first(details.permanent_cost, normalized.experience_cost));
}

export function formatConcealmentPair(outfit) {
  const normalized = normalizeOutfitForView(outfit);
  return pair(normalized.concealment, normalized.concealment_penalty);
}

function normalizeDetails(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, String(item ?? "")]))
    : {};
}

function first(...values) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

function pair(left, right) {
  const a = first(left);
  const b = first(right);
  if (!a && !b) return "—";
  return `${a || "—"}/${b || "—"}`;
}
