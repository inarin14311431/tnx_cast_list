import { supabase } from "./supabase-client.js";

const PAGE_SIZE = 60;
const OUTFIT_TARGETS = {
  weapon: "weapons",
  armor: "armours",
  cyberware: "outfits",
  tron: "outfits",
  vehicle: "vehicles",
  residence: "residences",
  other: "outfits"
};
const OUTFIT_LABELS = {
  weapon: "武器",
  armor: "防具",
  cyberware: "サイバーウェア",
  tron: "トロン",
  vehicle: "ヴィークル",
  residence: "住居",
  other: "その他"
};

let mode = "skd";
let results = [];
let selectedIds = new Set();
let filterCache = { skd: null, ofc: null };
let searching = false;

initialize();

function initialize() {
  const skdImport = document.querySelector("#import-skd");
  const ofcImport = document.querySelector("#import-ofc");
  if (!skdImport || !ofcImport) return;

  const skdButton = createSearchButton("search-skd-master", "SKD検索", "SEARCH MASTER");
  const ofcButton = createSearchButton("search-ofc-master", "OFC検索", "SEARCH MASTER");
  skdImport.after(skdButton);
  ofcImport.after(ofcButton);
  skdImport.closest(".skill-toolbar")?.classList.add("master-search-toolbar");
  ofcImport.closest(".toolbar")?.classList.add("master-search-toolbar", "master-search-toolbar--outfit");

  document.body.append(createDialog());
  bindDialogEvents();

  skdButton.addEventListener("click", () => openDialog("skd"));
  ofcButton.addEventListener("click", () => openDialog("ofc"));
}

function createSearchButton(id, label, english) {
  const button = document.createElement("button");
  button.id = id;
  button.type = "button";
  button.className = "master-search-open";
  button.innerHTML = `${label} <small>${english}</small>`;
  return button;
}

function createDialog() {
  const dialog = document.createElement("dialog");
  dialog.id = "master-search-dialog";
  dialog.className = "master-search-dialog";
  dialog.innerHTML = `
    <section class="master-search-shell">
      <header class="master-search-header">
        <div><p id="master-search-code">DATABASE MASTER</p><h2 id="master-search-title">SKD検索</h2></div>
        <button id="master-search-close-x" type="button" aria-label="閉じる">×</button>
      </header>
      <div class="master-search-controls">
        <label class="master-search-keyword">検索語<input id="master-search-keyword" type="search" placeholder="名称・スタイル・メーカー・解説"></label>
        <label>分類<select id="master-search-filter-primary"><option value="">すべて</option></select></label>
        <label>種別<select id="master-search-filter-secondary"><option value="">すべて</option></select></label>
        <button id="master-search-run" type="button">検索 <small>SEARCH</small></button>
      </div>
      <div class="master-search-summary"><p id="master-search-status">検索条件を入力してください。</p><p><strong id="master-search-selected-count">0</strong>件選択</p></div>
      <div id="master-search-results" class="master-search-results" aria-live="polite"></div>
      <footer class="master-search-footer">
        <button id="master-search-close" type="button">閉じる <small>CLOSE</small></button>
        <button id="master-search-copy" type="button" disabled>選択をTSVコピー <small>COPY TSV</small></button>
        <button id="master-search-add" type="button" disabled>選択を直接追加 <small>ADD TO SHEET</small></button>
      </footer>
    </section>`;
  return dialog;
}

function bindDialogEvents() {
  const dialog = getDialog();
  dialog.querySelector("#master-search-close-x").addEventListener("click", () => dialog.close());
  dialog.querySelector("#master-search-close").addEventListener("click", () => dialog.close());
  dialog.querySelector("#master-search-run").addEventListener("click", runSearch);
  dialog.querySelector("#master-search-keyword").addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      runSearch();
    }
  });
  dialog.querySelector("#master-search-filter-primary").addEventListener("change", () => {
    if (mode === "ofc") updateOfcMinorOptions();
  });
  dialog.querySelector("#master-search-results").addEventListener("change", handleResultSelection);
  dialog.querySelector("#master-search-results").addEventListener("click", handleResultAction);
  dialog.querySelector("#master-search-add").addEventListener("click", addSelectedResults);
  dialog.querySelector("#master-search-copy").addEventListener("click", copySelectedTsv);
}

