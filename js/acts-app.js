import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js?v=4";
import { withRequestTimeout } from "./async-timeout.js?v=1";

const el = {
  status: document.querySelector("#history-status"),
  player: document.querySelector("#history-player-filter"),
  cast: document.querySelector("#history-cast-filter"),
  year: document.querySelector("#history-year-filter"),
  query: document.querySelector("#history-query-filter"),
  role: document.querySelector("#history-role-filter"),
  sort: document.querySelector("#history-sort-filter"),
  reset: document.querySelector("#history-reset"),
  filterStatus: document.querySelector("#history-filter-status"),
  actList: document.querySelector("#act-history-list"),
  actCount: document.querySelector("#history-act-count"),
  earned: document.querySelector("#history-exp-total"),
  spent: document.querySelector("#history-spent-total"),
  balance: document.querySelector("#history-balance-total"),
  castCount: document.querySelector("#history-cast-count"),
  spendingForm: document.querySelector("#experience-spending-form"),
  spendingCharacter: document.querySelector("#spending-character"),
  spendingAmount: document.querySelector("#spending-amount"),
  spendingDate: document.querySelector("#spending-date"),
  spendingDescription: document.querySelector("#spending-description"),
  spendingStatus: document.querySelector("#spending-status"),
  spendingList: document.querySelector("#experience-spending-list")
};

const state = {
  user: null,
  characters: [],
  participations: [],
  spending: [],
  openRecords: new Set(),
  openYears: new Set(),
  busy: false
};

init();

async function init() {
  state.user = await requireAuth();
  if (!state.user || !el.actList || !el.spendingForm || !el.spendingList) return;
  bindEvents();
  el.spendingDate.value = localDate(new Date());
  await loadAll();
}

function bindEvents() {
  [el.player, el.cast, el.year, el.role, el.sort].forEach(node => node?.addEventListener("change", onFilterChange));
  el.query?.addEventListener("input", renderAll);
  el.reset?.addEventListener("click", resetFilters);
  el.actList.addEventListener("click", onActListClick);
  el.spendingList.addEventListener("click", onSpendingListClick);
  el.spendingForm.addEventListener("submit", addSpending);
}

async function loadAll() {
  setHistoryStatus("登録キャストとアクト履歴を読み込み中…");
  setSpendingStatus("経験点消費履歴を読み込み中…");

  let characterResult;
  try {
    characterResult = await withRequestTimeout(
      supabase.from("characters")
        .select("id, public_id, player_name, character_name, handle")
        .eq("owner_id", state.user.id)
        .order("player_name", { ascending: true })
        .order("character_name", { ascending: true }),
      "キャスト情報の取得がタイムアウトしました。"
    );
  } catch (error) {
    return failLoad("キャスト情報を取得できませんでした。再読み込みしてください。", error);
  }

  const { data: chars, error: charError } = characterResult;
  if (charError) return failLoad("キャスト情報を取得できませんでした。", charError);
  state.characters = chars ?? [];
  populateStaticFilters();
  applyQueryParams();
  populateCastOptions();
  populateSpendingCharacterOptions();

  if (!state.characters.length) {
    state.participations = [];
    state.spending = [];
    renderAll();
    setHistoryStatus("登録キャストがありません。");
    setSpendingStatus("登録キャストがありません。");
    return;
  }

  const ids = state.characters.map(c => c.id);
  let partsResult;
  let spendingResult;
  try {
    [partsResult, spendingResult] = await Promise.all([
      withRequestTimeout(
        supabase.from("act_participants").select(`
          id, character_id, character_public_id, character_name, player_name,
          cast_order, earned_experience, participation_role, updated_at,
          act:acts!inner(id, slug, act_name, ruler_name, public_url, published_at, updated_at)
        `).in("character_id", ids),
        "参加アクト情報の取得がタイムアウトしました。"
      ),
      withRequestTimeout(
        supabase.from("character_experience_spending")
          .select("id, character_id, amount, description, spent_on, created_at")
          .in("character_id", ids)
          .order("spent_on", { ascending: false })
          .order("id", { ascending: false }),
        "経験点消費履歴の取得がタイムアウトしました。"
      )
    ]);
  } catch (error) {
    return failLoad("参加アクト・経験点履歴を取得できませんでした。再読み込みしてください。", error);
  }

  if (partsResult.error) return failLoad("参加アクト情報を取得できませんでした。", partsResult.error);
  if (spendingResult.error) {
    console.error(spendingResult.error);
    setSpendingStatus("経験点消費履歴を取得できませんでした。", "error");
    state.spending = [];
  } else {
    state.spending = spendingResult.data ?? [];
  }

  state.participations = (partsResult.data ?? []).map(row => ({ ...row, act: row.act ?? {} }));
  populateDerivedFilters();
  renderAll();
  setHistoryStatus(`${state.participations.length}件のキャスト参加記録を読み込みました。`, "success");
  if (!spendingResult.error) setSpendingStatus(`${state.spending.length}件の経験点消費記録を読み込みました。`, "success");
}

