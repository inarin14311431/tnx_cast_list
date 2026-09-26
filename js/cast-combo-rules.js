export function getComboActUseLimit(combo) {
  const limit = Number.parseInt(String(combo.act_use_limit ?? ""), 10);
  return Number.isFinite(limit) && limit > 0 ? limit : null;
}

export function isSkillCounterCombo(combo) {
  const name = getComboValue(combo.name);
  const skills = getComboSkills(combo);

  if (!name || name !== skills || !getComboActUseLimit(combo)) {
    return false;
  }

  return [
    combo.ability, combo.ability_key, combo.modifier, combo.target_value, combo.achievement,
    combo.timing, combo.target, combo.range, combo.difficulty, combo.confrontation,
    combo.description, combo.effect
  ].every(value => !getComboValue(value));
}

export function getComboSkills(combo) {
  const currentSkills = getComboValue(combo.skills);

  if (currentSkills) {
    return currentSkills;
  }

  if (Array.isArray(combo.skill_names)) {
    return combo.skill_names
      .map(value => String(value ?? "").trim())
      .filter(Boolean)
      .join("＋");
  }

  return getComboValue(combo.skill_names);
}

export function getComboValue(...values) {
  for (const value of values) {
    if (value === null || value === undefined) {
      continue;
    }

    const text = String(value).trim();

    if (text) {
      return text;
    }
  }

  return "";
}


export const COMBO_ABILITY_LABELS = {
  reason: "♠ 理性",
  passion: "♣ 感情",
  life: "♥ 生命",
  mundane: "♦ 外界"
};

