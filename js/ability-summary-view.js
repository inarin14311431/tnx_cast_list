// Read-only "ABILITIES ♠8 ♣5 ♥2 ♦6" list shown in the skill panel headings of the public cast view.
// Same markup and classes as the editor's js/sheet-ability-summary.js (styled by components/sheet-ability-summary.css).
export const ABILITIES = [
  ["reason", "♠", "理性"], ["passion", "♣", "感情"],
  ["life", "♥", "生命"], ["mundane", "♦", "外界"]
];

export function abilityValues(character) {
  return ABILITIES.map(([key]) => {
    const value = character?.[`${key}_value`];
    return value === null || value === undefined || String(value).trim() === "" ? "—" : String(value).trim();
  });
}

export function abilityLabel(values) {
  return ABILITIES.map(([, , name], index) => `${name} ${values[index]}`).join("、");
}

export function createAbilitySummary(doc, values) {
  const summary = doc.createElement("span");
  summary.className = "sheet-ability-summary";
  const label = doc.createElement("small");
  label.textContent = "ABILITIES";
  summary.append(label);
  ABILITIES.forEach(([, suit], index) => {
    const item = doc.createElement("span");
    item.className = "sheet-ability-summary__item";
    const symbol = doc.createElement("span");
    symbol.className = "sheet-ability-summary__suit";
    symbol.textContent = suit;
    symbol.setAttribute("aria-hidden", "true");
    const value = doc.createElement("span");
    value.textContent = values[index];
    item.append(symbol, value);
    summary.append(item);
  });
  summary.setAttribute("aria-label", abilityLabel(values));
  return summary;
}
