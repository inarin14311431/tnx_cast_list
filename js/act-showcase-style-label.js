// A style label is the style name followed by its marks: "カブキ◎●" = persona (◎) and key (●).
// The assignment scene turns each label into a card (js/act-showcase-neotokyo.js); the text shown is unchanged.
const MARKS = /[◎●]/g;

export function parseStyleLabel(label) {
  const text = String(label ?? "").trim();
  const name = text.replace(MARKS, "").replace(/[\s　]+/g, " ").trim();
  return {
    label: text,
    name: name || text,
    persona: text.includes("◎"),
    key: text.includes("●")
  };
}