function failLoad(message, error) {
  console.error(error);
  setHistoryStatus(message, "error");
  setSpendingStatus(message, "error");
  el.actList.innerHTML = `<p class="act-history-empty">${escapeHtml(message)}</p>`;
  el.spendingList.innerHTML = `<p class="experience-spending-empty">${escapeHtml(message)}</p>`;
}

function onFilterChange(event) {
  if (event.currentTarget === el.player) populateCastOptions();
  renderAll();
}

function resetFilters() {
  [el.player, el.cast, el.year, el.query, el.role].forEach(node => { if (node) node.value = ""; });
  if (el.sort) el.sort.value = "desc";
  state.openRecords.clear();
  state.openYears.clear();
  populateCastOptions();
  history.replaceState(null, "", "./acts.html");
  renderAll();
}

function populateStaticFilters() {
  const players = [...new Set(state.characters.map(c => displayPlayer(c)))].sort(compareJa);
  setOptions(el.player, "すべてのプレイヤー", players.map(v => [v, v]));
}

function populateDerivedFilters() {
  const years = [...new Set(state.participations.map(r => historyYear(r)).filter(Boolean))].sort((a,b) => Number(b)-Number(a));
  setOptions(el.year, "すべての年", years.map(v => [v, `${v}年`]));
  const roles = [...new Set(state.participations.map(r => clean(r.participation_role)).filter(Boolean))].sort(compareJa);
  setOptions(el.role, "すべての参加枠", roles.map(v => [v, v]));
}

function populateCastOptions() {
  const previous = el.cast?.value || "";
  const player = el.player?.value || "";
  const chars = state.characters.filter(c => !player || displayPlayer(c) === player);
  setOptions(el.cast, "すべてのキャスト", chars.map(c => [c.public_id, fullName(c)]));
  if (chars.some(c => c.public_id === previous)) el.cast.value = previous;
}

function populateSpendingCharacterOptions() {
  if (!el.spendingCharacter) return;
  const chars = selectedCharacters();
  const candidates = chars.length ? chars : state.characters;
  const previous = String(el.spendingCharacter.value || "");
  el.spendingCharacter.innerHTML = candidates.length
    ? candidates.map(c => `<option value="${escapeAttr(c.id)}">${escapeHtml(fullName(c))}</option>`).join("")
    : `<option value="">登録キャストなし</option>`;
  if (candidates.some(c => String(c.id) === previous)) el.spendingCharacter.value = previous;
  const submit = el.spendingForm.querySelector("button[type='submit']");
  if (submit) submit.disabled = !candidates.length || state.busy;
}

function applyQueryParams() {
  const params = new URLSearchParams(location.search);
  const publicId = clean(params.get("character"));
  const player = clean(params.get("player"));
  if (player && [...el.player.options].some(o => o.value === player)) el.player.value = player;
  if (publicId) {
    const character = state.characters.find(c => c.public_id === publicId);
    if (character) {
      el.player.value = displayPlayer(character);
      populateCastOptions();
      el.cast.value = character.public_id;
    }
  }
}

