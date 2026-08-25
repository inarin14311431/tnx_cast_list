import { supabase } from "./supabase-client.js";
import {
  categoryToTarget,
  defenseText,
  getOutfitRows,
  outfitSignature,
  parseDefense,
  rowSignature,
  targetToCategory
} from "./outfit-ofc-utils.js";
import {
  masterRowToOutfitDetails,
  normalizeImportedOutfitDetails
} from "./outfit-ofc-adapter.js?v=2";

const MASTER_TABLE = "ofc_master";
const TSV_EXTRA_HEADERS = [
  "page_number", "major_category", "minor_category", "manufacturer",
  "parry", "speed", "control_value", "electronic_control",
  "defense_s", "defense_p", "defense_i",
  "ianus_surface", "ianus_deep", "ianus_none",
  "tron_software", "tron_support", "tron_hardware",
  "cs_modifier", "crew", "sf",
  "residence_entry", "residence_electric", "residence_area"
];

document.addEventListener("click", handleMasterCopy, true);
document.addEventListener("click", handleTsvImport, true);

async function handleMasterCopy(event) {
  const button = event.target.closest?.("#master-search-copy");
  if (!button || !isOfcMasterDialog()) return;
  event.preventDefault();
  event.stopImmediatePropagation();

  const ids = selectedMasterIds();
  if (!ids.length) return;
  button.disabled = true;
  setMasterStatus("OFC全項目TSVを生成しています…", "loading");
  try {
    const rows = await fetchMasterRows(ids);
    const ordered = ids.map(id => rows.find(row => String(row.id) === id)).filter(Boolean);
    await navigator.clipboard.writeText(createFullOfcTsv(ordered));
    setMasterStatus(`${ordered.length}件のOFC全項目TSVをコピーしました。`, "success");
  } catch (error) {
    console.error(error);
    setMasterStatus("OFC全項目TSVのコピーに失敗しました。", "error");
  } finally {
    button.disabled = false;
  }
}

function handleTsvImport(event) {
  const button = event.target.closest?.("#tsv-apply");
  if (!button) return;
  const title = document.querySelector("#tsv-title")?.textContent || "";
  if (!/OFC/i.test(title)) return;
  const rows = parseTsv(document.querySelector("#tsv-text")?.value || "");
  if (!rows.length || !rows.some(row => TSV_EXTRA_HEADERS.some(header => row[header]))) return;

  const before = new Set(getOutfitRows().map(row => row.dataset.outfitKey));
  window.setTimeout(async () => {
    const newRows = await waitForNewOutfitRows(before, rows.length, 4000);
    await wait(60);
    const available = [...newRows];
    for (const source of rows) {
      const category = targetToCategory(source.target);
      const index = available.findIndex(row => rowSignature(row) === outfitSignature(category, source.name));
      const row = index >= 0 ? available.splice(index, 1)[0] : available.shift();
      if (row) applyDetailsToModel(row.dataset.outfitKey, tsvRowDetails(source, category));
    }
  }, 0);
}

function applyDetailsToModel(key, details) {
  const apply = window.TNXSheetEditor?.applyOutfitDetailsForImport;
  if (typeof apply !== "function") throw new Error("Outfit editor model gateway is unavailable.");
  if (!apply(key, details)) throw new Error(`Outfit model row not found: ${key}`);
}

function selectedMasterIds() {
  const persistent = Array.isArray(globalThis.__tnxMasterSearchSelectedIds)
    ? globalThis.__tnxMasterSearchSelectedIds.map(String).filter(Boolean)
    : [];
  if (persistent.length) return persistent;
  return [...document.querySelectorAll("#master-search-results [data-result-select]:checked")]
    .map(input => String(input.dataset.resultSelect || ""))
    .filter(Boolean);
}

function isOfcMasterDialog() {
  return /OUTFIT CATALOG DATABASE/i.test(document.querySelector("#master-search-code")?.textContent || "");
}

async function fetchMasterRows(ids) {
  const { data, error } = await supabase
    .from(MASTER_TABLE)
    .select("id,page_number,major_category,minor_category,manufacturer,name,site_category,purchase_target,permanent_cost,concealment,concealment_penalty,attack,parry,range_text,speed,control_value,electronic_control,defense_s,defense_p,defense_i,slot,description,raw_data")
    .in("id", ids);
  if (error) throw error;
  return data || [];
}

function createFullOfcTsv(rows) {
  const headers = [
    "target", "name", "purchase", "permanent", "concealA", "concealB",
    "attack", "defense", "range", "part", "notes", ...TSV_EXTRA_HEADERS
  ];
  const values = rows.map(row => {
    const detail = masterRowToOutfitDetails(row);
    return [
      categoryToTarget(row.site_category), row.name, detail.purchase_target, detail.permanent_cost,
      detail.concealment, detail.concealment_penalty, detail.attack, defenseText(detail),
      detail.range_text, detail.slot, detail.description,
      ...TSV_EXTRA_HEADERS.map(header => header === "control_value" ? (detail.control_modifier || "") : (detail[header] || ""))
    ];
  });
  return toTsv(headers, values);
}

function tsvRowDetails(row, category) {
  const details = {};
  for (const header of TSV_EXTRA_HEADERS) details[header] = row[header] || "";
  return normalizeImportedOutfitDetails(category, {
    ...details,
    control_modifier: row.control_modifier || row.control_value,
    cs_modifier: row.cs_modifier || row.cs_value,
    purchase_target: row.purchase,
    permanent_cost: row.permanent,
    concealment: row.concealA,
    concealment_penalty: row.concealment_penalty || row.concealB,
    attack: row.attack,
    range_text: row.range,
    slot: row.part,
    description: row.notes,
    ...parseDefense(row.defense)
  });
}

function parseTsv(text) {
  const lines = String(text || "").replace(/\r/g, "").trim().split("\n").filter(Boolean);
  if (!lines.length) return [];
  const headers = lines.shift().split("\t").map(value => value.trim());
  return lines.map(line => {
    const cells = line.split("\t");
    return Object.fromEntries(headers.map((header, index) => [header, String(cells[index] || "").replace(/\\n/g, "\n")]));
  });
}

function toTsv(headers, rows) {
  const clean = value => String(value ?? "").replace(/\r\n?/g, "\n").replace(/\n/g, "\\n").replace(/\t/g, " ");
  return [headers, ...rows].map(row => row.map(clean).join("\t")).join("\n");
}

function setMasterStatus(message, state = "") {
  const element = document.querySelector("#master-search-status");
  if (!element) return;
  element.textContent = message;
  element.className = state ? `is-${state}` : "";
}

async function waitForNewOutfitRows(before, expected, timeout) {
  const started = performance.now();
  while (performance.now() - started < timeout) {
    const rows = getOutfitRows().filter(row => !before.has(row.dataset.outfitKey));
    if (rows.length >= expected) return rows.slice(0, expected);
    await wait(50);
  }
  return getOutfitRows().filter(row => !before.has(row.dataset.outfitKey));
}

function wait(milliseconds) {
  return new Promise(resolve => window.setTimeout(resolve, milliseconds));
}
