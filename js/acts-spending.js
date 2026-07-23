import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js";

const elements = {
  playerFilter: document.querySelector("#history-player-filter"),
  castFilter: document.querySelector("#history-cast-filter"),
  reset: document.querySelector("#history-reset"),
  actList: document.querySelector("#act-history-list"),
  earnedTotal: document.querySelector("#history-exp-total"),
  spentTotal: document.querySelector("#history-spent-total"),
  balanceTotal: document.querySelector("#history-balance-total"),
  form: document.querySelector("#experience-spending-form"),
  character: document.querySelector("#spending-character"),
  amount: document.querySelector("#spending-amount"),
  date: document.querySelector("#spending-date"),
  description: document.querySelector("#spending-description"),
  status: document.querySelector("#spending-status"),
  list: document.querySelector("#experience-spending-list")
};

let currentUser = null;
let ownedCharacters = [];
let spendingRows = [];
let renderScheduled = false;

initialize();

async function initialize() {
  currentUser = await requireAuth();
  if (!currentUser || !elements.form) return;

  elements.date.value = formatLocalDate(new Date());
  elements.form.addEventListener("submit", addSpendingRecord);
  elements.list.addEventListener("click", deleteSpendingRecord);
  elements.playerFilter?.addEventListener("change", scheduleRender);
  elements.castFilter?.addEventListener("change", scheduleRender);
  elements.reset?.addEventListener("click", scheduleRender);

  if (elements.earnedTotal) {
    new MutationObserver(updateExperienceSummary)
      .observe(elements.earnedTotal, { childList: true, characterData: true, subtree: true });
  }
  if (elements.actList) {
    new MutationObserver(scheduleRender)
      .observe(elements.actList, { childList: true, subtree: true });
  }

  await loadData();
}

async function loadData() {
  setStatus("経験点消費履歴を読み込み中…");

  const { data: characters, error: characterError } = await supabase
    .from("characters")
    .select("id, public_id, player_name, character_name, handle")
    .eq("owner_id", currentUser.id)
    .order("player_name", { ascending: true })
    .order("character_name", { ascending: true });

  if (characterError) {
    console.error(characterError);
    setStatus("キャスト情報を取得できませんでした。", "error");
    return;
  }

  ownedCharacters = characters ?? [];

  if (!ownedCharacters.length) {
    spendingRows = [];
    populateCharacterOptions();
    renderSpendingHistory();
    setStatus("登録キャストがありません。");
    return;
  }

  const { data, error } = await supabase
    .from("character_experience_spending")
    .select("id, character_id, amount, description, spent_on, created_at")
    .in("character_id", ownedCharacters.map(character => character.id))
    .order("spent_on", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    console.error(error);
    const hint = /character_experience_spending/i.test(String(error.message ?? ""))
      ? " Supabaseでsupabase/09_experience_spending.sqlを実行してください。"
      : "";
    setStatus(`経験点消費履歴を取得できませんでした。${hint}`, "error");
    elements.list.innerHTML = `<p class="experience-spending-empty">経験点消費履歴を取得できませんでした。</p>`;
    populateCharacterOptions();
    updateExperienceSummary();
    return;
  }

  spendingRows = data ?? [];
  populateCharacterOptions();
  renderSpendingHistory();
  setStatus(`${spendingRows.length}件の経験点消費記録を読み込みました。`, "success");
}

function scheduleRender() {
  if (renderScheduled) return;
  renderScheduled = true;
  window.setTimeout(() => {
    renderScheduled = false;
    populateCharacterOptions();
    renderSpendingHistory();
  }, 0);
}

function getFilteredCharacters() {
  const player = elements.playerFilter?.value ?? "";
  const publicId = elements.castFilter?.value ?? "";
  return ownedCharacters.filter(character =>
    (!player || displayPlayer(character) === player) &&
    (!publicId || character.public_id === publicId)
  );
}

function getFilteredSpendingRows() {
  const allowedIds = new Set(getFilteredCharacters().map(character => character.id));
  return spendingRows.filter(row => allowedIds.has(row.character_id));
}

function populateCharacterOptions() {
  const previous = elements.character.value;
  const filtered = getFilteredCharacters();
  const candidates = filtered.length ? filtered : ownedCharacters;

  elements.character.innerHTML = candidates.length
    ? candidates.map(character => `<option value="${escapeAttribute(character.id)}">${escapeHtml(`${formatFullName(character)} / ${displayPlayer(character)}`)}</option>`).join("")
    : `<option value="">登録キャストなし</option>`;

  const selectedCast = elements.castFilter?.value ?? "";
  const selectedCharacter = candidates.find(character => character.public_id === selectedCast)
    ?? candidates.find(character => character.id === previous)
    ?? candidates[0];

  if (selectedCharacter) elements.character.value = selectedCharacter.id;
  elements.form.querySelector("button[type='submit']").disabled = !candidates.length;
}

