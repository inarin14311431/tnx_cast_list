import { supabase } from "./supabase-client.js";
import {
  cssEscape,
  getOutfitRows,
  outfitSignature,
  rowSignature,
  valueOf
} from "./outfit-ofc-utils.js";

const ROOT_SELECTOR = "#outfit-list";

const FIELD_DEFINITIONS = {
  page_number: ["参照P", "SOURCE PAGE"],
  major_category: ["OFC大分類", "MAJOR"],
  minor_category: ["OFC小分類", "MINOR"],
  manufacturer: ["メーカー", "MAKER"],
  concealment_penalty: ["隠匿修正", "CONCEALMENT MODIFIER"],
  parry: ["受", "PARRY"],
  speed: ["ス", "SPEED"],
  electronic_control: ["電制", "ELECTRONIC CONTROL"],
  defense_s: ["防S", "DEF S"],
  defense_p: ["防P", "DEF P"],
  defense_i: ["防I", "DEF I"],
  ianus_surface: ["IANUS 表", "IANUS SURFACE"],
  ianus_deep: ["IANUS 深", "IANUS DEEP"],
  ianus_none: ["IANUS 無", "IANUS NONE"],
  tron_software: ["トロン ソ", "TRON SOFTWARE"],
  tron_support: ["トロン サ", "TRON SUPPORT"],
  tron_hardware: ["トロン ハ", "TRON HARDWARE"],
  crew: ["乗員", "CREW"],
  sf: ["SF", "SF"],
  residence_entry: ["住宅 登", "RESIDENCE ENTRY"],
  residence_electric: ["住宅 電", "RESIDENCE ELECTRIC"],
  residence_area: ["住宅 ア", "RESIDENCE AREA"]
};

// Only canonical fields meaningful to the current PC editor are generated.
// Retired aliases are normalized at explicit import boundaries, not retained in editor state.
const COMMON_FIELDS = ["manufacturer", "page_number", "concealment_penalty"];
const CATEGORY_FIELDS = {
  weapon: [...COMMON_FIELDS, "parry", "speed", "electronic_control"],
  armor: [...COMMON_FIELDS, "defense_s", "defense_p", "defense_i", "electronic_control"],
  cyberware: [...COMMON_FIELDS, "electronic_control", "ianus_surface", "ianus_deep", "ianus_none"],
  tron: [...COMMON_FIELDS, "speed", "electronic_control", "tron_software", "tron_support", "tron_hardware"],
  vehicle: [...COMMON_FIELDS, "speed", "electronic_control", "defense_s", "defense_p", "defense_i", "crew", "sf"],
  residence: [...COMMON_FIELDS, "speed", "electronic_control", "residence_entry", "residence_electric", "residence_area"],
  other: [...COMMON_FIELDS, "electronic_control"]
};

const stateByKey = new Map();
let loadedQueues = new Map();
let restoreQueues = null;
let enhanceQueued = false;
let suppressDirty = false;
let detailsReady = false;

globalThis.TNXOutfitOFCState = {
  getDetails(row) {
    const key = row?.dataset?.outfitKey || "";
    const details = key ? stateByKey.get(key) : null;
    return details ? { ...details } : {};
  },
  setDetails(rowOrKey, details = {}) {
    const key = typeof rowOrKey === "string" ? rowOrKey : rowOrKey?.dataset?.outfitKey || "";
    if (!key) return false;
    stateByKey.set(key, normalizeDetails(details));
    queueEnhance();
    return true;
  }
};

initialize();

async function initialize() {
  const root = document.querySelector(ROOT_SELECTOR);
  if (!root) return;

  new MutationObserver(queueEnhance).observe(root, { childList: true, subtree: true });
  document.addEventListener("input", handleDetailInput, true);
  document.addEventListener("change", handleDetailInput, true);
  document.addEventListener("click", handleOutfitMove, true);

  try {
    await loadStoredDetails();
  } finally {
    detailsReady = true;
    queueEnhance();
  }
}

async function loadStoredDetails() {
  const publicId = new URLSearchParams(location.search).get("id")?.trim();
  if (!publicId) return;

  const { data: character, error: characterError } = await supabase
    .from("characters")
    .select("id")
    .eq("public_id", publicId)
    .maybeSingle();
  if (characterError || !character) return;

  const { data, error } = await supabase
    .from("character_outfits")
    .select("category,name,sort_order,ofc_details")
    .eq("character_id", character.id)
    .order("sort_order");
  if (error) {
    if (/ofc_details|schema cache|does not exist/i.test(String(error.message || ""))) return;
    console.warn("OFC details could not be loaded.", error);
    return;
  }

  loadedQueues = rowsToDetailQueues(data || []);
}

function rowsToDetailQueues(rows) {
  const queues = new Map();
  for (const row of rows) {
    const detail = normalizeStoredRecord(row);
    const signature = outfitSignature(row.category, row.name);
    if (!queues.has(signature)) queues.set(signature, []);
    queues.get(signature).push(detail);
  }
  return queues;
}

function normalizeStoredRecord(row) {
  return normalizeDetails(row?.ofc_details || {});
}

function queueEnhance() {
  if (!detailsReady || enhanceQueued) return;
  enhanceQueued = true;
  requestAnimationFrame(() => {
    enhanceQueued = false;
    enhanceTables();
  });
}

