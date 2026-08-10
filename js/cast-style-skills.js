import { getStyleSkills } from "./cast-data-store.js";

const PREFIX = "@@TNX_STYLE_DETAIL_V1@@";
const SEPARATOR_MARKER = "[[STYLE_SEPARATOR]]";
const FIELDS = [
  ["skill", "技能"], ["limit", "上限"], ["timing", "タイミング"], ["target", "対象"],
  ["range", "射程"], ["difficulty", "目標値"], ["confrontation", "対決"],
  ["description", "解説"], ["page", "参照P"]
];
const SUITS = [
  ["reason", "理性", "♠"], ["passion", "感情", "♣"],
  ["life", "生命", "♥"], ["mundane", "外界", "♦"]
];

const esc = value => String(value ?? "").replace(/[&<>\"]/g, ch => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"
}[ch]));

function normalizeNewlines(value) {
  return String(value ?? "").replace(/\r\n?/g, "\n").replace(/\\n/g, "\n");
}

function parseDetail(value) {
  const text = String(value || "");
  const empty = Object.fromEntries(FIELDS.map(([key]) => [key, ""]));
  if (text.startsWith(PREFIX)) {
    try { return { ...empty, ...JSON.parse(text.slice(PREFIX.length).trim()) }; } catch {}
  }

  const labels = {
    "技能": "skill", "上限": "limit", "タイミング": "timing", "対象": "target",
    "射程": "range", "目標値": "difficulty", "対決": "confrontation",
    "解説": "description", "参照": "page", "参照P": "page"
  };
  const data = { ...empty };
  const remain = [];
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([^：:]+)[：:]\s*(.*)$/);
    const key = match && labels[match[1].trim()];
    if (key) data[key] = match[2];
    else if (line.trim()) remain.push(line);
  }
  if (!data.description) data.description = remain.join("\n");
  return data;
}

function findSection() {
  const moved = document.querySelector("#style-skill-panel .skill-section--style, #style-skill-panel .skill-section");
  if (moved) return moved;
  return document.querySelector("#skills-container .skill-section--style");
}

function ensureDedicatedPanel(section) {
  if (!section) return null;
  const existing = document.querySelector("#style-skill-panel");
  if (existing) {
    const body = existing.querySelector(".style-skill-panel__body");
    if (body && section.parentElement !== body) body.append(section);
    section.querySelector(":scope > h3")?.setAttribute("hidden", "");
    return existing;
  }

  const sourcePanel = document.querySelector("#skills-container")?.closest(".data-panel");
  if (!sourcePanel) return null;

  const panel = document.createElement("section");
  panel.id = "style-skill-panel";
  panel.className = "data-panel data-panel--wide panel-style-skills";
  panel.innerHTML = '<header class="data-panel__header"><h2>スタイル技能 <small>STYLE SKILLS</small></h2></header><div class="style-skill-panel__body"></div>';
  panel.querySelector(".style-skill-panel__body").append(section);
  sourcePanel.insertAdjacentElement("afterend", panel);
  section.querySelector(":scope > h3")?.setAttribute("hidden", "");
  return panel;
}

function fieldCell(value, key) {
  const text = normalizeNewlines(value);
  if (key === "name") return `<td class="style-view-cell style-view-cell--name"><textarea class="style-field-scroll style-skill-name-view" rows="1" wrap="soft" readonly aria-label="名称">${esc(text)}</textarea></td>`;
  if (key === "description") return `<td class="style-view-cell style-view-cell--description"><textarea class="style-field-scroll style-description-expandable" rows="1" wrap="soft" readonly aria-label="解説">${esc(text)}</textarea></td>`;
  const oneLine = text.replace(/\r?\n/g, " ");
  return `<td class="style-view-cell style-view-cell--${key}"><input class="style-field-scroll" type="text" readonly value="${esc(oneLine)}" title="${esc(text)}" aria-label="${esc(key)}"></td>`;
}

function headerCell(key, label) {
  if (key !== "description") return `<th>${label}</th>`;
  return `<th class="style-description-heading"><span>${label}</span><button type="button" class="style-description-toggle-all" aria-pressed="false" aria-label="すべての解説を表示">全表示</button></th>`;
}

function createSeparatorRow(skill) {
  return `<tr class="style-skill-public-separator" data-style-separator-public="1"><td colspan="16"><span class="style-skill-public-separator__label">${esc(normalizeNewlines(skill.name).trim() || "スタイル技能")}</span><small>STYLE SECTION</small></td></tr>`;
}

function createSkillRow(skill) {
  const detail = parseDetail(skill.description);
  if (String(detail.description || "").startsWith(SEPARATOR_MARKER)) return createSeparatorRow(skill);
  const kind = { none: "なし", normal: "通常", secret: "秘技", ultimate: "奥義", direction: "演出" }[skill.skill_kind] || skill.skill_kind || "";
  return `<tr>
    ${fieldCell(skill.name, "name")}${fieldCell(kind, "kind")}${fieldCell(skill.level, "level")}
    ${SUITS.map(([key,,mark]) => `<td class="style-suit-cell"><span class="style-suit-mark ${skill[key] ? "is-active" : ""}">${mark}</span></td>`).join("")}
    ${FIELDS.map(([key]) => fieldCell(detail[key], key)).join("")}
  </tr>`;
}

function fitNameFields(section) {
  section.querySelectorAll("textarea.style-skill-name-view").forEach(field => {
    field.style.height = "auto";
    field.style.height = `${Math.max(35, field.scrollHeight + 2)}px`;
  });
}

function renderTable(section, skills) {
  section.classList.add("style-skill-section-v47", "style-skill-view-editorlike");
  const heading = section.querySelector("h3");
  section.innerHTML = `
    <div class="data-table-wrapper style-skill-view-wrapper">
      <table class="data-table style-skill-detail-table style-skill-view-table">
        <colgroup>
          <col class="style-col-name"><col class="style-col-kind"><col class="style-col-level">
          ${SUITS.map(() => '<col class="style-col-suit">').join("")}
          <col class="style-col-skill"><col class="style-col-limit"><col class="style-col-timing">
          <col class="style-col-target"><col class="style-col-range"><col class="style-col-difficulty">
          <col class="style-col-confrontation"><col class="style-col-description"><col class="style-col-page">
        </colgroup>
        <thead><tr>
          <th>名称</th><th>種別</th><th>LV</th>
          ${SUITS.map(([, label]) => `<th>${label}</th>`).join("")}
          ${FIELDS.map(([key, label]) => headerCell(key, label)).join("")}
        </tr></thead>
        <tbody>${skills.map(createSkillRow).join("")}</tbody>
      </table>
    </div>`;
  if (heading) {
    heading.hidden = true;
    section.prepend(heading);
  }
  requestAnimationFrame(() => fitNameFields(section));
  document.fonts?.ready.then(() => fitNameFields(section));
}

async function initialize() {
  let skills = [];
  try {
    skills = await getStyleSkills();
  } catch (error) {
    console.error("Style skill view data load failed", error);
    return;
  }
  if (!skills.length) return;

  let tries = 0;
  const timer = window.setInterval(() => {
    const section = findSection();
    if (section) {
      window.clearInterval(timer);
      ensureDedicatedPanel(section);
      renderTable(section, skills);
      return;
    }
    if (++tries >= 80) window.clearInterval(timer);
  }, 50);
}

initialize();
