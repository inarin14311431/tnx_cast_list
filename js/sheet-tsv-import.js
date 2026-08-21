const OUTFIT_TARGET_MAP = Object.freeze({
  weapons: "weapon",
  weapon: "weapon",
  armours: "armor",
  armors: "armor",
  armor: "armor",
  cyberwares: "cyberware",
  cyberware: "cyberware",
  trons: "tron",
  tron: "tron",
  vehicles: "vehicle",
  vehicle: "vehicle",
  residences: "residence",
  residence: "residence",
  outfits: "other",
  outfit: "other",
  other: "other",
  "武器": "weapon",
  "防具": "armor",
  "サイバーウェア": "cyberware",
  "トロン": "tron",
  "ヴィークル": "vehicle",
  "住居": "residence",
  "住宅": "residence",
  "装備": "other",
  "その他": "other"
});

export function parseSheetTsv(text) {
  const normalized = String(text ?? "").replace(/\r/g, "").trim();
  if (!normalized) return [];
  const lines = normalized.split("\n").filter(Boolean).map(line => line.split("\t"));
  if (!lines.length) return [];
  const header = lines.shift().map(value => value.trim());
  return lines.map(row => Object.fromEntries(
    header.map((name, index) => [name, (row[index] || "").replace(/\\n/g, "\n")])
  ));
}

export function buildStyleSkillTsvRow(row = {}, {
  base = {},
  styleKindFromLabel = () => ""
} = {}) {
  const label = row["種別"] || "";
  const fallbackKind = /奥義/.test(label) ? "ultimate" : /秘技/.test(label) ? "secret" : "normal";
  return {
    ...base,
    name: row["名称"] || "",
    skill_kind: styleKindFromLabel(label) || fallbackKind,
    level: Number(row["レベル"] || 1),
    description: row["解説"] || ""
  };
}

function compactDetails(details) {
  return Object.fromEntries(
    Object.entries(details).filter(([, value]) => String(value ?? "").trim() !== "")
  );
}

function firstValue(...values) {
  return values.find(value => String(value ?? "").trim() !== "") ?? "";
}

export function resolveImportedDefense(row = {}) {
  const combined = String(row.defense || "").trim().split(/[\/／]/).map(value => value.trim());
  return {
    defense_s: firstValue(row.protecS, row.protectS, row.protectionS, row.defenseS, row.defense_s, row.S, combined[0]),
    defense_p: firstValue(row.protecP, row.protectP, row.protectionP, row.defenseP, row.defense_p, row.P, combined[1]),
    defense_i: firstValue(row.protecI, row.protectI, row.protectionI, row.defenseI, row.defense_i, row.I, combined[2])
  };
}

export function buildOutfitTsvRow(row = {}, { base = {} } = {}) {
  const category = OUTFIT_TARGET_MAP[row.target] || OUTFIT_TARGET_MAP[String(row.target || "").toLowerCase()] || "other";
  const defense = resolveImportedDefense(row);
  const ofcDetails = compactDetails({
    page_number: row.page || "",
    electronic_control: row.electrical_control || "",
    ...defense,
    crew: row.crew || "",
    sf: row.sf || "",
    residence_entry: row.entry || ""
  });

  return {
    ...base,
    category,
    name: row.name || "",
    purchase_value: row.purchase || "",
    experience_cost: Number(row.permanent || 0),
    concealment: [row.concealA, row.concealB].filter(Boolean).join("/"),
    attack: row.attack || "",
    range: row.range || "",
    slot: row.part || row.slot || "",
    control_modifier: Number(String(row.control || "").match(/-?\d+/)?.[0] || 0),
    description: row.notes || "",
    ofc_details: ofcDetails
  };
}
