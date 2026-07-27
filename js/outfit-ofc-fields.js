import { supabase } from "./supabase-client.js";

const BASE_SAVE_RPC = "save_character_bundle";
const OFC_SAVE_RPC = "save_character_bundle_with_ofc";
const MASTER_TABLE = "ofc_master";
const ROOT_SELECTOR = "#outfit-list";
const TSV_EXTRA_HEADERS = [
  "page_number", "major_category", "minor_category", "manufacturer",
  "parry", "speed", "control_value", "electronic_control",
  "defense_s", "defense_p", "defense_i",
  "ianus_surface", "ianus_deep", "ianus_none",
  "tron_software", "tron_support", "tron_hardware",
  "cs_value", "crew", "sf",
  "residence_entry", "residence_electric", "residence_area"
];

const FIELD_DEFINITIONS = {
  page_number: ["参照P", "SOURCE PAGE"],
  major_category: ["OFC大分類", "MAJOR"],
  minor_category: ["OFC小分類", "MINOR"],
  manufacturer: ["メーカー", "MAKER"],
  concealment_penalty: ["隠匿ペナ", "CONCEAL PENALTY"],
  parry: ["受", "PARRY"],
  speed: ["ス", "SPEED"],
  control_value: ["制御値", "CONTROL VALUE"],
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
  cs_value: ["CS値", "CS VALUE"],
  crew: ["乗員", "CREW"],
  sf: ["SF", "SF"],
  residence_entry: ["住宅 登", "RESIDENCE ENTRY"],
  residence_electric: ["住宅 電", "RESIDENCE ELECTRIC"],
  residence_area: ["住宅 ア", "RESIDENCE AREA"]
};

const COMMON_FIELDS = [
  "major_category", "minor_category", "manufacturer", "page_number", "concealment_penalty"
];
const CATEGORY_FIELDS = {
  weapon: [...COMMON_FIELDS, "parry", "speed", "electronic_control"],
  armor: [...COMMON_FIELDS, "electronic_control"],
  cyberware: [...COMMON_FIELDS, "control_value", "electronic_control", "ianus_surface", "ianus_deep", "ianus_none"],
  tron: [...COMMON_FIELDS, "control_value", "electronic_control", "tron_software", "tron_support", "tron_hardware"],
  vehicle: [...COMMON_FIELDS, "parry", "speed", "control_value", "electronic_control", "defense_s", "defense_p", "defense_i", "cs_value", "crew", "sf"],
  residence: [...COMMON_FIELDS, "electronic_control", "residence_entry", "residence_electric", "residence_area"],
  other: [...COMMON_FIELDS, "control_value", "electronic_control", "cs_value"]
};

const stateByKey = new Map();
let loadedQueues = new Map();
let restoreQueues = null;
let enhanceQueued = false;
let suppressDirty = false;
let detailsReady = false;

initialize();

async function initialize() {
  wrapSaveRpc();
  const root = document.querySelector(ROOT_SELECTOR);
  if (!root) return;

  new MutationObserver(queueEnhance).observe(root, { childList: true, subtree: true });
  document.addEventListener("input", handleDetailInput, true);
  document.addEventListener("change", handleDetailInput, true);
  document.addEventListener("click", handlePreAction, true);
  document.addEventListener("click", handleMasterCopy, true);
  document.addEventListener("click", handleTsvImport, true);

  try {
    await loadStoredDetails();
  } finally {
    detailsReady = true;
    queueEnhance();
  }
}

function wrapSaveRpc() {
  if (supabase.__tnxOfcSaveWrapped) return;
  const originalRpc = supabase.rpc.bind(supabase);
  Object.defineProperty(supabase, "__tnxOfcSaveWrapped", { value: true });
  supabase.rpc = (functionName, args = {}, options) => {
    if (functionName !== BASE_SAVE_RPC) return originalRpc(functionName, args, options);
    const enriched = {
      ...args,
      p_outfits: enrichOutfitPayload(Array.isArray(args?.p_outfits) ? args.p_outfits : [])
    };
    return originalRpc(OFC_SAVE_RPC, enriched, options);
  };
}