function renderSpendingHistory() {
  const rows = getFilteredSpendingRows();
  const charactersById = new Map(ownedCharacters.map(character => [character.id, character]));

  if (!rows.length) {
    elements.list.innerHTML = `<p class="experience-spending-empty">条件に一致する経験点消費履歴はありません。</p>`;
    updateExperienceSummary();
    return;
  }

  elements.list.innerHTML = rows.map(row => {
    const character = charactersById.get(row.character_id);
    return `
      <article class="experience-spending-record" data-spending-id="${escapeAttribute(row.id)}">
        <p class="experience-spending-record__date">${escapeHtml(formatDate(row.spent_on))}</p>
        <p class="experience-spending-record__cast"><strong>${escapeHtml(character ? formatFullName(character) : "削除済みキャスト")}</strong><small>${escapeHtml(character ? displayPlayer(character) : "PLAYER UNKNOWN")}</small></p>
        <p class="experience-spending-record__description">${escapeHtml(row.description || "用途未記入")}</p>
        <p class="experience-spending-record__amount">－${escapeHtml(row.amount)} EXP</p>
        <button type="button" data-delete-spending>削除</button>
      </article>`;
  }).join("");

  updateExperienceSummary();
}

function updateExperienceSummary() {
  const earned = Number(String(elements.earnedTotal?.textContent ?? "0").replace(/[^0-9-]/g, "")) || 0;
  const spent = getFilteredSpendingRows().reduce((sum, row) => sum + Number(row.amount || 0), 0);
  if (elements.spentTotal) elements.spentTotal.textContent = String(spent);
  if (elements.balanceTotal) elements.balanceTotal.textContent = String(earned - spent);
}

async function addSpendingRecord(event) {
  event.preventDefault();
  const characterId = elements.character.value;
  const amount = Number(elements.amount.value);
  const spentOn = elements.date.value;
  const description = elements.description.value.trim();

  if (!ownedCharacters.some(character => character.id === characterId)) {
    setStatus("消費経験点を登録するキャストを選択してください。", "error");
    return;
  }
  if (!Number.isInteger(amount) || amount < 1 || amount > 9999) {
    setStatus("消費経験点は1～9999の整数で入力してください。", "error");
    return;
  }
  if (!spentOn) {
    setStatus("消費日を入力してください。", "error");
    return;
  }

  const button = elements.form.querySelector("button[type='submit']");
  button.disabled = true;
  button.textContent = "追加中";

  const { data, error } = await supabase
    .from("character_experience_spending")
    .insert({
      character_id: characterId,
      amount,
      description,
      spent_on: spentOn,
      created_by: currentUser.id
    })
    .select("id, character_id, amount, description, spent_on, created_at")
    .single();

  button.disabled = false;
  button.textContent = "消費履歴を追加";

  if (error) {
    console.error(error);
    setStatus("経験点消費履歴を追加できませんでした。", "error");
    return;
  }

  spendingRows.unshift(data);
  elements.amount.value = "";
  elements.description.value = "";
  renderSpendingHistory();
  setStatus("経験点消費履歴を追加しました。", "success");
}

async function deleteSpendingRecord(event) {
  const button = event.target.closest("[data-delete-spending]");
  const record = event.target.closest("[data-spending-id]");
  if (!button || !record) return;
  if (!window.confirm("この経験点消費履歴を削除します。")) return;

  button.disabled = true;
  const { error } = await supabase
    .from("character_experience_spending")
    .delete()
    .eq("id", record.dataset.spendingId);

  if (error) {
    console.error(error);
    button.disabled = false;
    setStatus("経験点消費履歴を削除できませんでした。", "error");
    return;
  }

  spendingRows = spendingRows.filter(row => String(row.id) !== record.dataset.spendingId);
  renderSpendingHistory();
  setStatus("経験点消費履歴を削除しました。", "success");
}

function displayPlayer(character) {
  return character.player_name || "プレイヤー未登録";
}

function formatFullName(character) {
  const handle = String(character.handle ?? "").trim();
  return [handle ? `“${handle}”` : "", character.character_name].filter(Boolean).join(" ");
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
}

function setStatus(message, state = "") {
  elements.status.textContent = message;
  elements.status.className = `experience-spending-status${state ? ` is-${state}` : ""}`;
}

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
