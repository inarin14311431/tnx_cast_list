import {
  reconcileGeneralMasterRows,
  appendGeneralBlankSlots
} from "./sheet-general-skill-state.js";
import { createSkillRow as defaultCreateSkillRow } from "./sheet-row-factory.js";
import { appendRows } from "./sheet-row-collection-state.js?v=2";

export const STARTER_SOCIAL_CONNECTION_ROWS = Object.freeze([
  ["social", "社会：N◎VA"],
  ["social", "社会："],
  ["social", "社会："],
  ["social", "社会："],
  ["connection", "コネ："],
  ["connection", "コネ："],
  ["connection", "コネ："]
].map(row => Object.freeze(row)));

export function appendStarterSocialConnectionRowsIfBothMissing(rows = [], {
  createSkillRow = defaultCreateSkillRow
} = {}) {
  if (typeof createSkillRow !== "function") throw new TypeError("createSkillRow is required");
  const source = [...rows];
  const hasSocial = source.some(row => row?.category === "social");
  const hasConnection = source.some(row => row?.category === "connection");
  if (hasSocial || hasConnection) return source;

  const sharedTrailingSortOrder = source.length;
  const starterRows = STARTER_SOCIAL_CONNECTION_ROWS.map(([category, name]) => createSkillRow(category, {
    name,
    level: 1,
    free_level: 0,
    skill_kind: "proper"
  }, { sortOrder: sharedTrailingSortOrder }));
  return appendRows(source, starterRows);
}

export function buildNewCharacterSkills({
  masterRows = [],
  suits = [],
  blankColumns = [],
  createBlankSkill,
  createSkillRow = defaultCreateSkillRow
} = {}) {
  if (typeof createBlankSkill !== "function") throw new TypeError("createBlankSkill is required");
  if (typeof createSkillRow !== "function") throw new TypeError("createSkillRow is required");

  let rows = masterRows
    .filter(([, , kind]) => kind === "general")
    .map(([name, suit]) => createSkillRow("general", {
      name,
      level: 1,
      free_level: 0,
      [suit]: true,
      skill_kind: "general"
    }, { sortOrder: 0 }));

  rows = reconcileGeneralMasterRows(rows, {
    masterRows,
    suits,
    createBlankSkill
  });
  rows = appendGeneralBlankSlots(rows, {
    columns: blankColumns,
    createBlankSkill
  });

  return appendStarterSocialConnectionRowsIfBothMissing(rows, { createSkillRow });
}