function selectedCharacters() {
  const player = el.player?.value || "";
  const publicId = el.cast?.value || "";
  return state.characters.filter(c => (!player || displayPlayer(c) === player) && (!publicId || c.public_id === publicId));
}

function filteredParticipations() {
  const allowed = new Set(selectedCharacters().map(c => String(c.id)));
  const year = el.year?.value || "";
  const query = clean(el.query?.value).toLocaleLowerCase("ja");
  const role = el.role?.value || "";
  const direction = el.sort?.value === "asc" ? 1 : -1;
  return state.participations
    .filter(row => allowed.has(String(row.character_id)))
    .filter(row => !year || historyYear(row) === year)
    .filter(row => !query || actTitle(row).toLocaleLowerCase("ja").includes(query))
    .filter(row => !role || clean(row.participation_role) === role)
    .sort((a,b) => String(historyDate(a)).localeCompare(String(historyDate(b))) * direction);
}

function filteredSpending() {
  const allowed = new Set(selectedCharacters().map(c => String(c.id)));
  return state.spending.filter(row => allowed.has(String(row.character_id)));
}

function renderAll() {
  populateSpendingCharacterOptions();
  renderHistory();
  renderSpending();
  renderSummary();
}

function renderHistory() {
  const rows = filteredParticipations();
  if (!rows.length) {
    el.actList.innerHTML = `<p class="act-history-empty">条件に一致する参加アクトはありません。</p>`;
    setText(el.filterStatus, "0 RECORDS / 0 EXP / 0 CASTS");
    return;
  }

  const groups = new Map();
  for (const row of rows) {
    const year = historyYear(row) || "不明";
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year).push(row);
  }
  const years = [...groups.keys()].sort((a,b) => (Number(b)||-1) - (Number(a)||-1));
  const latest = years[0];
  el.actList.innerHTML = `<div class="act-records act-records--flat">${years.map(year => renderYearGroup(year, groups.get(year), year === latest)).join("")}</div>`;

  const exp = rows.reduce((sum,r) => sum + Number(r.earned_experience || 0), 0);
  const casts = new Set(rows.map(r => String(r.character_id)));
  setText(el.filterStatus, `${rows.length} RECORDS / ${exp} EXP / ${casts.size} CASTS`);
}

function renderYearGroup(year, rows, defaultOpen) {
  const key = String(year);
  const open = state.openYears.has(key) || (!state.openYears.has(`!${key}`) && defaultOpen);
  return `<section class="act-year-group${open ? " is-expanded" : ""}" data-year="${escapeAttr(key)}">
    <button type="button" class="act-year-toggle" data-action="toggle-year" data-year-key="${escapeAttr(key)}" aria-expanded="${open}">
      <span><strong>${escapeHtml(year)}</strong><small>YEAR ARCHIVE</small></span><span>${rows.length} RECORDS</span><span aria-hidden="true">${open ? "−" : "＋"}</span>
    </button>
    <div class="act-year-records"${open ? "" : " hidden"}>${rows.map(renderActRecord).join("")}</div>
  </section>`;
}

