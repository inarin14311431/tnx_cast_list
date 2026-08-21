export function appendRow(rows, row) {
  return [...(rows || []), row];
}

export function appendRows(rows, additions) {
  return [...(rows || []), ...(additions || [])];
}

export function clearRows() {
  return [];
}

export function removeRowByKey(rows, key) {
  return (rows || []).filter(item => item?._key !== key);
}

export function moveAdjacentRow(rows, key, direction, { keyOf = item => item?._key, canCross = () => true } = {}) {
  const source = [...(rows || [])];
  const index = source.findIndex(item => keyOf(item) === key);
  if (index < 0) return { rows: source, moved: false };

  const step = direction === "up" ? -1 : 1;
  let other = index + step;
  while (other >= 0 && other < source.length && !canCross(source[index], source[other])) other += step;
  if (other < 0 || other >= source.length) return { rows: source, moved: false };

  [source[index], source[other]] = [source[other], source[index]];
  return { rows: source, moved: true };
}

export function moveRowWithinCategory(rows, key, direction) {
  return moveAdjacentRow(rows, key, direction, {
    canCross: (current, candidate) => candidate?.category === current?.category
  });
}

export function normalizeOutfitCategory(category, allowedCategories, fallback = "other") {
  return allowedCategories?.has?.(category) ? category : fallback;
}
