export function applyStyleAttributeVisibility({
  root = globalThis.document,
  index
} = {}) {
  if (!root?.querySelector || !Number.isInteger(index)) return false;
  const wrap = root.querySelector(`#style-${index}-attribute-wrap`);
  const select = root.querySelector(`#style-${index}-attribute`);
  const style = root.querySelector(`#style-${index}`);
  if (!wrap || !select || !style) return false;

  const enabled = style.value === "ウツワ";
  wrap.hidden = !enabled;
  if (!enabled) select.value = "";
  return true;
}

export function applyCharacterToEditor({
  root = globalThis.document,
  data,
  structuredFields,
  abilities = [],
  styleBaseline,
  applyCharacterInputSnapshot,
  applyStyleInputSnapshot,
  applyAbilityInputSnapshot,
  calculateBaselines,
  updateDivines
} = {}) {
  if (!root || !styleBaseline || typeof applyCharacterInputSnapshot !== "function" ||
      typeof applyStyleInputSnapshot !== "function" ||
      typeof applyAbilityInputSnapshot !== "function" ||
      typeof calculateBaselines !== "function" ||
      typeof updateDivines !== "function") return false;

  applyCharacterInputSnapshot({ root, data, structuredFields });
  applyStyleInputSnapshot({ root, data });
  for (let index = 1; index <= 3; index += 1) {
    applyStyleAttributeVisibility({ root, index });
  }
  calculateBaselines();
  applyAbilityInputSnapshot({ root, abilities, data, baselines: styleBaseline });
  updateDivines(false);
  return true;
}
