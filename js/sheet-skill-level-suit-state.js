export function normalizeSkillLevel(value) {
  return Math.max(0, Number(value || 0));
}

export function normalizeSkillFreeLevel(freeLevel, level) {
  const normalizedLevel = normalizeSkillLevel(level);
  return Math.min(Math.max(0, Number(freeLevel || 0)), normalizedLevel);
}

export function shouldSelectAllSuits(level) {
  return normalizeSkillLevel(level) >= 4;
}

export function resolveSkillLevelAfterSuitChange({
  currentLevel = 0,
  selectedSuitCount = 0,
  checked = false
} = {}) {
  const count = Math.max(0, Number(selectedSuitCount || 0));
  if (!checked) return count;
  return Math.max(normalizeSkillLevel(currentLevel), count);
}

export function resolveSkillInputState({
  action = "",
  value = 0,
  currentLevel = 0,
  currentFreeLevel = 0,
  selectedSuitCount = 0,
  checked = false
} = {}) {
  let level = normalizeSkillLevel(currentLevel);
  let freeLevel = normalizeSkillFreeLevel(currentFreeLevel, level);

  if (action === "suit") {
    level = resolveSkillLevelAfterSuitChange({
      currentLevel: level,
      selectedSuitCount,
      checked
    });
    freeLevel = normalizeSkillFreeLevel(freeLevel, level);
  } else if (action === "level") {
    level = normalizeSkillLevel(value);
    freeLevel = normalizeSkillFreeLevel(freeLevel, level);
  } else if (action === "free_level") {
    freeLevel = normalizeSkillFreeLevel(value, level);
  }

  return { level, freeLevel };
}
