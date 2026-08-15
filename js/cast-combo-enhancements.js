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
  let queued = false;

  const apply = async () => {
    if (applying) {
      queued = true;
      return;
    }

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
      if (queued) {
        queued = false;
        queueMicrotask(apply);
      }
    }
  };

  // Only observe direct children. The renderer replaces the combo cards under
  // #combo-container; the enhancements themselves mutate descendants of those
  // cards. Watching the full subtree would cause those mutations to retrigger
  // this observer indefinitely and starve timers such as the scan overlay.
  new MutationObserver(() => apply()).observe(container, { childList: true });
  apply();
}

function enhanceAbility(card, combo) {
  const abilityNode = card.querySelector(".combo-card__ability");
  if (!abilityNode) return;

  const keys = parseSuitKeys(combo.ability || combo.ability_key);
  const desiredClass = "combo-card__ability combo-card__ability--multi";
  const desiredHtml = keys.map(key =>
    `<span class="combo-card__ability-chip combo-card__ability-chip--${key}">${SUITS[key]}</span>`
  ).join("");

  if (abilityNode.className !== desiredClass) abilityNode.className = desiredClass;

  if (!keys.length) {
    if (!abilityNode.hidden) abilityNode.hidden = true;
    if (abilityNode.childNodes.length) abilityNode.replaceChildren();
    return;
  }

  if (abilityNode.hidden) abilityNode.hidden = false;
  if (abilityNode.innerHTML !== desiredHtml) abilityNode.innerHTML = desiredHtml;
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

  if (node.textContent !== detail) node.textContent = detail;
  if (node.hidden === Boolean(detail)) node.hidden = !detail;
}

function parseSuitKeys(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return [];
  const known = new Set(Object.keys(SUITS));
  return [...new Set(text.split(/[\s,|/+]+/).filter(key => known.has(key)))];
}
