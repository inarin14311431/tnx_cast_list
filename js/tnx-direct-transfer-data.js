import { supabase } from "./supabase-client.js";
import { normalizeOutfitForView } from "./outfit-view-model.js?v=2";

const STYLE_CODES = new Map([
  ["カブキ", "0"], ["バサラ", "1"], ["タタラ", "2"], ["ミストレス", "3"], ["カブト", "4"], ["カリスマ", "5"],
  ["マネキン", "6"], ["カゼ", "7"], ["フェイト", "8"], ["クロマク", "9"], ["エグゼク", "10"], ["カタナ", "11"],
  ["クグツ", "12"], ["カゲ", "13"], ["チャクラ", "14"], ["レッガー", "15"], ["カブトワリ", "16"], ["ハイランダー", "17"],
  ["マヤカシ", "18"], ["トーキー", "19"], ["イヌ", "20"], ["ニューロ", "21"],
  ["コモン", "-0"], ["ヒルコ", "-1"], ["クロガネ", "-2"], ["イブキ", "-4"], ["シキガミ", "-6"],
  ["アラシ", "-7"], ["カゲムシャ", "-9"], ["ミギウデ", "-12"], ["エトランゼ", "-17"], ["アヤカシ", "-18"], ["ウツワ", "-21"]
]);

const STYLE_ENGLISH = new Map([
  ["カブキ", "Kabuki"], ["バサラ", "Vasara"], ["タタラ", "Tatara"], ["ミストレス", "Mistress"], ["カブト", "Kabuto"],
  ["カリスマ", "Charisma"], ["マネキン", "Mannequin"], ["カゼ", "Kaze"], ["フェイト", "Fate"], ["クロマク", "Kuromaku"],
  ["エグゼク", "Exec"], ["カタナ", "Katana"], ["クグツ", "Kugutsu"], ["カゲ", "Kage"], ["チャクラ", "Chakra"],
  ["レッガー", "Legger"], ["カブトワリ", "Kabuto-Wari"], ["ハイランダー", "Highlander"], ["マヤカシ", "Mayakashi"],
  ["トーキー", "Talkie"], ["イヌ", "Inu"], ["ニューロ", "Neuro"], ["コモン", "Common"], ["ヒルコ", "Hiruko"],
  ["クロガネ", "Kurogane"], ["イブキ", "Ibuki"], ["シキガミ", "Shikigami"], ["アラシ", "Arashi"], ["カゲムシャ", "Kagemusha"],
  ["ミギウデ", "Migiude"], ["エトランゼ", "Etranger"], ["アヤカシ", "Ayakashi"], ["ウツワ", "Utsuwa"]
]);

const GENERAL_ORDER = ["医療","射撃","知覚","電脳","製作：","心理","自我","交渉","芸術：","運動","回避","白兵","操縦：","信用","圧力","隠密"];
const SKILL_KIND = { normal: "通常", secret: "秘技", ultimate: "奥義", direction: "演出", general: "一般", proper: "固有名詞", none: "なし" };
const STYLE_DETAIL_PREFIX = "@@TNX_STYLE_DETAIL_V1@@";

