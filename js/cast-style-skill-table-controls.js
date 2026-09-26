/* Public cast viewer (cast.html): spreadsheet-like controls for the style skill table.
 * Presentation only. Data rendering stays in cast-style-skills.js; this module
 * reorders existing rows and changes column widths after "tnx:style-skills-rendered".
 *
 * - Header click: ascending -> descending -> original order.
 * - While sorted, style separator rows are hidden (restored with the original order).
 * - Header right edge drag (or arrow keys on the handle): column width.
 * - Column widths are stored per viewer in localStorage; sort order is not stored.
 */
(() => {
  if (window.TNXCastStyleSkillTableControlsLoaded) return;
  window.TNXCastStyleSkillTableControlsLoaded = true;

  // Key kept from the cast-v3.html trial so widths saved there carry over.
  const STORAGE_KEY = "tnx.castV3.styleSkillColumnWidths.v1";
  const MIN_WIDTH = 32;
  const MAX_WIDTH = 1200;
  const KEY_STEP = 10;
  const FALLBACK_WIDTHS = [144, 48, 48, 48, 48, 48, 48, 90, 52, 100, 64, 58, 64, 64, 340, 64];
  const COLUMN_TYPES = [
    "text", "kind", "number", "suit", "suit", "suit", "suit",
    "text", "text", "text", "text", "text", "text", "text", "text", "text"
  ];
  const KIND_ORDER = new Map([["通常", 0], ["秘技", 1], ["奥義", 2], ["演出", 3], ["なし", 4]]);
  const SEPARATOR_SELECTOR = ".style-skill-public-separator";
  const DEFAULT_STATUS = "見出しをクリックで並べ替え／見出しの右端をドラッグで列幅を変更";
  const collator = new Intl.Collator("ja", { numeric: true, sensitivity: "base" });

  const toHalfWidth = value => String(value ?? "").replace(/[０-９．－]/g, char => String.fromCharCode(char.charCodeAt(0) - 0xFEE0));

  function readStoredWidths() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch { return {}; }
  }
  function writeStoredWidths(widths) {
    try {
      if (Object.keys(widths).length) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(widths));
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }
  const clampWidth = value => Math.round(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Number(value) || MIN_WIDTH)));

  function cellValue(cell) {
    if (!cell) return "";
    const suit = cell.querySelector(".style-suit-mark");
    if (suit) return suit.classList.contains("is-active");
    const field = cell.querySelector("input, textarea");
    if (field) return String(field.value || "").trim();
    return String(cell.textContent || "").trim();
  }

  function compareValues(type, a, b, direction) {
    if (type === "suit") return (a === b ? 0 : a ? -1 : 1) * direction;
    const emptyA = a === "", emptyB = b === "";
    if (emptyA || emptyB) return emptyA === emptyB ? 0 : emptyA ? 1 : -1; // empty cells stay last
    if (type === "kind") {
      const ka = KIND_ORDER.has(a) ? KIND_ORDER.get(a) : KIND_ORDER.size;
      const kb = KIND_ORDER.has(b) ? KIND_ORDER.get(b) : KIND_ORDER.size;
      if (ka !== kb) return (ka - kb) * direction;
    }
    if (type === "number") {
      const na = Number.parseFloat(toHalfWidth(a)), nb = Number.parseFloat(toHalfWidth(b));
      const validA = Number.isFinite(na), validB = Number.isFinite(nb);
      if (validA && validB && na !== nb) return (na - nb) * direction;
      if (validA !== validB) return validA ? -1 : 1;
    }
    return collator.compare(a, b) * direction;
  }

  function enhanceTable(table) {
    if (!table || table.dataset.tableControls === "1") return;
    const headerRow = table.tHead?.rows?.[0];
    const tbody = table.tBodies?.[0];
    const cols = [...table.querySelectorAll(":scope > colgroup > col")];
    if (!headerRow || !tbody || cols.length !== headerRow.cells.length) return;
    table.dataset.tableControls = "1";
    table.classList.add("is-table-controlled");

    const headers = [...headerRow.cells];
    const labels = headers.map(th => (th.querySelector(":scope > span")?.textContent || th.textContent || "").trim());
    [...tbody.rows].forEach((row, index) => { row.dataset.originalIndex = String(index); });

    const section = table.closest(".style-skill-view-editorlike, .style-skill-section-v47, .skill-section") || table.parentElement;
    const tools = document.createElement("div");
    tools.className = "style-table-tools";
    tools.innerHTML = '<p class="style-table-tools__status" aria-live="polite"></p><button type="button" class="style-table-tools__button" data-table-action="reset-sort">元の並び順に戻す</button><button type="button" class="style-table-tools__button" data-table-action="reset-widths">列幅を初期化</button>';
    const wrapper = table.closest(".style-skill-view-wrapper") || table;
    wrapper.insertAdjacentElement("beforebegin", tools);
    const status = tools.querySelector(".style-table-tools__status");
    const resetSortButton = tools.querySelector('[data-table-action="reset-sort"]');
    const resetWidthsButton = tools.querySelector('[data-table-action="reset-widths"]');

    /* ---------- sorting ---------- */
    let sortState = { index: -1, direction: 0 };

    function renderSortState() {
      headers.forEach((th, index) => {
        const active = index === sortState.index && sortState.direction !== 0;
        th.setAttribute("aria-sort", active ? (sortState.direction > 0 ? "ascending" : "descending") : "none");
        const indicator = th.querySelector(":scope > .style-sort-indicator");
        if (indicator) indicator.textContent = active ? (sortState.direction > 0 ? "▲" : "▼") : "";
      });
      const sorted = sortState.direction !== 0;
      table.classList.toggle("is-sorted", sorted);
      status.classList.toggle("is-sorted", sorted);
      status.textContent = sorted
        ? `「${labels[sortState.index]}」で${sortState.direction > 0 ? "昇順" : "降順"}に並べ替え中（区切り行は非表示）`
        : DEFAULT_STATUS;
      resetSortButton.disabled = !sorted;
    }

    function applySort() {
      const rows = [...tbody.rows];
      const separators = rows.filter(row => row.matches(SEPARATOR_SELECTOR));
      let ordered;
      if (sortState.direction === 0) {
        ordered = rows.sort((a, b) => Number(a.dataset.originalIndex) - Number(b.dataset.originalIndex));
        separators.forEach(row => { row.hidden = false; });
      } else {
        const type = COLUMN_TYPES[sortState.index] || "text";
        const dataRows = rows.filter(row => !row.matches(SEPARATOR_SELECTOR));
        dataRows.sort((a, b) => compareValues(type, cellValue(a.cells[sortState.index]), cellValue(b.cells[sortState.index]), sortState.direction)
          || Number(a.dataset.originalIndex) - Number(b.dataset.originalIndex));
        separators.forEach(row => { row.hidden = true; });
        ordered = [...dataRows, ...separators];
      }
      ordered.forEach(row => tbody.append(row));
      renderSortState();
    }

    function cycleSort(index) {
      if (sortState.index !== index) sortState = { index, direction: 1 };
      else sortState = { index, direction: sortState.direction === 1 ? -1 : sortState.direction === -1 ? 0 : 1 };
      applySort();
    }

    headers.forEach((th, index) => {
      th.dataset.sortKey = String(index);
      th.tabIndex = 0;
      th.title = `${labels[index]}で並べ替え`;
      const indicator = document.createElement("span");
      indicator.className = "style-sort-indicator";
      indicator.setAttribute("aria-hidden", "true");
      const toggle = th.querySelector(":scope > .style-description-toggle-all");
      if (toggle) toggle.insertAdjacentElement("beforebegin", indicator); else th.append(indicator);
    });

    headerRow.addEventListener("click", event => {
      if (event.target.closest(".style-description-toggle-all, .style-col-resizer")) return;
      const th = event.target.closest("th[data-sort-key]");
      if (th) cycleSort(Number(th.dataset.sortKey));
    });
    headerRow.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const th = event.target.closest("th[data-sort-key]");
      if (!th || event.target !== th) return;
      event.preventDefault();
      cycleSort(Number(th.dataset.sortKey));
    });
    resetSortButton.addEventListener("click", () => { sortState = { index: -1, direction: 0 }; applySort(); });

    /* ---------- column widths ---------- */
    const defaultWidths = headers.map((th, index) => {
      const measured = th.getBoundingClientRect().width;
      return measured > 0 ? Math.round(measured) : FALLBACK_WIDTHS[index] || 64;
    });
    let storedWidths = readStoredWidths();
    const currentWidth = index => (storedWidths[index] != null ? clampWidth(storedWidths[index]) : defaultWidths[index]);

    function refreshExpandedDescriptions() {
      table.querySelectorAll(".style-description-expandable.is-expanded").forEach(field => {
        field.style.setProperty("height", "auto", "important");
        field.style.setProperty("height", `${Math.max(35, field.scrollHeight + 2)}px`, "important");
      });
    }

    function applyWidths() {
      const hasCustom = Object.keys(storedWidths).length > 0;
      if (!hasCustom) {
        cols.forEach(col => col.style.removeProperty("width"));
        ["width", "min-width", "max-width"].forEach(name => table.style.removeProperty(name));
      } else {
        const widths = headers.map((_, index) => currentWidth(index));
        cols.forEach((col, index) => { col.style.width = `${widths[index]}px`; });
        const total = `${widths.reduce((sum, width) => sum + width, 0)}px`;
        table.style.width = total;
        table.style.minWidth = total;
        table.style.maxWidth = total;
      }
      resizers.forEach((handle, index) => handle.setAttribute("aria-valuenow", String(currentWidth(index))));
      resetWidthsButton.disabled = !hasCustom;
    }

    function setWidth(index, width, persist) {
      storedWidths = { ...storedWidths, [index]: clampWidth(width) };
      applyWidths();
      if (persist) { writeStoredWidths(storedWidths); refreshExpandedDescriptions(); }
    }

    function resetWidth(index) {
      const next = { ...storedWidths };
      delete next[index];
      storedWidths = next;
      writeStoredWidths(storedWidths);
      applyWidths();
      refreshExpandedDescriptions();
    }

    const resizers = headers.map((th, index) => {
      const handle = document.createElement("span");
      handle.className = "style-col-resizer";
      handle.tabIndex = 0;
      handle.setAttribute("role", "separator");
      handle.setAttribute("aria-orientation", "vertical");
      handle.setAttribute("aria-label", `${labels[index]}の列幅（左右キーで調整、ダブルクリックで初期幅）`);
      handle.setAttribute("aria-valuemin", String(MIN_WIDTH));
      handle.setAttribute("aria-valuemax", String(MAX_WIDTH));
      th.append(handle);

      let drag = null;
      handle.addEventListener("pointerdown", event => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        drag = { startX: event.clientX, startWidth: currentWidth(index), pointerId: event.pointerId };
        handle.setPointerCapture?.(event.pointerId);
        handle.classList.add("is-dragging");
        table.classList.add("is-column-resizing");
      });
      handle.addEventListener("pointermove", event => {
        if (!drag || event.pointerId !== drag.pointerId) return;
        setWidth(index, drag.startWidth + (event.clientX - drag.startX), false);
      });
      const finish = event => {
        if (!drag || event.pointerId !== drag.pointerId) return;
        drag = null;
        handle.classList.remove("is-dragging");
        table.classList.remove("is-column-resizing");
        writeStoredWidths(storedWidths);
        refreshExpandedDescriptions();
      };
      handle.addEventListener("pointerup", finish);
      handle.addEventListener("pointercancel", finish);
      handle.addEventListener("click", event => event.stopPropagation());
      handle.addEventListener("dblclick", event => { event.preventDefault(); event.stopPropagation(); resetWidth(index); });
      handle.addEventListener("keydown", event => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        event.stopPropagation();
        setWidth(index, currentWidth(index) + (event.key === "ArrowRight" ? KEY_STEP : -KEY_STEP), true);
      });
      return handle;
    });

    resetWidthsButton.addEventListener("click", () => {
      storedWidths = {};
      writeStoredWidths(storedWidths);
      applyWidths();
      refreshExpandedDescriptions();
    });

    /* cast-view-controls.js clears the table min-width and description width when
     * "全表示" is toggled; re-apply the viewer's widths after that shared handler runs. */
    section.addEventListener("click", event => {
      if (!event.target.closest(".style-description-toggle-all")) return;
      requestAnimationFrame(() => { applyWidths(); requestAnimationFrame(refreshExpandedDescriptions); });
    });

    applyWidths();
    renderSortState();
  }

  function enhanceCurrent() {
    enhanceTable(document.querySelector("#style-skill-panel .style-skill-view-table"));
  }

  document.addEventListener("tnx:style-skills-rendered", () => requestAnimationFrame(enhanceCurrent));
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", enhanceCurrent, { once: true });
  else enhanceCurrent();
})();
