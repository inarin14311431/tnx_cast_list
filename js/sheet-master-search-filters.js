import { supabase } from "./supabase-client.js";

const PAGE_SIZE = 1000;
const RESULT_PAGE_SIZE = 50;
const MASTER_TABLES = new Set(["skd_master", "ofc_master"]);
const cache = { skd: null, ofc: null };
let activeMode = "";
let currentPage = 0;
let totalResults = 0;
let navigating = false;
let paginationBusy = false;
let countRequestId = 0;
let paginationRefreshQueued = false;

const originalFrom = supabase.from.bind(supabase);
installResultPaginationQueryPatch();

bind("#search-skd-master", "skd");
bind("#search-ofc-master", "ofc");
bindPaginationEvents();
installPaginationUi();

function bind(selector, mode) {
  document.querySelector(selector)?.addEventListener("click", () => {
    activeMode = mode;
    setTimeout(() => completeFilters(mode), 0);
  });
}

async function completeFilters(mode) {
  const dialog = document.querySelector("#master-search-dialog");
  if (!dialog?.open) return;

  try {
    if (!cache[mode]) cache[mode] = await fetchFilterRows(mode);
    if (activeMode !== mode || !dialog.open) return;
    applyFilters(mode, cache[mode]);
  } catch (error) {
    console.warn("Master search filter completion failed.", error);
  }
}

