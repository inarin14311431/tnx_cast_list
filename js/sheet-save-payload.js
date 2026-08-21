import { initialGeneralSkillSuit } from "./general-skill-catalog.js?v=2";

const ABILITY_KEYS = ["reason", "passion", "life", "mundane"];

export function buildCharacterSavePayload({
  base = {},
  structured = {},
  styles = [],
  abilities = {},
  cs = {}
} = {}) {
  const payload = {
    character_name: String(base.character_name || "").trim(),
    character_kana: String(base.character_kana || "").trim(),
    handle: String(base.handle || "").trim(),
    player_name: String(base.player_name || "").trim(),
    affiliation: String(base.affiliation || "").trim(),
    citizen_rank: String(base.citizen_rank || "").trim(),
    summary: String(base.summary || ""),
    profile: String(base.profile || ""),
    visibility: base.visibility === "public" ? "public" : "private",
    experience_points: Number(base.experience_points || 0)
  };

  for (const [name, value] of Object.entries(structured || {})) {
    payload[name] = String(value ?? "").trim();
  }

  for (let index = 0; index < 3; index += 1) {
    const slot = styles[index] || {};
    const number = index + 1;
    payload[`style_${number}`] = String(slot.name || "");
    payload[`style_${number}_mark`] = String(slot.mark || "");
    payload[`style_${number}_attribute`] = String(slot.attribute || "");
    payload[`divine_${number}`] = String(slot.divine || "");
    payload[`divine_${number}_yomi`] = String(slot.divineYomi || slot.divine || "");
  }

  for (const key of ABILITY_KEYS) {
    const ability = abilities[key] || {};
    const current = Number(ability.current || 0);
    const baseline = Number(ability.baseline || 0);
    const modifier = Number(ability.modifier || 0);
    const finalValue = current + modifier;
    const controlCurrent = Number(ability.controlCurrent || 0);
    const controlBaseline = Number(ability.controlBaseline || 0);
    const controlModifier = Number(ability.controlModifier || 0);
    const controlFinal = controlCurrent + controlModifier;

    payload[`${key}_base`] = current;
    payload[`${key}_growth`] = Math.max(0, current - baseline);
    payload[`${key}_gear`] = modifier;
    payload[`${key}_manual`] = 0;
    payload[`${key}_value`] = finalValue;
    payload[`${key}_control_base`] = controlCurrent;
    payload[`${key}_control_growth`] = Math.max(0, controlCurrent - controlBaseline);
    payload[`${key}_control_gear`] = controlModifier;
    payload[`${key}_control_manual`] = 0;
    payload[`${key}_control`] = controlFinal;
  }

  payload.cs_base = Number(cs.base || 0);
  payload.cs_gear = Number(cs.modifier || 0);
  payload.cs_manual = 0;
  payload.cs = payload.cs_base + payload.cs_gear;
  return payload;
}

export function buildSkillSavePayloads(skills = [], {
  isStyleSeparator = () => false,
  styleSeparatorMarker = "[[STYLE_SEPARATOR]]"
} = {}) {
  return skills
    .map(item => {
      if (item?.category !== "general") return item;
      const requiredSuit = initialGeneralSkillSuit(item.name);
      if (!requiredSuit) return item;
      return {
        ...item,
        level: Math.max(1, Number(item.level || 0)),
        [requiredSuit]: true
      };
    })
    .filter(item => Number(item?.level) > 0 && String(item?.name || "").trim())
    .map((item, index) => ({
      category: item.category,
      name: item.name,
      level: Number(item.level || 0),
      free_level: Math.min(Math.max(Number(item.free_level || 0), 0), Math.max(Number(item.level || 0), 0)),
      skill_kind: item.skill_kind,
      reason: Boolean(item.reason),
      passion: Boolean(item.passion),
      life: Boolean(item.life),
      mundane: Boolean(item.mundane),
      timing: item.timing || "",
      target: item.target || "",
      range: item.range || "",
      difficulty: item.difficulty || "",
      confrontation: item.confrontation || "",
      description: isStyleSeparator(item) ? styleSeparatorMarker : item.description || "",
      sort_order: index
    }));
}

export function buildOutfitSavePayloads(outfits = []) {
  return outfits
    .filter(item => String(item?.name || "").trim())
    .map((item, index) => {
      const category = item.category || "other";
      const payload = {
        category,
        name: item.name,
        purchase_value: item.purchase_value || "",
        experience_cost: Number(item.experience_cost || 0),
        concealment: item.concealment || "",
        slot: item.slot || "",
        description: item.description || "",
        sort_order: index
      };

      if (category === "weapon") {
        payload.attack = item.attack || "";
        payload.range = item.range || "";
      }
      if (category === "armor") payload.control_modifier = Number(item.control_modifier || 0);
      if (category === "tron") payload.cs_modifier = Number(item.cs_modifier || 0);
      if (category === "vehicle") {
        payload.attack = item.attack || "";
        payload.control_modifier = Number(item.control_modifier || 0);
        payload.cs_modifier = Number(item.cs_modifier || 0);
      }
      return payload;
    });
}
