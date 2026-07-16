import { supabase } from "./supabase-client.js";
import { renderAuthNavigation } from "./auth-state.js";

const castGrid = document.querySelector("#cast-grid");
const statusText = document.querySelector("#status-text");
const searchInput = document.querySelector("#archive-search");
const styleFilter = document.querySelector("#archive-style-filter");
const playerFilter = document.querySelector("#archive-player-filter");
const sortSelect = document.querySelector("#archive-sort");
const resetButton = document.querySelector("#archive-reset");
const resultCount = document.querySelector("#archive-result-count");

let allCharacters = [];

initialize();

async function initialize() {
  setupControls();
  await renderAuthNavigation();
  await loadCharacters();

  supabase.auth.onAuthStateChange(async () => {
    await renderAuthNavigation();
    await loadCharacters();
  });
}

function setupControls() {
  searchInput.addEventListener("input", applyFilters);
  styleFilter.addEventListener("change", applyFilters);
  playerFilter.addEventListener("change", applyFilters);
  sortSelect.addEventListener("change", applyFilters);

  resetButton.addEventListener("click", () => {
    searchInput.value = "";
    styleFilter.value = "";
    playerFilter.value = "";
    sortSelect.value = "updated-desc";
    applyFilters();
  });
}

async function loadCharacters() {
  castGrid.innerHTML = "";
  statusText.textContent = "SCANNING CAST DATABASE...";

  try {
    const { data, error } = await supabase
      .from("characters")
      .select(`
        id,
        public_id,
        player_name,
        character_name,
        character_kana,
        handle,
        affiliation,
        citizen_rank,
        experience_points,
        style_1,
        style_1_mark,
        style_2,
        style_2_mark,
        style_3,
        style_3_mark,
        image_url,
        summary,
        updated_at
      `)
      .eq("visibility", "public")
      .order("updated_at", { ascending: false });

    if (error) throw error;

    allCharacters = data ?? [];
    populateFilters(allCharacters);
    applyFilters();

    statusText.textContent = `${allCharacters.length} CAST${allCharacters.length === 1 ? "" : "S"} DETECTED`;
  } catch (error) {
    console.error(error);
    statusText.textContent = "DATABASE CONNECTION FAILED";
    resultCount.textContent = "0 CASTS SHOWN";
    castGrid.innerHTML = `<p class="error-message">キャスト情報を取得できませんでした。</p>`;
  }
}

function populateFilters(characters) {
  const selectedStyle = styleFilter.value;
  const selectedPlayer = playerFilter.value;

  const styles = [...new Set(characters.flatMap(character => [
    character.style_1,
    character.style_2,
    character.style_3
  ]).filter(Boolean))].sort(localeCompareJa);

  const players = [...new Set(characters.map(character => character.player_name).filter(Boolean))].sort(localeCompareJa);

  styleFilter.innerHTML = `<option value="">ALL STYLES</option>${styles.map(style => `<option value="${escapeAttribute(style)}">${escapeHtml(style)}</option>`).join("")}`;
  playerFilter.innerHTML = `<option value="">ALL PLAYERS</option>${players.map(player => `<option value="${escapeAttribute(player)}">${escapeHtml(player)}</option>`).join("")}`;

  if (styles.includes(selectedStyle)) styleFilter.value = selectedStyle;
  if (players.includes(selectedPlayer)) playerFilter.value = selectedPlayer;
}

function applyFilters() {
  const keyword = normalizeText(searchInput.value);
  const selectedStyle = styleFilter.value;
  const selectedPlayer = playerFilter.value;

  const filtered = allCharacters.filter(character => {
    const searchableText = normalizeText([
      character.public_id,
      character.character_name,
      character.character_kana,
      character.handle,
      character.player_name,
      character.affiliation,
      character.citizen_rank,
      character.summary,
      character.style_1,
      character.style_2,
      character.style_3
    ].join(" "));

    const styles = [character.style_1, character.style_2, character.style_3];

    return (!keyword || searchableText.includes(keyword)) &&
      (!selectedStyle || styles.includes(selectedStyle)) &&
      (!selectedPlayer || character.player_name === selectedPlayer);
  });

  sortCharacters(filtered, sortSelect.value);
  renderCharacters(filtered);
  resultCount.textContent = `${filtered.length} / ${allCharacters.length} CASTS SHOWN`;
}

function sortCharacters(characters, mode) {
  characters.sort((a, b) => {
    switch (mode) {
      case "updated-asc":
        return new Date(a.updated_at) - new Date(b.updated_at);
      case "name-asc":
        return localeCompareJa(a.character_kana || a.character_name, b.character_kana || b.character_name);
      case "name-desc":
        return localeCompareJa(b.character_kana || b.character_name, a.character_kana || a.character_name);
      case "exp-desc":
        return Number(b.experience_points ?? 0) - Number(a.experience_points ?? 0);
      case "exp-asc":
        return Number(a.experience_points ?? 0) - Number(b.experience_points ?? 0);
      default:
        return new Date(b.updated_at) - new Date(a.updated_at);
    }
  });
}

function renderCharacters(characters) {
  if (!characters.length) {
    castGrid.innerHTML = `<p class="empty-message">NO MATCHING CAST</p>`;
    return;
  }

  castGrid.innerHTML = characters.map(createCharacterCard).join("");
}

function createCharacterCard(character) {
  const imageUrl = character.image_url || "./assets/placeholders/scan-failed.webp";
  const styles = [
    [character.style_1, character.style_1_mark],
    [character.style_2, character.style_2_mark],
    [character.style_3, character.style_3_mark]
  ].filter(([name]) => name).map(([name, mark]) => `${escapeHtml(name)}${escapeHtml(mark)}`).join(" / ");

  return `
    <article class="cast-card">
      <a href="./cast.html?id=${encodeURIComponent(character.public_id)}">
        <div class="cast-card__image">
          <img src="${escapeAttribute(imageUrl)}" alt="${escapeAttribute(character.character_name)}" loading="lazy">
          <span class="cast-card__scanline"></span>
        </div>
        <div class="cast-card__body">
          <div class="cast-card__meta"><p class="cast-card__id">${escapeHtml(character.public_id)}</p><p class="cast-card__exp">${escapeHtml(character.experience_points ?? 0)} EXP</p></div>
          <p class="cast-card__handle">${escapeHtml(character.handle || "NO HANDLE")}</p>
          <h2 class="cast-card__name">${escapeHtml(character.character_name)}</h2>
          <p class="cast-card__styles">${styles}</p>
          <p class="cast-card__player">PLAYER // ${escapeHtml(character.player_name || "—")}</p>
          <p class="cast-card__affiliation">${escapeHtml(character.affiliation)}</p>
          <p class="cast-card__summary">${escapeHtml(character.summary)}</p>
        </div>
      </a>
    </article>
  `;
}

function normalizeText(value) {
  return String(value ?? "").normalize("NFKC").toLocaleLowerCase("ja-JP").replace(/\s+/g, " ").trim();
}

function localeCompareJa(a, b) {
  return String(a ?? "").localeCompare(String(b ?? ""), "ja", { sensitivity: "base", numeric: true });
}

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
