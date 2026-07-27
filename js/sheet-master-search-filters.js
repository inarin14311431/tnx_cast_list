import { supabase } from "./supabase-client.js";

const PAGE_SIZE = 1000;
const cache = { skd: null, ofc: null };
let activeMode = "";

bind("#search-skd-master", "skd");
bind("#search-ofc-master", "ofc");

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