function renderActRecord(row) {
  const character = state.characters.find(c => String(c.id) === String(row.character_id));
  const pid = String(row.id);
  const open = state.openRecords.has(pid);
  const title = actTitle(row);
  const date = historyDate(row);
  const role = clean(row.participation_role) || "—";
  const castName = character ? fullName(character) : (row.character_name || "削除済みキャスト");
  const ruler = clean(row.act?.ruler_name) || "—";
  const titleHtml = row.act?.public_url
    ? `<a class="act-record__showcase-link" href="${escapeAttr(row.act.public_url)}" target="_blank" rel="noopener">${escapeHtml(title)}</a>`
    : escapeHtml(title);
  return `<section class="act-character-group act-character-group--flat" data-character-id="${escapeAttr(row.character_id)}">
    <article class="act-record${open ? " is-detail-open" : ""}${row.act?.public_url ? " has-showcase-link" : ""}" data-participation-id="${escapeAttr(pid)}" data-history-cast="${escapeAttr(castName)}">
      <button type="button" class="act-record-summary" data-action="toggle-detail" aria-expanded="${open}">
        <span class="act-record-summary__date">${escapeHtml(date)}</span>
        <span class="act-record-summary__title">${escapeHtml(title)}</span>
        <span class="act-record-summary__cast">${escapeHtml(castName)}</span>
        <span class="act-record-summary__role">${escapeHtml(role)}</span>
        <span class="act-record-summary__exp">+${Number(row.earned_experience || 0)} EXP</span>
        <span class="act-record-summary__icon" aria-hidden="true">${open ? "−" : "＋"}</span>
      </button>
      <div class="act-record__main"><p class="act-record__title">${titleHtml}</p><p class="act-record__meta">${escapeHtml(date)} / CAST ${String(row.cast_order || 1).padStart(2,"0")}</p></div>
      <div class="act-record__role" data-participation-role><small>参加枠 / HANDOUT ROLE</small><strong>${escapeHtml(role)}</strong></div>
      <p class="act-record__ruler">${escapeHtml(ruler)}</p>
      <div class="act-record__facts">
        ${fact("act-record__fact--date", "参加日時 DATE", date)}
        ${fact("act-record__fact--cast", "ハンドアウト CAST No.", `CAST ${String(row.cast_order || 1).padStart(2,"0")}`)}
        ${fact("act-record__fact--style", "スタイル ASSIGN STYLE", role)}
        ${fact("act-record__fact--ruler", "ルーラー RULER", ruler)}
      </div>
      <div class="act-record__exp">
        <label>獲得経験点 <small>EXPERIENCE</small><input data-experience-input type="number" min="0" max="9999" step="1" value="${escapeAttr(row.earned_experience || 0)}"></label>
        <div class="act-record__exp-actions">
          <button type="button" class="act-record__ticket" data-issue-ticket><span>経験点チケット</span><small>ISSUE TICKET</small></button>
          <button type="button" data-action="save-experience">保存</button>
          <button type="button" class="act-record__delete" data-action="delete-participation">履歴削除</button>
        </div>
      </div>
    </article>
  </section>`;
}

function fact(className, label, value) {
  return `<p class="act-record__fact ${className}"><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></p>`;
}

function renderSpending() {
  const rows = filteredSpending();
  const byId = new Map(state.characters.map(c => [String(c.id), c]));
  if (!rows.length) {
    el.spendingList.innerHTML = `<p class="experience-spending-empty">条件に一致する経験点消費履歴はありません。</p>`;
    return;
  }
  el.spendingList.innerHTML = rows.map(row => {
    const c = byId.get(String(row.character_id));
    return `<article class="experience-spending-record" data-spending-id="${escapeAttr(row.id)}">
      <p class="experience-spending-record__date"><small>DATE</small><strong>${escapeHtml(formatDate(row.spent_on))}</strong></p>
      <p class="experience-spending-record__cast"><small>CAST</small><strong>${escapeHtml(c ? fullName(c) : "削除済みキャスト")}</strong></p>
      <p class="experience-spending-record__amount"><small>SPENT EXP</small><strong>－${Number(row.amount || 0)} EXP</strong></p>
      <p class="experience-spending-record__description"><small>DESCRIPTION</small><strong>${escapeHtml(row.description || "用途未記入")}</strong></p>
      <button type="button" class="experience-spending-record__delete" data-action="delete-spending">削除</button>
    </article>`;
  }).join("");
}

