export function resolveStyleRecord(slot = {}, {
  styleData = [],
  utsuwaAttributes = []
} = {}) {
  const name = slot?.name || "";
  if (!name) return null;
  if (name === "ウツワ") {
    const attribute = slot?.attribute || "";
    return utsuwaAttributes.find(item => item?.name === attribute) || null;
  }
  return styleData.find(item => item?.name === name) || null;
}

export function calculateStyleBaselines({
  slots = [],
  abilities = [],
  styleData = [],
  utsuwaAttributes = []
} = {}) {
  const result = {};
  for (const [key] of abilities) {
    result[key] = 0;
    result[`${key}-control`] = 0;
  }

  for (const slot of slots) {
    const record = resolveStyleRecord(slot, { styleData, utsuwaAttributes });
    if (!record) continue;
    for (const [key] of abilities) {
      result[key] += Number(record[key]?.[0] || 0);
      result[`${key}-control`] += Number(record[key]?.[1] || 0);
    }
  }
  return result;
}
