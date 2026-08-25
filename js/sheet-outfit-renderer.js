const OUTFIT_LABELS = Object.freeze({
  weapon: "武器",
  armor: "防具",
  cyberware: "サイバーウェア",
  tron: "トロン",
  vehicle: "ヴィークル",
  residence: "住居",
  other: "その他"
});

const OFC_FIELDS = new Set([
  "concealment_penalty", "parry", "speed", "electronic_control",
  "defense_s", "defense_p", "defense_i",
  "ianus_surface", "ianus_deep", "ianus_none",
  "tron_software", "tron_support", "tron_hardware",
  "crew", "sf", "residence_entry", "residence_electric", "residence_area",
  "manufacturer", "page_number", "major_category", "minor_category"
]);

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function field(outfit, key, label, { type = "text", className = "" } = {}) {
  const value = type === "number" ? Number(outfit[key] || 0) : outfit[key] ?? "";
  const ofc = OFC_FIELDS.has(key) ? ` data-ofc="${key}"` : "";
  const klass = className ? ` class="${className}"` : "";
  return `<label${klass}>${label}<input data-o="${key}"${ofc} type="${type}" value="${esc(value)}"></label>`;
}

export function renderOutfitEditor(outfits = []) {
  if (!outfits.length) return "<p>アウトフィット未登録</p>";
  return outfits.map(renderOutfitCard).join("");
}

function renderOutfitCard(outfit = {}) {
  const category = OUTFIT_LABELS[outfit.category] ? outfit.category : "other";
  const options = Object.entries(OUTFIT_LABELS)
    .map(([value, label]) => `<option value="${value}" ${category === value ? "selected" : ""}>${label}</option>`)
    .join("");
  const details = esc(JSON.stringify(outfit._ofc_details || {}));

  return `<article class="outfit-card outfit-form" data-outfit-key="${esc(outfit._key)}" data-outfit-ofc-details="${details}"><header><label>分類<select data-o="category">${options}</select></label><button class="row-delete" data-delete-outfit="${esc(outfit._key)}" type="button">×</button></header><div class="outfit-fields">${renderOutfitFields({ ...outfit, category })}</div></article>`;
}

function renderOutfitFields(outfit) {
  const common = [
    field(outfit, "name", "名称"),
    field(outfit, "purchase_value", "購入"),
    field(outfit, "experience_cost", "常備化", { type: "number" }),
    field(outfit, "concealment", "隠匿値"),
    field(outfit, "concealment_penalty", "隠匿修正")
  ];
  const metadata = [
    field(outfit, "manufacturer", "メーカー"),
    field(outfit, "page_number", "参照P"),
    field(outfit, "major_category", "OFC大分類"),
    field(outfit, "minor_category", "OFC小分類"),
    field(outfit, "description", "解説", { className: "outfit-description" })
  ];

  const categoryFields = {
    weapon: [
      field(outfit, "attack", "攻撃"), field(outfit, "parry", "受"), field(outfit, "range", "射程"),
      field(outfit, "speed", "ス"), field(outfit, "electronic_control", "電制"), field(outfit, "slot", "部位")
    ],
    armor: [
      field(outfit, "defense_s", "S"), field(outfit, "defense_p", "P"), field(outfit, "defense_i", "I"),
      field(outfit, "control_modifier", "制御値", { type: "number" }), field(outfit, "electronic_control", "電制"), field(outfit, "slot", "部位")
    ],
    cyberware: [
      field(outfit, "electronic_control", "電制"), field(outfit, "ianus_surface", "表"), field(outfit, "ianus_deep", "深"),
      field(outfit, "ianus_none", "無"), field(outfit, "slot", "部位")
    ],
    tron: [
      field(outfit, "electronic_control", "電制"), field(outfit, "speed", "ス"), field(outfit, "tron_software", "ソ"),
      field(outfit, "tron_support", "サ"), field(outfit, "tron_hardware", "ハ"), field(outfit, "cs_modifier", "CS修正", { type: "number" }),
      field(outfit, "slot", "部位")
    ],
    vehicle: [
      field(outfit, "attack", "攻撃"), field(outfit, "speed", "ス"), field(outfit, "control_modifier", "制御値", { type: "number" }),
      field(outfit, "cs_modifier", "CS修正", { type: "number" }), field(outfit, "electronic_control", "電制"),
      field(outfit, "defense_s", "S"), field(outfit, "defense_p", "P"), field(outfit, "defense_i", "I"),
      field(outfit, "crew", "乗員"), field(outfit, "sf", "SF"), field(outfit, "slot", "部位")
    ],
    residence: [
      field(outfit, "speed", "ス"), field(outfit, "electronic_control", "電制"), field(outfit, "residence_entry", "登"),
      field(outfit, "residence_electric", "電"), field(outfit, "residence_area", "ア"), field(outfit, "slot", "部位／エリア")
    ],
    other: [field(outfit, "electronic_control", "電制"), field(outfit, "slot", "部位")]
  };

  return [...common, ...(categoryFields[outfit.category] || categoryFields.other), ...metadata].join("");
}
