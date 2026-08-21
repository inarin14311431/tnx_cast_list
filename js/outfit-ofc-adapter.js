import {
  normalizeOutfitCategory,
  normalizeOutfitDetailCompatibility
} from "./outfit-contract.js";

export function masterRowToOutfitDetails(row = {}) {
  const raw = row?.raw_data && typeof row.raw_data === "object" && !Array.isArray(row.raw_data) ? row.raw_data : {};
  return normalizeImportedOutfitDetails(row.site_category, {
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
    control_modifier: row.control_modifier ?? row.control_value ?? raw["制御値"],
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
    cs_modifier: row.cs_modifier ?? raw.CS,
    crew: raw["乗員"],
    sf: raw.SF,
    residence_entry: raw["登"],
    residence_electric: raw["電"],
    residence_area: raw["ア"],
    slot: row.slot || raw["部位"],
    description: row.description || raw["解説"]
  });
}

export function normalizeImportedOutfitDetails(categoryValue, value = {}) {
  const category = normalizeOutfitCategory(categoryValue);
  return compactOutfitDetails(normalizeOutfitDetailCompatibility(category, value));
}

export function compactOutfitDetails(value = {}) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return Object.fromEntries(
    Object.entries(source)
      .map(([key, item]) => [key, String(item ?? "")])
      .filter(([, item]) => item !== "")
  );
}
