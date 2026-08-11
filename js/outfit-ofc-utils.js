export const OUTFIT_ROOT_SELECTOR = "#outfit-list";

export function targetToCategory(target) {
  const key = String(target || "").trim().toLowerCase();
  return ({
    weapons: "weapon", weapon: "weapon", "武器": "weapon",
    armours: "armor", armors: "armor", armor: "armor", "防具": "armor",
    vehicles: "vehicle", vehicle: "vehicle", "ヴィークル": "vehicle",
    residences: "residence", residence: "residence", "住居": "residence", "住宅": "residence",
    cyberware: "cyberware", cyberwares: "cyberware", "サイバーウェア": "cyberware",
    tron: "tron", trons: "tron", "トロン": "tron"
  })[key] || "other";
}

export function categoryToTarget(category) {
  return ({
    weapon: "weapons",
    armor: "armours",
    vehicle: "vehicles",
    residence: "residences"
  })[String(category || "").trim()] || "outfits";
}

export function parseDefense(value) {
  const text = String(value || "").trim();
  const output = { defense_s: "", defense_p: "", defense_i: "" };
  for (const match of text.matchAll(/\b([SPI])\s*[:：]?\s*([^/／,，\s]+)/gi)) {
    output[`defense_${match[1].toLowerCase()}`] = match[2];
  }
  if (Object.values(output).some(Boolean)) return output;
  const parts = text.split(/[\/／,，\s]+/).filter(Boolean);
  if (parts.length) output.defense_s = parts[0] || "";
  if (parts.length > 1) output.defense_i = parts[1] || "";
  if (parts.length > 2) output.defense_p = parts[2] || "";
  return output;
}

export function defenseText(details) {
  return [
    details?.defense_s !== "" && details?.defense_s != null ? `S${details.defense_s}` : "",
    details?.defense_p !== "" && details?.defense_p != null ? `P${details.defense_p}` : "",
    details?.defense_i !== "" && details?.defense_i != null ? `I${details.defense_i}` : ""
  ].filter(Boolean).join("/");
}

export function outfitSignature(category, name) {
  return `${String(category || "other").trim()}\u0000${String(name || "").trim()}`;
}

export function cssEscape(value) {
  return globalThis.CSS?.escape
    ? CSS.escape(String(value))
    : String(value).replace(/(["\\])/g, "\\$1");
}

export function valueOf(row, field) {
  return row?.querySelector(`[data-o="${cssEscape(field)}"]`)?.value ?? "";
}

export function getOutfitRows(root = globalThis.document) {
  if (!root?.querySelectorAll) return [];
  return [...root.querySelectorAll(`${OUTFIT_ROOT_SELECTOR} .outfit-table-row[data-outfit-key],${OUTFIT_ROOT_SELECTOR} .outfit-card[data-outfit-key]`)]
    .filter((row, index, array) => array.findIndex(other => other.dataset.outfitKey === row.dataset.outfitKey) === index);
}

export function rowSignature(row) {
  return outfitSignature(
    valueOf(row, "category") || row?.closest?.("table")?.dataset?.outfitSchema || "other",
    valueOf(row, "name")
  );
}