function enhanceTables() {
  const root = document.querySelector(ROOT_SELECTOR);
  if (!root) return;
  suppressDirty = true;
  try {
    root.querySelectorAll("table[data-outfit-schema]").forEach(table => enhanceTable(table));
  } finally {
    suppressDirty = false;
  }
}

function enhanceTable(table) {
  const category = table.dataset.outfitSchema || "other";
  const fields = CATEGORY_FIELDS[category] || CATEGORY_FIELDS.other;
  const headerRow = table.querySelector("thead tr");
  if (!headerRow) return;

  const descriptionHead = headerRow.querySelector(".outfit-table-head--description");
  const actionHead = headerRow.querySelector(".outfit-table-head--actions");
  const headAnchor = descriptionHead || actionHead;

  for (const field of fields) {
    if (headerRow.querySelector(`[data-ofc-head="${field}"]`)) continue;
    const th = document.createElement("th");
    th.className = `outfit-table-head outfit-table-head--ofc outfit-table-head--${field}`;
    th.dataset.ofcHead = field;
    th.title = FIELD_DEFINITIONS[field]?.[1] || field;
    th.textContent = FIELD_DEFINITIONS[field]?.[0] || field;
    headerRow.insertBefore(th, headAnchor || null);
  }

  table.querySelectorAll("tbody .outfit-table-row[data-outfit-key]").forEach(row => {
    const key = row.dataset.outfitKey || "";
    const details = ensureRowState(row, key);
    const descriptionCell = row.querySelector(".outfit-table-cell--description");
    const actionCell = row.querySelector(".outfit-table-cell--actions");
    const cellAnchor = descriptionCell || actionCell;

    for (const field of fields) {
      let cell = row.querySelector(`[data-ofc-cell="${field}"]`);
      if (!cell) {
        cell = document.createElement("td");
        cell.className = `outfit-table-cell outfit-table-cell--ofc outfit-table-cell--${field}`;
        cell.dataset.ofcCell = field;
        const input = document.createElement("input");
        input.type = "text";
        input.dataset.ofc = field;
        input.autocomplete = "off";
        input.setAttribute("aria-label", FIELD_DEFINITIONS[field]?.[0] || field);
        cell.append(input);
        row.insertBefore(cell, cellAnchor || null);
      }
      const input = cell.querySelector(`[data-ofc="${field}"]`);
      if (input && input.value !== String(details[field] || "")) input.value = String(details[field] || "");
    }
  });
}

function ensureRowState(row, key) {
  if (key && stateByKey.has(key)) return stateByKey.get(key);
  const signature = rowSignature(row);
  let details = shiftQueue(restoreQueues, signature) || shiftQueue(loadedQueues, signature) || {};
  details = normalizeDetails(details);
  if (key) stateByKey.set(key, details);
  return details;
}

function shiftQueue(queues, signature) {
  if (!queues) return null;
  const queue = queues.get(signature);
  if (!queue?.length) return null;
  const value = queue.shift();
  if (!queue.length) queues.delete(signature);
  if (queues === restoreQueues && queues.size === 0) restoreQueues = null;
  return value;
}

function handleDetailInput(event) {
  const input = event.target.closest?.("[data-ofc]");
  if (!input) return;
  const row = input.closest("[data-outfit-key]");
  if (!row) return;
  const key = row.dataset.outfitKey || "";
  const details = ensureRowState(row, key);
  details[input.dataset.ofc] = input.value;
  if (key) stateByKey.set(key, details);
  if (!suppressDirty && event.type === "change") queueEnhance();
}

function handleOutfitMove(event) {
  if (!event.target.closest?.("[data-outfit-move]")) return;
  restoreQueues = snapshotDetailQueues();
  window.setTimeout(queueEnhance, 0);
  window.setTimeout(queueEnhance, 80);
}

function collectDetails(row) {
  const details = normalizeDetails(stateByKey.get(row.dataset.outfitKey) || {});
  row.querySelectorAll("[data-ofc]").forEach(input => {
    details[input.dataset.ofc] = input.value;
  });

  const category = valueOf(row, "category") || "other";
  const concealParts = String(valueOf(row, "concealment") || "").split(/[\/／]/);
  const visibleDefense = {
    defense_s: row.querySelector('[data-ofc="defense_s"]')?.value || details.defense_s,
    defense_p: row.querySelector('[data-ofc="defense_p"]')?.value || details.defense_p,
    defense_i: row.querySelector('[data-ofc="defense_i"]')?.value || details.defense_i
  };

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
    ...visibleDefense
  });
}

function snapshotDetailQueues() {
  const queues = new Map();
  for (const row of getOutfitRows()) {
    const signature = rowSignature(row);
    if (!queues.has(signature)) queues.set(signature, []);
    queues.get(signature).push(collectDetails(row));
  }
  return queues;
}

function normalizeDetails(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const output = Object.fromEntries(Object.entries(source).map(([key, item]) => [key, String(item ?? "")]));
  for (const key of [...Object.keys(FIELD_DEFINITIONS), "site_category", "purchase_target", "permanent_cost", "concealment", "attack", "range_text", "slot", "description"]) {
    if (!(key in output)) output[key] = "";
  }
  return output;
}

function compactDetails(value) {
  const normalized = normalizeDetails(value);
  return Object.fromEntries(Object.entries(normalized).filter(([, item]) => item !== ""));
}
