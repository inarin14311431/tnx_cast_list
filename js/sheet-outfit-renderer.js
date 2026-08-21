const OUTFIT_LABELS = Object.freeze({
  weapon: "武器",
  armor: "防具",
  cyberware: "サイバーウェア",
  tron: "トロン",
  vehicle: "ヴィークル",
  residence: "住居",
  other: "その他"
});

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
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

  return `<article class="outfit-card outfit-form" data-outfit-key="${esc(outfit._key)}"><header><label>分類<select data-o="category">${options}</select></label><button class="row-delete" data-delete-outfit="${esc(outfit._key)}" type="button">×</button></header><div class="outfit-fields">${renderOutfitFields({ ...outfit, category })}</div></article>`;
}

function renderOutfitFields(outfit) {
  const common = `<label>名称<input data-o="name" value="${esc(outfit.name)}"></label><label>購入<input data-o="purchase_value" value="${esc(outfit.purchase_value)}"></label><label>常備化<input data-o="experience_cost" type="number" value="${Number(outfit.experience_cost || 0)}"></label>`;
  const description = `<label class="outfit-description">解説<input data-o="description" value="${esc(outfit.description)}"></label>`;

  if (outfit.category === "weapon") {
    return common + `<label>隠匿<input data-o="concealment" value="${esc(outfit.concealment)}"></label><label>攻撃<input data-o="attack" value="${esc(outfit.attack)}"></label><label>射程<input data-o="range" value="${esc(outfit.range)}"></label><label>部位<input data-o="slot" value="${esc(outfit.slot)}"></label>` + description;
  }
  if (outfit.category === "armor") {
    return common + `<label>隠匿<input data-o="concealment" value="${esc(outfit.concealment)}"></label><label>部位<input data-o="slot" value="${esc(outfit.slot)}"></label><label>制御値<input data-o="control_modifier" type="number" value="${Number(outfit.control_modifier || 0)}"></label>` + description;
  }
  if (outfit.category === "tron") {
    return common + `<label>隠匿<input data-o="concealment" value="${esc(outfit.concealment)}"></label><label>部位<input data-o="slot" value="${esc(outfit.slot)}"></label><label>CS修正<input data-o="cs_modifier" type="number" value="${Number(outfit.cs_modifier || 0)}"></label>` + description;
  }
  if (outfit.category === "vehicle") {
    return common + `<label>攻撃<input data-o="attack" value="${esc(outfit.attack)}"></label><label>制御値<input data-o="control_modifier" type="number" value="${Number(outfit.control_modifier || 0)}"></label><label>CS修正<input data-o="cs_modifier" type="number" value="${Number(outfit.cs_modifier || 0)}"></label>` + description;
  }
  if (outfit.category === "residence") {
    return common + `<label>部位／エリア<input data-o="slot" value="${esc(outfit.slot)}"></label>` + description;
  }
  return common + `<label>隠匿<input data-o="concealment" value="${esc(outfit.concealment)}"></label><label>部位<input data-o="slot" value="${esc(outfit.slot)}"></label>` + description;
}
