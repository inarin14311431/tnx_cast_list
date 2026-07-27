import { supabase } from "./supabase-client.js";

const ROOT_SELECTOR = "#outfit-list";
const EXTRA_FIELDS = {
  armor: ["control_value"],
  cyberware: ["attack", "parry", "range_text", "speed", "defense_s", "defense_p", "defense_i", "slot"],
  tron: ["speed", "ianus_surface", "ianus_deep", "ianus_none", "cs_value", "slot"],
  residence: ["speed"],
  other: ["attack", "parry", "range_text", "speed", "defense_s", "defense_p", "defense_i", "sf", "slot"]
};
const LABELS = {
  attack: ["攻", "ATTACK"],
  parry: ["受", "PARRY"],
  range_text: ["射", "RANGE"],
  speed: ["ス", "SPEED"],
  control_value: ["制御値", "CONTROL VALUE"],
  defense_s: ["防S", "DEF S"],
  defense_p: ["防P", "DEF P"],
  defense_i: ["防I", "DEF I"],
  ianus_surface: ["IANUS 表", "IANUS SURFACE"],
  ianus_deep: ["IANUS 深", "IANUS DEEP"],
  ianus_none: ["IANUS 無", "IANUS NONE"],
  cs_value: ["CS値", "CS VALUE"],
  sf: ["SF", "SF"],
  slot: ["部位", "SLOT"]
};

const valuesByKey = new Map();
let loadedQueues = new Map();
let restoreQueues = null;
let ready = false;
let queued = false;

initialize();

async function initialize() {
  const root = document.querySelector(ROOT_SELECTOR);
  if (!root) return;

  new MutationObserver(queueEnhance).observe(root, { childList: true, subtree: true });
  document.addEventListener("input", captureInput, true);
  document.addEventListener("change", captureBeforeRebuild, true);
  document.addEventListener("click", captureMove, true);

  try {
    await loadStoredValues();
  } finally {
    ready = true;
    queueEnhance();
  }
}

async function loadStoredValues() {
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
    .select("category,name,ofc_details")
    .eq("character_id", character.id)
    .order("sort_order");
  if (error) return;

  loadedQueues = new Map();
  for (const row of data || []) {
    const signature = makeSignature(row.category, row.name);
    if (!loadedQueues.has(signature)) loadedQueues.set(signature, []);
    loadedQueues.get(signature).push(normalize(row.ofc_details));
  }
}

function queueEnhance() {
  if (!ready || queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    enhanceAll();
  });
}

function enhanceAll() {
  document.querySelectorAll(`${ROOT_SELECTOR} table[data-outfit-schema]`).forEach(table => {
    const category = table.dataset.outfitSchema || "other";
    const fields = EXTRA_FIELDS[category] || [];
    if (fields.length) addHeaders(table, fields);
    table.querySelectorAll("tbody [data-outfit-key]").forEach(row => {
      if (fields.length) addCells(row, fields);
      fillDerivedValues(row);
    });
  });
}

function fillDerivedValues(row) {
  const penalty = row.querySelector('[data-ofc="concealment_penalty"]');
  if (!penalty || penalty.value) return;
  const concealment = row.querySelector('[data-o="concealment"]')?.value || "";
  const parts = String(concealment).split(/[\/／]/);
  if (parts.length > 1 && parts[1] !== "") penalty.value = parts.slice(1).join("/").trim();
}

function addHeaders(table, fields) {
  const header = table.querySelector("thead tr");
  if (!header) return;
  const anchor = header.querySelector(".outfit-table-head--description,.outfit-table-head--actions");
  for (const field of fields) {
    if (header.querySelector(`[data-ofc-head="${field}"]`)) continue;
    const cell = document.createElement("th");
    cell.className = `outfit-table-head outfit-table-head--ofc outfit-table-head--${field}`;
    cell.dataset.ofcHead = field;
    cell.textContent = LABELS[field]?.[0] || field;
    cell.title = LABELS[field]?.[1] || field;
    header.insertBefore(cell, anchor || null);
  }
}

function addCells(row, fields) {
  const key = row.dataset.outfitKey || "";
  const values = ensureValues(row, key);
  const anchor = row.querySelector(".outfit-table-cell--description,.outfit-table-cell--actions");

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
      input.setAttribute("aria-label", LABELS[field]?.[0] || field);
      cell.append(input);
      row.insertBefore(cell, anchor || null);
    }
    const input = cell.querySelector(`[data-ofc="${field}"]`);
    if (input && !input.value && values[field] !== undefined) input.value = String(values[field] || "");
  }
}

function ensureValues(row, key) {
  if (key && valuesByKey.has(key)) return valuesByKey.get(key);
  const signature = rowSignature(row);
  const values = shiftQueue(restoreQueues, signature) || shiftQueue(loadedQueues, signature) || {};
  if (key) valuesByKey.set(key, values);
  return values;
}

function shiftQueue(queues, signature) {
  const queue = queues?.get(signature);
  if (!queue?.length) return null;
  const value = queue.shift();
  if (!queue.length) queues.delete(signature);
  if (queues === restoreQueues && queues.size === 0) restoreQueues = null;
  return value;
}

function captureInput(event) {
  const input = event.target.closest?.("[data-ofc]");
  const row = input?.closest?.("[data-outfit-key]");
  if (!input || !row) return;
  const key = row.dataset.outfitKey || "";
  const values = ensureValues(row, key);
  values[input.dataset.ofc] = input.value;
  if (key) valuesByKey.set(key, values);
}

function captureBeforeRebuild(event) {
  if (!event.target.closest?.('[data-o="category"]')) return;
  const row = event.target.closest("[data-outfit-key]");
  if (row) captureRow(row);
  window.setTimeout(queueEnhance, 0);
}

function captureMove(event) {
  if (!event.target.closest?.("[data-outfit-move]")) return;
  restoreQueues = snapshotQueues();
  window.setTimeout(queueEnhance, 0);
  window.setTimeout(queueEnhance, 80);
}

function captureRow(row) {
  const key = row.dataset.outfitKey || "";
  const values = ensureValues(row, key);
  row.querySelectorAll("[data-ofc]").forEach(input => {
    values[input.dataset.ofc] = input.value;
  });
  if (key) valuesByKey.set(key, values);
  return values;
}

function snapshotQueues() {
  const queues = new Map();
  for (const row of outfitRows()) {
    const signature = rowSignature(row);
    if (!queues.has(signature)) queues.set(signature, []);
    queues.get(signature).push({ ...captureRow(row) });
  }
  return queues;
}

function outfitRows() {
  return [...document.querySelectorAll(`${ROOT_SELECTOR} [data-outfit-key]`)]
    .filter((row, index, rows) => rows.findIndex(other => other.dataset.outfitKey === row.dataset.outfitKey) === index);
}

function rowSignature(row) {
  const category = row.querySelector('[data-o="category"]')?.value || row.closest("table")?.dataset.outfitSchema || "other";
  const name = row.querySelector('[data-o="name"]')?.value || "";
  return makeSignature(category, name);
}

function makeSignature(category, name) {
  return `${String(category || "other").trim()}\u0000${String(name || "").trim()}`;
}

function normalize(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, String(item ?? "")]));
}