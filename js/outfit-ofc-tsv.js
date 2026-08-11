import { supabase } from "./supabase-client.js";
import {
  categoryToTarget,
  cssEscape,
  defenseText,
  getOutfitRows,
  outfitSignature,
  parseDefense,
  rowSignature,
  targetToCategory
} from "./outfit-ofc-utils.js";

const MASTER_TABLE = "ofc_master";
const TSV_EXTRA_HEADERS = [
  "page_number", "major_category", "minor_category", "manufacturer",
  "parry", "speed", "control_value", "electronic_control",
  "defense_s", "defense_p", "defense_i",
  "ianus_surface", "ianus_deep", "ianus_none",
  "tron_software", "tron_support", "tron_hardware",
  "cs_value", "crew", "sf",
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
      if (row) applyDetailsToRow(row, tsvRowDetails(source));
    }
  }, 0);
}

function applyDetailsToRow(row, details) {
  requestAnimationFrame(() => {
    for (const [field, value] of Object.entries(details)) {
      const input = row.querySelector(`[data-ofc="${cssEscape(field)}"]`);
      if (!input) continue;
      input.value = String(value || "");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
}

function selectedMasterIds() {
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

function masterRowDetails(row) {
  const raw = row?.raw_data && typeof row.raw_data === "object" ? row.raw_data : {};
  return compactDetails({
    page_number: row.page_number || raw["ページ番号"],
    major_category: row.major_category || raw["大分類"],
    minor_category: row.minor_category || raw["小分類"],
    manufacturer: row.manufacturer || raw["メーカー"],
    purchase_target: row.purchase_target || raw["目標値"],
    permanent_cost: row.permanent_cost || raw["常備化"],
    concealment: row.concealment || raw["隠匿値"],
    concealment_penalty: row.concealment_penalty || raw["ペナ"],
    attack: row.attack || raw["攻"],
    parry: row.parry || raw["受"],
    range_text: row.range_text || raw["射"],
    speed: row.speed || raw["ス"],
    control_value: row.control_value || raw["制御値"],
    electronic_control: row.electronic_control || raw["電制"],
    defense_s: row.defense_s || raw.S,
    defense_p: row.defense_p || raw.P,
    defense_i: row.defense_i || raw.I,
    ianus_surface: raw["表"],
    ianus_deep: raw["深"],
    ianus_none: raw["無"],
    tron_software: raw["ソ"],
    tron_support: raw["サ"],
    tron_hardware: raw["ハ"],
    cs_value: raw.CS,
    crew: raw["乗員"],
    sf: raw.SF,
    residence_entry: raw["登"],
    residence_electric: raw["電"],
    residence_area: raw["ア"],
    slot: row.slot || raw["部位"],
    description: row.description || raw["解説"]
  });
}

function createFullOfcTsv(rows) {
  const headers = [
    "target", "name", "purchase", "permanent", "concealA", "concealB",
    "attack", "defense", "range", "part", "notes", ...TSV_EXTRA_HEADERS
  ];
  const values = rows.map(row => {
    const detail = masterRowDetails(row);
    return [
      categoryToTarget(row.site_category), row.name, detail.purchase_target, detail.permanent_cost,
      detail.concealment, detail.concealment_penalty, detail.attack, defenseText(detail),
      detail.range_text, detail.slot, detail.description,
      ...TSV_EXTRA_HEADERS.map(header => detail[header] || "")
    ];
  });
  return toTsv(headers, values);
}

function tsvRowDetails(row) {
  const details = {};
  for (const header of TSV_EXTRA_HEADERS) details[header] = row[header] || "";
  return compactDetails({
    ...details,
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

function compactDetails(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return Object.fromEntries(Object.entries(source).map(([key, item]) => [key, String(item ?? "")]).filter(([, item]) => item !== ""));
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
