import { GENERAL_MASTER_ROWS } from "./general-skill-catalog.js";

// Use the same initial general-skill catalog as the desktop new-character builder.
// Existing rows retain their levels, suits, IDs and descriptions.
export function appendMissingInitialGeneralSkills(rows, createBlankSkill) {
  const next = [...rows];
  const added = [];
  for (const [name, suit, kind] of GENERAL_MASTER_ROWS) {
    if (kind !== "general" || next.some(row => row.category === "general" && String(row.name || "").trim() === name)) continue;
    const row = {
      ...createBlankSkill("general"),
      name,
      level: 1,
      free_level: 0,
      skill_kind: kind,
      [suit]: true,
      sort_order: Math.max(-1, ...next.map(item => Number(item.sort_order) || 0)) + 1
    };
    next.push(row);
    added.push(row);
  }
  return { rows: next, added };
}
