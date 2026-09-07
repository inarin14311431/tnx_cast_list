import { GENERAL_MASTER_ROWS, GENERAL_BLANK_SLOT_COLUMNS } from "./general-skill-catalog.js?v=2";
import { buildNewCharacterSkills } from "./sheet-new-character-state.js?v=1";
import { createBlankSkill } from "./sheet-row-factory.js?v=2";
import { buildSkillSavePayloads } from "./sheet-save-payload.js?v=3";

const SUITS = ["reason", "passion", "life", "mundane"];

export function buildMobileNewCharacterSkillPayloads(characterId) {
  if (!characterId) throw new TypeError("characterId is required");

  const skills = buildNewCharacterSkills({
    masterRows: GENERAL_MASTER_ROWS,
    suits: SUITS,
    blankColumns: GENERAL_BLANK_SLOT_COLUMNS,
    createBlankSkill
  });

  return buildSkillSavePayloads(skills).map(skill => ({
    ...skill,
    character_id: characterId
  }));
}
