import { GENERAL_MASTER_ROWS, initialGeneralSkillSuit, STARRED_GENERAL_NAMES } from "./general-skill-catalog.js";

const ABILITIES = ["reason", "passion", "life", "mundane"];
const SUITS = {
  reason: { off:"♤", on:"♠", label:"理性" },
  passion:{ off:"♧", on:"♣", label:"感情" },
  life:   { off:"♡", on:"♥", label:"生命" },
  mundane:{ off:"♢", on:"♦", label:"外界" }
};
const GENERAL_DISPLAY_ORDER = [
  "医療", "射撃", "知覚", "電脳", "製作：", "心理", "自我", "交渉",
  "芸術：", "運動", "回避", "操縦：", "白兵", "圧力", "信用", "隠密"
];

export function initializeTroopLayout(editor = document.querySelector("#troop-editor")) {
  if (!editor || editor.hidden || editor.dataset.layoutRefined === "1") return;
  refineTroopEditor(editor);
}

function refineTroopEditor(editor) {
  editor.dataset.layoutRefined = "1";
  regroupOverview();
  refineBasicFields();
  refineStyleSection();
  rebuildGeneralSkills();
  addSkillFieldLabels();
  compactCombos();
}

function regroupOverview() {
  const management = document.querySelector("#troop-visibility")?.closest(".troop-section");
  const basic = document.querySelector("#troop-name")?.closest(".troop-section");
  const style = document.querySelector("#troop-style")?.closest(".troop-section");
  const abilities = document.querySelector("#troop-ability-preview")?.closest(".troop-section");
  if (!management || !basic || !style || !abilities || management.closest(".troop-overview")) return;

  management.classList.add("troop-section--overview-management");
  basic.classList.add("troop-section--overview-basic");
  style.classList.add("troop-section--overview-style");
  abilities.classList.add("troop-section--overview-abilities");

  const overview = document.createElement("div");
  overview.className = "troop-overview";
  basic.before(overview);
  overview.append(basic, management, style, abilities);
}

function refineBasicFields() {
  ["#troop-level", "#troop-member-max"].forEach(selector => {
    const input = document.querySelector(selector);
    if (!input) return;
    input.max = "999";
    input.classList.add("troop-short-number");
    input.closest("label")?.classList.add("troop-short-number-field");
  });
}

function refineStyleSection() {
  const style = document.querySelector("#troop-style");
  const section = style?.closest(".troop-section");
  if (!section) return;
  section.classList.add("troop-section--style-primary");

  section.querySelector(".troop-important-badge")?.remove();
  section.querySelector(".troop-rule-note")?.remove();

  const styleLabel = style.closest("label");
  if (styleLabel) {
    style.classList.add("troop-primary-style-select");
    styleLabel.replaceWith(style);
  }
}

function rebuildGeneralSkills() {
  const root = document.querySelector("#troop-general-skills-editor");
  if (!root || root.dataset.fixedGrid === "1") return;
  const saved = new Map();
  root.querySelectorAll(":scope > .troop-skill-row").forEach(row => {
    const name = rowValue(row, "name");
    const key = canonicalGeneralName(name);
    if (!key) return;
    saved.set(key, {
      name,
      kind: rowValue(row, "kind"),
      level: rowInt(row, "level"),
      reason: checked(row, "reason"), passion: checked(row, "passion"), life: checked(row, "life"), mundane: checked(row, "mundane")
    });
  });
  root.innerHTML = "";
  root.dataset.fixedGrid = "1";

  GENERAL_DISPLAY_ORDER.forEach((baseName, index) => {
    const master = GENERAL_MASTER_ROWS.find(([name]) => name === baseName);
    if (!master) return;
    const [, baseSuit, kind] = master;
    const row = createGeneralRow(baseName, baseSuit, kind, saved.get(baseName));
    row.style.gridColumn = index < 8 ? "1" : "2";
    row.style.gridRow = String((index % 8) + 1);
    root.append(row);
  });

  document.querySelector("#troop-general-skill-add")?.remove();
  const note = root.closest(".troop-section")?.querySelector(".troop-rule-note");
  if (note) note.textContent = "自動取得スートは固定。追加取得するスートだけ切り替えます。製作・芸術・操縦は必要な場合のみ名称を入力します。";
}

