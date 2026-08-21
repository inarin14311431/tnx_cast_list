import { initialGeneralSkillSuit } from "./general-skill-catalog.js?v=2";

const SUITS = ["reason", "passion", "life", "mundane"];
const MARKS = ["♠", "♣", "♥", "♦"];
const DEFAULT_KIND_LABELS = {
  general: "一般",
  proper: "固有名詞",
  none: "なし",
  normal: "通常",
  secret: "秘技",
  ultimate: "奥義",
  direction: "演出"
};

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

export function renderSkillEditorSections({
  generalRows = [],
  socialRows = [],
  connectionRows = [],
  styleRows = [],
  isStyleSeparator = () => false,
  styleKindLabels = {}
} = {}) {
  const general = [...generalRows];
  const splitIndex = general.findIndex(item => item.name === "交渉") + 1;
  const firstGeneral = splitIndex > 0 ? general.slice(0, splitIndex) : general;
  const secondGeneral = splitIndex > 0 ? general.slice(splitIndex) : [];
  const context = { isStyleSeparator, styleKindLabels };

  return {
    generalHtml: `
    <div class="general-skill-columns">${skillTable("一般技能", "GENERAL SKILLS", firstGeneral, false, "general general-skill-column general-skill-column--first", context)}${skillTable("一般技能", "GENERAL SKILLS", secondGeneral, false, "general general-skill-column general-skill-column--second", context)}</div>
    ${skillTable("社会", "SOCIAL", socialRows, false, "social skill-group--ordered", context)}
    ${skillTable("コネクション", "CONNECTIONS", connectionRows, false, "connection skill-group--ordered", context)}`,
    styleHtml: skillTable("スタイル技能", "STYLE SKILLS", styleRows, true, "style", context)
  };
}

function skillTable(jp, en, rows, detail, category = "", context = {}) {
  if (!rows.length && !category.startsWith("general")) return "";
  return `<section class="skill-group ${esc(category)}" data-skill-category="${esc(category.split(" ")[0])}"><h3 class="skill-group-title">${jp} <small>${en}</small></h3>
    <table class="skill-table ${detail ? "has-detail" : "no-detail"}"><thead><tr><th class="name-col">名称</th><th class="type-col">種別</th><th class="lv-col">LV</th>${MARKS.map(mark => `<th class="suit-col">${mark}</th>`).join("")}${detail ? "<th>詳細</th>" : ""}<th></th></tr></thead><tbody>${rows.map(item => skillRow(item, detail, rows, context)).join("")}</tbody></table></section>`;
}

function rowActions(skill, ordered, categoryRows) {
  const categoryIndex = ordered ? categoryRows.findIndex(item => item._key === skill._key) : -1;
  return `<div class="row-actions skill-row-actions">${ordered ? `<button class="row-action row-action--up" data-action="move-up" data-skill-move="up" data-skill-key="${esc(skill._key)}" type="button" aria-label="上へ移動" ${categoryIndex === 0 ? "disabled" : ""}>▲</button><button class="row-action row-action--down" data-action="move-down" data-skill-move="down" data-skill-key="${esc(skill._key)}" type="button" aria-label="下へ移動" ${categoryIndex === categoryRows.length - 1 ? "disabled" : ""}>▼</button>` : ""}<button class="row-action row-action--delete" data-action="delete" data-delete-skill="${esc(skill._key)}" type="button" aria-label="削除">×</button></div>`;
}

function styleSeparatorRow(skill, categoryRows) {
  return `<tr class="style-skill-separator-row" data-style-separator="1" data-style-separator-structure="2cell" data-skill-key="${esc(skill._key)}">
    <td class="style-separator-main"><textarea data-f="name" rows="1" placeholder="スタイル名を入力（例：アヤカシ）" aria-label="スタイル技能の区切り名">${esc(skill.name)}</textarea></td>
    <td class="style-separator-actions">${rowActions(skill, true, categoryRows)}</td>
  </tr>`;
}

function skillRow(skill, detail, categoryRows, context) {
  if (context.isStyleSeparator?.(skill)) return styleSeparatorRow(skill, categoryRows);

  let kinds;
  if (skill.category === "style") kinds = ["none", "normal", "secret", "ultimate", "direction"];
  else if (skill.category === "general") kinds = ["general", "proper"];
  else kinds = ["proper"];

  const labels = { ...DEFAULT_KIND_LABELS, ...(context.styleKindLabels || {}) };
  const slotAttribute = skill._blankSlot ? ` data-general-slot-column="${esc(skill._slotColumn || "right")}"` : "";
  const ordered = skill.category === "social" || skill.category === "connection" || skill.category === "style";
  const nameControl = skill.category === "style"
    ? `<textarea data-f="name" rows="1" aria-label="名称">${esc(skill.name)}</textarea>`
    : `<input data-f="name" value="${esc(skill.name)}">`;
  const requiredSuit = skill.category === "general" ? initialGeneralSkillSuit(skill.name) : "";
  const minimumLevel = requiredSuit ? 1 : 0;
  const renderedLevel = Math.max(minimumLevel, Number(skill.level) || 0);

  return `<tr data-skill-key="${esc(skill._key)}"${slotAttribute}>
    <td>${nameControl}<input data-f="free_level" type="hidden" value="${Math.min(Math.max(Number(skill.free_level) || 0, 0), renderedLevel)}"></td>
    <td><select data-f="skill_kind">${kinds.map(value => `<option value="${value}" ${skill.skill_kind === value ? "selected" : ""}>${esc(labels[value] ?? value)}</option>`).join("")}</select></td>
    <td><input data-f="level" type="number" min="${minimumLevel}" value="${renderedLevel}"></td>
    ${SUITS.map((suit, index) => {
      const locked = suit === requiredSuit;
      const checked = locked || Boolean(skill[suit]);
      return `<td class="suit-cell"><label class="suit-check${locked ? " is-locked" : ""}"${locked ? ' title="初期取得スート"' : ""}><input data-f="${suit}" type="checkbox" ${checked ? "checked" : ""} ${locked ? "disabled data-initial-general-suit=\"1\"" : ""}><span>${MARKS[index]}</span></label></td>`;
    }).join("")}
    ${detail ? `<td><textarea data-f="description" rows="2">${esc(skill.description || skill.timing || "")}</textarea></td>` : ""}
    <td>${rowActions(skill, ordered, categoryRows)}</td>
  </tr>`;
}