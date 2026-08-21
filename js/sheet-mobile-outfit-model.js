import {
  OUTFIT_LABELS,
  normalizeOutfitCategory,
  normalizeOutfitDetailCompatibility,
  outfitSupportsControl,
  outfitSupportsCsModifier
} from "./outfit-contract.js";
import { parseLegacyDefense, splitLegacyConcealment } from "./outfit-legacy-compat.js";

export const LABELS = OUTFIT_LABELS;

export const RANGE_OPTIONS = [
  "", "なし", "至近", "至近※", "近", "中", "遠", "超遠", "武器", "解説参照", "―"
];

export const SLOT_OPTIONS = [
  "", "片手持ち", "両手持ち", "籠手", "靴", "指", "片腕", "両腕", "片脚", "両脚",
  "頭部", "眼部", "口腔", "頭髪", "皮膚", "骨格", "筋肉", "IANUS", "大脳", "小脳",
  "表層意識", "深層意識", "無意識", "タップ", "電脳", "操縦", "ヴィークル", "アンダーウェア",
  "スーツ", "コート", "アーマー", "ヘルメット", "マスク", "ゴーグル", "全身", "義体",
  "住宅", "住宅施設", "護符", "独立", "任意", "解説参照", "―"
];

export const CONTROL_OPTIONS = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];

export const CONCEALMENT_PENALTY_OPTIONS = [
  "0", "-1", "-2", "-3", "-4", "-5", "-6", "-8", "-10", "-12", "2", "12", "15",
  "-1（0）", "-2（0）", "－"
];

export const DETAIL_FIELDS = [
  "page_number", "major_category", "minor_category", "manufacturer", "concealment_penalty",
  "parry", "speed", "electronic_control",
  "defense_s", "defense_p", "defense_i",
  "ianus_surface", "ianus_deep", "ianus_none",
  "tron_software", "tron_support", "tron_hardware",
  "crew", "sf",
  "residence_entry", "residence_electric", "residence_area",
  "site_category", "purchase_target", "permanent_cost", "concealment",
  "attack", "range_text", "slot", "description"
];

export function normalizeNumber(value) {
  const result = Number(value || 0);
  return Number.isFinite(result) ? result : 0;
}

export function normalizeDetails(value, category = "other") {
  const compatible = normalizeOutfitDetailCompatibility(category, value);
  const output = {};
  for (const [key, raw] of Object.entries(compatible)) output[key] = raw == null ? "" : String(raw);
  for (const key of DETAIL_FIELDS) if (!(key in output)) output[key] = "";
  return output;
}

export function compactDetails(value, category = "other") {
  const normalized = normalizeDetails(value, category);
  return Object.fromEntries(Object.entries(normalized).filter(([, item]) => item !== ""));
}

export function blankOutfit() {
  return {
    _new: true,
    id: `outfit-${crypto.randomUUID()}`,
    category: "",
    name: "",
    purchase_value: "",
    experience_cost: 0,
    concealment: "",
    electronic_control: "",
    attack: "",
    range: "",
    slot: "",
    description: "",
    control_modifier: 0,
    cs_modifier: 0,
    sort_order: 9999,
    ofc_details: normalizeDetails({}, "other"),
    _concealValue: "",
    _concealMod: "",
    _defS: "",
    _defP: "",
    _defI: ""
  };
}

export function parseConcealment(item) {
  if (item._concealParsed) return item;
  const parsed = splitLegacyConcealment(item.concealment);
  item._concealValue = parsed.value;
  item._concealMod = parsed.modifier;
  if (item.ofc_details?.concealment_penalty !== undefined && item.ofc_details?.concealment_penalty !== "") {
    item._concealMod = String(item.ofc_details.concealment_penalty);
  }
  item._concealParsed = true;
  return item;
}

export function composeConcealment(item) {
  return String(item._concealValue ?? "").trim();
}

export function parseDefense(item) {
  if (item._defParsed) return item;
  const legacy = parseLegacyDefense(item.defense);
  item._defS = String(item.ofc_details?.defense_s || legacy.defense_s || "");
  item._defP = String(item.ofc_details?.defense_p || legacy.defense_p || "");
  item._defI = String(item.ofc_details?.defense_i || legacy.defense_i || "");
  item._defParsed = true;
  return item;
}

export function cloneOutfit(item) {
  const category = item?.category ? normalizeOutfitCategory(item.category) : "";
  const details = normalizeDetails(item?.ofc_details || {}, category || "other");
  if (!details.electronic_control && item?.electronic_control) details.electronic_control = String(item.electronic_control);

  const legacyDetails = item?.ofc_details && typeof item.ofc_details === "object" ? item.ofc_details : {};
  const controlSource = item?.control_modifier ?? legacyDetails.control_modifier ?? legacyDetails.control_value;
  const csSource = item?.cs_modifier ?? legacyDetails.cs_modifier ?? legacyDetails.cs_value;
  const control = outfitSupportsControl(category) ? normalizeNumber(controlSource) : 0;
  const cs = outfitSupportsCsModifier(category) ? normalizeNumber(csSource) : 0;

  delete details.control_modifier;
  delete details.cs_modifier;

  const draft = { ...item, category, control_modifier: control, cs_modifier: cs, ofc_details: details };
  delete draft.mundane_modifier;
  parseConcealment(draft);
  parseDefense(draft);
  return draft;
}

export function collectOutfitRecord(item, character) {
  const category = normalizeOutfitCategory(item.category || "other");
  const concealment = String(item._concealValue ?? "").trim();
  const control = outfitSupportsControl(category) ? normalizeNumber(item.control_modifier) : 0;
  const cs = outfitSupportsCsModifier(category) ? normalizeNumber(item.cs_modifier) : 0;
  const detailsSource = {
    ...normalizeDetails(item.ofc_details || {}, category),
    site_category: category,
    purchase_target: String(item.purchase_value ?? ""),
    permanent_cost: String(normalizeNumber(item.experience_cost)),
    concealment,
    concealment_penalty: String(item._concealMod ?? "").trim(),
    attack: item.attack || "",
    range_text: item.range || "",
    slot: item.slot || "",
    description: item.description || "",
    defense_s: String(item._defS ?? "").trim(),
    defense_p: String(item._defP ?? "").trim(),
    defense_i: String(item._defI ?? "").trim()
  };
  delete detailsSource.control_modifier;
  delete detailsSource.cs_modifier;
  const details = compactDetails(detailsSource, category);

  return {
    character_id: character?.id,
    category,
    name: item.name || "",
    purchase_value: String(item.purchase_value ?? ""),
    experience_cost: normalizeNumber(item.experience_cost),
    concealment,
    electronic_control: String(details.electronic_control || ""),
    attack: item.attack || "",
    defense: "",
    range: item.range || "",
    slot: item.slot || "",
    description: item.description || "",
    control_modifier: control,
    cs_modifier: cs,
    sort_order: normalizeNumber(item.sort_order),
    ofc_details: details
  };
}
