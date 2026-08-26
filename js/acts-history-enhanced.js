const list = document.querySelector("#act-history-list");
const yearFilter = document.querySelector("#history-year-filter");
const queryFilter = document.querySelector("#history-query-filter");
const roleFilter = document.querySelector("#history-role-filter");
const sortFilter = document.querySelector("#history-sort-filter");

const expandedYears = new Set();
let enhancing = false;
let scheduled = false;

if (list) {
  bindControls();
  const observer = new MutationObserver(() => scheduleEnhance());
  observer.observe(list, { childList: true, subtree: true });
  list.addEventListener("click", handleListClick);
  scheduleEnhance();
}

function bindControls() {
  [yearFilter, queryFilter, roleFilter, sortFilter].forEach(control => {
    const eventName = control === queryFilter ? "input" : "change";
    control?.addEventListener(eventName, () => {
      if (sortFilter === control) rebuildYearGroups();
      applyEnhancedFilters();
    });
  });

  document.querySelector("#history-reset")?.addEventListener("click", () => {
    if (yearFilter) yearFilter.value = "";
    if (queryFilter) queryFilter.value = "";
    if (roleFilter) roleFilter.value = "";
    if (sortFilter) sortFilter.value = "desc";
    window.requestAnimationFrame(() => {
      rebuildYearGroups();
      applyEnhancedFilters();
    });
  });
}

function scheduleEnhance() {
  if (scheduled || enhancing) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    enhanceHistory();
  });
}

function enhanceHistory() {
  if (enhancing) return;
  enhancing = true;
  try {
    list.querySelectorAll(".act-record").forEach(ensureCompactSummary);
    rebuildYearGroups(false);
    syncFilterOptions();
    applyEnhancedFilters();
  } finally {
    enhancing = false;
  }
}

function ensureCompactSummary(record) {
  let summary = record.querySelector(":scope > .act-record-summary");
  if (!summary) {
    summary = document.createElement("button");
    summary.type = "button";
    summary.className = "act-record-summary";
    summary.dataset.toggleActDetail = "";
    summary.setAttribute("aria-expanded", "false");
    summary.innerHTML = `
      <span class="act-record-summary__date"></span>
      <span class="act-record-summary__title"></span>
      <span class="act-record-summary__role"></span>
      <span class="act-record-summary__exp"></span>
      <span class="act-record-summary__icon" aria-hidden="true">＋</span>`;
    record.prepend(summary);
  }

  const meta = clean(record.querySelector(".act-record__meta")?.textContent);
  const title = clean(record.querySelector(".act-record__title")?.textContent) || "名称未登録アクト";
  const role = clean(record.querySelector("[data-participation-role] strong")?.textContent) || "—";
  const exp = Number(record.querySelector("[data-experience-input]")?.value || 0);
  const date = extractDate(meta);

  setText(summary.querySelector(".act-record-summary__date"), date);
  setText(summary.querySelector(".act-record-summary__title"), title);
  setText(summary.querySelector(".act-record-summary__role"), role);
  setText(summary.querySelector(".act-record-summary__exp"), `+${exp} EXP`);
  record.dataset.historyYear = extractYear(date);
  record.dataset.historyTitle = title.toLocaleLowerCase("ja");
  record.dataset.historyRole = role;
  record.dataset.historyDate = date === "日時未登録" ? "0000/00/00" : date;
}

function rebuildYearGroups(force = true) {
  list.querySelectorAll(".act-records").forEach(records => {
    const allRecords = [...records.querySelectorAll(".act-record")];
    if (!allRecords.length) return;
    if (!force && records.dataset.yearGrouped === "true") return;

    const characterId = records.closest(".act-character-group")?.querySelector("[data-character-id]")?.dataset.characterId || "cast";
    const years = new Map();
    allRecords.forEach(record => {
      ensureCompactSummary(record);
      const year = record.dataset.historyYear || "不明";
      if (!years.has(year)) years.set(year, []);
      years.get(year).push(record);
    });

    const yearKeys = [...years.keys()].sort((a, b) => yearSortValue(b) - yearSortValue(a));
    const latestYear = yearKeys[0];
    records.replaceChildren();

    yearKeys.forEach(year => {
      const rows = years.get(year).sort(compareRecords);
      const key = `${characterId}:${year}`;
      const defaultExpanded = year === latestYear;
      const isExpanded = expandedYears.has(key) || (!expandedYears.has(`!${key}`) && defaultExpanded);
      const section = document.createElement("section");
      section.className = `act-year-group${isExpanded ? " is-expanded" : ""}`;
      section.dataset.year = year;
      section.dataset.yearKey = key;
      section.innerHTML = `
        <button type="button" class="act-year-toggle" data-toggle-year aria-expanded="${isExpanded}">
          <span><strong>${escapeHtml(year)}</strong><small>YEAR ARCHIVE</small></span>
          <span>${rows.length} ACTS</span>
          <span aria-hidden="true">${isExpanded ? "−" : "＋"}</span>
        </button>
        <div class="act-year-records"${isExpanded ? "" : " hidden"}></div>`;
      const container = section.querySelector(".act-year-records");
      rows.forEach(row => container.append(row));
      records.append(section);
    });
    records.dataset.yearGrouped = "true";
  });
}

