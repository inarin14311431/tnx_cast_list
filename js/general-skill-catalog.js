export const GENERAL_MASTER_ROWS = Object.freeze([
  ["医療", "reason", "general"], ["射撃", "reason", "general"], ["知覚", "reason", "general"], ["電脳", "reason", "general"], ["製作：", "reason", "proper"],
  ["心理", "passion", "general"], ["自我", "passion", "general"], ["交渉", "passion", "general"], ["芸術：", "passion", "proper"],
  ["運動", "life", "general"], ["回避", "life", "general"], ["白兵", "life", "general"], ["操縦：", "life", "proper"],
  ["信用", "mundane", "general"], ["圧力", "mundane", "general"], ["隠密", "mundane", "general"]
]);

export const GENERAL_BLANK_SLOT_COLUMNS = Object.freeze(["left", "left", "right", "right"]);

// Mobile is a single-column editor, so keep the canonical master order instead of
// interleaving the two desktop columns row-by-row.
export const GENERAL_MOBILE_ORDER = Object.freeze(
  GENERAL_MASTER_ROWS.map(([name]) => name)
);

export const MUTABLE_GENERAL_PREFIXES = Object.freeze(
  GENERAL_MASTER_ROWS.filter(([, , kind]) => kind === "proper").map(([name]) => name)
);

export const INITIAL_GENERAL_SKILL_SUITS = Object.freeze(Object.fromEntries(
  GENERAL_MASTER_ROWS
    .filter(([, , kind]) => kind === "general")
    .map(([name, suit]) => [name, suit])
));

export function initialGeneralSkillSuit(name) {
  return INITIAL_GENERAL_SKILL_SUITS[String(name || "").trim()] || "";
}

export function isInitialGeneralSkill(name) {
  return Boolean(initialGeneralSkillSuit(name));
}

export const STARRED_GENERAL_NAMES = new Set([
  "射撃", "心理", "自我", "回避", "操縦：", "白兵", "信用", "圧力"
]);
