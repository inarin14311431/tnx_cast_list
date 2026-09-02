const ITEM_PATH_SEPARATOR = " / ";
const CATEGORY_LABELS = {basic:"基本情報",personal:"パーソナルデータ",styles:"スタイル",abilities:"能力値・制御値・CS",general:"一般技能",social:"社会",connection:"コネ",styleSkills:"スタイル技能",outfits:"アウトフィット"};
const OUTFIT_CATEGORY_LABELS = {weapon:"ウェポン",armor:"防具",cyberware:"サイバーウェア",tron:"トロン",vehicle:"ヴィークル",residence:"住居",other:"アウトフィット"};
const ABILITY_LABELS = {reason:"【理性】",passion:"【感情】",life:"【生命】",mundane:"【外界】"};
const SCALAR_FIELD_LABELS = {
  basic:{character_name:"キャスト名",character_kana:"キャスト名の読み",handle:"ハンドル",handle_kana:"ハンドルの読み",player_name:"プレイヤー名",affiliation:"所属",citizen_rank:"市民ランク",summary:"概要",profile:"プロフィール"},
  personal:{age:"年齢",gender:"性別",height:"身長",weight:"体重",eyes:"瞳",hair:"髪",skin:"肌",life_path_origin:"出自",life_path_experience:"経験",life_path_encounter:"邂逅"},
  styles:{style_1:"スタイル1",style_1_mark:"スタイル1のマーク",style_1_attribute:"スタイル1の属性",style_2:"スタイル2",style_2_mark:"スタイル2のマーク",style_2_attribute:"スタイル2の属性",style_3:"スタイル3",style_3_mark:"スタイル3のマーク",style_3_attribute:"スタイル3の属性"}
};
const RECORD_FIELD_LABELS = {name:"名称",level:"レベル",free_level:"フリーレベル",reason:"【理性】スート",passion:"【感情】スート",life:"【生命】スート",mundane:"【外界】スート",skill_kind:"種別",description:"解説文",category:"種別",slot:"部位",range:"射程",attack:"攻撃力",concealment:"隠匿値",purchase_value:"常備化",experience_cost:"経験点",cs_modifier:"CS修正",control_modifier:"制御値修正",defense_s:"S防御",defense_p:"P防御",defense_i:"I防御",purchase_target:"購入難易度",permanent_cost:"常備化",electronic_control:"電制",concealment_penalty:"隠匿修正"};

export function groupCharacterSheetDifferences(differences = []) {
  const groups = [];
  const records = new Map();

  for (const difference of Array.isArray(differences) ? differences : []) {
    const category = difference?.category ?? "";
    const path = String(difference?.path ?? "");
    const recordPath = splitRecordPath(path);

    if (!recordPath) {
      groups.push({
        record: false,
        category,
        path,
        fields: [Object.assign({}, difference || {}, { field: path })]
      });
      continue;
    }

    const key = String(category) + "\u0000" + recordPath.itemPath;
    let group = records.get(key);
    if (!group) {
      group = {
        record: true,
        category,
        path: recordPath.itemPath,
        fields: []
      };
      records.set(key, group);
      groups.push(group);
    }
    group.fields.push(Object.assign({}, difference || {}, { field: recordPath.field }));
  }

  return groups.map(group => group.record ? Object.assign({}, group, { presence: detectRecordPresence(group) }) : group);
}

export function summarizeCharacterSheetDifferences(groups = []) {
  const summaries = [];
  for (const group of Array.isArray(groups) ? groups : []) {
    if (group?.presence === "added") {
      const info = recordInfo(group);
      summaries.push(`${info.categoryLabel}「${info.name}」が削除されている`);
      continue;
    }
    if (group?.presence === "removed") {
      const info = recordInfo(group);
      summaries.push(`${info.categoryLabel}に「${info.name}」が追加されている`);
      continue;
    }
    for (const field of Array.isArray(group?.fields) ? group.fields : []) {
      const summary = summarizeFieldDifference(group, field);
      if (summary) summaries.push(summary);
    }
  }
  return summaries;
}

function detectRecordPresence(group) {
  const nameField = group.fields.find(field => field.field === "name");
  if (!nameField) return "changed";

  const archiveName = recordNameValue(nameField.archive);
  const warehouseName = recordNameValue(nameField.warehouse);
  if (!archiveName && warehouseName) return "added";
  if (archiveName && !warehouseName) return "removed";
  return "changed";
}

