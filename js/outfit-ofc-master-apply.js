import { supabase } from "./supabase-client.js";
import { getOutfitRows, outfitSignature, rowSignature } from "./outfit-ofc-utils.js";
import { masterRowToOutfitDetails } from "./outfit-ofc-adapter.js?v=2";

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
      applyDetailsToModel(row.dataset.outfitKey, masterRowToOutfitDetails(rowData));
    }
  } catch (error) {
    console.warn("OFC detail fields could not be applied after master addition.", error);
  }
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
