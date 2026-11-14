import { renderShowcase, getStyleNames, formatHandle, obfuscatePublicId } from "./showcase-output-html.js?v=0214e5e5";
import { normalizeCastNumber, formatCastNumber, resolveCastNumber, findDuplicateCastNumber } from "./showcase-cast-number.js?v=944a948e";
import { syncActCastOrders } from "./showcase-cast-order-sync.js?v=0e404b6b";
import { escapeHtml, escapeAttribute } from "./dom-escape.js?v=46402d5f";
import { normalizeShowcaseTheme } from "./showcase-output-css.js?v=6c2c74a1";
import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js?v=a766246e";
import { createImageLedger, manualImagePathFromUrl, removeManualImages, uploadManualImage, validateManualImage } from "./showcase-manual-image.js?v=ab40c1a2";
import { createCastRowHtml, createLibraryCardHtml, handoutBadgeText, handoutState, isPlaceholderImage, manualImageValue, nextPanel, reorder } from "./showcase-cast-row.js?v=31b01e50";

const MAX_CASTS = 6;
const FUNCTION_NAME = "publish-showcase";
const FULL_CHARACTER_COLUMNS = `
  id, public_id, owner_id, player_name, character_name, character_kana,
  handle, handle_kana, affiliation, citizen_rank,
  style_1, style_1_mark, style_2, style_2_mark, style_3, style_3_mark,
  image_url, image_thumbnail_url, summary, age, gender, visibility, updated_at
`;
const FALLBACK_CHARACTER_COLUMNS = `
  id, public_id, owner_id, player_name, character_name, character_kana,
  handle, affiliation, citizen_rank,
  style_1, style_1_mark, style_2, style_2_mark, style_3, style_3_mark,
  image_url, summary, visibility, updated_at
`;
const $ = selector => document.querySelector(selector);
const elements = {
  pageTitle: document.querySelector("#page-title"),
  actName: document.querySelector("#act-name"),
  showcaseTheme: document.querySelector("#showcase-theme"),
  rulerName: document.querySelector("#ruler-name"),
  publishSlug: document.querySelector("#publish-slug"),
  introText: document.querySelector("#intro-text"),
  backgroundUrl: document.querySelector("#background-url"),
  backgroundFile: document.querySelector("#background-file"),
  search: document.querySelector("#cast-search"),
  playerFilter: document.querySelector("#player-filter"),
  styleFilter: document.querySelector("#style-filter"),
  libraryStatus: document.querySelector("#library-status"),
  publicGrid: document.querySelector("#public-cast-grid"),
  privateGrid: document.querySelector("#owned-private-cast-grid"),
  privateStatus: document.querySelector("#private-library-status"),
  privateSelectedCount: document.querySelector("#private-selected-count"),
  privateSelectionSummary: document.querySelector("#private-selection-summary"),
  selectedCount: document.querySelector("#selected-count"),
  selectedCasts: document.querySelector("#selected-casts"),
  manualAddButton: document.querySelector("#add-manual-cast"),
  manualForm: document.querySelector("#manual-cast-form"),
  generateButton: document.querySelector("#generate-button"),
  downloadButton: document.querySelector("#download-button"),
  copyButton: document.querySelector("#copy-button"),
  historyButton: document.querySelector("#history-button"),
  publishButton: document.querySelector("#publish-button"),
  generatorStatus: document.querySelector("#generator-status"),
  preview: document.querySelector("#showcase-preview")
};

let currentUser = null;
let publicCharacters = [];
let privateCharacters = [];
let selectedCasts = [];
let generatedHtml = "";
let publishing = false;
let registeringHistory = false;
let imageLedger = createImageLedger();
let formImagePath = "";

initialize();

async function initialize() {
  currentUser = await requireAuth();
  if (!currentUser) return;

  bindEvents();
  suggestSlug();
  renderSelections();
  await Promise.all([loadPublicCharacters(), loadPrivateCharacters()]);
}

