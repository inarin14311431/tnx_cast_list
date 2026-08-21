export const OUTFIT_CATEGORIES = Object.freeze([
  "weapon", "armor", "cyberware", "tron", "vehicle", "residence", "other"
]);

export const OUTFIT_LABELS = Object.freeze({
  weapon: "武器",
  armor: "防具",
  cyberware: "サイバーウェア",
  tron: "トロン",
  vehicle: "ヴィークル",
  residence: "住居",
  other: "その他"
});

export const OUTFIT_FIELD_LABELS = Object.freeze({
  category: "分類",
  name: "名称",
  purchase_value: "購入",
  experience_cost: "常備化",
  concealment: "隠匿値",
  concealment_penalty: "隠匿修正",
  slot: "部位",
  attack: "攻撃",
  parry: "受",
  range: "射程",
  speed: "ス",
  electronic_control: "電制",
  defense_s: "S",
  defense_p: "P",
  defense_i: "I",
  control_modifier: "制御値",
  cs_modifier: "CS修正",
  ianus_surface: "表層",
  ianus_deep: "深層",
  ianus_none: "無",
  tron_software: "ソ",
  tron_support: "サ",
  tron_hardware: "ハ",
  crew: "乗員",
  sf: "SF",
  residence_entry: "登",
  residence_electric: "電",
  residence_area: "ア",
  description: "解説",
  page_number: "参照P"
});

export const OUTFIT_BASE_FIELDS = Object.freeze([
  "name", "purchase_value", "experience_cost", "concealment", "concealment_penalty", "slot"
]);

export const OUTFIT_DESCRIPTION_FIELDS = Object.freeze([
  "description", "page_number"
]);

export const OUTFIT_PERFORMANCE_FIELDS = Object.freeze({
  weapon: ["attack", "parry", "range", "speed", "electronic_control"],
  armor: ["defense_s", "defense_p", "defense_i", "control_modifier", "electronic_control"],
  cyberware: ["electronic_control", "ianus_surface", "ianus_deep", "ianus_none"],
  tron: ["electronic_control", "speed", "tron_software", "tron_support", "tron_hardware", "cs_modifier"],
  vehicle: ["attack", "speed", "control_modifier", "cs_modifier", "electronic_control", "defense_s", "defense_p", "defense_i", "crew", "sf"],
  residence: ["speed", "electronic_control", "residence_entry", "residence_electric", "residence_area"],
  other: ["electronic_control"]
});

const CONTROL_CATEGORIES = new Set(["armor", "vehicle"]);
const CS_CATEGORIES = new Set(["tron", "vehicle"]);

export function normalizeOutfitCategory(value) {
  const category = String(value || "other").trim() || "other";
  return OUTFIT_CATEGORIES.includes(category) ? category : "other";
}

export function outfitSupportsControl(category) {
  return CONTROL_CATEGORIES.has(normalizeOutfitCategory(category));
}

export function outfitSupportsCsModifier(category) {
  return CS_CATEGORIES.has(normalizeOutfitCategory(category));
}

export function outfitPerformanceFields(category) {
  return OUTFIT_PERFORMANCE_FIELDS[normalizeOutfitCategory(category)] || OUTFIT_PERFORMANCE_FIELDS.other;
}

export function outfitCanonicalFields(category) {
  return Object.freeze([
    "category",
    ...OUTFIT_BASE_FIELDS,
    ...outfitPerformanceFields(category),
    ...OUTFIT_DESCRIPTION_FIELDS
  ]);
}

// Compatibility policy: legacy detail aliases may be read, but current editors must not create them.
export const OUTFIT_LEGACY_READ_ONLY_DETAIL_FIELDS = Object.freeze([
  "control_value", "cs_value"
]);

// Normalize legacy OFC/detail input at the boundary. Legacy aliases are consumed
// into canonical names, invalid category-specific modifiers are discarded, and
// the retired outfit-only mundane_modifier is never emitted again.
export function normalizeOutfitDetailCompatibility(categoryValue, value = {}) {
  const category = normalizeOutfitCategory(categoryValue);
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const normalized = { ...source };

  if (normalized.control_modifier == null && normalized.control_value != null) {
    normalized.control_modifier = normalized.control_value;
  }
  if (normalized.cs_modifier == null && normalized.cs_value != null) {
    normalized.cs_modifier = normalized.cs_value;
  }

  delete normalized.control_value;
  delete normalized.cs_value;
  delete normalized.mundane_modifier;

  if (!outfitSupportsControl(category)) delete normalized.control_modifier;
  if (!outfitSupportsCsModifier(category)) delete normalized.cs_modifier;

  return normalized;
}