function compareRecords(a, b) {
  const direction = sortFilter?.value === "asc" ? 1 : -1;
  return String(a.dataset.historyDate || "").localeCompare(String(b.dataset.historyDate || "")) * direction;
}

function syncFilterOptions() {
  if (yearFilter) {
    const previous = yearFilter.value;
    const years = [...new Set([...list.querySelectorAll(".act-record")].map(record => record.dataset.historyYear).filter(Boolean))]
      .sort((a, b) => yearSortValue(b) - yearSortValue(a));
    const next = `<option value="">すべての年</option>${years.map(year => `<option value="${escapeAttribute(year)}">${escapeHtml(year)}年</option>`).join("")}`;
    if (yearFilter.innerHTML !== next) yearFilter.innerHTML = next;
    if (years.includes(previous)) yearFilter.value = previous;
  }

  if (roleFilter) {
    const previous = roleFilter.value;
    const roles = [...new Set([...list.querySelectorAll(".act-record")].map(record => record.dataset.historyRole).filter(role => role && role !== "—"))]
      .sort(localeCompareJa);
    const next = `<option value="">すべての参加枠</option>${roles.map(role => `<option value="${escapeAttribute(role)}">${escapeHtml(role)}</option>`).join("")}`;
    if (roleFilter.innerHTML !== next) roleFilter.innerHTML = next;
    if (roles.includes(previous)) roleFilter.value = previous;
  }
}

function applyEnhancedFilters() {
  const year = yearFilter?.value || "";
  const query = clean(queryFilter?.value).toLocaleLowerCase("ja");
  const role = roleFilter?.value || "";

  list.querySelectorAll(".act-record").forEach(record => {
    ensureCompactSummary(record);
    const matches = (!year || record.dataset.historyYear === year)
      && (!query || record.dataset.historyTitle.includes(query))
      && (!role || record.dataset.historyRole === role);
    record.hidden = !matches;
  });

  list.querySelectorAll(".act-year-group").forEach(group => {
    const visible = [...group.querySelectorAll(".act-record")].filter(record => !record.hidden);
    group.hidden = visible.length === 0;
    setText(group.querySelector(".act-year-toggle > span:nth-child(2)"), `${visible.length} ACTS`);
  });

  list.querySelectorAll(".act-character-group").forEach(group => {
    const visibleCount = [...group.querySelectorAll(".act-record")].filter(record => !record.hidden).length;
    group.hidden = visibleCount === 0;
  });

  list.querySelectorAll(".act-player-group").forEach(group => {
    const visibleCount = [...group.querySelectorAll(".act-record")].filter(record => !record.hidden).length;
    group.hidden = visibleCount === 0;
  });
}

function handleListClick(event) {
  const detailToggle = event.target.closest("[data-toggle-act-detail]");
  if (detailToggle) {
    const record = detailToggle.closest(".act-record");
    if (!record) return;
    const open = !record.classList.contains("is-detail-open");
    record.classList.toggle("is-detail-open", open);
    detailToggle.setAttribute("aria-expanded", String(open));
    setText(detailToggle.querySelector(".act-record-summary__icon"), open ? "−" : "＋");
    return;
  }

  const yearToggle = event.target.closest("[data-toggle-year]");
  if (yearToggle) {
    const group = yearToggle.closest(".act-year-group");
    if (!group) return;
    const open = !group.classList.contains("is-expanded");
    const key = group.dataset.yearKey;
    group.classList.toggle("is-expanded", open);
    yearToggle.setAttribute("aria-expanded", String(open));
    setText(yearToggle.lastElementChild, open ? "−" : "＋");
    group.querySelector(".act-year-records").hidden = !open;
    if (key) {
      expandedYears.delete(open ? `!${key}` : key);
      expandedYears.add(open ? key : `!${key}`);
    }
  }
}

function extractDate(meta) {
  const match = String(meta || "").match(/(\d{4})[/.\-](\d{1,2})[/.\-](\d{1,2})/);
  if (!match) return "日時未登録";
  return `${match[1]}/${match[2].padStart(2, "0")}/${match[3].padStart(2, "0")}`;
}

function extractYear(date) {
  const match = String(date || "").match(/^(\d{4})\//);
  return match?.[1] || "不明";
}

function yearSortValue(year) {
  const value = Number(year);
  return Number.isFinite(value) ? value : -1;
}

function setText(element, value) {
  if (element && element.textContent !== String(value)) element.textContent = String(value);
}
function clean(value) { return String(value || "").replace(/\s+/g, " ").trim(); }
function localeCompareJa(a, b) { return String(a ?? "").localeCompare(String(b ?? ""), "ja", { sensitivity: "base", numeric: true }); }
function escapeHtml(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function escapeAttribute(value) { return escapeHtml(value); }
