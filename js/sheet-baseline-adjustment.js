export function shouldApplyStyleBaseline(currentValue, oldBaseline) {
  const current = Number(currentValue || 0);
  const previous = Number(oldBaseline || 0);
  return current === previous || current === 0;
}

export function resolveStyleBaselineValue(currentValue, oldBaseline, newBaseline) {
  return shouldApplyStyleBaseline(currentValue, oldBaseline)
    ? Number(newBaseline || 0)
    : Number(currentValue || 0);
}
