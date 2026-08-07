import { supabase } from "./supabase-client.js";
import { renderAuthNavigation } from "./auth-state.js?v=4";
import { getStyleColor } from "./style-colors.js";
import { getImageObjectPosition, getImageScale, getImageTransformOrigin } from "./image-focus.js?v=3";

const ALLOWED_PAGE_SIZES = new Set([12, 25, 50, 100]);
const ALLOWED_SORTS = new Set(["updated-desc", "updated-asc", "name-asc", "name-desc", "exp-desc", "exp-asc"]);
const DEFAULT_PAGE_SIZE = 12;
const DEFAULT_SORT = "updated-desc";
const ARCHIVE_SCROLL_KEY = "tnx-cast-archive-return-scroll";

const castGrid = document.querySelector("#cast-grid");
const statusText = document.querySelector("#status-text");
const searchInput = document.querySelector("#archive-search");
const styleFilter = document.querySelector("#archive-style-filter");
const playerFilter = document.querySelector("#archive-player-filter");
const sortSelect = document.querySelector("#archive-sort");
const pageSizeSelect = document.querySelector("#archive-page-size");
const resetButton = document.querySelector("#archive-reset");
const resultCount = document.querySelector("#archive-result-count");
const pagination = document.querySelector("#archive-pagination");
const pageStatus = document.querySelector("#archive-page-status");
const previousPageButton = document.querySelector("#archive-page-prev");
const nextPageButton = document.querySelector("#archive-page-next");

let allCharacters = [];
let filteredCharacters = [];
let currentPage = 1;

initialize();

async function initialize() {
  setupControls();
  // Public character loading must not be blocked by a stale or unavailable
  // authentication session. Run both initializers independently.
  const authInitialization = renderAuthNavigation().catch(error => {
    console.error("Authentication navigation initialization failed:", error);
  });
  const characterInitialization = loadCharacters();
  await Promise.allSettled([authInitialization, characterInitialization]);

  supabase.auth.onAuthStateChange((_event, session) => {
    // Do not call getSession from inside this callback. Supabase holds its auth
    // lock while notifying listeners, so doing so can leave the callback waiting.
    void renderAuthNavigation(session);
    void loadCharacters();
  });
}

function setupControls() {
  restoreArchiveStateFromUrl();

  const applyFromFirstPage = () => {
    currentPage = 1;
    applyFilters();
  };

  searchInput?.addEventListener("input", applyFromFirstPage);
  styleFilter?.addEventListener("change", applyFromFirstPage);
  playerFilter?.addEventListener("change", applyFromFirstPage);
  sortSelect?.addEventListener("change", applyFromFirstPage);
  pageSizeSelect?.addEventListener("change", applyFromFirstPage);
  previousPageButton?.addEventListener("click", () => changePage(-1));
  nextPageButton?.addEventListener("click", () => changePage(1));

  resetButton?.addEventListener("click", () => {
    searchInput.value = "";
    styleFilter.value = "";
    playerFilter.value = "";
    sortSelect.value = DEFAULT_SORT;
    pageSizeSelect.value = String(DEFAULT_PAGE_SIZE);
    currentPage = 1;
    applyFilters();
  });

  castGrid?.addEventListener("click", event => {
    if (!event.target.closest("a[data-archive-cast-link]")) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    rememberArchiveScrollPosition();
  });
}

async function loadCharacters() {
  if (!castGrid || !statusText || !resultCount) return;
  castGrid.innerHTML = "";
  statusText.textContent = "公開キャストを読み込み中…";

  try {
    const { data, error } = await supabase
      .from("characters")
      .select(`
        id, public_id, player_name, character_name, character_kana, handle,
        affiliation, citizen_rank, experience_points,
        style_1, style_1_mark, style_2, style_2_mark, style_3, style_3_mark,
        image_url, summary, updated_at
      `)
      .eq("visibility", "public")
      .order("updated_at", { ascending: false });

    if (error) throw error;

    allCharacters = data ?? [];
    populateFilters(allCharacters);
    restoreArchiveStateFromUrl();
    applyFilters();
    restoreArchiveScrollPosition();
    statusText.textContent = `${allCharacters.length}件の公開キャストを読み込みました。`;
  } catch (error) {
    console.error(error);
    allCharacters = [];
    filteredCharacters = [];
    statusText.textContent = "データベースへの接続に失敗しました。";
    resultCount.textContent = "0件表示";
    if (pagination) pagination.hidden = true;
    castGrid.innerHTML = `<p class="error-message">キャスト情報を取得できませんでした。</p>`;
  }
}