async function openDialog(nextMode) {
  mode = nextMode;
  results = [];
  selectedIds.clear();
  const dialog = getDialog();
  dialog.querySelector("#master-search-title").textContent = mode === "skd" ? "SKDスタイル技能検索" : "OFCアウトフィット検索";
  dialog.querySelector("#master-search-code").textContent = mode === "skd" ? "STYLE SKILL DATABASE" : "OUTFIT CATALOG DATABASE";
  dialog.querySelector("#master-search-keyword").value = "";
  dialog.querySelector("#master-search-results").innerHTML = "";
  setStatus("検索条件を入力してください。");
  updateSelectionState();
  dialog.showModal();

  try {
    await populateFilters();
    await runSearch();
  } catch (error) {
    console.error(error);
    setStatus(formatDatabaseError(error), "error");
  }
}

async function populateFilters() {
  const primary = getDialog().querySelector("#master-search-filter-primary");
  const secondary = getDialog().querySelector("#master-search-filter-secondary");

  if (!filterCache[mode]) {
    const table = mode === "skd" ? "skd_master" : "ofc_master";
    const columns = mode === "skd" ? "style,type_label" : "major_category,minor_category";
    const { data, error } = await supabase.from(table).select(columns).range(0, 4999);
    if (error) throw error;
    filterCache[mode] = data ?? [];
  }

  if (mode === "skd") {
    const rows = filterCache.skd || [];
    const styles = unique(rows.map(row => row.style));
    const types = unique(rows.map(row => row.type_label));
    primary.innerHTML = optionHtml("すべてのスタイル", styles);
    secondary.innerHTML = optionHtml("すべての種別", types);
    secondary.closest("label").hidden = false;
  } else {
    const rows = filterCache.ofc || [];
    const majors = unique(rows.map(row => row.major_category));
    primary.innerHTML = optionHtml("すべての大分類", majors);
    secondary.closest("label").hidden = false;
    updateOfcMinorOptions();
  }
}

function updateOfcMinorOptions() {
  const primary = getDialog().querySelector("#master-search-filter-primary");
  const secondary = getDialog().querySelector("#master-search-filter-secondary");
  const rows = filterCache.ofc || [];
  const minors = unique(rows
    .filter(row => !primary.value || row.major_category === primary.value)
    .map(row => row.minor_category));
  secondary.innerHTML = optionHtml("すべての小分類", minors);
}

function optionHtml(defaultLabel, values) {
  return `<option value="">${escapeHtml(defaultLabel)}</option>${values.map(value => `<option value="${escapeAttribute(value)}">${escapeHtml(value)}</option>`).join("")}`;
}