function renderSummary() {
  const parts = filteredParticipations();
  const spending = filteredSpending();
  const earned = parts.reduce((sum,r) => sum + Number(r.earned_experience || 0), 0);
  const spent = spending.reduce((sum,r) => sum + Number(r.amount || 0), 0);
  setText(el.actCount, new Set(parts.map(r => r.act?.id).filter(Boolean)).size);
  setText(el.earned, earned);
  setText(el.spent, spent);
  setText(el.balance, earned - spent);
  setText(el.castCount, selectedCharacters().length);
}

async function onActListClick(event) {
  const target = elementTarget(event.target);
  const actionNode = target?.closest("[data-action]");
  if (!actionNode || state.busy) return;
  const action = actionNode.dataset.action;
  const record = actionNode.closest("[data-participation-id]");
  const pid = String(record?.dataset.participationId || "");
  if (action === "toggle-year") return toggleYear(actionNode.dataset.yearKey);
  if (!record || !pid) return;
  if (action === "toggle-detail") return toggleRecord(pid);
  if (action === "save-experience") return saveExperience(record, actionNode);
  if (action === "delete-participation") return deleteParticipation(pid);
}

function toggleYear(key) {
  key = String(key || "");
  if (!key) return;
  const open = state.openYears.has(key);
  if (open) { state.openYears.delete(key); state.openYears.add(`!${key}`); }
  else { state.openYears.delete(`!${key}`); state.openYears.add(key); }
  renderHistory();
}

function toggleRecord(pid) {
  state.openRecords.has(pid) ? state.openRecords.delete(pid) : state.openRecords.add(pid);
  renderHistory();
}

async function runBusyAction(task) {
  setBusy(true);
  try {
    return await task();
  } finally {
    setBusy(false);
  }
}

async function saveExperience(record, button) {
  const pid = String(record.dataset.participationId || "");
  const row = state.participations.find(r => String(r.id) === pid);
  const character = row && state.characters.find(c => String(c.id) === String(row.character_id));
  const value = Number(record.querySelector("[data-experience-input]")?.value);
  if (!row || !character || !Number.isInteger(value) || value < 0 || value > 9999) {
    setHistoryStatus("獲得経験点は0～9999の整数で入力してください。", "error");
    return;
  }

  await runBusyAction(async () => {
    button.textContent = "保存中";
    try {
      const { data, error } = await withRequestTimeout(
        supabase.from("act_participants")
          .update({ earned_experience: value })
          .eq("id", row.id).eq("character_id", character.id)
          .select("id, earned_experience").single(),
        "獲得経験点の保存がタイムアウトしました。"
      );
      if (error || String(data?.id ?? "") !== pid) {
        console.error(error);
        setHistoryStatus("獲得経験点を保存できませんでした。", "error");
        renderHistory();
        return;
      }
      row.earned_experience = Number(data.earned_experience || 0);
      renderAll();
      setHistoryStatus("獲得経験点を保存しました。", "success");
    } catch (error) {
      console.error(error);
      setHistoryStatus("獲得経験点の保存結果を確認できませんでした。再読み込みして状態を確認してください。", "error");
      renderHistory();
    }
  });
}

async function deleteParticipation(pid) {
  const row = state.participations.find(r => String(r.id) === pid);
  const character = row && state.characters.find(c => String(c.id) === String(row.character_id));
  if (!row || !character) return setHistoryStatus("削除対象の参加履歴を確認できませんでした。", "error");
  const ok = await confirmAction({
    title: "参加アクト履歴を削除",
    lines: [["キャスト", fullName(character)], ["アクト", actTitle(row)], ["獲得経験点", `${Number(row.earned_experience || 0)} EXP`]],
    warning: "この操作は元に戻せません。"
  });
  if (!ok) return;

  await runBusyAction(async () => {
    setHistoryStatus("参加アクト履歴を削除中…");
    try {
      const { data, error } = await withRequestTimeout(
        supabase.from("act_participants").delete()
          .eq("id", row.id).eq("character_id", character.id).select("id").single(),
        "参加アクト履歴の削除がタイムアウトしました。"
      );
      if (error || String(data?.id ?? "") !== pid) {
        console.error(error);
        setHistoryStatus("参加アクト履歴を削除できませんでした。", "error");
        return;
      }
      state.participations = state.participations.filter(r => String(r.id) !== pid);
      state.openRecords.delete(pid);
      populateDerivedFilters();
      renderAll();
      setHistoryStatus("参加アクト履歴を削除しました。", "success");
    } catch (error) {
      console.error(error);
      setHistoryStatus("参加アクト履歴の削除結果を確認できませんでした。再読み込みして状態を確認してください。", "error");
    }
  });
}

