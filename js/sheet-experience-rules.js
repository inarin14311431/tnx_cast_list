// Initial skill package: 13 levels of General skills (130 XP)
// plus 7 levels of Social/Connection skills (35 XP) = 165 XP.
// Character construction then grants 170 XP for further growth.
export const INITIAL_GENERAL_SKILL_COST = 165;
export const CREATION_ALLOWANCE = 170;

export function numericValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function steppedExperienceCost(base, current, threshold) {
  const normalizedBase = numericValue(base);
  const normalizedCurrent = Math.max(normalizedBase, numericValue(current));
  let total = 0;
  for (let value = normalizedBase + 1; value <= normalizedCurrent; value++) {
    total += value <= numericValue(threshold) ? 20 : 40;
  }
  return total;
}

export function resolveCanonicalCurrent({ baseline = 0, current, growth = 0 } = {}) {
  const normalizedBaseline = numericValue(baseline);
  if (current !== undefined && current !== null && String(current).trim() !== "") {
    return numericValue(current);
  }
  return normalizedBaseline + Math.max(0, numericValue(growth));
}

export function paidSkillLevel(level, freeLevel = 0) {
  const normalizedLevel = Math.max(0, numericValue(level));
  const normalizedFree = Math.min(normalizedLevel, Math.max(0, numericValue(freeLevel)));
  return normalizedLevel - normalizedFree;
}
