import { getOutfits } from "./cast-data-store.js?v=2";
import {
  OUTFIT_CATEGORIES,
  OUTFIT_CATEGORY_LABELS,
  OUTFIT_FIELD_LABELS,
  OUTFIT_SCHEMAS
} from "./cast-view-definitions.js?v=2";

const container = document.querySelector("#outfit-container");
const content = document.querySelector("#cast-content");

if (container) initializeCastOutfits();

async function initializeCastOutfits() {
  if (container.dataset.castOutfitsInitialized === "1") return;
  container.dataset.castOutfitsInitialized = "1";
  try {
    const outfits = await getOutfits();
    await waitForCastReady();
    render(outfits);
  } catch (error) {
    console.error("Outfit view rebuild failed", error);
  }
}

function waitForCastReady() {
  if (!content || !content.hidden) return Promise.resolve();
  return new Promise(resolve => {
    const observer = new MutationObserver(() => {
      if (content.hidden) return;
      observer.disconnect();
      resolve();
    });
    observer.observe(content, { attributes: true, attributeFilter: ["hidden"] });
  });
}

function render(outfits) {
  if (!outfits.length) {
    container.innerHTML = '<p class="empty-data">アウトフィット未登録 <small>NO OUTFIT DATA</small></p>';
    return;
  }

  const grouped = Object.fromEntries(OUTFIT_CATEGORIES.map(([key]) => [key, []]));
  for (const outfit of outfits) {
    const category = grouped[outfit.category] ? outfit.category : "other";
    grouped[category].push({ ...outfit, category });
  }

  container.className = "cast-outfit-container";
  container.innerHTML = OUTFIT_CATEGORIES
    .filter(([category]) => grouped[category].length)
    .map(([category, jp, en]) => createSection(category, jp, en, grouped[category]))
    .join("");
}

function createSection(category, jp, en, items) {
  const schema = OUTFIT_SCHEMAS[category];
  const totals = category === "armor" ? armorTotals(items) : null;
  return `<section class="data-panel panel-outfits cast-outfit-section cast-outfit-section--${category}">
    <header class="cast-outfit-title"><h2>${escapeHtml(jp)} <small>${escapeHtml(en)}</small></h2></header>
    <div class="cast-outfit-table-scroll">
      <table class="cast-outfit-table" data-outfit-category="${category}">
        <thead><tr>${schema.map(createHeader).join("")}</tr></thead>
        <tbody>${items.map(item => createRow(category, schema, item)).join("")}</tbody>
        ${totals ? createArmorFooter(schema, totals) : ""}
      </table>
    </div>
  </section>`;
}

function createHeader(field) {
  if (field !== "description") {
    return `<th class="cast-outfit-col--${field}">${escapeHtml(OUTFIT_FIELD_LABELS[field] || field)}</th>`;
  }
  return `<th class="cast-outfit-col--description style-description-heading"><span>解説</span><button type="button" class="style-description-toggle-all outfit-description-toggle-all" aria-pressed="false" aria-label="すべての解説を表示">全表示</button></th>`;
}

function createRow(category, schema, item) {
  const source = displayItem(category, item);
  return `<tr>${schema.map(field => createCell(field, source)).join("")}</tr>`;
}

function createCell(field, item) {
  const text = displayValue(item[field]);
  if (field === "description") {
    const value = text === "—" ? "" : text;
    return `<td class="cast-outfit-col--description style-view-cell style-view-cell--description"><textarea class="style-field-scroll style-description-expandable outfit-description-expandable" rows="1" wrap="soft" readonly aria-label="解説">${escapeHtml(value)}</textarea></td>`;
  }
  return `<td class="cast-outfit-col--${field}"><span class="cast-outfit-value" title="${escapeAttribute(text)}">${escapeHtml(text)}</span></td>`;
}

function displayItem(category, item) {
  const residenceElectric = item.residence_electric || "";
  const residenceArea = item.residence_area || "";
  return {
    ...item,
    category: OUTFIT_CATEGORY_LABELS[category] || OUTFIT_CATEGORY_LABELS.other,
    residence_electric_area: [residenceElectric, residenceArea].some(Boolean)
      ? `${residenceElectric || "—"}/${residenceArea || "—"}`
      : ""
  };
}

function createArmorFooter(schema, totals) {
  const first = schema.indexOf("defense_s");
  const tail = schema.length - first - 3;
  return `<tfoot><tr class="cast-armor-total-row"><th colspan="${first}">防御値合計</th><td class="cast-armor-total">${totals.s}</td><td class="cast-armor-total">${totals.p}</td><td class="cast-armor-total">${totals.i}</td>${tail > 0 ? `<td colspan="${tail}"></td>` : ""}</tr></tfoot>`;
}

function armorTotals(items) {
  return items.reduce((totals, item) => ({
    s: totals.s + numeric(item.defense_s),
    p: totals.p + numeric(item.defense_p),
    i: totals.i + numeric(item.defense_i)
  }), { s: 0, p: 0, i: 0 });
}

function numeric(value) {
  const match = String(value ?? "").match(/[+-]?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function displayValue(value) {
  return value === null || value === undefined || String(value).trim() === "" ? "—" : String(value);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/\r?\n/g, "&#10;");
}