async function addSpending(event) {
  event.preventDefault();
  if (state.busy) return;
  const characterId = String(el.spendingCharacter.value || "");
  const character = state.characters.find(c => String(c.id) === characterId);
  const amount = Number(el.spendingAmount.value);
  const spentOn = el.spendingDate.value;
  const description = clean(el.spendingDescription.value);
  if (!character) return setSpendingStatus("自分が所有するキャストを選択してください。", "error");
  if (!Number.isInteger(amount) || amount < 1 || amount > 9999) return setSpendingStatus("消費経験点は1～9999の整数で入力してください。", "error");
  if (!spentOn) return setSpendingStatus("消費日を入力してください。", "error");

  await runBusyAction(async () => {
    setSpendingStatus("経験点消費履歴を追加中…");
    try {
      const { data, error } = await withRequestTimeout(
        supabase.from("character_experience_spending").insert({
          character_id: character.id, amount, description, spent_on: spentOn, created_by: state.user.id
        }).select("id, character_id, amount, description, spent_on, created_at").single(),
        "経験点消費履歴の追加がタイムアウトしました。"
      );
      if (error) {
        console.error(error);
        setSpendingStatus("経験点消費履歴を追加できませんでした。", "error");
        return;
      }
      state.spending.unshift(data);
      el.spendingAmount.value = "";
      el.spendingDescription.value = "";
      renderAll();
      setSpendingStatus("経験点消費履歴を追加しました。", "success");
    } catch (error) {
      console.error(error);
      setSpendingStatus("経験点消費履歴の追加結果を確認できませんでした。再読み込みして状態を確認してください。", "error");
    }
  });
}

async function onSpendingListClick(event) {
  const target = elementTarget(event.target);
  const button = target?.closest('[data-action="delete-spending"]');
  if (!button || state.busy) return;
  const record = button.closest("[data-spending-id]");
  const id = String(record?.dataset.spendingId || "");
  const row = state.spending.find(r => String(r.id) === id);
  const character = row && state.characters.find(c => String(c.id) === String(row.character_id));
  if (!row || !character) return setSpendingStatus("削除対象を確認できませんでした。", "error");
  const ok = await confirmAction({ title: "経験点消費履歴を削除", lines: [["キャスト", fullName(character)], ["消費日", formatDate(row.spent_on)], ["消費経験点", `${Number(row.amount || 0)} EXP`], ["用途", row.description || "用途未記入"]], warning: "この操作は元に戻せません。" });
  if (!ok) return;

  await runBusyAction(async () => {
    setSpendingStatus("経験点消費履歴を削除中…");
    try {
      const { data, error } = await withRequestTimeout(
        supabase.from("character_experience_spending").delete()
          .eq("id", row.id).eq("character_id", character.id).select("id").single(),
        "経験点消費履歴の削除がタイムアウトしました。"
      );
      if (error || String(data?.id ?? "") !== id) {
        console.error(error);
        setSpendingStatus("経験点消費履歴を削除できませんでした。", "error");
        return;
      }
      state.spending = state.spending.filter(r => String(r.id) !== id);
      renderAll();
      setSpendingStatus("経験点消費履歴を削除しました。", "success");
    } catch (error) {
      console.error(error);
      setSpendingStatus("経験点消費履歴の削除結果を確認できませんでした。再読み込みして状態を確認してください。", "error");
    }
  });
}