function bindEvents() {
  const renderLibraries = () => { renderPublicCharacters(); renderPrivateCharacters(); };
  elements.search?.addEventListener("input", renderLibraries);
  elements.playerFilter?.addEventListener("change", renderLibraries);
  elements.styleFilter?.addEventListener("change", renderLibraries);
  elements.publicGrid?.addEventListener("click", handlePublicLibraryClick);
  elements.privateGrid?.addEventListener("click", handlePrivateLibraryClick);
  elements.selectedCasts?.addEventListener("click", handleSelectedCastClick);
  elements.selectedCasts?.addEventListener("input", handleSelectedCastInput);
  elements.selectedCasts?.addEventListener("change", handleSelectedCastInput);
  elements.selectedCasts?.addEventListener("dragstart", handleGripDragStart);
  elements.selectedCasts?.addEventListener("dragover", handleGripDragOver);
  elements.selectedCasts?.addEventListener("drop", handleGripDrop);
  elements.selectedCasts?.addEventListener("dragend", handleGripDragEnd);
  elements.selectedCasts?.addEventListener("keydown", handleGripKeydown);
  elements.selectedCasts?.addEventListener("change", event => { handleManualImageFileChange(event); });
  elements.manualForm?.addEventListener("change", event => { handleManualImageFileChange(event); });
  elements.manualForm?.querySelector('[data-manual-new="imageUrl"]')?.addEventListener("input", handleFormImageUrlInput);
  $("#manual-image-clear")?.addEventListener("click", clearFormImage);
  const drop = elements.manualForm?.querySelector("[data-manual-drop]");
  drop?.addEventListener("dragover", event => { event.preventDefault(); drop.classList.add("is-over"); });
  drop?.addEventListener("dragleave", () => drop.classList.remove("is-over"));
  drop?.addEventListener("drop", event => { event.preventDefault(); drop.classList.remove("is-over"); const file = event.dataTransfer?.files?.[0]; if (file) void uploadFormImage(file); });
  document.addEventListener("tnx:showcase-published", handleShowcasePublished);
  document.addEventListener("tnx:showcase-restore-start", handleRestoreStart);
  // "手動で追加" opens the add form; the cast is created from it ("出演順に追加"). Restoring a saved act asks for an empty one by event.
  elements.manualAddButton?.addEventListener("click", () => setManualFormOpen(Boolean(elements.manualForm?.hidden)));
  elements.manualForm?.addEventListener("submit", submitManualCastForm);
  $("#cancel-manual-cast")?.addEventListener("click", () => { resetManualForm(); setManualFormOpen(false); });
  $("#manual-sheet-import")?.addEventListener("click", () => { void importManualFormFromSheet(); });
  document.addEventListener("tnx:showcase-add-manual-cast", () => { addManualCast({}); });
  elements.actName?.addEventListener("input", suggestSlug);
  elements.publishSlug?.addEventListener("input", () => {
    elements.publishSlug.dataset.edited = "true";
    invalidateGeneratedHtml("公開ファイル名が変更されました。HTMLを再生成してください。");
  });
  [elements.pageTitle, elements.actName, elements.rulerName, elements.introText, elements.backgroundUrl]
    .forEach(field => field?.addEventListener("input", () => invalidateGeneratedHtml("アクト情報が変更されました。HTMLを再生成してください。")));
  elements.showcaseTheme?.addEventListener("change", () => invalidateGeneratedHtml("紹介テーマが変更されました。HTMLを再生成してください。"));
  elements.backgroundFile?.addEventListener("change", () => invalidateGeneratedHtml("背景画像が変更されました。HTMLを再生成してください。"));
  elements.generateButton?.addEventListener("click", generateShowcase);
  elements.downloadButton?.addEventListener("click", downloadShowcase);
  elements.copyButton?.addEventListener("click", copyShowcase);
  elements.historyButton?.addEventListener("click", registerHistoryOnly);
  elements.publishButton?.addEventListener("click", publishShowcase);
}

async function loadPublicCharacters() {
  setLibraryStatus("公開キャストを読み込み中…");
  const result = await queryCharacters("public");
  if (result.error) {
    console.error(result.error);
    setLibraryStatus(`公開キャストを取得できませんでした。${result.error.message ? ` ${result.error.message}` : ""}`, "error");
    return;
  }

  publicCharacters = result.data ?? [];
  populateFilters();
  renderPublicCharacters();
  setLibraryStatus(`${publicCharacters.length}件の公開キャストを読み込みました。`, "success");
}

async function loadPrivateCharacters() {
  if (!elements.privateGrid || !elements.privateStatus) return;
  setPrivateStatus("自分の非公開キャストを読み込み中…");
  const result = await queryCharacters("private");
  if (result.error) {
    console.error(result.error);
    setPrivateStatus(`自分の非公開キャストを取得できませんでした。${result.error.message ? ` ${result.error.message}` : ""}`, "error");
    return;
  }

  privateCharacters = result.data ?? [];
  renderPrivateCharacters();
  setPrivateStatus(
    privateCharacters.length
      ? `${privateCharacters.length}件の自分の非公開キャストを読み込みました。出演枠へ追加してHTMLを生成できます。`
      : "出演枠へ追加できる非公開キャストはありません。",
    privateCharacters.length ? "success" : ""
  );
}

async function queryCharacters(mode) {
  let result = await buildCharacterQuery(FULL_CHARACTER_COLUMNS, mode);
  if (result.error && isMissingColumnError(result.error)) {
    console.warn("Optional character columns are unavailable. Retrying with the compatible column set.", result.error);
    result = await buildCharacterQuery(FALLBACK_CHARACTER_COLUMNS, mode);
  }
  return result;
}

function buildCharacterQuery(columns, mode) {
  let query = supabase.from("characters").select(columns);
  if (mode === "public") query = query.eq("visibility", "public");
  else query = query.eq("owner_id", currentUser.id).eq("visibility", "private");
  return query.order("updated_at", { ascending: false });
}

function isMissingColumnError(error) {
  const message = String(error?.message ?? "");
  return /column .* does not exist|could not find .* column|PGRST204/i.test(message);
}

function populateFilters() {
  const library = [...publicCharacters, ...privateCharacters];
  const players = [...new Set(library.map(character => character.player_name).filter(Boolean))].sort(localeCompareJa);
  const styles = [...new Set(library.flatMap(getStyleNames))].sort(localeCompareJa);
  const keep = { player: elements.playerFilter?.value ?? "", style: elements.styleFilter?.value ?? "" };
  if (elements.playerFilter) elements.playerFilter.innerHTML = `<option value="">すべて</option>${players.map(value => `<option value="${escapeAttribute(value)}">${escapeHtml(value)}</option>`).join("")}`;
  if (elements.styleFilter) elements.styleFilter.innerHTML = `<option value="">すべて</option>${styles.map(value => `<option value="${escapeAttribute(value)}">${escapeHtml(value)}</option>`).join("")}`;
  if (elements.playerFilter && players.includes(keep.player)) elements.playerFilter.value = keep.player;
  if (elements.styleFilter && styles.includes(keep.style)) elements.styleFilter.value = keep.style;
}