function createGeneralRow(baseName, baseSuit, kind, data = {}) {
  const row = document.createElement("div");
  row.className = "troop-editor-row troop-skill-row troop-general-fixed-row";
  row.dataset.category = "general";
  row.dataset.troopUiEnhanced = "1";
  const fixedSuit = initialGeneralSkillSuit(baseName);
  const isProper = kind === "proper";
  const level = Math.max(isProper ? 0 : 1, Number(data.level || 0));
  const actualName = String(data.name || "");
  const detailValue = isProper && actualName.startsWith(baseName) ? actualName.slice(baseName.length) : "";
  const hiddenName = isProper ? ((detailValue || level > 0) ? `${baseName}${detailValue}` : "") : baseName;
  const displayName = `${STARRED_GENERAL_NAMES.has(baseName) ? "★" : ""}${baseName}`;
  row.innerHTML = `
    <div class="troop-general-name-cell">
      ${isProper ? `<span class="troop-general-prefix">${escapeHtml(displayName)}</span><input class="troop-general-detail" data-general-detail type="text" value="${escapeAttr(detailValue)}" placeholder="名称">` : `<strong>${escapeHtml(displayName)}</strong>`}
      <input data-field="name" type="hidden" value="${escapeAttr(hiddenName)}">
      <select data-field="kind" hidden><option value="${kind}" selected>${kind}</option></select>
    </div>
    <input class="troop-level-input" data-field="level" type="number" min="${isProper ? 0 : 1}" max="4" value="${level}" aria-label="${escapeAttr(baseName)}レベル">
    <div class="troop-suits">${ABILITIES.map(key => suitMarkup(key, fixedSuit, Boolean(data[key]) || key === fixedSuit)).join("")}</div>`;
  const detail = row.querySelector("[data-general-detail]");
  const levelInput = row.querySelector('[data-field="level"]');
  const syncName = () => {
    if (!isProper) return;
    const text = detail.value.trim();
    row.querySelector('[data-field="name"]').value = (text || Number(levelInput.value || 0) > 0) ? `${baseName}${text}` : "";
  };
  detail?.addEventListener("input", syncName);
  levelInput.addEventListener("input", syncName);
  return row;
}

function suitMarkup(key, fixedSuit, checkedState) {
  const suit = SUITS[key];
  const fixed = key === fixedSuit;
  const fixedClass = fixed ? " troop-suit-toggle--fixed" : "";
  const title = fixed ? `${suit.label}：自動取得スート` : suit.label;
  const checkedAttr = checkedState ? "checked" : "";
  const fixedAttr = fixed ? 'disabled data-auto-suit="1"' : "";
  return `<label class="troop-suit-toggle${fixedClass}" title="${escapeAttr(title)}"><input type="checkbox" data-suit="${key}" ${checkedAttr} ${fixedAttr} aria-label="${suit.label}スート"><span data-off="${suit.off}" data-on="${suit.on}"></span></label>`;
}

function addSkillFieldLabels() {
  const general = document.querySelector("#troop-general-skills-editor");
  if (general && !general.previousElementSibling?.classList.contains("troop-general-field-heads")) {
    general.insertAdjacentHTML("beforebegin", `<div class="troop-general-field-heads" aria-hidden="true"><div><span>技能名 <small>SKILL</small></span><span>LV</span><span>スート <small>SUIT</small></span></div><div><span>技能名 <small>SKILL</small></span><span>LV</span><span>スート <small>SUIT</small></span></div></div>`);
  }
  const style = document.querySelector("#troop-style-skills-editor");
  if (style && !style.previousElementSibling?.classList.contains("troop-style-field-heads")) {
    style.insertAdjacentHTML("beforebegin", `<div class="troop-style-field-heads" aria-hidden="true"><span>技能名 <small>SKILL</small></span><span>種別 <small>TYPE</small></span><span>LV</span><span>スート <small>SUIT</small></span><span>タイミング <small>TIMING</small></span><span>対決 <small>CONFRONTATION</small></span><span>解説 <small>DETAIL</small></span><span></span></div>`);
  }
}

function compactCombos() {
  document.querySelector("#troop-combo-cards")?.classList.add("troop-combo-cards--compact");
}

export function refreshTroopAbilityPairs(rootSelector, levelSelector) {
  const root = document.querySelector(rootSelector);
  if (!root) return;
  root.classList.remove("troop-ability-grid--with-cs");
  root.classList.add("troop-ability-grid--compact-pairs", "troop-ability-grid--with-cs");

  const abilityCards = [...root.querySelectorAll(":scope > article:not(.troop-cs-card)")].slice(0, 4);
  abilityCards.forEach(card => {
    if (card.dataset.compactAbility === "1") return;
    const label = card.querySelector("span")?.textContent?.trim() || "";
    const value = card.querySelector("strong")?.textContent?.trim() || "0";
    const controlText = card.querySelector("small")?.textContent || "";
    const control = controlText.match(/-?\d+/)?.[0] || "0";
    card.dataset.compactAbility = "1";
    card.classList.add("troop-ability-pair");
    card.innerHTML = `<span class="troop-ability-pair__label">${escapeHtml(label)}</span><strong class="troop-ability-pair__value">${escapeHtml(value)}<i>／</i>${escapeHtml(control)}</strong>`;
  });

  if (!abilityCards.length) return;
  let cs = root.querySelector(":scope > .troop-cs-card");
  if (!cs) {
    cs = document.createElement("article");
    cs.className = "troop-cs-card";
    cs.innerHTML = `<span>CS</span><strong>0</strong>`;
    root.append(cs);
  }
  const levelNode = document.querySelector(levelSelector);
  cs.querySelector("strong").textContent = String(levelNode?.value ?? levelNode?.textContent ?? "0").trim() || "0";
}

function canonicalGeneralName(name) {
  const value = String(name || "").trim();
  return GENERAL_MASTER_ROWS.find(([base, , kind]) => kind === "proper" ? value.startsWith(base) : value === base)?.[0] || "";
}
function checked(row, key) { return Boolean(row.querySelector(`[data-suit="${key}"]`)?.checked); }
function rowValue(row, field) { return String(row.querySelector(`[data-field="${field}"]`)?.value || "").trim(); }
function rowInt(row, field) { return Math.max(0, Number.parseInt(rowValue(row, field) || "0", 10) || 0); }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function escapeAttr(value) { return escapeHtml(value); }
