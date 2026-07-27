import { supabase } from "./supabase-client.js";

const LABELS = {
  page_number: "参照P",
  major_category: "OFC大分類",
  minor_category: "OFC小分類",
  manufacturer: "メーカー",
  concealment: "隠匿値",
  concealment_penalty: "隠匿ペナ",
  attack: "攻",
  parry: "受",
  range_text: "射",
  speed: "ス",
  control_value: "制御値",
  electronic_control: "電制",
  defense_s: "防御S",
  defense_p: "防御P",
  defense_i: "防御I",
  ianus_surface: "IANUS 表",
  ianus_deep: "IANUS 深",
  ianus_none: "IANUS 無",
  tron_software: "トロン ソ",
  tron_support: "トロン サ",
  tron_hardware: "トロン ハ",
  cs_value: "CS",
  crew: "乗員",
  sf: "SF",
  residence_entry: "住宅 登",
  residence_electric: "住宅 電",
  residence_area: "住宅 ア",
  slot: "部位"
};

initialize();

async function initialize() {
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
    .order("category")
    .order("sort_order")
    .order("name");
  if (error) {
    if (!/ofc_details|schema cache|does not exist/i.test(String(error.message || ""))) {
      console.warn("OFC outfit details could not be loaded.", error);
    }
    return;
  }

  await waitForOutfitTables();
  appendDetails(data || []);
}

function appendDetails(outfits) {
  const queues = new Map();
  for (const outfit of outfits) {
    const key = signature(outfit.category, outfit.name);
    if (!queues.has(key)) queues.set(key, []);
    queues.get(key).push(outfit);
  }

  document.querySelectorAll("#outfit-container .outfit-section").forEach(section => {
    const category = categoryFromHeading(section.querySelector("h2")?.textContent || "");
    section.querySelectorAll("tbody > tr:not(.cast-outfit-ofc-detail-row)").forEach(row => {
      const name = row.cells?.[0]?.textContent?.trim() || "";
      const queue = queues.get(signature(category, name));
      const outfit = queue?.shift();
      if (!outfit) return;
      const details = detailsForDisplay(outfit);
      if (!details.length) return;

      const detailRow = document.createElement("tr");
      detailRow.className = "cast-outfit-ofc-detail-row";
      const cell = document.createElement("td");
      cell.colSpan = Math.max(1, row.cells.length);
      cell.innerHTML = `<dl class="cast-outfit-ofc-details">${details.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>`;
      detailRow.append(cell);
      row.after(detailRow);
    });
  });
}

function detailsForDisplay(outfit) {
  const source = normalizeDetails(outfit.ofc_details || {});
  const legacy = parseLegacyDescription(outfit.description || "");
  for (const [key, value] of Object.entries(legacy)) {
    if (!source[key]) source[key] = value;
  }
  if (!source.concealment && outfit.concealment) {
    const [concealment, penalty] = String(outfit.concealment).split(/[\/／]/);
    source.concealment = concealment || "";
    if (!source.concealment_penalty) source.concealment_penalty = penalty || "";
  }
  if (!source.defense_s && !source.defense_p && !source.defense_i) {
    Object.assign(source, parseDefense(outfit.defense || ""));
  }

  // These values are already visible in the base row when that category has
  // a dedicated column. Keep them in the detail row only for categories whose
  // base table cannot display the OFC field.
  if (String(outfit.attack || "").trim()) delete source.attack;
  if (String(outfit.range || "").trim()) delete source.range_text;
  if (String(outfit.slot || "").trim()) delete source.slot;

  return Object.entries(LABELS)
    .map(([key, label]) => [label, source[key]])
    .filter(([, value]) => String(value || "").trim());
}

function normalizeDetails(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, String(item ?? "")]));
}

function parseLegacyDescription(text) {
  const fields = {
    "メーカー": "manufacturer", "大分類": "major_category", "小分類": "minor_category",
    "攻": "attack", "受": "parry", "射": "range_text", "ス": "speed",
    "制御値": "control_value", "電制": "electronic_control", "部位": "slot",
    "参照P": "page_number"
  };
  const output = {};
  for (const line of String(text || "").split("\n")) {
    const match = line.match(/^([^：:]+)[：:]\s*(.*)$/);
    if (!match) continue;
    const label = match[1].trim();
    if (fields[label] && !output[fields[label]]) output[fields[label]] = match[2].trim();
    if (label === "防御値") Object.assign(output, parseDefense(match[2]));
  }
  return output;
}

function parseDefense(value) {
  const output = { defense_s: "", defense_p: "", defense_i: "" };
  const text = String(value || "").trim();
  for (const match of text.matchAll(/\b([SPI])\s*[:：]?\s*([^/／,，\s]+)/gi)) {
    output[`defense_${match[1].toLowerCase()}`] = match[2];
  }
  if (Object.values(output).some(Boolean)) return output;
  const parts = text.split(/[\/／,，\s]+/).filter(Boolean);
  output.defense_s = parts[0] || "";
  output.defense_i = parts[1] || "";
  output.defense_p = parts[2] || "";
  return output;
}

function categoryFromHeading(value) {
  const heading = String(value || "").toUpperCase();
  return ({ WEAPON: "weapon", ARMOR: "armor", CYBERWARE: "cyberware", TRON: "tron", VEHICLE: "vehicle", RESIDENCE: "residence", OTHER: "other" })[heading] || "other";
}

function signature(category, name) {
  return `${String(category || "other").trim()}\u0000${String(name || "").trim()}`;
}

async function waitForOutfitTables() {
  const started = performance.now();
  while (performance.now() - started < 5000) {
    if (document.querySelector("#outfit-container tbody tr")) return;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