// The search and the two filters apply to the public and to the private list alike.
function filterLibrary(characters) {
  const keyword = normalizeSearch(elements.search?.value);
  const player = elements.playerFilter?.value ?? "";
  const style = elements.styleFilter?.value ?? "";
  return characters.filter(character => {
    const searchable = normalizeSearch([
      character.public_id, obfuscatePublicId(character.public_id), character.character_name, character.character_kana,
      character.handle, character.handle_kana, character.player_name,
      character.affiliation, character.summary, ...getStyleNames(character)
    ].join(" "));
    return (!keyword || searchable.includes(keyword)) &&
      (!player || character.player_name === player) &&
      (!style || getStyleNames(character).includes(style));
  });
}

function renderPublicCharacters() {
  if (!elements.publicGrid) return;
  const filtered = filterLibrary(publicCharacters);
  if (!filtered.length) {
    elements.publicGrid.innerHTML = `<p class="empty-state">条件に一致する公開キャストはいません。</p>`;
    return;
  }
  elements.publicGrid.innerHTML = filtered.map(character => createLibraryCard(character, "public")).join("");
}

function renderPrivateCharacters() {
  if (!elements.privateGrid) return;
  updatePrivateSelectionSummary();
  if (!privateCharacters.length) {
    elements.privateGrid.innerHTML = "";
    return;
  }
  const filtered = filterLibrary(privateCharacters);
  elements.privateGrid.innerHTML = filtered.length
    ? filtered.map(character => createLibraryCard(character, "private")).join("")
    : `<p class="empty-state">条件に一致する非公開キャストはいません。</p>`;
}

function createLibraryCard(character, source) {
  const selected = selectedCasts.some(item => item.source === source && item.character.id === character.id);
  return createLibraryCardHtml({ character, source, selected, disabled: !selected && selectedCasts.length >= MAX_CASTS });
}

function handlePublicLibraryClick(event) {
  const card = event.target.closest("[data-public-character-id]");
  if (!card) return;
  toggleArchiveCast("public", card.dataset.publicCharacterId, publicCharacters);
}

function handlePrivateLibraryClick(event) {
  const card = event.target.closest("[data-private-character-id]");
  if (!card) return;
  toggleArchiveCast("private", card.dataset.privateCharacterId, privateCharacters);
}

function toggleArchiveCast(source, characterId, library) {
  const character = library.find(item => String(item.id) === String(characterId));
  if (!character) return;
  const selectedIndex = selectedCasts.findIndex(item => item.source === source && item.character.id === character.id);

  if (selectedIndex >= 0) {
    selectedCasts.splice(selectedIndex, 1);
  } else {
    if (selectedCasts.length >= MAX_CASTS) {
      setGeneratorStatus("キャストは公開・非公開・手動追加を合わせて最大6名までです。", "error");
      return;
    }
    selectedCasts.push({ source, manual: false, character, description: "", quote: "", tagline: "", castNo: "", panel: null });
  }

  invalidateGeneratedHtml();
  renderSelections();
}

const MANUAL_FORM_KEYS = ["handle", "name", "styles", "player", "affiliation", "age", "gender", "rank", "sheetUrl", "imageUrl"];

function manualFormField(key) {
  return elements.manualForm?.querySelector(`[data-manual-new="${key}"]`) ?? null;
}

function readManualForm() {
  return Object.fromEntries(MANUAL_FORM_KEYS.map(key => [key, String(manualFormField(key)?.value ?? "").trim()]));
}

function setManualFormOpen(open) {
  if (!elements.manualForm) return;
  elements.manualForm.hidden = !open;
  elements.manualAddButton?.setAttribute("aria-expanded", String(open));
  elements.manualAddButton?.classList.toggle("is-open", open);
  if (open) manualFormField("name")?.focus();
}

// The picture the add form holds (uploaded but not yet part of a cast) goes when the form is cancelled.
function resetManualForm({ keepImage = false } = {}) {
  if (!keepImage) releaseImagePath(formImagePath);
  formImagePath = "";
  elements.manualForm?.reset();
  renderFormImage();
  const imageStatus = $("#manual-image-status");
  if (imageStatus) { imageStatus.textContent = ""; imageStatus.className = "manual-field__note"; }
  const note = $("#manual-sheet-import-status");
  if (note) { note.textContent = DEFAULT_SHEET_NOTE; note.className = "manual-field__note"; }
  const error = $("#manual-cast-form-status");
  if (error) { error.hidden = true; error.textContent = ""; }
}

