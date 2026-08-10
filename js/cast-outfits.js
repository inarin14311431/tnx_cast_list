import { getOutfits } from "./cast-data-store.js";

const container = document.querySelector("#outfit-container");
const content = document.querySelector("#cast-content");

const CATEGORIES = [
  ["weapon", "武器", "WEAPONS"],
  ["armor", "防具", "ARMOR"],
  ["cyberware", "サイバーウェア", "CYBERWARE"],
  ["tron", "トロン", "TRON"],
  ["vehicle", "ヴィークル", "VEHICLES"],
  ["residence", "住居", "RESIDENCES"],
  ["other", "その他", "OTHER"]
];
const CATEGORY_LABELS = Object.fromEntries(CATEGORIES.map(([key, jp]) => [key, jp]));

const LABELS = {
  category: "分類", name: "名称", purchase_value: "購入", experience_cost: "常備化", concealment: "隠匿",
  attack: "攻撃", parry: "受け", range: "射程", speed: "スロ", electronic_control: "電制", slot: "部位",
  defense_s: "S", defense_i: "I", defense_p: "P", control_modifier: "制御", control_value: "制御",
  tron_software: "ソ", tron_support: "サ", tron_hardware: "ハ", cs_value: "CS", crew: "乗員", sf: "SF",
  residence_entry: "登場", residence_electric_area: "電/ア", description: "解説", page_number: "参照P"
};

const SCHEMAS = {
  weapon: ["category", "name", "purchase_value", "experience_cost", "concealment", "attack", "parry", "range", "speed", "electronic_control", "slot", "description", "page_number"],
  armor: ["category", "name", "purchase_value", "experience_cost", "concealment", "defense_s", "defense_i", "defense_p", "electronic_control", "control_value", "slot", "description", "page_number"],
  cyberware: ["category", "name", "purchase_value", "experience_cost", "concealment", "electronic_control", "control_modifier", "slot", "description", "page_number"],
  tron: ["category", "name", "purchase_value", "experience_cost", "concealment", "control_modifier", "electronic_control", "speed", "tron_software", "tron_support", "tron_hardware", "cs_value", "slot", "description", "page_number"],
  vehicle: ["category", "name", "purchase_value", "experience_cost", "concealment", "attack", "control_modifier", "speed", "electronic_control", "defense_s", "defense_p", "defense_i", "crew", "sf", "description", "page_number"],
  residence: ["category", "name", "purchase_value", "experience_cost", "slot", "speed", "electronic_control", "residence_entry", "residence_electric_area", "description", "page_number"],
  other: ["category", "name", "purchase_value", "experience_cost", "concealment", "slot", "description", "page_number"]
};

if (container) initialize();

async function initialize() {
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

  const grouped = Object.fromEntries(CATEGORIES.map(([key]) => [key, []]));
  for (const outfit of outfits) {
    const category = grouped[outfit.category] ? outfit.category : "other";
    grouped[category].push({ ...outfit, category });
  }

  container.className = "cast-outfit-container";
  container.innerHTML = CATEGORIES
    .filter(([category]) => grouped[category].length)
    .map(([category, jp, en]) => createSection(category, jp, en, grouped[category]))
    .join("");

  initializeDescriptionToggles();
}

function createSection(category, jp, en, items) {
  const schema = SCHEMAS[category];
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
    return `<th class="cast-outfit-col--${field}">${escapeHtml(LABELS[field] || field)}</th>`;
  }
  return `<th class="cast-outfit-col--description style-description-heading"><span>解説</span><button type="button" class="style-description-toggle-all outfit-description-toggle-all" aria-pressed="false" aria-label="すべての解説を表示">全表示</button></th>`;
}

function createRow(category, schema, item) {
  const source = normalizedItem(category, item);
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

function initializeDescriptionToggles() {
  container.querySelectorAll(".outfit-description-toggle-all").forEach(button => {
    button.addEventListener("click", () => {
      const section = button.closest(".cast-outfit-section");
      if (!section) return;
      const expanded = section.classList.contains("is-description-all-expanded");
      setDescriptionsExpanded(section, !expanded);
    });
  });
}

function setDescriptionsExpanded(section, expanded) {
  section.classList.toggle("is-description-all-expanded", expanded);
  const fields = [...section.querySelectorAll(".outfit-description-expandable")];
  fields.forEach(field => {
    field.classList.toggle("is-expanded", expanded);
    field.closest("tr")?.classList.toggle("is-description-expanded", expanded);
    field.scrollTop = 0;
    field.scrollLeft = 0;
    if (expanded) {
      field.style.setProperty("height", "auto", "important");
    } else {
      field.style.removeProperty("height");
    }
  });

  if (expanded) {
    requestAnimationFrame(() => {
      fields.forEach(field => {
        field.style.setProperty("height", `${Math.max(35, field.scrollHeight + 2)}px`, "important");
      });
    });
  }

  const button = section.querySelector(".outfit-description-toggle-all");
  if (button) {
    button.textContent = expanded ? "縮小" : "全表示";
    button.setAttribute("aria-pressed", String(expanded));
    button.setAttribute("aria-label", expanded ? "すべての解説を縮小" : "すべての解説を表示");
  }
}

function normalizedItem(category, item) {
  const details = normalizeDetails(item.ofc_details);
  const defense = parseArmorDefense(item.defense);
  const residenceElectric = details.residence_electric || "";
  const residenceArea = details.residence_area || "";
  return {
    ...item,
    category: CATEGORY_LABELS[category] || CATEGORY_LABELS.other,
    parry: details.parry,
    speed: details.speed,
    electronic_control: details.electronic_control,
    control_value: details.control_value,
    defense_s: details.defense_s || defense.s,
    defense_i: details.defense_i || defense.i,
    defense_p: details.defense_p || defense.p,
    tron_software: details.tron_software,
    tron_support: details.tron_support,
    tron_hardware: details.tron_hardware,
    cs_value: details.cs_value,
    crew: details.crew,
    sf: details.sf,
    residence_entry: details.residence_entry,
    residence_electric_area: [residenceElectric, residenceArea].some(Boolean) ? `${residenceElectric}/${residenceArea}` : "",
    page_number: details.page_number
  };
}

function normalizeDetails(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, String(item ?? "")]))
    : {};
}

function createArmorFooter(schema, totals) {
  const first = schema.indexOf("defense_s");
  const tail = schema.length - first - 3;
  return `<tfoot><tr class="cast-armor-total-row"><th colspan="${first}">防御値合計</th><td class="cast-armor-total">${totals.s}</td><td class="cast-armor-total">${totals.i}</td><td class="cast-armor-total">${totals.p}</td>${tail > 0 ? `<td colspan="${tail}"></td>` : ""}</tr></tfoot>`;
}

function parseArmorDefense(value) {
  const text = String(value ?? "").trim();
  const result = { s: "", i: "", p: "" };
  if (!text) return result;
  const labeled = [...text.matchAll(/(?:^|[\s,，/／])([SPI])\s*[:：]?\s*([+-]?\d+)/gi)];
  if (labeled.length) {
    for (const match of labeled) result[match[1].toLowerCase()] = match[2];
    return result;
  }
  const parts = text.split(/[\/／,，\s]+/).filter(Boolean);
  result.s = parts[0] || "";
  result.i = parts[1] || "";
  result.p = parts[2] || "";
  return result;
}

function armorTotals(items) {
  const totals = { s: 0, i: 0, p: 0 };
  for (const item of items) {
    const source = normalizedItem("armor", item);
    for (const key of Object.keys(totals)) totals[key] += numeric(source[`defense_${key}`]);
  }
  return totals;
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
