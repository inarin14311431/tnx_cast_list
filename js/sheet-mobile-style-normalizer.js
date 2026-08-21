export const STYLE_DETAIL_PREFIX = "@@TNX_STYLE_DETAIL_V1@@";

const LABELS = [
  ["skill", ["技能"]],
  ["limit", ["上限", "使用上限"]],
  ["timing", ["タイミング"]],
  ["target", ["対象"]],
  ["range", ["射程"]],
  ["difficulty", ["目標値"]],
  ["confrontation", ["対決"]],
  ["page", ["参照P", "参照Ｐ", "参照ページ", "ページ"]],
  ["description", ["解説"]]
];

export const STYLE_DETAIL_FIELDS = LABELS.map(([key]) => key);

const escapeRe = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function blankStyleSkillDetail() {
  return Object.fromEntries(STYLE_DETAIL_FIELDS.map(key => [key, ""]));
}

function readLabel(text, names) {
  const all = LABELS.flatMap(([, aliases]) => aliases).map(escapeRe).join("|");
  const label = names.map(escapeRe).join("|");
  const re = new RegExp(`(?:^|[\\s　／|｜])(?:${label})\\s*[：:]\\s*([\\s\\S]*?)(?=\\s*(?:(?:${all})\\s*[：:])|$)`, "i");
  const match = String(text || "").match(re);
  return match ? match[1].trim() : "";
}

export function normalizeStyleSkillRow(row = {}) {
  const result = blankStyleSkillDetail();
  const text = String(row?.description || "");

  if (text.startsWith(STYLE_DETAIL_PREFIX)) {
    try {
      const parsed = JSON.parse(text.slice(STYLE_DETAIL_PREFIX.length).trim());
      if (parsed && typeof parsed === "object") Object.assign(result, parsed);
    } catch {
      result.description = text;
    }
  } else {
    for (const [key, names] of LABELS) {
      const value = readLabel(text, names);
      if (value) result[key] = value;
    }
    if (!result.description) result.description = text;
  }

  for (const key of ["timing", "target", "range", "difficulty", "confrontation"]) {
    if (!result[key] && row?.[key] != null) result[key] = String(row[key]);
  }

  for (const key of STYLE_DETAIL_FIELDS) result[key] = String(result[key] ?? "");
  return result;
}
