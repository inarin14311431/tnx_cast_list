import {
  GENERAL_SKILL_ORDER,
  GENERAL_SKILL_REQUIRED_FAMILIES,
  SKILL_SUITS,
  COMPACT_SKILL_HEADERS
} from "./cast-view-definitions.js";

/* Public compact skill renderer/layout.
 * Owns General / Social / Connection tables and their final placement.
 */
(() => {
  const normalizeName = value => String(value || "").trim().replace(/[;；]/g, "：");
  const familyName = value => {
    const name = normalizeName(value);
    return GENERAL_SKILL_REQUIRED_FAMILIES.find(prefix => name.startsWith(prefix)) || name;
  };

  function createSuitMarkup(mark, active) {
    return `<span class="style-suit-mark${active ? " is-active" : ""}" aria-label="${mark} ${active ? "取得済み" : "未取得"}">${mark}</span>`;
  }

  function normalizeRow(row) {
    while (row.cells.length > 6) row.deleteCell(row.cells.length - 1);
    SKILL_SUITS.forEach((mark, index) => {
      const cell = row.cells[index + 2];
      if (!cell) return;
      const existing = cell.querySelector(".style-suit-mark, .cast-suit-box");
      const active = existing
        ? existing.classList.contains("is-active") || /●/.test(existing.textContent)
        : /●/.test(cell.textContent);
      cell.className = "style-suit-cell";
      cell.innerHTML = createSuitMarkup(mark, active);
    });
  }

  function normalizeTable(section, category) {
    const wrapper = section.querySelector(":scope > .data-table-wrapper");
    const table = wrapper?.querySelector(":scope > table");
    if (!table) return null;
    table.classList.add(`skill-data-table--${category}`);
    const colgroup = table.querySelector(":scope > colgroup");
    while (colgroup && colgroup.children.length > 6) colgroup.lastElementChild.remove();
    const header = table.tHead?.rows?.[0];
    if (header) {
      while (header.cells.length > 6) header.deleteCell(header.cells.length - 1);
      COMPACT_SKILL_HEADERS.forEach((label, index) => { if (header.cells[index]) header.cells[index].textContent = label; });
    }
    const tbody = table.tBodies?.[0];
    if (!tbody) return null;
    [...tbody.rows].forEach(normalizeRow);
    return tbody;
  }

  function createZeroLevelRow(name) {
    const row = document.createElement("tr");
    row.dataset.fixedGeneralSkill = name;
    row.innerHTML = `<td>${name}</td><td>0</td>${SKILL_SUITS.map(mark => `<td class="style-suit-cell">${createSuitMarkup(mark, false)}</td>`).join("")}`;
    return row;
  }

  function ensureRequiredFamilies(tbody) {
    const present = new Set([...tbody.rows].map(row => familyName(row.cells?.[0]?.textContent)).filter(Boolean));
    GENERAL_SKILL_REQUIRED_FAMILIES.forEach(prefix => { if (!present.has(prefix)) tbody.append(createZeroLevelRow(prefix)); });
  }

  function sortGeneralRows(tbody) {
    const order = new Map(GENERAL_SKILL_ORDER.map((name, index) => [name, index]));
    const rows = [...tbody.rows]
      .map((row, index) => ({ row, index, family: familyName(row.cells?.[0]?.textContent) }))
      .sort((a, b) => {
        const ai = order.has(a.family) ? order.get(a.family) : Number.MAX_SAFE_INTEGER;
        const bi = order.has(b.family) ? order.get(b.family) : Number.MAX_SAFE_INTEGER;
        return ai - bi || a.index - b.index;
      });
    rows.forEach(({ row }, index) => { if (tbody.rows[index] !== row) tbody.insertBefore(row, tbody.rows[index] || null); });
  }

  function splitGeneralColumns(section) {
    if (section.querySelector(":scope > .cast-general-columns")) return;
    const wrapper = section.querySelector(":scope > .data-table-wrapper");
    const table = wrapper?.querySelector(":scope > table");
    const tbody = table?.tBodies?.[0];
    if (!wrapper || !table || !tbody) return;
    const rows = [...tbody.rows];
    const splitIndex = rows.findIndex(row => familyName(row.cells?.[0]?.textContent) === "交渉");
    const splitAt = splitIndex >= 0 ? splitIndex + 1 : Math.ceil(rows.length / 2);
    if (splitAt <= 0 || splitAt >= rows.length) return;
    const columns = document.createElement("div");
    columns.className = "cast-general-columns";
    const left = document.createElement("div");
    left.className = "cast-general-column cast-general-column--left";
    const right = document.createElement("div");
    right.className = "cast-general-column cast-general-column--right";
    wrapper.classList.add("cast-general-table-wrapper");
    left.append(wrapper);
    const rightWrapper = wrapper.cloneNode(false);
    rightWrapper.classList.add("cast-general-table-wrapper");
    const rightTable = table.cloneNode(false);
    rightTable.classList.add("skill-data-table--general-secondary");
    const colgroup = table.querySelector(":scope > colgroup")?.cloneNode(true);
    const thead = table.tHead?.cloneNode(true);
    const rightBody = document.createElement("tbody");
    if (colgroup) rightTable.append(colgroup);
    if (thead) rightTable.append(thead);
    rightTable.append(rightBody);
    rows.slice(splitAt).forEach(row => rightBody.append(row));
    rightWrapper.append(rightTable);
    right.append(rightWrapper);
    columns.append(left, right);
    section.querySelector(":scope > h3")?.insertAdjacentElement("afterend", columns);
  }

  function finalizeGeneral(section) {
    if (!section || section.dataset.compactFinalized === "1") return;
    section.classList.add("is-general");
    const tbody = normalizeTable(section, "general");
    if (!tbody) return;
    ensureRequiredFamilies(tbody);
    [...tbody.rows].forEach(normalizeRow);
    sortGeneralRows(tbody);
    splitGeneralColumns(section);
    section.dataset.compactFinalized = "1";
  }

  function finalizeSide(section, category, className) {
    if (!section || section.dataset.compactFinalized === "1") return;
    section.classList.add(className);
    if (!normalizeTable(section, category)) return;
    section.dataset.compactFinalized = "1";
  }

  function placeSections(container, general, social, connection) {
    container.classList.add("cast-skill-layout");
    container.closest(".data-panel")?.classList.add("panel-skills");
    let side = container.querySelector(":scope > .cast-skill-side");
    if (!side) { side = document.createElement("div"); side.className = "cast-skill-side"; }
    if (social && social.parentElement !== side) side.append(social);
    if (connection && connection.parentElement !== side) side.append(connection);
    if (side.children.length && !side.parentElement) {
      if (general) general.insertAdjacentElement("afterend", side);
      else container.prepend(side);
    }
  }

  function finalize() {
    const container = document.querySelector("#skills-container");
    if (!container) return;
    const general = container.querySelector(".skill-section--general");
    const social = container.querySelector(".skill-section--social");
    const connection = container.querySelector(".skill-section--connection");
    finalizeGeneral(general);
    finalizeSide(social, "social", "is-social");
    finalizeSide(connection, "connection", "is-connection");
    placeSections(container, general, social, connection);
  }

  const content = document.querySelector("#cast-content");
  if (!content) return;
  if (!content.hidden) {
    finalize();
    return;
  }
  const observer = new MutationObserver(() => {
    if (content.hidden) return;
    observer.disconnect();
    finalize();
  });
  observer.observe(content, { attributes: true, attributeFilter: ["hidden"] });
})();