function enrichOutfitPayload(items) {
  const rows = getOutfitRows();
  const queues = rowsBySignature(rows);
  const used = new Set();

  return items.map((item, index) => {
    const signature = outfitSignature(item.category, item.name);
    const queue = queues.get(signature) || [];
    let row = queue.find(candidate => !used.has(candidate));
    if (!row) row = rows.find(candidate => !used.has(candidate));
    if (row) used.add(row);

    return {
      ...item,
      sort_order: Number.isFinite(Number(item.sort_order)) ? Number(item.sort_order) : index,
      ofc_details: row ? collectDetails(row) : normalizeDetails(item.ofc_details || {})
    };
  });
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
    .select("category,name,sort_order,concealment,attack,defense,range,slot,description,ofc_details")
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
  const details = normalizeDetails(row?.ofc_details || {});
  const legacy = parseLegacyDescription(row?.description || "");
  for (const [key, value] of Object.entries(legacy)) {
    if (!details[key]) details[key] = value;
  }
  if (!details.defense_s && !details.defense_p && !details.defense_i) {
    Object.assign(details, parseDefense(row?.defense || ""));
  }
  return details;
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

function handlePreAction(event) {
  if (event.target.closest?.("[data-outfit-move]")) {
    restoreQueues = snapshotDetailQueues();
    window.setTimeout(queueEnhance, 0);
    window.setTimeout(queueEnhance, 80);
    return;
  }

  const resultAdd = event.target.closest?.("[data-result-add]");
  const bulkAdd = event.target.closest?.("#master-search-add");
  if (!resultAdd && !bulkAdd) return;
  if (!isOfcMasterDialog()) return;

  const ids = resultAdd
    ? [String(resultAdd.dataset.resultAdd || "")]
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
    queueEnhance();
    await wait(60);

    const available = [...newRows];
    for (const rowData of ordered) {
      const details = masterRowDetails(rowData);
      const category = rowData.site_category || "other";
      const matchIndex = available.findIndex(row => rowSignature(row) === outfitSignature(category, rowData.name));
      const row = matchIndex >= 0 ? available.splice(matchIndex, 1)[0] : available.shift();
      if (row) setDetailsOnRow(row, details);
    }
  } catch (error) {
    console.warn("OFC detail fields could not be applied after master addition.", error);
  }
}

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
    queueEnhance();
    await wait(60);
    const available = [...newRows];
    for (const source of rows) {
      const category = targetToCategory(source.target);
      const index = available.findIndex(row => rowSignature(row) === outfitSignature(category, source.name));
      const row = index >= 0 ? available.splice(index, 1)[0] : available.shift();
      if (row) setDetailsOnRow(row, tsvRowDetails(source));
    }
  }, 0);
}

