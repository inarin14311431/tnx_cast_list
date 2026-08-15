import { getCombos } from "./cast-data-store.js";

const SUITS = {
  reason: ["♠", "理性"],
  passion: ["♣", "感情"],
  life: ["♥", "生命"],
  mundane: ["♦", "外界"]
};

if (new URLSearchParams(location.search).get("mobile") === "1") {
  initialize();
}

async function initialize() {
  const root = document.querySelector("#mobile-cast-view");
  if (!root) return;

  const apply = async () => {
    const list = root.querySelector(".mobile-combo-list");
    if (!list || list.dataset.mobileComboEnhanced === "1") return false;

    try {
      const combos = await getCombos();
      list.dataset.mobileComboEnhanced = "1";
      list.innerHTML = combos.map(renderEntry).join("");
      initializeCounters(list);
    } catch (error) {
      console.warn("mobile combo enhancement failed", error);
    }
    return true;
  };

  if (await apply()) return;

  const observer = new MutationObserver(async () => {
    if (await apply()) observer.disconnect();
  });
  observer.observe(root, { childList: true, subtree: true });
  window.setTimeout(() => observer.disconnect(), 6000);
}

function renderEntry(combo) {
  if (isCounter(combo)) return renderCounter(combo);

  const suits = parseSuitKeys(combo.ability || combo.ability_key);
  const stats = [
    hasValue(combo.modifier) ? ["判定修正", combo.modifier] : null,
    hasValue(combo.target_value) ? ["達成目安", combo.target_value] : null,
    positiveInteger(combo.act_use_limit) ? ["使用上限", `${positiveInteger(combo.act_use_limit)}回/ACT`] : null
  ].filter(Boolean);
  const detail = [
    hasValue(combo.timing) ? `タイミング：${combo.timing}` : "",
    hasValue(combo.target) ? `対象：${combo.target}` : "",
    hasValue(combo.range) ? `射程：${combo.range}` : ""
  ].filter(Boolean).join("／");
  const description = combo.description || combo.effect || "";

  return `
    <article class="mobile-combo-card mobile-combo-card--detail">
      <header class="mobile-combo-card__header">
        <div class="mobile-combo-card__title"><span>COMBO</span><strong>${esc(combo.name || "COMBO")}</strong></div>
        ${suits.length ? `<div class="mobile-combo-card__suits">${suits.map(renderSuit).join("")}</div>` : ""}
      </header>
      ${combo.skills ? `<p class="mobile-combo-card__skills"><i>組み合わせ技能</i><b>${esc(combo.skills)}</b></p>` : ""}
      ${stats.length ? `<dl class="mobile-combo-card__stats">${stats.map(([label,value]) => `<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join("")}</dl>` : ""}
      ${detail ? `<p class="mobile-combo-card__detail">${esc(detail)}</p>` : ""}
      ${description ? `<p class="mobile-combo-card__description">${nl2br(description)}</p>` : ""}
    </article>`;
}

function renderCounter(combo) {
  const limit = positiveInteger(combo.act_use_limit);
  const id = String(combo.id || combo.name || combo.skills || "counter");
  return `
    <article class="mobile-combo-card mobile-combo-card--counter" data-mobile-counter-id="${esc(id)}" data-mobile-counter-limit="${limit || 0}">
      <header class="mobile-combo-card__header">
        <div class="mobile-combo-card__title"><span>COUNTER</span><strong>${esc(combo.name || combo.skills || "技能カウンター")}</strong></div>
      </header>
      <div class="mobile-combo-counter__row">
        <p class="mobile-combo-counter__meta">${limit ? `1アクト ${limit}回` : "使用回数上限なし"}／技能カウンター</p>
        ${limit ? `<button class="mobile-combo-counter__reset" type="button" data-mobile-counter-reset>RESET</button>` : ""}
      </div>
      ${limit ? `<div class="mobile-combo-counter__boxes" role="group" aria-label="使用回数">${Array.from({length:limit},(_,index)=>`<button type="button" class="mobile-combo-counter__box" data-mobile-counter-box="${index}" aria-pressed="false" aria-label="${index+1}回目"></button>`).join("")}</div>` : ""}
    </article>`;
}

function initializeCounters(list) {
  list.querySelectorAll("[data-mobile-counter-id]").forEach(card => {
    const limit = positiveInteger(card.dataset.mobileCounterLimit);
    if (!limit) return;
    const key = counterStorageKey(card.dataset.mobileCounterId);
    let used = readUsedCount(key, limit);
    paintCounter(card, used, limit);

    card.querySelectorAll("[data-mobile-counter-box]").forEach(button => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.mobileCounterBox || 0);
        used = index < used ? index : index + 1;
        used = Math.max(0, Math.min(limit, used));
        writeUsedCount(key, used);
        paintCounter(card, used, limit);
      });
    });

    card.querySelector("[data-mobile-counter-reset]")?.addEventListener("click", () => {
      used = 0;
      writeUsedCount(key, used);
      paintCounter(card, used, limit);
    });
  });
}

function paintCounter(card, used, limit) {
  card.querySelectorAll("[data-mobile-counter-box]").forEach((button,index) => {
    const active = index < used;
    button.classList.toggle("is-used", active);
    button.setAttribute("aria-pressed", String(active));
  });
  card.dataset.mobileCounterUsed = String(used);
  card.setAttribute("aria-label", `技能カウンター ${used}/${limit}回使用`);
}

function counterStorageKey(id) {
  const publicId = new URLSearchParams(location.search).get("id")?.trim() || "unknown";
  return `tnx-mobile-counter:${publicId}:${id}`;
}

function readUsedCount(key, limit) {
  try {
    const value = Number.parseInt(localStorage.getItem(key) || "0", 10);
    return Number.isFinite(value) ? Math.max(0, Math.min(limit, value)) : 0;
  } catch {
    return 0;
  }
}

function writeUsedCount(key, value) {
  try { localStorage.setItem(key, String(value)); } catch {}
}

function renderSuit(key) {
  const value = SUITS[key];
  if (!value) return "";
  return `<span class="mobile-combo-suit mobile-combo-suit--${key}">${value[0]}${value[1]}</span>`;
}

function parseSuitKeys(value) {
  const known = new Set(Object.keys(SUITS));
  return [...new Set(String(value || "").trim().toLowerCase().split(/[\s,|/+]+/).filter(key => known.has(key)))];
}

function isCounter(combo) {
  const limit = positiveInteger(combo?.act_use_limit);
  const skills = String(combo?.skills || "").trim();
  const name = String(combo?.name || "").trim();
  const normalFields = [combo?.ability, combo?.modifier, combo?.target_value, combo?.timing, combo?.target, combo?.range, combo?.description]
    .some(hasValue);
  return Boolean(limit && name && skills && name === skills && !normalFields);
}

function positiveInteger(value) {
  const number = Number.parseInt(String(value ?? ""), 10);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function nl2br(value) {
  return esc(value).replace(/\r?\n/g, "<br>");
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}