function setBusy(value) {
  state.busy = value;
  document.body.classList.toggle("is-act-management-busy", value);
  document.querySelectorAll("#act-history-list button, #experience-spending-form button, #experience-spending-list button").forEach(button => { button.disabled = value; });
  populateSpendingCharacterOptions();
}

function confirmAction({ title, lines, warning }) {
  return new Promise(resolve => {
    document.querySelector("[data-act-confirm]")?.remove();
    const overlay = document.createElement("div");
    overlay.className = "experience-spending-confirm";
    overlay.dataset.actConfirm = "";
    overlay.innerHTML = `<div class="experience-spending-confirm__panel" role="dialog" aria-modal="true" aria-labelledby="act-confirm-title">
      <p class="experience-spending-confirm__eyebrow">CONFIRM ACTION</p><h2 id="act-confirm-title">${escapeHtml(title)}</h2>
      <dl class="experience-spending-confirm__details">${lines.map(([k,v]) => `<div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`).join("")}</dl>
      <p class="experience-spending-confirm__warning">${escapeHtml(warning)}</p>
      <div class="experience-spending-confirm__actions"><button type="button" data-confirm-cancel>キャンセル</button><button type="button" class="danger" data-confirm-ok>実行する</button></div>
    </div>`;
    const finish = result => { overlay.remove(); document.removeEventListener("keydown", onKey); resolve(result); };
    const onKey = e => { if (e.key === "Escape") finish(false); };
    overlay.addEventListener("click", e => {
      const t = elementTarget(e.target);
      if (t === overlay || t?.closest("[data-confirm-cancel]")) finish(false);
      else if (t?.closest("[data-confirm-ok]")) finish(true);
    });
    document.addEventListener("keydown", onKey);
    document.body.append(overlay);
    overlay.querySelector("[data-confirm-ok]")?.focus();
  });
}

function actTitle(row) { return clean(row.act?.act_name || row.act?.slug) || "名称未登録アクト"; }
function historyDate(row) { return formatDate(row.act?.published_at); }
function historyYear(row) { return historyDate(row).match(/^(\d{4})\//)?.[1] || "不明"; }
function displayPlayer(c) { return clean(c.player_name) || "プレイヤー未登録"; }
function fullName(c) {
  const formatter = window.TNXHandleFormat?.formatIdentity;
  if (typeof formatter === "function") return formatter(c?.handle, c?.character_name);
  const handle = clean(c?.handle).replace(/^[“”"「『]+|[“”"」』]+$/g, "");
  return [handle ? `“${handle}”` : "", clean(c?.character_name)].filter(Boolean).join(" ");
}
function formatDate(value) {
  if (!value) return "日時未登録";
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}/${m[2]}/${m[3]}` : new Intl.DateTimeFormat("ja-JP").format(new Date(value));
}
function localDate(date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`; }
function setOptions(select, firstLabel, pairs) { if (select) select.innerHTML = `<option value="">${escapeHtml(firstLabel)}</option>${pairs.map(([v,l]) => `<option value="${escapeAttr(v)}">${escapeHtml(l)}</option>`).join("")}`; }
function setHistoryStatus(message, stateName="") { setStatus(el.status, message, "", stateName); }
function setSpendingStatus(message, stateName="") { setStatus(el.spendingStatus, message, "experience-spending-status", stateName); }
function setStatus(node, message, base, stateName) { if (!node) return; node.textContent = message; if (base) node.className = `${base}${stateName ? ` is-${stateName}` : ""}`; }
function setText(node, value) { if (node) node.textContent = String(value); }
function elementTarget(target) { return target instanceof Element ? target : target?.parentElement ?? null; }
function clean(value) { return String(value ?? "").replace(/\s+/g, " ").trim(); }
function compareJa(a,b) { return String(a).localeCompare(String(b), "ja", { sensitivity:"base", numeric:true }); }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[c]); }
function escapeAttr(value) { return escapeHtml(value); }