function populateFilters(characters) {
  const selectedStyle = styleFilter.value;
  const selectedPlayer = playerFilter.value;
  const styles = [...new Set(characters.flatMap(character => [character.style_1, character.style_2, character.style_3]).filter(Boolean))].sort(localeCompareJa);
  const players = [...new Set(characters.map(character => character.player_name).filter(Boolean))].sort(localeCompareJa);

  styleFilter.innerHTML = `<option value="">すべてのスタイル</option>${styles.map(style => `<option value="${escapeAttribute(style)}">${escapeHtml(style)}</option>`).join("")}`;
  playerFilter.innerHTML = `<option value="">すべてのプレイヤー</option>${players.map(player => `<option value="${escapeAttribute(player)}">${escapeHtml(player)}</option>`).join("")}`;

  if (styles.includes(selectedStyle)) styleFilter.value = selectedStyle;
  if (players.includes(selectedPlayer)) playerFilter.value = selectedPlayer;
}

function applyFilters() {
  if (!searchInput || !styleFilter || !playerFilter || !sortSelect || !resultCount) return;
  const keyword = normalizeText(searchInput.value);
  const selectedStyle = styleFilter.value;
  const selectedPlayer = playerFilter.value;

  const filtered = allCharacters.filter(character => {
    const searchableText = normalizeText([
      character.public_id, obfuscatePublicId(character.public_id), character.character_name, character.character_kana,
      character.handle, character.player_name, character.affiliation,
      character.citizen_rank, character.summary,
      character.style_1, character.style_2, character.style_3
    ].join(" "));
    const styles = [character.style_1, character.style_2, character.style_3];
    return (!keyword || searchableText.includes(keyword)) &&
      (!selectedStyle || styles.includes(selectedStyle)) &&
      (!selectedPlayer || character.player_name === selectedPlayer);
  });

  sortCharacters(filtered, sortSelect.value);
  filteredCharacters = filtered;
  renderCurrentPage();
}

function getPageSize() {
  const value = Number(pageSizeSelect?.value ?? DEFAULT_PAGE_SIZE);
  return ALLOWED_PAGE_SIZES.has(value) ? value : DEFAULT_PAGE_SIZE;
}

function changePage(offset) {
  const pageCount = Math.max(1, Math.ceil(filteredCharacters.length / getPageSize()));
  const nextPage = Math.min(pageCount, Math.max(1, currentPage + offset));
  if (nextPage === currentPage) return;
  currentPage = nextPage;
  renderCurrentPage(true);
}