// Adds a manual cast to the order. `fields` are the add form's values ({} adds an empty one, which is what restoring a saved act does
// before it fills the row). Returns the new item, or null at the limit.
function addManualCast(fields = {}) {
  if (selectedCasts.length >= MAX_CASTS) {
    setGeneratorStatus("キャストは公開・非公開・手動追加を合わせて最大6名までです。", "error");
    return null;
  }

  const key = crypto.randomUUID?.() || `manual-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const placeholder = new URL("./assets/placeholders/scan-failed.webp", location.href).href;
  const item = {
    source: "manual",
    manual: true,
    character: {
      id: `manual-${key}`,
      public_id: "ScanFailed",
      character_name: fields.name ?? "",
      player_name: fields.player ?? "",
      manual_styles: fields.styles ?? "",
      image_url: fields.imageUrl || placeholder,
      handle: fields.handle ?? "",
      handle_kana: "",
      character_kana: "",
      affiliation: fields.affiliation ?? "",
      age: fields.age ?? "",
      gender: fields.gender ?? "",
      citizen_rank: fields.rank ?? ""
    },
    sheetUrl: fields.sheetUrl ?? "",
    imagePath: fields.imagePath ?? "",
    quote: "",
    tagline: "",
    description: "",
    castNo: "",
    // restoring a saved act adds an empty row and fills it: no panel opens by itself (the add form opens the handout panel, below)
    panel: null
  };
  selectedCasts.push(item);

  invalidateGeneratedHtml();
  renderSelections();
  return item;
}

function submitManualCastForm(event) {
  event.preventDefault();
  const fields = readManualForm();
  const error = $("#manual-cast-form-status");
  if (!fields.name) {
    if (error) { error.textContent = "キャスト名を入力してください。"; error.hidden = false; }
    manualFormField("name")?.focus();
    return;
  }
  if (!addManualCast({ ...fields, imagePath: formImagePath })) return;
  resetManualForm({ keepImage: true });
  setManualFormOpen(false);
  const index = selectedCasts.length - 1;
  // the details were typed in the form, so only the handout panel opens: scroll the row into view and start at its first field
  openRowPanel(index, "handout");
  const row = elements.selectedCasts?.querySelector(`[data-selected-index="${index}"]`);
  row?.scrollIntoView({ block: "nearest" });
  row?.querySelector('[data-field="cast-no"]')?.focus({ preventScroll: true });
}

// The one open panel of the whole list: opening a panel closes every other one (the row's other panel and the other rows').
// The rows are updated in place, never re-rendered, so what was typed into a closed panel's fields stays where it is.
function openRowPanel(index, panel) {
  selectedCasts.forEach((item, at) => { item.panel = at === index ? panel : null; });
  syncRowPanels();
}

function syncRowPanels() {
  elements.selectedCasts?.querySelectorAll("[data-selected-index]").forEach(row => {
    const item = selectedCasts[Number(row.dataset.selectedIndex)];
    const open = item?.panel ?? null;
    row.classList.toggle("is-open", Boolean(open));
    row.querySelectorAll('[data-action="toggle"]').forEach(button => button.setAttribute("aria-expanded", String(button.dataset.panel === open)));
    row.querySelectorAll(".cast-row__panel").forEach(panel => { panel.hidden = panel.dataset.panel !== open; });
  });
}

function renderSelections() {
  const count = selectedCasts.length;
  if (elements.selectedCount) elements.selectedCount.textContent = String(count);
  const orderCount = $("#cast-order-count");
  if (orderCount) orderCount.textContent = String(count);
  if (elements.manualAddButton) elements.manualAddButton.disabled = count >= MAX_CASTS;
  if (count >= MAX_CASTS) setManualFormOpen(false);
  renderPublicCharacters();
  renderPrivateCharacters();

  if (!elements.selectedCasts) return;
  if (!count) {
    elements.selectedCasts.innerHTML = `<p class="empty-state">下の「キャストを追加」から公開キャストか自分の非公開キャストを選ぶか、「手動で追加」からキャストを入力してください。</p>`;
    updateOutputButtons();
    return;
  }

  elements.selectedCasts.innerHTML = selectedCasts.map((item, index) => createCastRowHtml({ item, index, total: count })).join("");
  updateOutputButtons();
}

function moveCast(from, to) {
  const next = reorder(selectedCasts, from, to);
  if (next.every((item, index) => item === selectedCasts[index])) return false;
  selectedCasts.splice(0, selectedCasts.length, ...next);
  invalidateGeneratedHtml();
  renderSelections();
  return true;
}

function handleSelectedCastClick(event) {
  const button = event.target.closest("[data-action]");
  const row = event.target.closest("[data-selected-index]");
  if (!button || !row) return;
  const index = Number(row.dataset.selectedIndex);
  if (!Number.isInteger(index) || !selectedCasts[index]) return;
  const action = button.dataset.action;

  if (action === "toggle") {
    const item = selectedCasts[index];
    openRowPanel(index, nextPanel(item.panel, button.dataset.panel, item.manual));
    return;
  }
  if (action === "close") {
    openRowPanel(index, null);
    row.querySelector(".cast-row__main")?.focus();
    return;
  }
  if (action === "up" && index > 0) {
    moveCast(index, index - 1);
  } else if (action === "down" && index < selectedCasts.length - 1) {
    moveCast(index, index + 1);
  } else if (action === "remove") {
    const [removed] = selectedCasts.splice(index, 1);
    releaseImagePath(removed?.imagePath);
    invalidateGeneratedHtml();
    renderSelections();
  } else if (action === "manual-image-clear") {
    setManualRowImage(row, selectedCasts[index], "", "");
  }
}

// ---- drag and drop (the grip of a row) and the keyboard on the grip ----
let dragIndex = -1;

function clearDropMarks() {
  elements.selectedCasts?.querySelectorAll(".is-drop-before, .is-drop-after, .is-dragging").forEach(row => row.classList.remove("is-drop-before", "is-drop-after", "is-dragging"));
}

function dropTarget(event) {
  const row = event.target.closest?.("[data-selected-index]");
  if (!row) return null;
  const index = Number(row.dataset.selectedIndex);
  const rect = row.getBoundingClientRect();
  return { row, index, after: event.clientY > rect.top + rect.height / 2 };
}

function handleGripDragStart(event) {
  const grip = event.target.closest?.('[data-action="grip"]');
  const row = grip?.closest("[data-selected-index]");
  if (!row) return;
  dragIndex = Number(row.dataset.selectedIndex);
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", String(dragIndex));
  event.dataTransfer.setDragImage?.(row, 24, 24);
  row.classList.add("is-dragging");
}

function handleGripDragOver(event) {
  if (dragIndex < 0) return;
  const target = dropTarget(event);
  if (!target) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  elements.selectedCasts.querySelectorAll(".is-drop-before, .is-drop-after").forEach(row => row.classList.remove("is-drop-before", "is-drop-after"));
  target.row.classList.add(target.after ? "is-drop-after" : "is-drop-before");
}

function handleGripDrop(event) {
  if (dragIndex < 0) return;
  const target = dropTarget(event);
  const from = dragIndex;
  dragIndex = -1;
  clearDropMarks();
  if (!target) return;
  event.preventDefault();
  let to = target.index + (target.after ? 1 : 0);
  if (from < to) to -= 1;
  moveCast(from, to);
}

function handleGripDragEnd() {
  dragIndex = -1;
  clearDropMarks();
}

function handleGripKeydown(event) {
  const grip = event.target.closest?.('[data-action="grip"]');
  if (!grip || !["ArrowUp", "ArrowDown"].includes(event.key)) return;
  const row = grip.closest("[data-selected-index]");
  const index = Number(row?.dataset.selectedIndex);
  if (!Number.isInteger(index)) return;
  event.preventDefault();
  const to = index + (event.key === "ArrowUp" ? -1 : 1);
  if (moveCast(index, to)) {
    requestAnimationFrame(() => elements.selectedCasts?.querySelector(`[data-selected-index="${Math.max(0, Math.min(selectedCasts.length - 1, to))}"] [data-action="grip"]`)?.focus());
  }
}

const MANUAL_FIELD_KEYS = {
  "manual-handle": "handle",
  "manual-styles": "manual_styles",
  "manual-player": "player_name",
  "manual-affiliation": "affiliation",
  "manual-age": "age",
  "manual-gender": "gender",
  "manual-rank": "citizen_rank"
};

const DEFAULT_SHEET_NOTE = "名前・スタイル・PL名・所属・年齢・性別・市民ランクを倉庫のデータで入力します。";

// The add form's "取込": the warehouse data fills the form, the writer then adds the cast to the order.
async function importManualFormFromSheet() {
  const button = $("#manual-sheet-import");
  const status = $("#manual-sheet-import-status");
  const url = String(manualFormField("sheetUrl")?.value ?? "").trim();
  const setStatus = (message, state = "") => {
    if (!status) return;
    status.textContent = message;
    status.className = `manual-field__note${state ? ` is-${state}` : ""}`;
  };
  if (button) button.disabled = true;
  setStatus("キャラクターシート倉庫からデータを取得しています…");
  try {
    const { fetchManualCastFromSheet } = await import("./showcase-manual-sheet-import.js?v=d305c6d8");
    const fields = await fetchManualCastFromSheet(url);
    const values = { name: fields.name, styles: fields.styles, player: fields.player, affiliation: fields.affiliation, age: fields.age, gender: fields.gender, rank: fields.rank };
    for (const [key, value] of Object.entries(values)) {
      const input = manualFormField(key);
      if (input) input.value = value ?? "";
    }
    setStatus(`「${fields.name}」を取り込みました。内容を確認して「出演順に追加」を押してください。`, "success");
  } catch (error) {
    console.error(error);
    setStatus(error?.message || "キャラクターシート倉庫から取り込めませんでした。", "error");
  } finally {
    if (button) button.disabled = false;
  }
}

// ---- the picture of a manual cast (js/showcase-manual-image.js) ----

// A picture that stops being used: one uploaded in this session goes at once, one a published showcase shows waits for the next publication.
function releaseImagePath(path) {
  const now = imageLedger.release(path);
  if (now.length) void removeManualImages(supabase, now);
}

function setImageStatus(node, message, state = "") {
  if (!node) return;
  node.textContent = message;
  node.className = `manual-field__note${state ? ` is-${state}` : ""}`;
}

function renderFormImage() {
  const form = elements.manualForm;
  if (!form) return;
  const url = String(manualFormField("imageUrl")?.value ?? "").trim();
  const preview = form.querySelector(".manual-image__preview");
  const hint = form.querySelector(".manual-image__hint");
  const clear = $("#manual-image-clear");
  if (preview) { preview.hidden = !url; if (url) preview.src = url; else preview.removeAttribute("src"); }
  if (hint) hint.hidden = Boolean(url);
  if (clear) clear.hidden = !url;
}

async function uploadFormImage(file) {
  const status = $("#manual-image-status");
  const problem = validateManualImage(file);
  if (problem) return setImageStatus(status, problem, "error");
  try {
    setImageStatus(status, "画像をアップロードしています…");
    const { path, url } = await uploadManualImage(supabase, currentUser?.id, file);
    releaseImagePath(formImagePath);
    imageLedger.uploaded(path);
    formImagePath = path;
    const field = manualFormField("imageUrl");
    if (field) field.value = url;
    renderFormImage();
    setImageStatus(status, "画像をアップロードしました。", "success");
  } catch (error) {
    console.error(error);
    setImageStatus(status, error?.message || "画像を登録できませんでした。", "error");
  }
}

function clearFormImage() {
  releaseImagePath(formImagePath);
  formImagePath = "";
  const field = manualFormField("imageUrl");
  if (field) field.value = "";
  renderFormImage();
  setImageStatus($("#manual-image-status"), "");
}

// Typing another URL in the form replaces an uploaded picture: the uploaded file is not used any more.
function handleFormImageUrlInput() {
  const url = String(manualFormField("imageUrl")?.value ?? "").trim();
  if (formImagePath && !url.endsWith(formImagePath)) {
    releaseImagePath(formImagePath);
    formImagePath = "";
  }
  renderFormImage();
}

// Sets the picture URL of a manual row (an upload, a typed URL, a restore, "外す") and keeps what depends on it in step.
function setManualRowImage(row, item, url, uploadedPath) {
  if (!item) return;
  const nextUrl = String(url ?? "").trim();
  const placeholder = new URL("./assets/placeholders/scan-failed.webp", location.href).href;
  const nextPath = uploadedPath || manualImagePathFromUrl(nextUrl, currentUser?.id);
  if (item.imagePath && item.imagePath !== nextPath) releaseImagePath(item.imagePath);
  if (uploadedPath) imageLedger.uploaded(uploadedPath);
  else if (nextPath) imageLedger.known(nextPath);
  item.imagePath = nextPath;
  item.character.image_url = nextUrl || placeholder;
  const shown = nextUrl || "./assets/placeholders/scan-failed.webp";
  row.querySelector(".cast-row__thumb")?.setAttribute("src", shown);
  row.querySelector(".manual-image__preview")?.setAttribute("src", shown);
  const field = row.querySelector('[data-field="manual-image-url"]');
  if (field && field.value !== nextUrl) field.value = nextUrl;
  const clear = row.querySelector('[data-action="manual-image-clear"]');
  if (clear) clear.hidden = !nextUrl;
  invalidateGeneratedHtml();
}

async function uploadRowImage(row, item, file) {
  const status = row.querySelector("[data-manual-image-status]");
  const problem = validateManualImage(file);
  if (problem) return setImageStatus(status, problem, "error");
  try {
    setImageStatus(status, "画像をアップロードしています…");
    const { path, url } = await uploadManualImage(supabase, currentUser?.id, file);
    if (!selectedCasts.includes(item)) { void removeManualImages(supabase, [path]); return; }
    setManualRowImage(row, item, url, path);
    setImageStatus(status, "画像をアップロードしました。", "success");
  } catch (error) {
    console.error(error);
    setImageStatus(status, error?.message || "画像を登録できませんでした。", "error");
  }
}

function handleManualImageFileChange(event) {
  const input = event.target.closest?.("[data-manual-image-file]");
  if (!input) return false;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return true;
  if (input.dataset.manualImageFile === "new") { void uploadFormImage(file); return true; }
  const row = input.closest("[data-selected-index]");
  const item = selectedCasts[Number(row?.dataset.selectedIndex)];
  if (row && item) void uploadRowImage(row, item, file);
  return true;
}

// After a publication: the pictures in use are now part of the published showcase, and the ones that were replaced or removed may go.
function handleShowcasePublished() {
  const inUse = selectedCasts.filter(item => item.manual).map(item => item.imagePath).filter(Boolean);
  const gone = imageLedger.published(inUse);
  if (gone.length) void removeManualImages(supabase, gone);
}

// Restoring a saved showcase replaces everything: what was uploaded here and never published goes, and the ledger starts again from
// the restored showcase (the rows it clears must not retire the pictures of the showcase that was open before).
function handleRestoreStart() {
  const { uploaded } = imageLedger.snapshot();
  if (uploaded.length) void removeManualImages(supabase, uploaded);
  imageLedger = createImageLedger();
  formImagePath = "";
}

function refreshHandoutBadge(row, item) {
  const badge = row.querySelector("[data-handout-badge]");
  if (!badge) return;
  const state = handoutState(item);
  if (badge.dataset.state !== state) badge.dataset.state = state;
  const text = handoutBadgeText(state);
  if (badge.textContent !== text) badge.textContent = text;
}

function handleSelectedCastInput(event) {
  const field = event.target.closest("[data-field]");
  const row = event.target.closest("[data-selected-index]");
  if (!field || !row) return;
  const item = selectedCasts[Number(row.dataset.selectedIndex)];
  if (!item) return;

  if (field.dataset.field === "cast-no") {
    item.castNo = normalizeCastNumber(field.value);
    const index = Number(row.dataset.selectedIndex);
    const label = row.querySelector("[data-cast-slot-label]");
    if (label) label.textContent = `CAST ${formatCastNumber(item.castNo, index)}`;
    if (event.type === "change") {
      renderPublicCharacters();
      renderPrivateCharacters();
    }
  } else if (field.dataset.field === "quote") item.quote = field.value;
  else if (field.dataset.field === "description") {
    item.description = field.value;
    refreshHandoutBadge(row, item);
  } else if (field.dataset.field === "tagline") item.tagline = field.value;
  else if (item.manual && field.dataset.field === "manual-image-url") {
    // typed or restored: the URL decides the picture (a restored URL of this user's own file is remembered as published)
    setManualRowImage(row, item, field.value, "");
    return;
  } else if (item.manual && field.dataset.field === "manual-name") {
    item.character.character_name = field.value;
    const preview = row.querySelector(".selected-cast__manual-preview-name");
    if (preview) preview.textContent = field.value.trim() || "未入力キャスト";
  } else if (item.manual && MANUAL_FIELD_KEYS[field.dataset.field]) {
    item.character[MANUAL_FIELD_KEYS[field.dataset.field]] = field.value;
    if (field.dataset.field === "manual-handle") {
      const handle = row.querySelector(".cast-row__handle");
      const text = formatHandle(field.value);
      if (handle) { handle.textContent = text; handle.hidden = !text; }
    } else if (field.dataset.field === "manual-styles") {
      const styles = row.querySelector(".cast-row__styles");
      if (styles) styles.textContent = field.value;
    } else if (field.dataset.field === "manual-player") {
      const player = row.querySelector(".cast-row__player");
      if (player) player.textContent = `PL：${field.value || "—"}`;
    }
  } else return;

  invalidateGeneratedHtml();
}

async function generateShowcase() {
  try {
    validateSelectedCasts();
    setGeneratorStatus("HTMLを生成中…");
    const background = elements.backgroundUrl?.value.trim() || await readFileAsDataUrl(elements.backgroundFile?.files?.[0]);
    const actName = elements.actName?.value.trim() || "トーキョーＮ◎ＶＡ アクト参加キャスト";
    generatedHtml = renderShowcase({
      // A blank page title falls back to the act title (a restored act keeps the page title it was saved with).
      title: elements.pageTitle?.value.trim() || elements.actName?.value.trim() || "ACT CAST FILE",
      actName,
      rulerName: elements.rulerName?.value.trim() || "",
      theme: normalizeShowcaseTheme(elements.showcaseTheme?.value),
      intro: elements.introText?.value.trim() || "",
      background,
      casts: selectedCasts
    }, location.href);
    if (elements.preview) elements.preview.srcdoc = generatedHtml;
    updateOutputButtons();
    if (hasPrivateCast()) {
      setGeneratorStatus("HTMLを生成しました。非公開キャストを含むため、ダウンロードとコピーは利用できますがGitHub Pagesへは公開できません。", "success");
    } else {
      setGeneratorStatus("HTMLを生成しました。プレビューを確認してください。", "success");
    }
  } catch (error) {
    console.error(error);
    setGeneratorStatus(error?.message || "HTML生成に失敗しました。", "error");
  }
}

function validateSelectedCasts() {
  if (!selectedCasts.length) throw new Error("キャストを1名以上選択または手動追加してください。");
  if (selectedCasts.length > MAX_CASTS) throw new Error("キャストは最大6名までです。");
  const incompleteManual = selectedCasts.find(item => item.manual && !item.character.character_name.trim());
  if (incompleteManual) throw new Error("手動追加キャストの名前を入力してください。");
  const duplicateNumber = findDuplicateCastNumber(selectedCasts.map(item => item.castNo));
  if (duplicateNumber) throw new Error(`CAST No ${String(duplicateNumber).padStart(2, "0")} が重複しています。番号を変更してください。`);
  const missingRole = selectedCasts.find(item => !String(item.quote ?? "").trim());
  if (missingRole) throw new Error("各キャストの参加枠（スタイル）を選択または入力してください。");
}

function downloadShowcase() {
  if (!generatedHtml) return;
  const slug = normalizeSlug(elements.publishSlug?.value) || "act-showcase";
  const blob = new Blob([generatedHtml], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${slug}.html`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function copyShowcase() {
  if (!generatedHtml) return;
  try {
    await navigator.clipboard.writeText(generatedHtml);
    setGeneratorStatus("HTMLをクリップボードへコピーしました。", "success");
  } catch (error) {
    console.error(error);
    setGeneratorStatus("クリップボードへのコピーに失敗しました。", "error");
  }
}

async function registerHistoryOnly() {
  if (registeringHistory) return;
  try {
    const participantIds = selectedCasts
      .filter(item => !item.manual && item.character.id)
      .map(item => item.character.id);
    if (!participantIds.length) throw new Error("履歴へ登録するには、公開または自分の非公開キャストを1名以上選択してください。");
    const duplicateNumber = findDuplicateCastNumber(selectedCasts.map(item => item.castNo));
    if (duplicateNumber) throw new Error(`CAST No ${String(duplicateNumber).padStart(2, "0")} が重複しています。番号を変更してください。`);

    const slug = normalizeSlug(elements.publishSlug?.value);
    if (!slug) throw new Error("アクト識別名を半角英数字とハイフンで入力してください。");
    const title = elements.actName?.value.trim();
    if (!title) throw new Error("アクト名を入力してください。");

    registeringHistory = true;
    updateOutputButtons();
    setGeneratorStatus("参加アクト履歴を登録中…");

    const { data: actId, error } = await supabase.rpc("record_act_history_for_current_user", {
      p_slug: slug,
      p_act_name: title,
      p_ruler_name: elements.rulerName?.value.trim() || "",
      p_participant_ids: [...new Set(participantIds)]
    });
    if (error) throw new Error(translateHistoryError(error));
    if (!actId) throw new Error("登録したアクト履歴を確認できませんでした。");
    const castOrders = selectedCasts
      .map((item, index) => ({ item, castOrder: resolveCastNumber(item.castNo, index) }))
      .filter(({ item }) => !item.manual && item.character.id)
      .map(({ item, castOrder }) => ({ characterId: item.character.id, castOrder }));
    const castOrderSync = await syncActCastOrders(supabase, slug, castOrders);

    const privateCount = selectedCasts.filter(item => item.source === "private").length;
    const manualCount = selectedCasts.filter(item => item.manual).length;
    const privateNote = privateCount ? ` 非公開キャスト${privateCount}名を含みます。` : "";
    const manualNote = manualCount ? ` 手動追加キャスト${manualCount}名は履歴対象外です。` : "";
    const castOrderNote = castOrderSync.ok ? "" : " 履歴のCAST No.は更新できませんでした。";
    setGeneratorStatus(`GitHub Pagesへ公開せず、参加アクト履歴へ登録しました。${privateNote}${manualNote}${castOrderNote}`, "success");
  } catch (error) {
    console.error(error);
    setGeneratorStatus(error?.message || "参加アクト履歴の登録に失敗しました。", "error");
  } finally {
    registeringHistory = false;
    updateOutputButtons();
  }
}

async function publishShowcase() {
  if (publishing) return;
  try {
    if (!generatedHtml) throw new Error("先にHTMLを生成してください。");
    if (hasPrivateCast()) throw new Error("非公開キャストを含むHTMLはGitHub Pagesへ公開できません。非公開キャストを外して再生成してください。");
    const participantIds = selectedCasts.filter(item => item.source === "public" && item.character.id).map(item => item.character.id);
    if (!participantIds.length) throw new Error("GitHub Pagesへ公開するには、公開キャストを1名以上選択してください。");
    const slug = normalizeSlug(elements.publishSlug?.value);
    if (!slug) throw new Error("公開ファイル名を半角英数字とハイフンで入力してください。");

    const { data: { session: authSession }, error: authError } = await supabase.auth.getSession();
    if (authError) throw authError;
    if (!authSession) throw new Error("ログイン情報を確認できません。再ログインしてください。");

    publishing = true;
    updateOutputButtons();
    setGeneratorStatus("アクト紹介ページと参加履歴を公開中…");
    const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
      body: {
        slug,
        actName: elements.actName?.value.trim() || slug,
        rulerName: elements.rulerName?.value.trim() || "",
        html: generatedHtml,
        participantIds
      }
    });
    if (error) throw new Error(await extractFunctionError(error));
    if (!data?.publicUrl) throw new Error("公開URLを取得できませんでした。");

    setGeneratorStatus(`公開処理が完了しました。参加アクト履歴にも反映しました。 <a href="${escapeAttribute(data.publicUrl)}" target="_blank" rel="noopener">公開ページを開く</a>`, "success", true);
  } catch (error) {
    console.error(error);
    setGeneratorStatus(error?.message || "アクト紹介ページの公開に失敗しました。", "error");
  } finally {
    publishing = false;
    updateOutputButtons();
  }
}

