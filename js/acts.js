import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js?v=4";

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
const expandedCharacterIds = new Set();

initialize();

async function initialize() {
  currentUser = await requireAuth();
  if (!currentUser) return;
  bindEvents();
  await loadHistory();
}

function bindEvents() {
  elements.playerFilter?.addEventListener("change", () => {
    expandedCharacterIds.clear();
    syncCastOptions();
    renderHistory();
  });
  elements.castFilter?.addEventListener("change", () => {
    expandedCharacterIds.clear();
    renderHistory();
  });
  elements.reset?.addEventListener("click", () => {
    expandedCharacterIds.clear();
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
  const characterId = String(character.id);
  const recordsId = `act-records-${characterId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  const isExpanded = expandedCharacterIds.has(characterId);

  return `
    <section class="act-character-group${isExpanded ? " is-expanded" : ""}">
      <header class="act-character-group__header">
        <button class="act-character-toggle" type="button" data-toggle-character data-character-id="${escapeAttribute(characterId)}"
          aria-expanded="${isExpanded}" aria-controls="${escapeAttribute(recordsId)}">
          <span class="act-character-toggle__name">${escapeHtml(formatFullName(character))}</span>
          <span class="act-character-toggle__summary">${rows.length} RECORDS / ${totalExp} EXP</span>
          <span class="act-character-toggle__icon" aria-hidden="true">${isExpanded ? "−" : "＋"}</span>
        </button>
      </header>
      <div id="${escapeAttribute(recordsId)}" class="act-records"${isExpanded ? "" : " hidden"}>${rows.map(renderActRecord).join("")}</div>
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
        <div class="act-record__exp-actions">
          <button type="button" data-save-experience>保存</button>
          <button type="button" class="act-record__delete" data-delete-participation>履歴削除</button>
        </div>
      </div>
    </article>`;
}

async function handleHistoryClick(event) {
  const toggle = event.target.closest("[data-toggle-character]");
  if (toggle) {
    const characterId = String(toggle.dataset.characterId || "");
    if (!characterId) return;
    if (expandedCharacterIds.has(characterId)) expandedCharacterIds.delete(characterId);
    else expandedCharacterIds.add(characterId);
    renderHistory();
    return;
  }

  const deleteButton = event.target.closest("[data-delete-participation]");
  if (deleteButton) {
    await deleteParticipationHistory(deleteButton);
    return;
  }

  const button = event.target.closest("[data-save-experience]");
  const record = event.target.closest("[data-participation-id]");
  if (!button || !record) return;
  const input = record.querySelector("[data-experience-input]");
  const value = Number(input?.value);
  if (!Number.isInteger(value) || value < 0 || value > 9999) {
    setStatus("獲得経験点は0～9999の整数で入力してください。", "error");
    return;
  }

  setRecordButtonsDisabled(record, true);
  button.textContent = "保存中";
  const { error } = await supabase
    .from("act_participants")
    .update({ earned_experience: value })
    .eq("id", record.dataset.participationId);

  if (error) {
    console.error(error);
    setStatus("獲得経験点を保存できませんでした。キャスト所有者だけが更新できます。", "error");
    setRecordButtonsDisabled(record, false);
    button.textContent = "保存";
    return;
  }

  const row = participationRows.find(item => String(item.id) === record.dataset.participationId);
  if (row) row.earned_experience = value;
  renderHistory();
  setStatus("獲得経験点を保存しました。", "success");
}

async function deleteParticipationHistory(button) {
  const record = button.closest("[data-participation-id]");
  if (!record) return;

  const participationId = String(record.dataset.participationId || "");
  const row = participationRows.find(item => String(item.id) === participationId);
  if (!row) {
    setStatus("削除対象の参加アクト履歴を確認できませんでした。", "error");
    return;
  }

  const character = ownedCharacters.find(item => item.id === row.character_id);
  const characterName = formatFullName(character ?? { character_name: row.character_name });
  const actName = row.act?.act_name || row.act?.slug || "名称未登録アクト";
  const experience = Number(row.earned_experience || 0);
  const confirmed = window.confirm(
    `「${characterName}」の参加履歴から「${actName}」を削除します。\n` +
    `この記録の獲得経験点 ${experience} EXP も集計から削除されます。\n\nこの操作は元に戻せません。`
  );
  if (!confirmed) return;

  setRecordButtonsDisabled(record, true);
  button.textContent = "削除中";
  setStatus("参加アクト履歴を削除中…");

  const { data, error } = await supabase.rpc("delete_owned_act_participation", {
    p_participation_id: Number(participationId)
  });

  if (error || data !== true) {
    console.error(error);
    const message = /delete_owned_act_participation|schema cache|function.*does not exist/i.test(String(error?.message ?? ""))
      ? "履歴削除機能が未設定です。Supabaseで supabase/16_delete_owned_act_history.sql を実行してください。"
      : "参加アクト履歴を削除できませんでした。キャスト所有者だけが削除できます。";
    setStatus(message, "error");
    setRecordButtonsDisabled(record, false);
    button.textContent = "履歴削除";
    return;
  }

  participationRows = participationRows.filter(item => String(item.id) !== participationId);
  if (!participationRows.some(item => item.character_id === row.character_id)) {
    expandedCharacterIds.delete(String(row.character_id));
  }
  renderHistory();
  setStatus(`「${actName}」を「${characterName}」の参加履歴から削除しました。`, "success");
}

function setRecordButtonsDisabled(record, disabled) {
  record.querySelectorAll("button").forEach(button => { button.disabled = disabled; });
}

function setStatus(message, state = "") {
  elements.status.textContent = message;
  elements.status.className = `act-history-message${state ? ` is-${state}` : ""}`;
}

function formatFullName(character) {
  const handle = String(character?.handle ?? "").trim();
  return [handle ? `“${handle}”` : "", character?.character_name].filter(Boolean).join(" ");
}

function formatDate(value) {
  if (!value) return "日時未登録";
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

function localeCompareJa(a, b) { return String(a ?? "").localeCompare(String(b ?? ""), "ja", { sensitivity: "base", numeric: true }); }
function escapeHtml(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function escapeAttribute(value) { return escapeHtml(value); }