function renderCurrentPage(scrollToList = false) {
  const pageSize = getPageSize();
  const pageCount = Math.max(1, Math.ceil(filteredCharacters.length / pageSize));
  currentPage = Math.min(pageCount, Math.max(1, currentPage));

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredCharacters.length);
  const pageCharacters = filteredCharacters.slice(startIndex, endIndex);

  syncArchiveStateToUrl();
  renderCharacters(pageCharacters);
  updatePagination(pageCount);

  if (filteredCharacters.length) {
    resultCount.textContent = `${allCharacters.length}件中 ${filteredCharacters.length}件該当・${startIndex + 1}〜${endIndex}件を表示`;
  } else {
    resultCount.textContent = `${allCharacters.length}件中 0件該当`;
  }

  if (scrollToList) {
    document.querySelector(".archive-summary")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function updatePagination(pageCount) {
  if (!pagination || !pageStatus || !previousPageButton || !nextPageButton) return;
  const hasMultiplePages = filteredCharacters.length > getPageSize();
  pagination.hidden = !hasMultiplePages;
  pageStatus.textContent = `${currentPage} / ${pageCount}`;
  previousPageButton.disabled = currentPage <= 1;
  nextPageButton.disabled = currentPage >= pageCount;
}

function sortCharacters(characters, mode) {
  characters.sort((a, b) => {
    switch (mode) {
      case "updated-asc": return new Date(a.updated_at) - new Date(b.updated_at);
      case "name-asc": return localeCompareJa(a.character_kana || a.character_name, b.character_kana || b.character_name);
      case "name-desc": return localeCompareJa(b.character_kana || b.character_name, a.character_kana || a.character_name);
      case "exp-desc": return Number(b.experience_points ?? 0) - Number(a.experience_points ?? 0);
      case "exp-asc": return Number(a.experience_points ?? 0) - Number(b.experience_points ?? 0);
      default: return new Date(b.updated_at) - new Date(a.updated_at);
    }
  });
}

function renderCharacters(characters) {
  if (!castGrid) return;
  if (!characters.length) {
    castGrid.innerHTML = `<p class="empty-message">条件に一致するキャストはいません。</p>`;
    return;
  }
  castGrid.innerHTML = characters.map(createCharacterCard).join("");
}

function createCharacterCard(character) {
  const imageUrl = character.image_url || "./assets/placeholders/scan-failed.webp";
  const imagePosition = getImageObjectPosition(character.image_url);
  const displayId = obfuscatePublicId(character.public_id);
  const archiveReturnUrl = `./index.html${window.location.search}`;
  const castUrl = `./cast.html?id=${encodeURIComponent(character.public_id)}&return=${encodeURIComponent(archiveReturnUrl)}`;
  const styles = [
    [character.style_1, character.style_1_mark],
    [character.style_2, character.style_2_mark],
    [character.style_3, character.style_3_mark]
  ].filter(([name]) => name).map(([name, mark]) => `
    <span class="cast-card__style-chip" style="--style-color:${getStyleColor(name)}">
      <span>${escapeHtml(name)}</span>${mark ? `<b>${escapeHtml(mark)}</b>` : ""}
    </span>`).join("");

  return `
    <article class="cast-card">
      <a href="${escapeAttribute(castUrl)}" data-archive-cast-link>
        <div class="cast-card__image">
          <img src="${escapeAttribute(imageUrl)}" alt="${escapeAttribute(character.character_name)}" loading="lazy" style="object-position:${escapeAttribute(imagePosition)};--tnx-image-scale:${getImageScale(character.image_url)};--tnx-image-origin:${escapeAttribute(getImageTransformOrigin(character.image_url))}">
          <span class="cast-card__scanline"></span>
        </div>
        <div class="cast-card__body">
          <div class="cast-card__meta"><p class="cast-card__exp">${escapeHtml(character.experience_points ?? 0)} EXP</p></div>
          <p class="cast-card__handle">${escapeHtml(character.handle || "ハンドル未登録")}</p>
          <h2 class="cast-card__name">${escapeHtml(character.character_name)}</h2>
          <div class="cast-card__styles" aria-label="スタイル">${styles}</div>
          <p class="cast-card__player">プレイヤー：${escapeHtml(character.player_name || "—")}</p>
          <p class="cast-card__affiliation">${escapeHtml(character.affiliation)}</p>
          <p class="cast-card__summary">${escapeHtml(character.summary)}</p>
          <p class="cast-card__serial">${escapeHtml(displayId)}</p>
        </div>
      </a>
    </article>`;
}

function obfuscatePublicId(value) {
  const source = `TNX_CAST_ARCHIVE::${String(value ?? "")}`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < source.length; index++) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `TNX-${(hash >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
}

function normalizeText(value) {
  return String(value ?? "").normalize("NFKC").toLocaleLowerCase("ja-JP").replace(/\s+/g, " ").trim();
}

function restoreArchiveStateFromUrl() {
  const params = new URLSearchParams(location.search);

  if (searchInput) searchInput.value = params.get("q") ?? "";
  if (sortSelect) {
    const sort = params.get("sort");
    sortSelect.value = ALLOWED_SORTS.has(sort) ? sort : DEFAULT_SORT;
  }
  if (pageSizeSelect) {
    const size = Number(params.get("size"));
    pageSizeSelect.value = ALLOWED_PAGE_SIZES.has(size) ? String(size) : String(DEFAULT_PAGE_SIZE);
  }

  const style = params.get("style") ?? "";
  const player = params.get("player") ?? "";
  if (styleFilter && [...styleFilter.options].some(option => option.value === style)) styleFilter.value = style;
  if (playerFilter && [...playerFilter.options].some(option => option.value === player)) playerFilter.value = player;

  const requestedPage = Number.parseInt(params.get("page") ?? "1", 10);
  currentPage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
}

function syncArchiveStateToUrl() {
  const url = new URL(location.href);
  const setOrDelete = (name, value, defaultValue = "") => {
    if (String(value ?? "") && String(value) !== String(defaultValue)) url.searchParams.set(name, String(value));
    else url.searchParams.delete(name);
  };

  setOrDelete("q", searchInput?.value.trim());
  setOrDelete("style", styleFilter?.value);
  setOrDelete("player", playerFilter?.value);
  setOrDelete("sort", sortSelect?.value, DEFAULT_SORT);
  setOrDelete("size", getPageSize(), DEFAULT_PAGE_SIZE);
  setOrDelete("page", currentPage, 1);
  history.replaceState(history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

function rememberArchiveScrollPosition() {
  try {
    sessionStorage.setItem(ARCHIVE_SCROLL_KEY, JSON.stringify({
      url: `${location.pathname}${location.search}`,
      y: Math.max(0, Math.round(window.scrollY))
    }));
  } catch {}
}

function restoreArchiveScrollPosition() {
  try {
    const stored = JSON.parse(sessionStorage.getItem(ARCHIVE_SCROLL_KEY) || "null");
    if (!stored || stored.url !== `${location.pathname}${location.search}` || !Number.isFinite(Number(stored.y))) return;
    sessionStorage.removeItem(ARCHIVE_SCROLL_KEY);
    requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo({ top: Number(stored.y), behavior: "auto" })));
  } catch {
    try { sessionStorage.removeItem(ARCHIVE_SCROLL_KEY); } catch {}
  }
}

function localeCompareJa(a, b) {
  return String(a ?? "").localeCompare(String(b ?? ""), "ja", { sensitivity: "base", numeric: true });
}
function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function escapeAttribute(value) { return escapeHtml(value); }
