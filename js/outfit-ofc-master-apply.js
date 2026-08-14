import { supabase } from "./supabase-client.js";
import { cssEscape, getOutfitRows, outfitSignature, rowSignature } from "./outfit-ofc-utils.js";

const MASTER_TABLE = "ofc_master";

document.addEventListener("click", handleMasterAdd, true);

function handleMasterAdd(event) {
  const single = event.target.closest?.("[data-result-add]");
  const bulk = event.target.closest?.("#master-search-add");
  if (!single && !bulk) return;
  if (!isOfcMasterDialog()) return;

  const ids = single
    ? [String(single.dataset.resultAdd || "")]
    : selectedMasterIds();
  if (!ids.length) return;

  const before = new Set(getOutfitRows().map(row => row.dataset.outfitKey));
  applyMasterRowsAfterBaseAdd(ids, before);
}

async function applyMasterRowsAfterBaseAdd(ids, before) {
  try {
    const masterRows = await fetchMasterRows(ids);
    const ordered = ids.map(id => masterRows.find(row => String(row.id) === id)).filter(Boolean);
    const newRows = await waitForNewOutfitRows(before, ordered.length, 5000);
    const available = [...newRows];

    for (const rowData of ordered) {
      const category = rowData.site_category || "other";
      const matchIndex = available.findIndex(row => rowSignature(row) === outfitSignature(category, rowData.name));
      const row = matchIndex >= 0 ? available.splice(matchIndex, 1)[0] : available.shift();
      if (!row) continue;
      await waitForOfcFields(row, 2000);
      applyDetailsToRow(row, masterRowDetails(rowData));
    }
  } catch (error) {
    console.warn("OFC detail fields could not be applied after master addition.", error);
  }
}

function applyDetailsToRow(row, details) {
  for (const [field, value] of Object.entries(details)) {
    let input = row.querySelector(`[data-ofc="${cssEscape(field)}"]`);
    // Armor already has a native control field (control_modifier). OFC calls
    // the same value control_value, so bridge it instead of dropping the value.
    if (!input && field === "control_value") {
      input = row.querySelector('[data-o="control_modifier"]');
    }
    if (!input) continue;
    input.value = String(value ?? "");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }
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

function compactDetails(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return Object.fromEntries(Object.entries(source)
    .map(([key, item]) => [key, String(item ?? "")])
    .filter(([, item]) => item !== ""));
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

async function waitForOfcFields(row, timeout) {
  const started = performance.now();
  while (performance.now() - started < timeout) {
    if (row.querySelector("[data-ofc]")) return true;
    await wait(40);
  }
  return false;
}

function wait(milliseconds) {
  return new Promise(resolve => window.setTimeout(resolve, milliseconds));
}
