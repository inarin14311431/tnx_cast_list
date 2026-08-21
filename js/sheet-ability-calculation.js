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
