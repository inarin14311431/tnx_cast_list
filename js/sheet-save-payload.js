import { initialGeneralSkillSuit } from "./general-skill-catalog.js?v=2";
import { normalizeImportedOutfitDetails } from "./outfit-ofc-adapter.js?v=2";

const ABILITY_KEYS = ["reason", "passion", "life", "mundane"];

const STYLE_DETAIL_PREFIX = "@@TNX_STYLE_DETAIL_V1@@";
const STYLE_DETAIL_KEYS = [
  "skill",
  "limit",
  "timing",
  "target",
  "range",
  "difficulty",
  "confrontation",
  "description",
  "page"
];
const STYLE_DETAIL_LABELS = new Map([
  ["技能", "skill"],
  ["上限", "limit"],
  ["タイミング", "timing"],
  ["対象", "target"],
  ["射程", "range"],
  ["目標値", "difficulty"],
  ["対決", "confrontation"],
  ["解説", "description"],
  ["参照", "page"],
  ["参照P", "page"]
]);

function parseStyleDetail(value) {
  const text = String(value ?? "");
  const empty = Object.fromEntries(STYLE_DETAIL_KEYS.map(key => [key, ""]));

  if (text.startsWith(STYLE_DETAIL_PREFIX)) {
    try {
      const parsed = JSON.parse(text.slice(STYLE_DETAIL_PREFIX.length).trim());
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return Object.fromEntries(STYLE_DETAIL_KEYS.map(key => [key, String(parsed[key] ?? "")]));
      }
    } catch {}
  }

  const detail = { ...empty };
  const description = [];
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([^：:]+)[：:]\s*(.*)$/);
    const key = match && STYLE_DETAIL_LABELS.get(match[1].trim());
    if (key) detail[key] = match[2];
    else description.push(line);
  }
  detail.description = description.join("\n").trim();
  return detail;
}

function encodeStyleDetail(detail) {
  const canonical = Object.fromEntries(
    STYLE_DETAIL_KEYS.map(key => [key, String(detail?.[key] ?? "")])
  );
  return `${STYLE_DETAIL_PREFIX}\n${JSON.stringify(canonical)}`;
}

function hasStyleDetailValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function resolveStyleSkillForSave(item) {
  if (item?.category !== "style") return item;

  const parsed = parseStyleDetail(item.description);
  const detail = {};
  for (const key of STYLE_DETAIL_KEYS) {
    if (key === "description") {
      detail[key] = parsed[key];
      continue;
    }
    const explicit = item[key];
    detail[key] = hasStyleDetailValue(explicit)
      ? String(explicit)
      : parsed[key];
  }

  return {
    ...item,
    timing: detail.timing,
    target: detail.target,
    range: detail.range,
    difficulty: detail.difficulty,
    confrontation: detail.confrontation,
    description: encodeStyleDetail(detail)
  };
}

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
    .map((item, index) => {
      const source = isStyleSeparator(item) ? item : resolveStyleSkillForSave(item);
      return {
        category: source.category,
        name: source.name,
        level: Number(source.level || 0),
        free_level: Math.min(Math.max(Number(source.free_level || 0), 0), Math.max(Number(source.level || 0), 0)),
        skill_kind: source.skill_kind,
        reason: Boolean(source.reason),
        passion: Boolean(source.passion),
        life: Boolean(source.life),
        mundane: Boolean(source.mundane),
        timing: source.timing || "",
        target: source.target || "",
        range: source.range || "",
        difficulty: source.difficulty || "",
        confrontation: source.confrontation || "",
        description: isStyleSeparator(item) ? styleSeparatorMarker : source.description || "",
        sort_order: index
      };
    });
}

const OUTFIT_DETAIL_MODEL_FIELDS = Object.freeze({
  purchase_target: "purchase_value",
  permanent_cost: "experience_cost",
  concealment: "concealment",
  concealment_penalty: "concealment_penalty",
  attack: "attack",
  parry: "parry",
  range_text: "range",
  speed: "speed",
  control_modifier: "control_modifier",
  electronic_control: "electronic_control",
  defense_s: "defense_s",
  defense_p: "defense_p",
  defense_i: "defense_i",
  ianus_surface: "ianus_surface",
  ianus_deep: "ianus_deep",
  ianus_none: "ianus_none",
  tron_software: "tron_software",
  tron_support: "tron_support",
  tron_hardware: "tron_hardware",
  cs_modifier: "cs_modifier",
  crew: "crew",
  sf: "sf",
  residence_entry: "residence_entry",
  residence_electric: "residence_electric",
  residence_area: "residence_area",
  slot: "slot",
  manufacturer: "manufacturer",
  page_number: "page_number",
  major_category: "major_category",
  minor_category: "minor_category",
  description: "description"
});

function buildOutfitDetails(item, category) {
  const source = item?._ofc_details && typeof item._ofc_details === "object" && !Array.isArray(item._ofc_details)
    ? item._ofc_details
    : {};
  const details = { ...source, site_category: category };
  for (const [detailKey, modelKey] of Object.entries(OUTFIT_DETAIL_MODEL_FIELDS)) {
    if (Object.hasOwn(item, modelKey)) details[detailKey] = item[modelKey];
  }
  return normalizeImportedOutfitDetails(category, details);
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
        sort_order: index,
        ofc_details: buildOutfitDetails(item, category)
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