function recordNameValue(value) {
  return String(value ?? "").trim();
}

function summarizeFieldDifference(group, field) {
  const key = String(field?.field ?? field?.path ?? "");
  const subject = group?.record ? recordSubject(group) : scalarSubject(group?.category, key);
  const label = group?.record ? recordFieldLabel(key) : "";
  const target = label && subject ? `${subject}の${label}` : subject || label || key;
  return describeValueChange(target, field?.archive, field?.warehouse, key);
}

function recordInfo(group) {
  const category = String(group?.category ?? "");
  const rawPath = String(group?.path ?? "");
  if (category === "outfits") {
    const separatorIndex = rawPath.indexOf(":");
    const outfitCategory = separatorIndex >= 0 ? rawPath.slice(0, separatorIndex) : "other";
    const rawName = separatorIndex >= 0 ? rawPath.slice(separatorIndex + 1) : rawPath;
    return {
      categoryLabel: OUTFIT_CATEGORY_LABELS[outfitCategory] || OUTFIT_CATEGORY_LABELS.other,
      name: displayRecordName(rawName)
    };
  }
  return {
    categoryLabel: CATEGORY_LABELS[category] || category,
    name: displaySkillName(rawPath, category)
  };
}

function recordSubject(group) {
  const info = recordInfo(group);
  return info.name || info.categoryLabel || "項目";
}

function displaySkillName(value, category) {
  let name = displayRecordName(value);
  if (category === "social" && name.startsWith("社会：")) name = name.slice(3);
  if (category === "connection" && name.startsWith("コネ：")) name = name.slice(3);
  return name || "名称なし";
}

function displayRecordName(value) {
  const source = String(value ?? "").trim();
  const duplicate = source.match(/\s+#(\d+)$/);
  if (!duplicate) return source;
  return `${source.slice(0, duplicate.index).trim()}（${duplicate[1]}件目）`;
}

function scalarSubject(category, key) {
  const ability = key.match(/^(reason|passion|life|mundane)_(base|gear|control_base|control_gear)$/);
  if (ability) {
    const suffix = {base:"",gear:"の装備修正",control_base:"の制御値",control_gear:"の制御値修正"}[ability[2]] || "";
    return `${ABILITY_LABELS[ability[1]] || ability[1]}${suffix}`;
  }
  if (key === "cs_base") return "CS";
  if (key === "cs_gear") return "CSの装備修正";
  return SCALAR_FIELD_LABELS[category]?.[key] || key;
}

function recordFieldLabel(key) {
  return RECORD_FIELD_LABELS[key] || key;
}

function describeValueChange(subject, archive, warehouse, key) {
  const archiveNumber = numericValue(archive);
  const warehouseNumber = numericValue(warehouse);
  if (archiveNumber !== null && warehouseNumber !== null && archiveNumber !== warehouseNumber) {
    const delta = archiveNumber - warehouseNumber;
    const amount = formatNumber(Math.abs(delta));
    const levelLike = /(?:^|_)level$/.test(key);
    const direction = delta > 0 ? (levelLike ? "上がっている" : "増えている") : (levelLike ? "下がっている" : "減っている");
    return `${subject}が${amount}${direction}`;
  }

  const archiveBoolean = booleanValue(archive);
  const warehouseBoolean = booleanValue(warehouse);
  if (archiveBoolean !== null && warehouseBoolean !== null && archiveBoolean !== warehouseBoolean) {
    return `${subject}が${archiveBoolean ? "追加されている" : "削除されている"}`;
  }

  return `${subject}が変更されている`;
}

function numericValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const source = value.trim();
  if (!source || !/^[-+]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(source)) return null;
  const result = Number(source);
  return Number.isFinite(result) ? result : null;
}

function booleanValue(value) {
  if (typeof value === "boolean") return value;
  if (value === null || value === undefined) return null;
  const source = String(value).trim().toLowerCase();
  if (["true","1","yes","on","あり"].includes(source)) return true;
  if (["false","0","no","off","なし",""].includes(source)) return false;
  return null;
}

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : String(value);
}

function splitRecordPath(path) {
  const separatorIndex = path.lastIndexOf(ITEM_PATH_SEPARATOR);
  if (separatorIndex <= 0 || separatorIndex + ITEM_PATH_SEPARATOR.length >= path.length) return null;
  return {
    itemPath: path.slice(0, separatorIndex),
    field: path.slice(separatorIndex + ITEM_PATH_SEPARATOR.length)
  };
}