function setDetailsOnRow(row, source) {
  const key = row.dataset.outfitKey || "";
  const details = normalizeDetails(source);
  if (key) stateByKey.set(key, details);
  queueEnhance();
  requestAnimationFrame(() => {
    for (const [field, value] of Object.entries(details)) {
      const input = row.querySelector(`[data-ofc="${cssEscape(field)}"]`);
      if (input) input.value = String(value || "");
    }
    row.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function collectDetails(row) {
  const details = normalizeDetails(stateByKey.get(row.dataset.outfitKey) || {});
  row.querySelectorAll("[data-ofc]").forEach(input => {
    details[input.dataset.ofc] = input.value;
  });

  const category = valueOf(row, "category") || "other";
  const concealParts = String(valueOf(row, "concealment") || "").split(/[\/／]/);
  const armorDefense = parseDefense(valueOf(row, "defense"));
  const visibleDefense = {
    defense_s: row.querySelector('[data-armor-defense="S"]')?.value || details.defense_s || armorDefense.defense_s,
    defense_p: row.querySelector('[data-armor-defense="P"]')?.value || details.defense_p || armorDefense.defense_p,
    defense_i: row.querySelector('[data-armor-defense="I"]')?.value || details.defense_i || armorDefense.defense_i
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

function getOutfitRows() {
  return [...document.querySelectorAll(`${ROOT_SELECTOR} .outfit-table-row[data-outfit-key],${ROOT_SELECTOR} .outfit-card[data-outfit-key]`)]
    .filter((row, index, array) => array.findIndex(other => other.dataset.outfitKey === row.dataset.outfitKey) === index);
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

function rowSignature(row) {
  return outfitSignature(valueOf(row, "category") || row.closest("table")?.dataset.outfitSchema || "other", valueOf(row, "name"));
}

function outfitSignature(category, name) {
  return `${String(category || "other").trim()}\u0000${String(name || "").trim()}`;
}

function valueOf(row, field) {
  return row?.querySelector(`[data-o="${cssEscape(field)}"]`)?.value ?? "";
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
      categoryToTarget(row.site_category),
      row.name,
      detail.purchase_target,
      detail.permanent_cost,
      detail.concealment,
      detail.concealment_penalty,
      detail.attack,
      defenseText(detail),
      detail.range_text,
      detail.slot,
      detail.description,
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

function categoryToTarget(category) {
  return ({ weapon: "weapons", armor: "armours", vehicle: "vehicles", residence: "residences" })[category] || "outfits";
}

function targetToCategory(target) {
  const key = String(target || "").trim().toLowerCase();
  return ({
    weapons: "weapon", weapon: "weapon", "武器": "weapon",
    armours: "armor", armors: "armor", armor: "armor", "防具": "armor",
    vehicles: "vehicle", vehicle: "vehicle", "ヴィークル": "vehicle",
    residences: "residence", residence: "residence", "住居": "residence", "住宅": "residence",
    cyberware: "cyberware", cyberwares: "cyberware", "サイバーウェア": "cyberware",
    tron: "tron", trons: "tron", "トロン": "tron"
  })[key] || "other";
}

function parseDefense(value) {
  const text = String(value || "").trim();
  const output = { defense_s: "", defense_p: "", defense_i: "" };
  for (const match of text.matchAll(/\b([SPI])\s*[:：]?\s*([^/／,，\s]+)/gi)) {
    output[`defense_${match[1].toLowerCase()}`] = match[2];
  }
  if (Object.values(output).some(Boolean)) return output;
  const parts = text.split(/[\/／,，\s]+/).filter(Boolean);
  if (parts.length) output.defense_s = parts[0] || "";
  if (parts.length > 1) output.defense_i = parts[1] || "";
  if (parts.length > 2) output.defense_p = parts[2] || "";
  return output;
}

function defenseText(details) {
  return [
    details.defense_s !== "" && details.defense_s != null ? `S${details.defense_s}` : "",
    details.defense_p !== "" && details.defense_p != null ? `P${details.defense_p}` : "",
    details.defense_i !== "" && details.defense_i != null ? `I${details.defense_i}` : ""
  ].filter(Boolean).join("/");
}

function parseLegacyDescription(text) {
  const map = {
    "メーカー": "manufacturer", "大分類": "major_category", "小分類": "minor_category",
    "受": "parry", "ス": "speed", "制御値": "control_value", "電制": "electronic_control",
    "参照P": "page_number"
  };
  const details = {};
  for (const line of String(text || "").split("\n")) {
    const match = line.match(/^([^：:]+)[：:]\s*(.*)$/);
    if (!match) continue;
    const field = map[match[1].trim()];
    if (field && !details[field]) details[field] = match[2].trim();
    if (/^防御値$/.test(match[1].trim())) Object.assign(details, parseDefense(match[2]));
  }
  return details;
}

function normalizeDetails(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const output = {};
  for (const key of [...Object.keys(FIELD_DEFINITIONS), "site_category", "purchase_target", "permanent_cost", "concealment", "attack", "range_text", "slot", "description"]) {
    output[key] = String(source[key] ?? "");
  }
  return output;
}

function compactDetails(value) {
  const normalized = normalizeDetails(value);
  return Object.fromEntries(Object.entries(normalized).filter(([, item]) => item !== ""));
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

function cssEscape(value) {
  return window.CSS?.escape ? CSS.escape(String(value)) : String(value).replace(/(["\\])/g, "\\$1");
}
