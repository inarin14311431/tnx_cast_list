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
  category: "分類", name: "名称", purchase_value: "購入", experience_cost: "常備化", concealment: "隠匿",
  attack: "攻撃", parry: "受け", range: "射程", speed: "スロ", electronic_control: "電制", slot: "部位",
  defense_s: "S", defense_i: "I", defense_p: "P", control_modifier: "制御", control_value: "制御",
  tron_software: "ソ", tron_support: "サ", tron_hardware: "ハ", cs_value: "CS", crew: "乗員", sf: "SF",
  residence_entry: "登場", residence_electric_area: "電/ア", description: "解説", page_number: "参照P"
});

export const OUTFIT_SCHEMAS = Object.freeze({
  weapon: ["category", "name", "purchase_value", "experience_cost", "concealment", "attack", "parry", "range", "speed", "electronic_control", "slot", "description", "page_number"],
  armor: ["category", "name", "purchase_value", "experience_cost", "concealment", "defense_s", "defense_i", "defense_p", "electronic_control", "control_value", "slot", "description", "page_number"],
  cyberware: ["category", "name", "purchase_value", "experience_cost", "concealment", "electronic_control", "control_modifier", "slot", "description", "page_number"],
  tron: ["category", "name", "purchase_value", "experience_cost", "concealment", "control_modifier", "electronic_control", "speed", "tron_software", "tron_support", "tron_hardware", "cs_value", "slot", "description", "page_number"],
  vehicle: ["category", "name", "purchase_value", "experience_cost", "concealment", "attack", "control_modifier", "speed", "electronic_control", "defense_s", "defense_p", "defense_i", "crew", "sf", "description", "page_number"],
  residence: ["category", "name", "purchase_value", "experience_cost", "slot", "speed", "electronic_control", "residence_entry", "residence_electric_area", "description", "page_number"],
  other: ["category", "name", "purchase_value", "experience_cost", "concealment", "slot", "description", "page_number"]
});
