export function calculateFinalValue(currentValue = 0, modifier = 0) {
  return Number(currentValue || 0) + Number(modifier || 0);
}

export function calculateAbilityFinals({
  abilities = [],
  values = {},
  cs = {}
} = {}) {
  const result = {};
  for (const [key] of abilities) {
    const value = values[key] || {};
    result[key] = calculateFinalValue(value.current, value.modifier);
    result[`${key}-control`] = calculateFinalValue(value.controlCurrent, value.controlModifier);
  }
  result.cs = calculateFinalValue(cs.current, cs.modifier);
  return result;
}

function toInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : 0;
}

// CS (combat speed), shared by the PC and mobile editors.
// reason / passion / life are each "current + modifier" for that ability.
// base: floor((reason + passion + life) / 2), shown read-only.
// final: max(0, base + modifier).
// storedBase: the value saved as cs_base, so that cs_base + cs_gear === final.
export function calculateCombatSpeed({ reason = 0, passion = 0, life = 0, modifier = 0 } = {}) {
  const base = Math.floor((toInteger(reason) + toInteger(passion) + toInteger(life)) / 2);
  const normalizedModifier = toInteger(modifier);
  const final = Math.max(0, base + normalizedModifier);
  return { base, modifier: normalizedModifier, final, storedBase: final - normalizedModifier };
}
