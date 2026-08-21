// Initial skill package:
// - 13 fixed General skills each have their first level for free (130 XP total).
// - Social and Connection share a flexible 7-level free pool (35 XP total).
// The fixed General pool and Social/Connection pool are not interchangeable.
// Character construction then grants 170 XP for further growth.
export const INITIAL_GENERAL_SKILL_COUNT = 13;
export const INITIAL_GENERAL_SKILL_COST = 130;
export const INITIAL_SOCIAL_CONNECTION_SKILL_LEVELS = 7;
export const INITIAL_SOCIAL_CONNECTION_SKILL_COST = 35;
export const INITIAL_SKILL_COST = INITIAL_GENERAL_SKILL_COST + INITIAL_SOCIAL_CONNECTION_SKILL_COST;
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

export function paidFixedInitialGeneralLevel(level, freeLevel = 0) {
  return Math.max(0, paidSkillLevel(level, freeLevel) - 1);
}

export function paidSocialConnectionInitialCost({ social = 0, connection = 0 } = {}) {
  const rawTotal = Math.max(0, numericValue(social)) + Math.max(0, numericValue(connection));
  return Math.max(0, rawTotal - INITIAL_SOCIAL_CONNECTION_SKILL_COST);
}
