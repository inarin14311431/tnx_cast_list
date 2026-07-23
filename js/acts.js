import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js";

const elements = {
  status: document.querySelector("#history-status"),
  playerFilter: document.querySelector("#history-player-filter"),
  castFilter: document.querySelector("#history-cast-filter"),
  reset: document.querySelector("#history-reset"),
  actCount: document.querySelector("#history-act-count"),
  expTotal: document.querySelector("#history-exp-total"),
  castCount: document.querySelector("#history-cast-count"),
  list: document.querySelector("#act-history-list")
};

let currentUser = null;
let ownedCharacters = [];
let participationRows = [];

initialize();

async function initialize() {
  currentUser = await requireAuth();
  if (!currentUser) return;
  bindEvents();
  await loadHistory();
}

function bindEvents() {
  elements.playerFilter?.addEventListener("change", () => {
    syncCastOptions();
    renderHistory();
  });
  elements.castFilter?.addEventListener("change", renderHistory);
  elements.reset?.addEventListener("click", () => {
    elements.playerFilter.value = "";
    syncCastOptions();
    elements.castFilter.value = "";
    history.replaceState(null, "", "./acts.html");
    renderHistory();
  });
  elements.list?.addEventListener("click", handleHistoryClick);
}

async function loadHistory() {
  setStatus("登録キャストと参加アクトを読み込み中…");

  const { data: characters, error: characterError } = await supabase
    .from("characters")
    .select("id, public_id, player_name, character_name, handle")
    .eq("owner_id", currentUser.id)
    .order("player_name", { ascending: true })
    .order("character_name", { ascending: true });

  if (characterError) {
    console.error(characterError);
    setStatus("キャスト情報を取得できませんでした。", "error");
    elements.list.innerHTML = `<p class="act-history-empty">キャスト情報を取得できませんでした。</p>`;
    return;
  }

  ownedCharacters = characters ?? [];
  populatePlayerOptions();
  syncCastOptions();

  if (!ownedCharacters.length) {
    setStatus("登録キャストがありません。");
    renderHistory();
    return;
  }

  const characterIds = ownedCharacters.map(character => character.id);
  const { data, error } = await supabase
    .from("act_participants")
    .select(`
      id, character_id, character_public_id, character_name, player_name,
      cast_order, earned_experience, updated_at,
      act:acts!inner(id, slug, act_name, ruler_name, public_url, published_at, updated_at)
    `)
    .in("character_id", characterIds);

  if (error) {
    console.error(error);
    const migrationHint = /act_participants|acts/i.test(String(error.message ?? ""))
      ? " Supabaseでsupabase/07_act_history.sqlを実行してください。"
      : "";
    setStatus(`参加アクトを取得できませんでした。${migrationHint}`, "error");
    elements.list.innerHTML = `<p class="act-history-empty">参加アクト情報を取得できませんでした。</p>`;
    return;
  }

  participationRows = (data ?? []).sort((a, b) =>
    new Date(b.act?.published_at ?? 0) - new Date(a.act?.published_at ?? 0)
  );
  applyQueryFilters();
  renderHistory();
  setStatus(`${participationRows.length}件のキャスト参加記録を読み込みました。`, "success");
}

function populatePlayerOptions() {
  const players = [...new Set(ownedCharacters.map(character => character.player_name || "プレイヤー未登録"))]
    .sort(localeCompareJa);
  elements.playerFilter.innerHTML = `<option value="">すべてのプレイヤー</option>${players.map(player => `<option value="${escapeAttribute(player)}">${escapeHtml(player)}</option>`).join("")}`;
}

function syncCastOptions() {
  const selectedPlayer = elements.playerFilter.value;
  const previous = elements.castFilter.value;
  const characters = ownedCharacters.filter(character =>
    !selectedPlayer || (character.player_name || "プレイヤー未登録") === selectedPlayer
  );
  elements.castFilter.innerHTML = `<option value="">すべてのキャスト</option>${characters.map(character => `<option value="${escapeAttribute(character.public_id)}">${escapeHtml(formatFullName(character))}</option>`).join("")}`;
  if (characters.some(character => character.public_id === previous)) elements.castFilter.value = previous;
}

function applyQueryFilters() {
  const params = new URLSearchParams(location.search);
  const requestedCharacter = params.get("character")?.trim() ?? "";
  const requestedPlayer = params.get("player")?.trim() ?? "";

  if (requestedPlayer && [...elements.playerFilter.options].some(option => option.value === requestedPlayer)) {
    elements.playerFilter.value = requestedPlayer;
    syncCastOptions();
  }

  if (requestedCharacter) {
    const character = ownedCharacters.find(item => item.public_id === requestedCharacter);
    if (character) {
      elements.playerFilter.value = character.player_name || "プレイヤー未登録";
      syncCastOptions();
      elements.castFilter.value = character.public_id;
    }
  }
}

function getFilteredRows() {
  const player = elements.playerFilter.value;
  const publicId = elements.castFilter.value;
  const allowedIds = new Set(ownedCharacters
    .filter(character => (!player || (character.player_name || "プレイヤー未登録") === player) && (!publicId || character.public_id === publicId))
    .map(character => character.id));
  return participationRows.filter(row => allowedIds.has(row.character_id));
}

