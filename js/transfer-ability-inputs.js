import { calculateStyleBaselines } from "./sheet-style-baseline.js?v=3ea20d4f";
import { STYLE_DATA, UTSUWA_ATTRIBUTES } from "./style-data.js";

const ABILITIES = [["reason"], ["passion"], ["life"], ["mundane"]];
const number = value => Number(value || 0);

/* What the character-sheets editor calculates from: growth ("上昇") and gear ("装備"). The saved base
 * already contains growth (the PC editor also writes the *_growth columns on save: the part of the
 * current value above the style total), so growth is derived as base - styles.
 * Returns null when a style is unknown, because growth cannot be separated then. */
export function transferAbilityInputs(character) {
  const slots = [1, 2, 3].map(index => ({
    name: character[`style_${index}`] || "",
    attribute: character[`style_${index}_attribute`] || ""
  }));
  const known = slots.every(slot => slot.name === "ウツワ"
    ? UTSUWA_ATTRIBUTES.some(item => item.name === slot.attribute)
    : STYLE_DATA.some(item => item.name === slot.name && item.reason));
  if (!known) return null;

  const baseline = calculateStyleBaselines({ slots, abilities: ABILITIES, styleData: STYLE_DATA, utsuwaAttributes: UTSUWA_ATTRIBUTES });
  const result = {};
  for (const [key] of ABILITIES) {
    result[key] = {
      up: number(character[`${key}_base`]) - baseline[key],
      up_control: number(character[`${key}_control_base`]) - baseline[`${key}-control`],
      gear: number(character[`${key}_gear`]) + number(character[`${key}_manual`]),
      gear_control: number(character[`${key}_control_gear`]) + number(character[`${key}_control_manual`])
    };
  }
  result.cs = { gear: number(character.cs_gear) + number(character.cs_manual) };
  return result;
}
