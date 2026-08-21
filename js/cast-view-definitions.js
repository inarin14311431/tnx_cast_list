/* Shared definitions for the public cast view.
 * Keep display order, labels and table schemas here so view modules do not
 * silently diverge from one another.
 */

export const GENERAL_SKILL_ORDER = [
  "医療", "射撃", "知覚", "電脳", "製作：", "心理", "自我", "交渉",
  "芸術：", "運動", "回避", "白兵", "操縦：", "信用", "圧力", "隠密"
];

export const GENERAL_SKILL_REQUIRED_FAMILIES = ["製作：", "芸術：", "操縦："];
export const SKILL_SUITS = ["♠", "♣", "♥", "♦"];
export const COMPACT_SKILL_HEADERS = ["名称", "LV", "理性", "感情", "生命", "外界"];

export const OUTFIT_CATEGORIES = [
  ["weapon", "武器", "WEAPONS"],
  ["armor", "防具", "ARMOR"],
  ["cyberware", "サイバーウェア", "CYBERWARE"],
  ["tron", "トロン", "TRON"],
  ["vehicle", "ヴィークル", "VEHICLES"],
  ["residence", "住居", "RESIDENCES"],
  ["other", "その他", "OTHER"]
];

export const OUTFIT_CATEGORY_LABELS = Object.freeze(
  Object.fromEntries(OUTFIT_CATEGORIES.map(([key, jp]) => [key, jp]))
);

export const OUTFIT_FIELD_LABELS = Object.freeze({
  category: "分類",
  name: "名称",
  purchase_value: "購入",
  experience_cost: "常備化",
  concealment: "隠匿値",
  concealment_penalty: "隠匿修正",
  attack: "攻撃",
  parry: "受け",
  range: "射程",
  speed: "ス",
  electronic_control: "電制",
  slot: "部位",
  defense_s: "S",
  defense_p: "P",
  defense_i: "I",
  control_modifier: "制御値",
  tron_software: "ソ",
  tron_support: "サ",
  tron_hardware: "ハ",
  cs_modifier: "CS修正",
  crew: "乗員",
  sf: "SF",
  ianus_surface: "IANUS 表",
  ianus_deep: "IANUS 深",
  ianus_none: "IANUS 無",
  residence_entry: "登場",
  residence_electric_area: "電/ア",
  description: "解説",
  page_number: "参照P"
});

const COMMON = ["category", "name", "purchase_value", "experience_cost", "concealment", "concealment_penalty"];
const TAIL = ["slot", "description", "page_number"];

export const OUTFIT_SCHEMAS = Object.freeze({
  weapon: [...COMMON, "attack", "parry", "range", "speed", "electronic_control", ...TAIL],
  armor: [...COMMON, "defense_s", "defense_p", "defense_i", "control_modifier", "electronic_control", ...TAIL],
  cyberware: [...COMMON, "electronic_control", "ianus_surface", "ianus_deep", "ianus_none", ...TAIL],
  tron: [...COMMON, "electronic_control", "speed", "tron_software", "tron_support", "tron_hardware", "cs_modifier", ...TAIL],
  vehicle: [...COMMON, "attack", "speed", "control_modifier", "cs_modifier", "electronic_control", "defense_s", "defense_p", "defense_i", "crew", "sf", ...TAIL],
  residence: [...COMMON, "speed", "electronic_control", "residence_entry", "residence_electric_area", ...TAIL],
  other: [...COMMON, "electronic_control", ...TAIL]
});
