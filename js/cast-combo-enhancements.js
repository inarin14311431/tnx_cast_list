import { getCombos } from "./cast-data-store.js";

const SUITS = {
  reason: "♠理性",
  passion: "♣感情",
  life: "♥生命",
  mundane: "♦外界"
};

initialize();

async function initialize() {
  if (document.body?.dataset.page !== "cast.html") return;
  const container = document.querySelector("#combo-container");
  if (!container) return;

  let applying = false;
  const apply = async () => {
    if (applying) return;
    const cards = [...container.querySelectorAll(".combo-card")];
    if (!cards.length) return;
    applying = true;
    try {
      const combos = await getCombos();
      let comboIndex = 0;
      cards.forEach(card => {
        const combo = combos[comboIndex++];
        if (!combo || card.classList.contains("combo-skill-counter")) return;
        enhanceAbility(card, combo);
        enhanceDetail(card, combo);
      });
    } catch (error) {
      console.warn("combo enhancement load failed", error);
    } finally {
      applying = false;
    }
  };

  new MutationObserver(() => apply()).observe(container, { childList: true, subtree: true });
  apply();
}

function enhanceAbility(card, combo) {
  const abilityNode = card.querySelector(".combo-card__ability");
  if (!abilityNode) return;
  const keys = parseSuitKeys(combo.ability || combo.ability_key);
  abilityNode.className = "combo-card__ability combo-card__ability--multi";
  if (!keys.length) {
    abilityNode.hidden = true;
    abilityNode.replaceChildren();
    return;
  }
  abilityNode.hidden = false;
  abilityNode.innerHTML = keys.map(key => `<span class="combo-card__ability-chip combo-card__ability-chip--${key}">${SUITS[key]}</span>`).join("");
}

function enhanceDetail(card, combo) {
  const node = card.querySelector(".combo-card__outcome");
  if (!node) return;
  const detail = [
    combo.timing ? `タイミング：${combo.timing}` : "",
    combo.difficulty ? `目標値：${combo.difficulty}` : "",
    combo.confrontation ? `対決：${combo.confrontation}` : "",
    combo.target ? `対象：${combo.target}` : "",
    combo.range ? `射程：${combo.range}` : ""
  ].filter(Boolean).join("／");
  node.textContent = detail;
  node.hidden = !detail;
}

function parseSuitKeys(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return [];
  const known = new Set(Object.keys(SUITS));
  return [...new Set(text.split(/[\s,|/+]+/).filter(key => known.has(key)))];
}