async function extractFunctionError(error) {
  try {
    const response = error?.context;
    if (response instanceof Response) {
      const payload = await response.clone().json();
      return payload?.error || payload?.message || error.message;
    }
  } catch {}
  return error?.message || "Edge Functionの呼び出しに失敗しました。";
}

function translateHistoryError(error) {
  const message = String(error?.message ?? "");
  if (/record_act_history_for_current_user|function.*does not exist|schema cache/i.test(message)) {
    return "履歴登録機能が未設定です。Supabaseで supabase/13_private_act_history.sql を実行してください。";
  }
  if (/owned by another|another user|permission denied/i.test(message)) {
    return "このアクト識別名は別のユーザーが使用しています。別の識別名を入力してください。";
  }
  if (/not accessible|do not exist|participant/i.test(message)) {
    return "選択したキャストの一部を履歴へ登録できません。公開状態または所有者を確認してください。";
  }
  return message || "参加アクト履歴の登録に失敗しました。";
}

function invalidateGeneratedHtml(message = "選択内容が変更されました。HTMLを再生成してください。") {
  if (!generatedHtml) return;
  generatedHtml = "";
  elements.preview?.removeAttribute("srcdoc");
  updateOutputButtons();
  setGeneratorStatus(message);
}

function updateOutputButtons() {
  const hasOutput = Boolean(generatedHtml);
  if (elements.downloadButton) elements.downloadButton.disabled = !hasOutput;
  if (elements.copyButton) elements.copyButton.disabled = !hasOutput;
  if (elements.historyButton) elements.historyButton.disabled = registeringHistory;
  if (elements.publishButton) {
    const blockedByPrivate = hasPrivateCast();
    elements.publishButton.disabled = !hasOutput || blockedByPrivate || publishing;
    elements.publishButton.classList.toggle("is-blocked-private", blockedByPrivate);
    elements.publishButton.title = blockedByPrivate
      ? "非公開キャストを含むためGitHub Pagesへ公開できません。HTMLの生成・ダウンロード・コピーは利用できます。"
      : "";
  }
}