function renderHistory() {
  const filteredRows = getFilteredRows();
  const selectedCharacters = ownedCharacters.filter(character => {
    const player = elements.playerFilter.value;
    const publicId = elements.castFilter.value;
    return (!player || (character.player_name || "プレイヤー未登録") === player) && (!publicId || character.public_id === publicId);
  });

  elements.actCount.textContent = String(new Set(filteredRows.map(row => row.act?.id).filter(Boolean)).size);
  elements.expTotal.textContent = String(filteredRows.reduce((sum, row) => sum + Number(row.earned_experience || 0), 0));
  elements.castCount.textContent = String(selectedCharacters.length);

  if (!filteredRows.length) {
    elements.list.innerHTML = `<p class="act-history-empty">条件に一致する参加アクトはありません。</p>`;
    return;
  }

  const charactersById = new Map(ownedCharacters.map(character => [character.id, character]));
  const playerGroups = new Map();

  for (const row of filteredRows) {
    const character = charactersById.get(row.character_id);
    if (!character) continue;
    const playerName = character.player_name || row.player_name || "プレイヤー未登録";
    if (!playerGroups.has(playerName)) playerGroups.set(playerName, new Map());
    const characterGroups = playerGroups.get(playerName);
    if (!characterGroups.has(character.id)) characterGroups.set(character.id, { character, rows: [] });
    characterGroups.get(character.id).rows.push(row);
  }

  elements.list.innerHTML = [...playerGroups.entries()].sort(([a], [b]) => localeCompareJa(a, b)).map(([playerName, characterGroups]) => {
    const allRows = [...characterGroups.values()].flatMap(group => group.rows);
    const playerExp = allRows.reduce((sum, row) => sum + Number(row.earned_experience || 0), 0);
    return `
      <section class="act-player-group">
        <header class="act-player-group__header">
          <h3>${escapeHtml(playerName)} <small>PLAYER ACT HISTORY</small></h3>
          <p>${new Set(allRows.map(row => row.act?.id).filter(Boolean)).size} ACTS / ${playerExp} EXP</p>
        </header>
        ${[...characterGroups.values()].sort((a, b) => localeCompareJa(a.character.character_name, b.character.character_name)).map(renderCharacterGroup).join("")}
      </section>`;
  }).join("");
}

function renderCharacterGroup(group) {
  const { character, rows } = group;
  const totalExp = rows.reduce((sum, row) => sum + Number(row.earned_experience || 0), 0);
  return `
    <section class="act-character-group">
      <header class="act-character-group__header">
        <h4>${escapeHtml(formatFullName(character))}<small>${escapeHtml(character.public_id)}</small></h4>
        <p>${rows.length} RECORDS / ${totalExp} EXP</p>
      </header>
      <div class="act-records">${rows.map(renderActRecord).join("")}</div>
    </section>`;
}

function renderActRecord(row) {
  const act = row.act ?? {};
  const title = escapeHtml(act.act_name || act.slug || "名称未登録アクト");
  const titleHtml = act.public_url
    ? `<a href="${escapeAttribute(act.public_url)}" target="_blank" rel="noopener">${title}</a>`
    : title;
  return `
    <article class="act-record" data-participation-id="${escapeAttribute(row.id)}">
      <div class="act-record__main">
        <p class="act-record__title">${titleHtml}</p>
        <p class="act-record__meta">${escapeHtml(formatDate(act.published_at))} / CAST ${String(row.cast_order || 1).padStart(2, "0")}</p>
      </div>
      <p class="act-record__ruler">RULER：${escapeHtml(act.ruler_name || "—")}</p>
      <div class="act-record__exp">
        <label>獲得経験点 <small>EXPERIENCE</small><input data-experience-input type="number" min="0" max="9999" step="1" value="${escapeAttribute(row.earned_experience || 0)}"></label>
        <button type="button" data-save-experience>保存</button>
      </div>
    </article>`;
}

async function handleHistoryClick(event) {
  const button = event.target.closest("[data-save-experience]");
  const record = event.target.closest("[data-participation-id]");
  if (!button || !record) return;
  const input = record.querySelector("[data-experience-input]");
  const value = Number(input?.value);
  if (!Number.isInteger(value) || value < 0 || value > 9999) {
    setStatus("獲得経験点は0～9999の整数で入力してください。", "error");
    return;
  }

  button.disabled = true;
  button.textContent = "保存中";
  const { error } = await supabase
    .from("act_participants")
    .update({ earned_experience: value })
    .eq("id", record.dataset.participationId);

  if (error) {
    console.error(error);
    setStatus("獲得経験点を保存できませんでした。キャスト所有者だけが更新できます。", "error");
    button.disabled = false;
    button.textContent = "保存";
    return;
  }

  const row = participationRows.find(item => String(item.id) === record.dataset.participationId);
  if (row) row.earned_experience = value;
  renderHistory();
  setStatus("獲得経験点を保存しました。", "success");
}

function setStatus(message, state = "") {
  elements.status.textContent = message;
  elements.status.className = `act-history-message${state ? ` is-${state}` : ""}`;
}

function formatFullName(character) {
  const handle = String(character.handle ?? "").trim();
  return [handle ? `“${handle}”` : "", character.character_name].filter(Boolean).join(" ");
}

function formatDate(value) {
  if (!value) return "日時未登録";
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

function localeCompareJa(a, b) { return String(a ?? "").localeCompare(String(b ?? ""), "ja", { sensitivity: "base", numeric: true }); }
function escapeHtml(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function escapeAttribute(value) { return escapeHtml(value); }
