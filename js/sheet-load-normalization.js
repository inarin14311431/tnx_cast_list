export const STYLE_SEPARATOR_MARKER = "[[STYLE_SEPARATOR]]";
export const STYLE_DETAIL_PREFIX = "@@TNX_STYLE_DETAIL_V1@@";

function createKey() {
  return globalThis.crypto?.randomUUID?.() || `sheet-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function isStyleSeparatorDescription(value) {
  const text = String(value || "");
  if (text.startsWith(STYLE_SEPARATOR_MARKER)) return true;
  if (!text.startsWith(STYLE_DETAIL_PREFIX)) return false;
  try {
    const detail = JSON.parse(text.slice(STYLE_DETAIL_PREFIX.length).trim());
    return String(detail?.description || "").startsWith(STYLE_SEPARATOR_MARKER);
  } catch {
    return false;
  }
}

export function isStyleSeparatorRecord(skill) {
  return skill?.category === "style" && (skill._rowType === "separator" || isStyleSeparatorDescription(skill.description));
}

export function inferLoadedSkillKind(skill, { styleKindFromLabel } = {}) {
  if (skill?.category === "style") {
    const label = skill.type || skill.kind || "";
    return styleKindFromLabel?.(label)
      || (/演出|方向/.test(label) ? "direction"
        : /奥義/.test(label) ? "ultimate"
          : /秘技/.test(label) ? "secret"
            : /なし/i.test(label) ? "none"
              : "normal");
  }
  return String(skill?.name || "").includes("：") ? "proper" : "general";
}

export function normalizeLoadedSkill(skill = {}, { styleKindFromLabel } = {}) {
  const category = skill.category || "general";
  const result = {
    _key: skill.id || createKey(),
    category,
    name: "",
    level: 1,
    free_level: 0,
    skill_kind: category === "style" ? "normal" : category === "general" ? "general" : "proper",
    reason: false,
    passion: false,
    life: false,
    mundane: false,
    timing: "",
    target: "",
    range: "",
    difficulty: "",
    confrontation: "",
    description: "",
    sort_order: 0,
    ...skill,
    _key: skill.id || createKey(),
    level: Number(skill.level || 0),
    free_level: Number(skill.free_level || 0),
    skill_kind: skill.skill_kind || inferLoadedSkillKind(skill, { styleKindFromLabel })
  };

  if (result.name === "初期取得") result.name = result.category === "connection" ? "コネ：" : "社会：";
  if (result.name === "社会：初期取得") result.name = "社会：";
  if (result.name === "コネ：初期取得") result.name = "コネ：";
  if (isStyleSeparatorDescription(result.description)) {
    result._rowType = "separator";
    result.skill_kind = "none";
  }
  return result;
}

export function normalizeLoadedOutfit(outfit = {}) {
  return {
    _key: outfit.id || createKey(),
    category: "other",
    name: "",
    purchase_value: "",
    experience_cost: 0,
    concealment: "",
    attack: "",
    range: "",
    slot: "",
    description: "",
    sort_order: 0,
    ...outfit,
    _key: outfit.id || createKey(),
    experience_cost: Number(outfit.experience_cost || 0)
  };
}
