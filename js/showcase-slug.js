export function nextActSlugFromRows(rows) {
  let highest = 0;
  for (const row of Array.isArray(rows) ? rows : []) {
    const match = /^act-(\d+)$/.exec(String(row?.slug ?? ""));
    if (!match) continue;
    highest = Math.max(highest, Number(match[1]) || 0);
  }

  return `act-${String(highest + 1).padStart(4, "0")}`;
}
