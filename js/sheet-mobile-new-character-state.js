import { GENERAL_MASTER_ROWS, GENERAL_BLANK_SLOT_COLUMNS } from "./general-skill-catalog.js?v=2";
import { buildNewCharacterSkills } from "./sheet-new-character-state.js?v=1";
import { createBlankSkill } from "./sheet-row-factory.js?v=2";
import { buildSkillSavePayloads } from "./sheet-save-payload.js?v=3";

const SUITS = ["reason", "passion", "life", "mundane"];
const PROPER_MASTER_NAMES = new Set(
  GENERAL_MASTER_ROWS.filter(([, , kind]) => kind === "proper").map(([name]) => name)
);

export function buildMobileNewCharacterSkillPayloads(characterId) {
  if (!characterId) throw new TypeError("characterId is required");

  const skills = buildNewCharacterSkills({
    masterRows: GENERAL_MASTER_ROWS,
    suits: SUITS,
    blankColumns: GENERAL_BLANK_SLOT_COLUMNS,
    createBlankSkill
  });

  const saved = buildSkillSavePayloads(skills);
  const properMasterSlots = skills
    .filter(skill => skill.category === "general" && PROPER_MASTER_NAMES.has(skill.name))
    .map((skill, index) => {
      const [payload] = buildSkillSavePayloads([{ ...skill, level: 1 }]);
      return {
        ...payload,
        level: 0,
        free_level: 0,
        sort_order: saved.length + index
      };
    });

  return [...saved, ...properMasterSlots].map(skill => ({
    ...skill,
    character_id: characterId
  }));
}
