import { supabase } from "./supabase-client.js";
import {
  OUTFIT_BASE_FIELDS,
  OUTFIT_FIELD_LABELS,
  normalizeOutfitCategory
} from "./outfit-contract.js?v=2";
import { splitLegacyConcealment } from "./outfit-legacy-compat.js?v=1";

const ROOT = "#outfit-list";
const TABLE_NATIVE_FIELDS = Object.freeze({
  weapon: new Set(["name", "purchase_value", "experience_cost", "concealment", "slot"]),
  armor: new Set(["name", "purchase_value", "experience_cost", "concealment", "slot"]),
  cyberware: new Set(["name", "purchase_value", "experience_cost", "concealment", "slot"]),
  tron: new Set(["name", "purchase_value", "experience_cost", "concealment", "slot"]),
  vehicle: new Set(["name", "purchase_value", "experience_cost"]),
  residence: new Set(["name", "purchase_value", "experience_cost", "slot"]),
  other: new Set(["name", "purchase_value", "experience_cost", "concealment", "slot"])
});

let queued = false;
let storedQueues = new Map();

const signature = (category, name) => `${normalizeOutfitCategory(category)}\u0000${String(name || "").trim()}`;

function storedRecord(row) {
  const category = normalizeOutfitCategory(row.closest("table")?.dataset.outfitSchema);
  const name = row.querySelector('[data-o="name"]')?.value || "";
  const queue = storedQueues.get(signature(category, name));
  return queue?.[Number(row.dataset.pcProxyOccurrence || 0)] || null;
}

function extraBaseFields(category) {
  const native = TABLE_NATIVE_FIELDS[normalizeOutfitCategory(category)] || TABLE_NATIVE_FIELDS.other;
  return OUTFIT_BASE_FIELDS.filter(field => field !== "concealment_penalty" && !native.has(field));
}

function addHeader(table, field) {
  const header = table.querySelector("thead tr");
  if (!header || header.querySelector(`[data-pc-outfit-head="${CSS.escape(field)}"]`)) return;
  const th = document.createElement("th");
  th.className = `outfit-table-head outfit-table-head--${field}`;
  th.dataset.pcOutfitHead = field;
  th.textContent = OUTFIT_FIELD_LABELS[field] || field;
  const anchor = header.querySelector(".outfit-table-head--description") || header.querySelector(".outfit-table-head--actions");
  header.insertBefore(th, anchor || null);
}

function addCell(row, field) {
  if (row.querySelector(`[data-pc-outfit-proxy="${CSS.escape(field)}"]`) || row.querySelector(`[data-o="${CSS.escape(field)}"]`)) return;
  const item = storedRecord(row);
  const td = document.createElement("td");
  td.className = `outfit-table-cell outfit-table-cell--${field}`;
  const input = document.createElement("input");
  input.type = "text";
  input.autocomplete = "off";
  input.dataset.o = field;
  input.dataset.pcOutfitProxy = field;
  input.setAttribute("aria-label", OUTFIT_FIELD_LABELS[field] || field);
  const rawValue = String(item?.[field] ?? "");
  if (field === "concealment") {
    const parsed = splitLegacyConcealment(rawValue);
    input.value = parsed.value;
    if (parsed.modifier) row.dataset.pcConcealmentModifier = parsed.modifier;
  } else {
    input.value = rawValue;
  }
  td.append(input);
  const anchor = row.querySelector(".outfit-table-cell--description") || row.querySelector(".outfit-table-cell--actions");
  row.insertBefore(td, anchor || null);
}

function normalizeConcealmentRow(row) {
  const field = row.querySelector('[data-o="concealment"]');
  if (field) {
    const parsed = splitLegacyConcealment(field.value);
    if (parsed.modifier && !row.dataset.pcConcealmentModifier) row.dataset.pcConcealmentModifier = parsed.modifier;
    if (field.value !== parsed.value) field.value = parsed.value;
  }

  const modifier = row.querySelector('[data-ofc="concealment_penalty"]');
  const legacyModifier = String(row.dataset.pcConcealmentModifier || "").trim();
  if (modifier && legacyModifier && !String(modifier.value || "").trim()) {
    modifier.value = legacyModifier;
    modifier.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

function applyTable(table) {
  const category = normalizeOutfitCategory(table.dataset.outfitSchema);
  const occurrence = new Map();
  table.querySelectorAll("tbody .outfit-table-row").forEach(row => {
    const name = row.querySelector('[data-o="name"]')?.value || "";
    const key = signature(category, name);
    const index = occurrence.get(key) || 0;
    row.dataset.pcProxyOccurrence = String(index);
    occurrence.set(key, index + 1);
  });

  for (const field of extraBaseFields(category)) {
    addHeader(table, field);
    table.querySelectorAll("tbody .outfit-table-row").forEach(row => addCell(row, field));
  }

  table.querySelectorAll("tbody .outfit-table-row").forEach(normalizeConcealmentRow);
}

function applyPolicy() {
  document.querySelectorAll(`${ROOT} table[data-outfit-schema]`).forEach(applyTable);
}

function queue() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    applyPolicy();
  });
}

async function loadStoredRows() {
  const publicId = new URLSearchParams(location.search).get("id")?.trim();
  if (!publicId) return;
  const characterResult = await supabase.from("characters").select("id").eq("public_id", publicId).maybeSingle();
  if (characterResult.error || !characterResult.data?.id) return;
  const result = await supabase.from("character_outfits")
    .select("category,name,concealment,slot,sort_order")
    .eq("character_id", characterResult.data.id)
    .order("sort_order");
  if (result.error) return;
  const queues = new Map();
  for (const item of result.data || []) {
    const key = signature(item.category, item.name);
    if (!queues.has(key)) queues.set(key, []);
    queues.get(key).push(item);
  }
  storedQueues = queues;
}

async function init() {
  const root = document.querySelector(ROOT);
  if (!root) return;
  await loadStoredRows();
  root.addEventListener("tnx:outfit-tables-rendered", queue);
  queue();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
else init();
