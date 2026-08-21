function selectedSuitCount(skill, suits) {
  return suits.filter(suit => skill?.[suit]).length;
}

export function reconcileGeneralMasterRows(rows, {
  masterRows = [],
  suits = [],
  createBlankSkill
} = {}) {
  let next = [...rows];

  for (const [name, , kind] of masterRows) {
    const matches = next.filter(item => item.category === "general" && item.name === name);
    let skill = [...matches].sort((a, b) => {
      const levelDiff = Number(b.level || 0) - Number(a.level || 0);
      if (levelDiff) return levelDiff;
      return selectedSuitCount(b, suits) - selectedSuitCount(a, suits);
    })[0];

    if (skill) {
      for (const duplicate of matches) {
        if (duplicate === skill) continue;
        for (const suit of suits) skill[suit] = Boolean(skill[suit] || duplicate[suit]);
        skill.level = Math.max(Number(skill.level || 0), Number(duplicate.level || 0));
        skill.free_level = Math.max(Number(skill.free_level || 0), Number(duplicate.free_level || 0));
      }
      skill.level = Math.max(Number(skill.level || 0), selectedSuitCount(skill, suits));
      skill.free_level = Math.min(Math.max(Number(skill.free_level || 0), 0), skill.level);
      next = next.filter(item => item === skill || item.category !== "general" || item.name !== name);
    } else {
      if (typeof createBlankSkill !== "function") throw new TypeError("createBlankSkill is required when a master row is missing");
      skill = {
        ...createBlankSkill("general", { sortOrder: next.length }),
        name,
        level: 0,
        free_level: 0,
        skill_kind: kind
      };
      next.push(skill);
    }

    skill._fixedMaster = true;
  }

  return next;
}

export function appendGeneralBlankSlots(rows, {
  columns = [],
  createBlankSkill
} = {}) {
  if (typeof createBlankSkill !== "function") throw new TypeError("createBlankSkill is required");
  const next = [...rows];

  for (const column of columns) {
    next.push({
      ...createBlankSkill("general", { sortOrder: next.length }),
      name: "",
      level: 0,
      free_level: 0,
      skill_kind: "proper",
      _blankSlot: true,
      _slotColumn: column
    });
  }

  return next;
}

export function orderGeneralRows(rows, masterRows = []) {
  const general = rows.filter(item => item.category === "general");
  return general.sort((a, b) => {
    const ai = masterRows.findIndex(item => item[0] === a.name);
    const bi = masterRows.findIndex(item => item[0] === b.name);
    if (ai < 0 && bi < 0) return 0;
    if (ai < 0) return 1;
    if (bi < 0) return -1;
    return ai - bi;
  });
}