function hasPrivateCast() {
  return selectedCasts.some(item => item.source === "private");
}

function updatePrivateSelectionSummary() {
  const selectedPrivate = selectedCasts.filter(item => item.source === "private");
  if (elements.privateSelectedCount) elements.privateSelectedCount.textContent = String(selectedPrivate.length);
  if (!elements.privateSelectionSummary) return;

  if (!selectedPrivate.length) {
    elements.privateSelectionSummary.innerHTML = `<span>非公開キャストは未選択です。</span><small>NO PRIVATE CAST SELECTED</small>`;
    return;
  }

  elements.privateSelectionSummary.innerHTML = `
    <span class="private-selection-summary__label">出演枠に追加済み：</span>
    ${selectedPrivate.map(item => {
      const index = selectedCasts.indexOf(item);
      return `<span class="private-selection-summary__item"><b>${formatCastNumber(item.castNo, index)}</b>${escapeHtml(item.character.character_name || "名称未登録")}</span>`;
    }).join("")}`;
}

function suggestSlug() {
  if (!elements.publishSlug || elements.publishSlug.dataset.edited === "true") return;
  const suggested = normalizeSlug(elements.actName?.value);
  if (suggested) elements.publishSlug.value = suggested;
}

function setLibraryStatus(message, state = "") {
  if (!elements.libraryStatus) return;
  elements.libraryStatus.textContent = message;
  elements.libraryStatus.className = `generator-status${state ? ` is-${state}` : ""}`;
}

function setPrivateStatus(message, state = "") {
  if (!elements.privateStatus) return;
  elements.privateStatus.textContent = message;
  elements.privateStatus.className = `generator-status${state ? ` is-${state}` : ""}`;
}

function setGeneratorStatus(message, state = "", allowHtml = false) {
  if (!elements.generatorStatus) return;
  if (allowHtml) elements.generatorStatus.innerHTML = message;
  else elements.generatorStatus.textContent = message;
  elements.generatorStatus.className = `generator-status${state ? ` is-${state}` : ""}`;
}

function normalizeSearch(value) { return String(value ?? "").normalize("NFKC").toLocaleLowerCase("ja-JP").replace(/\s+/g, " ").trim(); }
function normalizeSlug(value) { return String(value ?? "").normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64); }
function localeCompareJa(a, b) { return String(a ?? "").localeCompare(String(b ?? ""), "ja", { sensitivity: "base", numeric: true }); }
function readFileAsDataUrl(file) { return new Promise((resolve, reject) => { if (!file) return resolve(""); const reader = new FileReader(); reader.onload = () => resolve(String(reader.result ?? "")); reader.onerror = () => reject(reader.error || new Error("背景画像を読み込めませんでした。")); reader.readAsDataURL(file); }); }