async function fetchFilterRows(mode) {
  const table = mode === "skd" ? "skd_master" : "ofc_master";
  const columns = mode === "skd" ? "style,type_label" : "major_category,minor_category";
  const rows = [];

  for (let from = 0; from < 10000; from += PAGE_SIZE) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

function applyFilters(mode, rows) {
  const dialog = document.querySelector("#master-search-dialog");
  const primary = dialog?.querySelector("#master-search-filter-primary");
  const secondary = dialog?.querySelector("#master-search-filter-secondary");
  if (!primary || !secondary) return;

  const primaryValue = primary.value;
  const secondaryValue = secondary.value;

  if (mode === "skd") {
    replaceOptions(primary, "すべてのスタイル", unique(rows.map(row => row.style)), primaryValue);
    replaceOptions(secondary, "すべての種別", unique(rows.map(row => row.type_label)), secondaryValue);
    return;
  }

  replaceOptions(primary, "すべての大分類", unique(rows.map(row => row.major_category)), primaryValue);
  updateOfcMinorOptions(rows, primary, secondary, secondaryValue);
  if (primary.dataset.fullFilterBound !== "1") {
    primary.dataset.fullFilterBound = "1";
    primary.addEventListener("change", () => updateOfcMinorOptions(rows, primary, secondary, ""));
  }
}

function updateOfcMinorOptions(rows, primary, secondary, selected) {
  const values = unique(rows
    .filter(row => !primary.value || row.major_category === primary.value)
    .map(row => row.minor_category));
  replaceOptions(secondary, "すべての小分類", values, selected);
}

function replaceOptions(select, defaultLabel, values, selected) {
  select.innerHTML = `<option value="">${escapeHtml(defaultLabel)}</option>${values.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("")}`;
  if ([...select.options].some(option => option.value === selected)) select.value = selected;
}

function unique(values) {
  return [...new Set(values.map(value => String(value || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ja"));
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
}

function installResultPaginationQueryPatch() {
  if (supabase.__tnxMasterPaginationPatched) return;

  Object.defineProperty(supabase, "__tnxMasterPaginationPatched", {
    configurable: false,
    enumerable: false,
    value: true
  });

  supabase.from = (table, ...args) => {
    const builder = originalFrom(table, ...args);
    return MASTER_TABLES.has(table) ? wrapMasterBuilder(builder) : builder;
  };
}

function wrapMasterBuilder(builder) {
  if (!builder || typeof builder !== "object") return builder;

  return new Proxy(builder, {
    get(target, property) {
      const value = Reflect.get(target, property, target);

      if (property === "then" && typeof value === "function") {
        return value.bind(target);
      }

      if (property === "limit") {
        return () => {
          const from = currentPage * RESULT_PAGE_SIZE;
          return wrapMasterBuilder(target.range(from, from + RESULT_PAGE_SIZE - 1));
        };
      }

      if (typeof value !== "function") return value;
      return (...args) => {
        const result = value.apply(target, args);
        return isQueryBuilder(result) ? wrapMasterBuilder(result) : result;
      };
    }
  });
}

function isQueryBuilder(value) {
  return Boolean(value && typeof value === "object" && (
    typeof value.then === "function" ||
    typeof value.select === "function" ||
    typeof value.eq === "function"
  ));
}

function bindPaginationEvents() {
  document.addEventListener("click", event => {
    if (event.target.closest("#search-skd-master, #search-ofc-master")) {
      resetPagination();
      return;
    }

    if (event.target.closest("#master-search-run")) {
      if (!navigating) currentPage = 0;
      navigating = false;
      paginationBusy = true;
      updatePaginationUi();
      return;
    }

    const previous = event.target.closest("#master-search-page-prev");
    if (previous) {
      if (currentPage <= 0 || paginationBusy) return;
      currentPage -= 1;
      requestPage();
      return;
    }

    const next = event.target.closest("#master-search-page-next");
    if (next) {
      const totalPages = pageCount();
      if (currentPage + 1 >= totalPages || paginationBusy) return;
      currentPage += 1;
      requestPage();
    }
  }, true);

  document.addEventListener("keydown", event => {
    if (event.key !== "Enter" || !event.target.closest("#master-search-keyword")) return;
    currentPage = 0;
    navigating = false;
    paginationBusy = true;
    updatePaginationUi();
  }, true);
}

function resetPagination() {
  currentPage = 0;
  totalResults = 0;
  navigating = false;
  paginationBusy = true;
  countRequestId += 1;
  updatePaginationUi();
}

function requestPage() {
  navigating = true;
  paginationBusy = true;
  updatePaginationUi();
  document.querySelector("#master-search-results")?.scrollTo({ top: 0, behavior: "auto" });
  document.querySelector("#master-search-run")?.click();
}

function installPaginationUi() {
  const dialog = document.querySelector("#master-search-dialog");
  const results = dialog?.querySelector("#master-search-results");
  if (!dialog || !results) {
    const observer = new MutationObserver(() => {
      if (!document.querySelector("#master-search-dialog #master-search-results")) return;
      observer.disconnect();
      installPaginationUi();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    return;
  }

  if (!document.querySelector("#master-search-pagination")) {
    const pagination = document.createElement("nav");
    pagination.id = "master-search-pagination";
    pagination.className = "master-search-pagination";
    pagination.setAttribute("aria-label", "検索結果のページ送り");
    pagination.hidden = true;
    pagination.innerHTML = `
      <button id="master-search-page-prev" type="button">&lt; 前へ <small>PREVIOUS</small></button>
      <p><span id="master-search-page-range">0件</span><strong id="master-search-page-current">1</strong> / <span id="master-search-page-total">1</span></p>
      <button id="master-search-page-next" type="button">次へ &gt; <small>NEXT</small></button>`;
    results.insertAdjacentElement("afterend", pagination);
  }

  new MutationObserver(queuePaginationRefresh).observe(results, { childList: true });
  updatePaginationUi();
}

function queuePaginationRefresh() {
  if (paginationRefreshQueued) return;
  paginationRefreshQueued = true;
  queueMicrotask(() => {
    paginationRefreshQueued = false;
    refreshPagination();
  });
}

async function refreshPagination() {
  const dialog = document.querySelector("#master-search-dialog");
  if (!dialog?.open) return;

  const requestId = ++countRequestId;
  try {
    const count = await fetchResultCount();
    if (requestId !== countRequestId) return;

    totalResults = count;
    const totalPages = pageCount();
    if (totalResults > 0 && currentPage >= totalPages) {
      currentPage = totalPages - 1;
      requestPage();
      return;
    }

    paginationBusy = false;
    updatePaginationUi();
    updateResultStatus();
  } catch (error) {
    if (requestId !== countRequestId) return;
    paginationBusy = false;
    updatePaginationUi();
    console.warn("Master search result count failed.", error);
  }
}

async function fetchResultCount() {
  const dialog = document.querySelector("#master-search-dialog");
  const table = currentSearchMode() === "ofc" ? "ofc_master" : "skd_master";
  const keyword = normalizeSearch(dialog?.querySelector("#master-search-keyword")?.value);
  const primary = dialog?.querySelector("#master-search-filter-primary")?.value || "";
  const secondary = dialog?.querySelector("#master-search-filter-secondary")?.value || "";

  let query = originalFrom(table).select("id", { count: "exact", head: true });
  if (table === "skd_master") {
    if (primary) query = query.eq("style", primary);
    if (secondary) query = query.eq("type_label", secondary);
  } else {
    if (primary) query = query.eq("major_category", primary);
    if (secondary) query = query.eq("minor_category", secondary);
  }

  for (const token of keyword.split(" ").filter(Boolean)) {
    query = query.ilike("search_text", `%${escapeLike(token)}%`);
  }

  const { count, error } = await query;
  if (error) throw error;
  return Number(count || 0);
}

function currentSearchMode() {
  const title = document.querySelector("#master-search-title")?.textContent || "";
  return title.includes("OFC") ? "ofc" : "skd";
}

function pageCount() {
  return Math.max(1, Math.ceil(totalResults / RESULT_PAGE_SIZE));
}

function updatePaginationUi() {
  const pagination = document.querySelector("#master-search-pagination");
  if (!pagination) return;

  const totalPages = pageCount();
  const cards = document.querySelectorAll("#master-search-results .master-result-card").length;
  const first = totalResults && cards ? currentPage * RESULT_PAGE_SIZE + 1 : 0;
  const last = totalResults && cards ? Math.min(first + cards - 1, totalResults) : 0;

  pagination.hidden = totalResults <= RESULT_PAGE_SIZE;
  pagination.querySelector("#master-search-page-current").textContent = String(totalResults ? currentPage + 1 : 1);
  pagination.querySelector("#master-search-page-total").textContent = String(totalPages);
  pagination.querySelector("#master-search-page-range").textContent = totalResults ? `${first}～${last} / ${totalResults}件` : "0件";
  pagination.querySelector("#master-search-page-prev").disabled = paginationBusy || currentPage <= 0;
  pagination.querySelector("#master-search-page-next").disabled = paginationBusy || currentPage + 1 >= totalPages;
}

function updateResultStatus() {
  const status = document.querySelector("#master-search-status");
  if (!status) return;

  const cards = document.querySelectorAll("#master-search-results .master-result-card").length;
  if (!totalResults || !cards) {
    status.textContent = "条件に一致するデータはありません。";
    status.className = "";
    return;
  }

  const first = currentPage * RESULT_PAGE_SIZE + 1;
  const last = Math.min(first + cards - 1, totalResults);
  status.textContent = `${totalResults}件中 ${first}～${last}件を表示しています。1ページ${RESULT_PAGE_SIZE}件です。`;
  status.className = "is-success";
}

function normalizeSearch(value) {
  return String(value || "").normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}

function escapeLike(value) {
  return String(value).replace(/[\\%_]/g, character => `\\${character}`);
}