const text = value => String(value ?? "").trim();
const nullable = value => text(value) || null;
const flag = value => Boolean(value) ? "1" : null;
const numText = value => {
  const raw = text(value);
  if (!raw) return null;
  const match = raw.match(/-?\d+(?:\.\d+)?/);
  return match ? match[0] : raw;
};
const quoteHandle = value => {
  const raw = text(value);
  if (!raw) return "";
  const inner = raw.replace(/^[“”"'「『]+\s*/, "").replace(/\s*[“”"'」』]+$/, "").trim();
  return inner ? `“${inner}”` : "";
};
const joinName = (handle, name) => [quoteHandle(handle), text(name)].filter(Boolean).join(" ");
function splitProfileMemo(value) {
  const raw = String(value ?? "");
  const marker = "【メモ】";
  const index = raw.indexOf(marker);
  if (index < 0) return { profile: text(raw), memo: "" };
  return {
    profile: text(raw.slice(0, index)),
    memo: text(raw.slice(index + marker.length))
  };
}

export async function fetchTransferBundle(publicId) {
  const id = text(publicId);
  if (!id) throw new Error("CAST ARCHIVEのキャストIDを指定してください。");

  const { data: character, error: characterError } = await supabase
    .from("characters")
    .select("*")
    .eq("public_id", id)
    .maybeSingle();
  if (characterError) throw characterError;
  if (!character) throw new Error("CAST ARCHIVEのキャストデータを取得できませんでした。");

  const [{ data: skills, error: skillError }, { data: outfits, error: outfitError }] = await Promise.all([
    supabase.from("character_skills").select("*").eq("character_id", character.id).order("sort_order"),
    supabase.from("character_outfits").select("*").eq("character_id", character.id).order("sort_order")
  ]);
  if (skillError) throw skillError;
  if (outfitError) throw outfitError;

  return { character, skills: skills || [], outfits: (outfits || []).map(normalizeOutfitForView) };
}

export function resolvePublicId(raw) {
  const value = text(raw);
  if (!value) return "";
  if (/^TNX-\d+$/i.test(value)) return value.toUpperCase();
  try {
    const url = new URL(value, location.href);
    return text(url.searchParams.get("id"));
  } catch {
    return value;
  }
}

export function buildCharacterSheetsPayload(bundle, { hideFromList = false } = {}) {
  const { character, skills = [], outfits = [] } = bundle || {};
  if (!character) throw new Error("CAST ARCHIVEデータがありません。");
  if (!text(character.character_name)) throw new Error("キャスト名が空です。");

  const styles = [1, 2, 3].map(index => ({
    name: text(character[`style_${index}`]),
    mark: text(character[`style_${index}_mark`]),
    attribute: text(character[`style_${index}_attribute`])
  }));
  const unsupported = styles.filter(item => item.name && !STYLE_CODES.has(item.name)).map(item => item.name);
  if (unsupported.length) throw new Error(`安全停止：未対応のスタイル名があります（${[...new Set(unsupported)].join("、")}）。`);
  if (styles.some(item => !item.name)) throw new Error("安全停止：スタイル3枠のいずれかが空です。");

  const general = skills.filter(skill => skill.category === "general");
  const fixedGeneral = GENERAL_ORDER.map(name => findGeneral(general, name));
  const social = skills.filter(skill => skill.category === "social" && text(skill.name));
  const connections = skills.filter(skill => skill.category === "connection" && text(skill.name));
  const styleSkills = skills.filter(skill => skill.category === "style" && text(skill.name));

  const groups = { weapons: [], armours: [], vehicles: [], residences: [], outfits: [] };
  for (const outfit of outfits.map(normalizeOutfitForView).filter(item => text(item.name))) {
    const target = outfit.category === "weapon" ? "weapons"
      : outfit.category === "armor" ? "armours"
      : outfit.category === "vehicle" ? "vehicles"
      : outfit.category === "residence" ? "residences"
      : "outfits";
    groups[target].push(toCharacterSheetsOutfit(outfit, target));
  }

  const displayValue = hideFromList ? "0" : null;
  const profileParts = splitProfileMemo(character.profile);
  const castName = joinName(character.handle, character.character_name);
  const castKana = joinName(character.handle_kana, character.character_kana);
  const json = {
    ability: {
      cs: numText(character.cs ?? character.cs_base),
      life: ability(character, "life"),
      mundane: ability(character, "mundane"),
      passion: ability(character, "passion"),
      reason: ability(character, "reason"),
      outfits: emptyAbilityModifier(),
      up: emptyAbilityModifier()
    },
    armours: groups.armours.length ? groups.armours : [blankArmour()],
    autoresize: null,
    base: {
      age: nullable(character.age), birth: "Ｎ◎ＶＡ", birthday: null, dept: null,
      exp: nullable(character.experience_spent ?? character.spent_exp ?? character.total_exp),
      eyes: nullable(character.eyes), hair: nullable(character.hair), height: nullable(character.height),
      lifepath: {
        encouter: nullable(character.life_path_encounter),
        environment: nullable(character.life_path_experience),
        experience: nullable(character.life_path_origin),
        memo: nullable(character.summary)
      },
      memo: nullable(profileParts.memo),
      memoir: nullable(profileParts.profile),
      name: castName,
      nameKana: nullable(castKana),
      player: nullable(character.player_name),
      post: nullable(character.affiliation),
      rank: nullable(character.citizen_rank), reward: null,
      sex: nullable(character.gender), skin: nullable(character.skin), weight: nullable(character.weight)
    },
    ccfolia: { crude: null, trump: null },
    display: displayValue,
    exp: { ability: "0", armours: "0", initial: "0", outfits: "0", residences: "0", skills: "0", superhumanskills: "0", total: "0", vehicles: "0", weapons: "0" },
    outfits: groups.outfits.length ? groups.outfits : [blankOutfit()],
    outline: createOutline(styles),
    residences: groups.residences.length ? groups.residences : [blankResidence()],
    skills1: fixedGeneral.slice(0, 8).map((skill, index) => toGeneralSkill(skill, GENERAL_ORDER[index])),
    skills2: fixedGeneral.slice(8).map((skill, index) => toGeneralSkill(skill, GENERAL_ORDER[index + 8])),
    skills3: social.length ? social.map(skill => toSimpleSkill(skill, "社会：")) : [blankSkill("社会：Ｎ◎ＶＡ")],
    skills4: connections.length ? connections.map(skill => toSimpleSkill(skill, "コネ：")) : [blankSkill("コネ：")],
    styles: {
      style1: STYLE_CODES.get(styles[0].name),
      style2: STYLE_CODES.get(styles[1].name),
      style3: STYLE_CODES.get(styles[2].name),
      utsuwa: {
        element1: styles[0].name === "ウツワ" ? nullable(styles[0].attribute) : null,
        element2: styles[1].name === "ウツワ" ? nullable(styles[1].attribute) : null,
        element3: styles[2].name === "ウツワ" ? nullable(styles[2].attribute) : null
      }
    },
    superhumanskills: styleSkills.length ? styleSkills.map(toStyleSkill) : [blankStyleSkill()],
    vehicles: groups.vehicles.length ? groups.vehicles : [blankVehicle()],
    weapons: groups.weapons.length ? groups.weapons : [blankWeapon()]
  };

  const jsonData = `(${JSON.stringify(json)})`;
  return {
    name: castName,
    nameKana: castKana,
    player: text(character.player_name),
    outline: json.outline,
    display: displayValue,
    jsonData,
    summary: {
      publicId: text(character.public_id),
      styles: styles.map(item => `${item.name}${item.mark}${item.name === "ウツワ" && item.attribute ? `（${item.attribute}）` : ""}`).join(" / "),
      generalSkills: general.length,
      socialSkills: social.length,
      connectionSkills: connections.length,
      styleSkills: styleSkills.length,
      outfits: outfits.filter(item => text(item.name)).length
    }
  };
}

function ability(character, key) {
  return {
    abl: numText(character[`${key}_value`] ?? character[`${key}_base`]),
    ctl: numText(character[`${key}_control`] ?? character[`${key}_control_base`])
  };
}
function emptyAbilityModifier() { return { cs: null, life: { abl: null, ctl: null }, mundane: { abl: null, ctl: null }, passion: { abl: null, ctl: null }, reason: { abl: null, ctl: null } }; }
function createOutline(styles) { return `STYLE:${styles.map(item => STYLE_ENGLISH.get(item.name)).join("=")}`; }
function cleanSkillName(value) { return text(value).replace(/^[★]+\s*/, ""); }
function findGeneral(general, target) {
  const exact = general.find(skill => cleanSkillName(skill.name) === target);
  if (exact) return exact;
  if (["製作：", "芸術：", "操縦："].includes(target)) return general.find(skill => cleanSkillName(skill.name).startsWith(target)) || null;
  return null;
}
function toGeneralSkill(skill, fallbackName) {
  if (!skill) return blankSkill(fallbackName);
  return toSkillCore(skill, cleanSkillName(skill.name) || fallbackName);
}
function toSimpleSkill(skill, prefix) {
  let name = cleanSkillName(skill.name);
  if (prefix && !name.startsWith(prefix)) name = `${prefix}${name}`;
  return toSkillCore(skill, name);
}
function toSkillCore(skill, name) {
  return { c: flag(skill.passion), d: flag(skill.mundane), h: flag(skill.life), level: text(skill.level) || null, name: nullable(name), s: flag(skill.reason) };
}
function blankSkill(name = null) { return { c: null, d: null, h: null, level: name ? "1" : null, name, s: name ? "1" : null }; }
function styleSkillExpBase(skill) {
  const kind = text(skill?.skill_kind).toLowerCase();
  if (kind === "secret" || kind === "秘技") return "20";
  if (kind === "ultimate" || kind === "奥義") return "50";
  if (["direction", "none", "演出", "なし"].includes(kind)) return "0";
  return "10";
}
function toStyleSkill(skill) {
  const detail = parseStyleDetail(skill);
  return {
    aim: nullable(detail.difficulty || skill.difficulty),
    c: flag(skill.passion), confront: nullable(detail.confrontation || skill.confrontation), d: flag(skill.mundane),
    expbase: styleSkillExpBase(skill), h: flag(skill.life), level: text(skill.level) || null, limit: nullable(detail.limit),
    name: nullable(skill.name), notes: nullable(detail.description || skill.description), page: nullable(detail.page),
    range: nullable(detail.range || skill.range), s: flag(skill.reason), skill: nullable(detail.skill),
    target: nullable(detail.target || skill.target), timing: nullable(detail.timing || skill.timing),
    type: nullable(SKILL_KIND[text(skill.skill_kind).toLowerCase()] || skill.skill_kind)
  };
}
function blankStyleSkill() { return { aim:null,c:null,confront:null,d:null,expbase:"10",h:null,level:null,limit:null,name:null,notes:null,page:null,range:null,s:null,skill:null,target:null,timing:null,type:null }; }

function parseStyleDetail(skill) {
  if (skill?._styleDetail) return skill._styleDetail;
  const raw = String(skill?.description || "");
  if (raw.startsWith(STYLE_DETAIL_PREFIX)) {
    try { return JSON.parse(raw.slice(STYLE_DETAIL_PREFIX.length).trim()); } catch { /* continue */ }
  }
  const detail = { skill:"",limit:"",timing:skill?.timing||"",target:skill?.target||"",range:skill?.range||"",difficulty:skill?.difficulty||"",confrontation:skill?.confrontation||"",description:raw,page:"" };
  const labels = { "技能":"skill", "上限":"limit", "タイミング":"timing", "対象":"target", "射程":"range", "目標値":"difficulty", "対決":"confrontation", "参照P":"page" };
  const description = [];
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^([^：:]+)[：:]\s*(.*)$/); const key = match && labels[match[1].trim()];
    if (key) detail[key] = match[2]; else description.push(line);
  }
  detail.description = description.join("\n").trim();
  return detail;
}
function parseOutfitExtra(description) {
  const extras = {}, plain = [];
  const labels = { "隠匿A":"concealA", "隠匿B":"concealB", "攻撃":"attack", "防御":"defense", "射程":"range", "スロット":"slot", "制御":"control", "制御値":"control", "電制":"electrical_control", "防御S":"protecS", "防御P":"protecP", "防御I":"protecI", "乗員":"crew", "SF":"sf", "登場":"entry", "部位":"part", "参照P":"page" };
  for (const line of String(description || "").split(/\r?\n/)) {
    const match = line.match(/^([^：:]+)[：:]\s*(.*)$/); const key = match && labels[match[1].trim()];
    if (key) extras[key] = match[2]; else plain.push(line);
  }
  extras.notes = plain.join("\n").trim(); return extras;
}
function outfitFields(outfit) {
  const normalized = normalizeOutfitForView(outfit);
  const details = normalized.ofc_details || {};
  const legacy = parseOutfitExtra(normalized.description);
  const category = normalized.category;
  return {
    name: nullable(normalized.name), purchase: nullable(details.purchase_target || normalized.purchase_value), permanent: nullable(details.permanent_cost || normalized.experience_cost),
    concealA: nullable(normalized.concealment || legacy.concealA), concealB: nullable(normalized.concealment_penalty || legacy.concealB),
    attack: nullable(normalized.attack || legacy.attack), defense: nullable(category === "weapon" ? (normalized.parry || legacy.defense || normalized.defense) : (normalized.defense || legacy.defense)),
    range: nullable(normalized.range || legacy.range), slot: nullable(normalized.speed || legacy.slot), control: nullable(normalized.control_modifier || legacy.control),
    electrical_control: nullable(normalized.electronic_control || legacy.electrical_control), protecS: nullable(normalized.defense_s || legacy.protecS),
    protecP: nullable(normalized.defense_p || legacy.protecP), protecI: nullable(normalized.defense_i || legacy.protecI), crew: nullable(normalized.crew || legacy.crew),
    sf: nullable(normalized.sf || legacy.sf), entry: nullable(normalized.residence_entry || legacy.entry), part: nullable(normalized.slot || legacy.part), notes: nullable(legacy.notes || normalized.description), page: nullable(normalized.page_number || legacy.page)
  };
}
function toCharacterSheetsOutfit(outfit, target) {
  const f = outfitFields(outfit);
  if (target === "weapons") return pick(f,["name","purchase","permanent","concealA","concealB","attack","defense","range","electrical_control","part","notes","page"]);
  if (target === "armours") return pick(f,["name","purchase","permanent","concealA","concealB","control","electrical_control","protecS","protecP","protecI","part","notes","page"]);
  if (target === "vehicles") return pick(f,["name","purchase","permanent","concealA","concealB","attack","control","electrical_control","protecS","protecP","protecI","crew","sf","slot","part","notes","page"]);
  if (target === "residences") return pick(f,["name","purchase","permanent","entry","electrical_control","part","notes","page"]);
  return pick(f,["name","purchase","permanent","concealA","concealB","slot","electrical_control","part","notes","page","attack","protecS","protecP","protecI"]);
}
function pick(object, keys) { return Object.fromEntries(keys.map(key => [key, object[key] ?? null])); }
function blankWeapon(){return {attack:null,concealA:null,concealB:null,defense:null,electrical_control:null,name:null,notes:null,page:null,part:null,permanent:null,purchase:null,range:null};}
function blankArmour(){return {concealA:null,concealB:null,control:null,electrical_control:null,name:null,notes:null,page:null,part:null,permanent:null,protecI:null,protecP:null,protecS:null,purchase:null};}
function blankVehicle(){return {attack:null,concealA:null,concealB:null,control:null,crew:null,electrical_control:null,name:null,notes:null,page:null,part:null,permanent:null,protecI:null,protecP:null,protecS:null,purchase:null,sf:null,slot:null};}
function blankResidence(){return {electrical_control:null,entry:null,name:null,notes:null,page:null,part:null,permanent:null,purchase:null};}
function blankOutfit(){return {concealA:null,concealB:null,electrical_control:null,name:null,notes:null,page:null,part:null,permanent:null,purchase:null,slot:null};}