async function runSearch() {
  if (searching) return;
  searching = true;
  const dialog = getDialog();
  const keyword = normalizeSearch(dialog.querySelector("#master-search-keyword").value);
  const primary = dialog.querySelector("#master-search-filter-primary").value;
  const secondary = dialog.querySelector("#master-search-filter-secondary").value;
  const runButton = dialog.querySelector("#master-search-run");
  runButton.disabled = true;
  selectedIds.clear();
  updateSelectionState();
  setStatus("Supabaseマスタを検索中…", "loading");

  try {
    let query;
    if (mode === "skd") {
      query = supabase.from("skd_master")
        .select("id,source_row,source_no,style,page_number,name,reading,type_label,skill,limit_text,timing,target,range_text,difficulty,confrontation,description")
        .order("style").order("source_row").limit(PAGE_SIZE);
      if (primary) query = query.eq("style", primary);
      if (secondary) query = query.eq("type_label", secondary);
    } else {
      query = supabase.from("ofc_master")
        .select("id,source_row,page_number,major_category,minor_category,manufacturer,name,site_category,purchase_target,permanent_cost,concealment,concealment_penalty,attack,parry,range_text,speed,control_value,electronic_control,defense_s,defense_p,defense_i,slot,description,raw_data")
        .order("major_category").order("source_row").limit(PAGE_SIZE);
      if (primary) query = query.eq("major_category", primary);
      if (secondary) query = query.eq("minor_category", secondary);
    }

    for (const token of keyword.split(" ").filter(Boolean)) {
      query = query.ilike("search_text", `%${escapeLike(token)}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    results = data ?? [];
    renderResults();
    setStatus(results.length
      ? `${results.length}件を表示しています。検索結果は最大${PAGE_SIZE}件です。`
      : "条件に一致するデータはありません。",
      results.length ? "success" : "");
  } catch (error) {
    console.error(error);
    results = [];
    renderResults();
    setStatus(formatDatabaseError(error), "error");
  } finally {
    searching = false;
    runButton.disabled = false;
  }
}

function renderResults() {
  const container = getDialog().querySelector("#master-search-results");
  if (!results.length) {
    container.innerHTML = `<p class="master-search-empty">検索結果はありません。</p>`;
    return;
  }
  container.innerHTML = results.map(row => mode === "skd" ? renderSkdResult(row) : renderOfcResult(row)).join("");
}

function renderSkdResult(row) {
  const chips = [
    row.skill && `技能：${row.skill}`,
    row.limit_text && `上限：${row.limit_text}`,
    row.timing && `タイミング：${row.timing}`,
    row.target && `対象：${row.target}`,
    row.range_text && `射程：${row.range_text}`,
    row.difficulty && `目標値：${row.difficulty}`,
    row.confrontation && `対決：${row.confrontation}`
  ].filter(Boolean);
  return `
    <article class="master-result-card" data-master-id="${row.id}">
      <label class="master-result-check"><input type="checkbox" data-result-select="${row.id}"><span></span></label>
      <div class="master-result-main">
        <p class="master-result-meta">${escapeHtml(row.style || "—")} / ${escapeHtml(row.type_label || "特技")} / P.${escapeHtml(row.page_number || "—")}</p>
        <h3>${escapeHtml(row.name)}</h3>
        ${row.reading ? `<p class="master-result-reading">${escapeHtml(row.reading)}</p>` : ""}
        <div class="master-result-chips">${chips.map(value => `<span>${escapeHtml(value)}</span>`).join("")}</div>
        <details><summary>解説を表示</summary><p>${escapeHtml(row.description || "解説なし")}</p></details>
      </div>
      <button class="master-result-add" type="button" data-result-add="${row.id}">追加 <small>ADD</small></button>
    </article>`;
}

function renderOfcResult(row) {
  const defense = formatDefense(row);
  const chips = [
    row.purchase_target && `購入：${row.purchase_target}`,
    row.permanent_cost && `常備化：${row.permanent_cost}`,
    row.concealment && `隠匿：${row.concealment}${row.concealment_penalty ? `/${row.concealment_penalty}` : ""}`,
    row.attack && `攻：${row.attack}`,
    row.parry && `受：${row.parry}`,
    row.range_text && `射：${row.range_text}`,
    defense && `防御：${defense}`,
    row.slot && `部位：${row.slot}`
  ].filter(Boolean);
  return `
    <article class="master-result-card" data-master-id="${row.id}">
      <label class="master-result-check"><input type="checkbox" data-result-select="${row.id}"><span></span></label>
      <div class="master-result-main">
        <p class="master-result-meta">${escapeHtml(row.major_category || "—")} / ${escapeHtml(row.minor_category || "—")} / P.${escapeHtml(row.page_number || "—")}</p>
        <h3>${escapeHtml(row.name)}</h3>
        ${row.manufacturer ? `<p class="master-result-reading">メーカー：${escapeHtml(row.manufacturer)}</p>` : ""}
        <div class="master-result-chips">${chips.map(value => `<span>${escapeHtml(value)}</span>`).join("")}</div>
        <details><summary>解説を表示</summary><p>${escapeHtml(row.description || "解説なし")}</p></details>
      </div>
      <button class="master-result-add" type="button" data-result-add="${row.id}">追加 <small>ADD</small></button>
    </article>`;
}

function handleResultSelection(event) {
  const checkbox = event.target.closest("[data-result-select]");
  if (!checkbox) return;
  const id = String(checkbox.dataset.resultSelect);
  if (checkbox.checked) selectedIds.add(id);
  else selectedIds.delete(id);
  updateSelectionState();
}

async function handleResultAction(event) {
  const button = event.target.closest("[data-result-add]");
  if (!button) return;
  const row = results.find(item => String(item.id) === String(button.dataset.resultAdd));
  if (!row) return;
  button.disabled = true;
  try {
    await addRowToSheet(row);
    setStatus(`「${row.name}」を編集画面へ追加しました。約1.2秒後に自動保存されます。`, "success");
  } catch (error) {
    console.error(error);
    setStatus(error?.message || "編集画面への追加に失敗しました。", "error");
  } finally {
    button.disabled = false;
  }
}

async function addSelectedResults() {
  const rows = results.filter(row => selectedIds.has(String(row.id)));
  if (!rows.length) return;
  const button = getDialog().querySelector("#master-search-add");
  button.disabled = true;
  setStatus(`${rows.length}件を編集画面へ追加中…`, "loading");
  try {
    for (const row of rows) await addRowToSheet(row);
    setStatus(`${rows.length}件を編集画面へ追加しました。約1.2秒後に自動保存されます。`, "success");
  } catch (error) {
    console.error(error);
    setStatus(error?.message || "編集画面への追加に失敗しました。", "error");
  } finally {
    updateSelectionState();
  }
}

async function addRowToSheet(row) {
  if (mode === "skd") return addSkdRow(row);
  return addOfcRow(row);
}

async function addSkdRow(rowData) {
  const before = new Set([...document.querySelectorAll("#style-skills [data-skill-key]")].map(row => row.dataset.skillKey));
  document.querySelector("#add-style-skill")?.click();
  const row = await waitForNewElement("#style-skills [data-skill-key]", before, "スタイル技能行を追加できませんでした。");
  await waitFor(() => row.querySelector("[data-style-field='description']") || row.querySelector("[data-f='description']"), 1600);

  setControl(row.querySelector("[data-f='name']"), rowData.name);
  setControl(row.querySelector("[data-f='skill_kind']"), mapSkillKind(rowData.type_label));
  setControl(row.querySelector("[data-f='level']"), 1);
  const detailValues = {
    skill: rowData.skill,
    limit: rowData.limit_text,
    timing: rowData.timing,
    target: rowData.target,
    range: rowData.range_text,
    difficulty: rowData.difficulty,
    confrontation: rowData.confrontation,
    description: rowData.description,
    page: rowData.page_number
  };
  for (const [field, value] of Object.entries(detailValues)) {
    const control = row.querySelector(`[data-style-field="${field}"]`);
    if (control) setControl(control, value || "");
  }

  if (!row.querySelector("[data-style-field='description']")) {
    setControl(row.querySelector("[data-f='description']"), buildSkdPlainDescription(rowData));
  }
  row.scrollIntoView({ block: "center", behavior: "smooth" });
}

async function addOfcRow(rowData) {
  const before = new Set([...document.querySelectorAll("#outfit-list [data-outfit-key]")].map(card => card.dataset.outfitKey));
  document.querySelector("#add-outfit")?.click();
  let card = await waitForNewElement("#outfit-list [data-outfit-key]", before, "アウトフィット行を追加できませんでした。");
  const key = card.dataset.outfitKey;
  setControl(card.querySelector("[data-o='category']"), rowData.site_category || "other");
  card = await waitFor(() => document.querySelector(`#outfit-list [data-outfit-key="${cssEscape(key)}"]`), 1600) || card;

  setControl(card.querySelector("[data-o='name']"), rowData.name);
  setControl(card.querySelector("[data-o='purchase_value']"), rowData.purchase_target || "");
  setControl(card.querySelector("[data-o='experience_cost']"), firstNumber(rowData.permanent_cost));
  setControl(card.querySelector("[data-o='concealment']"), [rowData.concealment, rowData.concealment_penalty].filter(Boolean).join("/"));
  setControl(card.querySelector("[data-o='attack']"), rowData.attack || "");
  setControl(card.querySelector("[data-o='defense']"), formatDefense(rowData));
  setControl(card.querySelector("[data-o='range']"), rowData.range_text || "");
  setControl(card.querySelector("[data-o='slot']"), rowData.slot || "");
  setControl(card.querySelector("[data-o='description']"), buildOfcDescription(rowData));
  card.scrollIntoView({ block: "center", behavior: "smooth" });
}

function setControl(control, value) {
  if (!control) return;
  control.value = String(value ?? "");
  control.dispatchEvent(new Event("input", { bubbles: true }));
  control.dispatchEvent(new Event("change", { bubbles: true }));
}

function mapSkillKind(label) {
  const value = String(label || "");
  if (/奥義/.test(value)) return "ultimate";
  if (/秘技/.test(value)) return "secret";
  if (/演出|方向/.test(value)) return "direction";
  if (/なし/.test(value)) return "none";
  return "normal";
}

function buildSkdPlainDescription(row) {
  return [
    row.skill && `技能：${row.skill}`,
    row.limit_text && `上限：${row.limit_text}`,
    row.timing && `タイミング：${row.timing}`,
    row.target && `対象：${row.target}`,
    row.range_text && `射程：${row.range_text}`,
    row.difficulty && `目標値：${row.difficulty}`,
    row.confrontation && `対決：${row.confrontation}`,
    row.page_number && `参照P：${row.page_number}`,
    row.description
  ].filter(Boolean).join("\n");
}

function buildOfcDescription(row) {
  const extra = [
    row.manufacturer && `メーカー：${row.manufacturer}`,
    row.minor_category && `小分類：${row.minor_category}`,
    row.parry && `受：${row.parry}`,
    row.speed && `ス：${row.speed}`,
    row.control_value && `制御値：${row.control_value}`,
    row.electronic_control && `電制：${row.electronic_control}`,
    formatDefense(row) && `防御値：${formatDefense(row)}`,
    row.page_number && `参照P：${row.page_number}`
  ].filter(Boolean);
  if (row.description) extra.push(row.description);
  return extra.join("\n");
}

function formatDefense(row) {
  return [
    row.defense_s !== "" && row.defense_s != null ? `S${row.defense_s}` : "",
    row.defense_p !== "" && row.defense_p != null ? `P${row.defense_p}` : "",
    row.defense_i !== "" && row.defense_i != null ? `I${row.defense_i}` : ""
  ].filter(Boolean).join("/");
}

async function copySelectedTsv() {
  const rows = results.filter(row => selectedIds.has(String(row.id)));
  if (!rows.length) return;
  const tsv = mode === "skd" ? createSkdTsv(rows) : createOfcTsv(rows);
  try {
    await navigator.clipboard.writeText(tsv);
    setStatus(`${rows.length}件のTSVをクリップボードへコピーしました。`, "success");
  } catch (error) {
    console.error(error);
    setStatus("TSVのコピーに失敗しました。ブラウザのクリップボード権限を確認してください。", "error");
  }
}

function createSkdTsv(rows) {
  const headers = ["スタイル", "ページ番号", "名称", "ヨミガナ", "種別", "技能", "上限", "タイミング", "対象", "射程", "目標値", "対決", "解説", "レベル"];
  return toTsv(headers, rows.map(row => [row.style, row.page_number, row.name, row.reading, row.type_label, row.skill, row.limit_text, row.timing, row.target, row.range_text, row.difficulty, row.confrontation, row.description, "1"]));
}

function createOfcTsv(rows) {
  const headers = ["target", "name", "purchase", "permanent", "concealA", "concealB", "attack", "defense", "range", "part", "notes"];
  return toTsv(headers, rows.map(row => [
    OUTFIT_TARGETS[row.site_category] || "outfits",
    row.name,
    row.purchase_target,
    row.permanent_cost,
    row.concealment,
    row.concealment_penalty,
    row.attack,
    formatDefense(row),
    row.range_text,
    row.slot,
    buildOfcDescription(row)
  ]));
}

function toTsv(headers, rows) {
  const clean = value => String(value ?? "").replace(/\r\n?/g, "\n").replace(/\n/g, "\\n").replace(/\t/g, " ");
  return [headers, ...rows].map(row => row.map(clean).join("\t")).join("\n");
}

function updateSelectionState() {
  const dialog = getDialog();
  dialog.querySelector("#master-search-selected-count").textContent = String(selectedIds.size);
  dialog.querySelector("#master-search-add").disabled = selectedIds.size === 0 || searching;
  dialog.querySelector("#master-search-copy").disabled = selectedIds.size === 0 || searching;
}

function setStatus(message, state = "") {
  const element = getDialog().querySelector("#master-search-status");
  element.textContent = message;
  element.className = state ? `is-${state}` : "";
}

function formatDatabaseError(error) {
  const message = String(error?.message || error || "");
  if (/skd_master|ofc_master|does not exist|schema cache|PGRST205/i.test(message)) {
    return "検索マスタが未設定です。Supabaseで supabase/20_authenticated_master_search.sql を実行し、管理者がマスタ同期を行ってください。";
  }
  if (/row-level security|permission denied|42501|JWT|auth/i.test(message)) {
    return "検索機能はログイン済みUID登録者のみ利用できます。ログイン状態を確認してください。";
  }
  return message ? `マスタ検索に失敗しました：${message}` : "マスタ検索に失敗しました。";
}

function getDialog() {
  return document.querySelector("#master-search-dialog");
}

function unique(values) {
  return [...new Set(values.map(value => String(value || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ja"));
}

function normalizeSearch(value) {
  return String(value || "").normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}

function escapeLike(value) {
  return String(value).replace(/[\\%_]/g, character => `\\${character}`);
}

function firstNumber(value) {
  const match = String(value ?? "").match(/-?\d+/);
  return match ? Number(match[0]) : 0;
}

function waitForNewElement(selector, before, message) {
  return waitFor(() => [...document.querySelectorAll(selector)].find(element => !before.has(element.dataset.skillKey || element.dataset.outfitKey)), 1800)
    .then(element => {
      if (!element) throw new Error(message);
      return element;
    });
}

async function waitFor(getter, timeout = 1200) {
  const started = performance.now();
  while (performance.now() - started < timeout) {
    const value = getter();
    if (value) return value;
    await new Promise(resolve => requestAnimationFrame(resolve));
  }
  return null;
}

function cssEscape(value) {
  return window.CSS?.escape ? CSS.escape(String(value)) : String(value).replace(/["\\]/g, "\\$&");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}
