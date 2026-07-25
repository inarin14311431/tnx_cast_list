import { supabase } from "./supabase-client.js";

const MAX_CASTS = 6;
const publicGrid = document.querySelector("#public-cast-grid");
const selectedCasts = document.querySelector("#selected-casts");
const historyButton = document.querySelector("#history-button");
const publishSlug = document.querySelector("#publish-slug");
const actName = document.querySelector("#act-name");
const rulerName = document.querySelector("#ruler-name");
const status = document.querySelector("#generator-status");
const privateGrid = document.querySelector("#owned-private-cast-grid");
const privateStatus = document.querySelector("#private-library-status");
const privateSelectedCount = document.querySelector("#private-selected-count");

let privateCharacters = [];
let selectedPrivateIds = [];
let registering = false;
let annotationQueued = false;

initialize();

async function initialize() {
  historyButton?.addEventListener("click", registerHistoryOnly);
  privateGrid?.addEventListener("click", handlePrivateCastClick);

  publicGrid?.addEventListener("click", scheduleSelectedRowAnnotation, true);
  selectedCasts?.addEventListener("click", scheduleSelectedRowAnnotation, true);

  if (publicGrid) new MutationObserver(scheduleSelectedRowAnnotation).observe(publicGrid, { childList: true, subtree: true });
  if (selectedCasts) new MutationObserver(scheduleSelectedRowAnnotation).observe(selectedCasts, { childList: true, subtree: true });

  setHistoryButtonReady();
  scheduleSelectedRowAnnotation();
  await loadOwnedPrivateCharacters();
}

async function loadOwnedPrivateCharacters() {
  if (!privateGrid || !privateStatus) return;

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session?.user) {
    setPrivateStatus("非公開キャストを読み込むには再ログインしてください。", "error");
    return;
  }

  setPrivateStatus("自分の非公開キャストを読み込み中…");
  const { data, error } = await supabase
    .from("characters")
    .select(`
      id, public_id, player_name, character_name, handle, visibility,
      style_1, style_1_mark, style_2, style_2_mark, style_3, style_3_mark,
      image_url, updated_at
    `)
    .eq("owner_id", session.user.id)
    .neq("visibility", "public")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error(error);
    setPrivateStatus("自分の非公開キャストを取得できませんでした。", "error");
    return;
  }

  privateCharacters = data ?? [];
  renderPrivateCharacters();
  setPrivateStatus(
    privateCharacters.length
      ? `${privateCharacters.length}件の自分の非公開キャストを読み込みました。`
      : "履歴登録に追加できる非公開キャストはありません。",
    privateCharacters.length ? "success" : ""
  );
}

function renderPrivateCharacters() {
  if (!privateGrid) return;

  if (!privateCharacters.length) {
    privateGrid.innerHTML = "";
    updatePrivateSelectedCount();
    return;
  }

  privateGrid.innerHTML = privateCharacters.map(character => {
    const selected = selectedPrivateIds.includes(character.id);
    const styles = [
      [character.style_1, character.style_1_mark],
      [character.style_2, character.style_2_mark],
      [character.style_3, character.style_3_mark]
    ].filter(([name]) => name).map(([name, mark]) => `${name}${mark || ""}`).join(" / ");

    return `
      <button class="cast-pick-card private-history-card${selected ? " is-selected" : ""}" type="button"
        data-private-character-id="${escapeAttribute(character.id)}" aria-pressed="${selected}">
        <img src="${escapeAttribute(character.image_url || "./assets/placeholders/scan-failed.webp")}" alt="" loading="lazy">
        <span class="cast-pick-card__body">
          <span class="private-history-card__visibility">${escapeHtml(visibilityLabel(character.visibility))} / HISTORY ONLY</span>
          <span class="cast-pick-card__handle">${escapeHtml(formatHandle(character.handle) || "NO HANDLE")}</span>
          <h3>${escapeHtml(character.character_name || "名称未登録")}</h3>
          <span class="cast-pick-card__styles">${escapeHtml(styles)}</span>
          <span class="cast-pick-card__player">PL：${escapeHtml(character.player_name || "—")}</span>
        </span>
      </button>`;
  }).join("");

  updatePrivateSelectedCount();
}

function handlePrivateCastClick(event) {
  const card = event.target.closest("[data-private-character-id]");
  if (!card) return;

  const id = card.dataset.privateCharacterId;
  const currentIndex = selectedPrivateIds.indexOf(id);

  if (currentIndex >= 0) {
    selectedPrivateIds.splice(currentIndex, 1);
  } else {
    const publicCount = collectPublicParticipantIds().length;
    if (publicCount + selectedPrivateIds.length >= MAX_CASTS) {
      setStatus("参加アクト履歴へ登録できるキャストは合計6名までです。", "error");
      return;
    }
    selectedPrivateIds.push(id);
  }

  renderPrivateCharacters();
}

function scheduleSelectedRowAnnotation() {
  if (annotationQueued) return;
  annotationQueued = true;
  queueMicrotask(() => {
    annotationQueued = false;
    annotateSelectedRows();
  });
}

function annotateSelectedRows() {
  if (!publicGrid || !selectedCasts) return;

  const idsByOrder = new Map();
  publicGrid.querySelectorAll("[data-character-id].is-selected").forEach(card => {
    const orderText = card.querySelector(".cast-pick-card__order")?.textContent ?? "";
    const match = /CAST\s*0*(\d+)/i.exec(orderText);
    if (match) idsByOrder.set(Number(match[1]) - 1, card.dataset.characterId);
  });

  selectedCasts.querySelectorAll(".selected-cast:not(.selected-cast--manual)[data-selected-index]").forEach(row => {
    const index = Number(row.dataset.selectedIndex);
    const characterId = idsByOrder.get(index);
    if (characterId) row.dataset.characterId = characterId;
  });
}

function collectPublicParticipantIds() {
  annotateSelectedRows();

  const rows = [...(selectedCasts?.querySelectorAll(".selected-cast:not(.selected-cast--manual)[data-selected-index]") ?? [])]
    .sort((a, b) => Number(a.dataset.selectedIndex) - Number(b.dataset.selectedIndex));
  const rowIds = rows.map(row => row.dataset.characterId).filter(Boolean);
  if (rowIds.length) return unique(rowIds);

  const visibleSelected = [...(publicGrid?.querySelectorAll("[data-character-id].is-selected") ?? [])]
    .map(card => ({
      id: card.dataset.characterId,
      order: Number((/CAST\s*0*(\d+)/i.exec(card.querySelector(".cast-pick-card__order")?.textContent ?? "") || [])[1] || 999)
    }))
    .sort((a, b) => a.order - b.order)
    .map(item => item.id)
    .filter(Boolean);

  return unique(visibleSelected);
}

async function registerHistoryOnly() {
  if (!historyButton || registering) return;

  try {
    const publicIds = collectPublicParticipantIds();
    const participantIds = unique([...publicIds, ...selectedPrivateIds]);
    if (!participantIds.length) {
      throw new Error("履歴へ登録するには、公開キャストまたは自分の非公開キャストを1名以上選択してください。");
    }
    if (participantIds.length > MAX_CASTS) throw new Error("参加アクト履歴へ登録できるキャストは6名までです。");

    const slug = normalizeSlug(publishSlug?.value);
    if (!slug) throw new Error("アクト識別名を半角英数字とハイフンで入力してください。");

    const title = actName?.value.trim();
    if (!title) throw new Error("アクト名を入力してください。");

    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError) throw authError;
    if (!session) throw new Error("ログイン情報を確認できません。再ログインしてください。");

    registering = true;
    setHistoryButtonReady();
    setStatus("参加アクト履歴を登録中…");

    const { data: actId, error } = await supabase.rpc("record_act_history_for_current_user", {
      p_slug: slug,
      p_act_name: title,
      p_ruler_name: rulerName?.value.trim() || "",
      p_participant_ids: participantIds
    });

    if (error) throw new Error(translateHistoryError(error));
    if (!actId) throw new Error("登録したアクト履歴を確認できませんでした。");

    const manualCount = selectedCasts?.querySelectorAll(".selected-cast--manual").length ?? 0;
    const privateNote = selectedPrivateIds.length
      ? ` 自分の非公開キャスト${selectedPrivateIds.length}名を履歴へ登録しました。`
      : "";
    const manualNote = manualCount
      ? ` 手動追加キャスト${manualCount}名はサイト未登録のため履歴対象外です。`
      : "";
    setStatus(`GitHub Pagesへ公開せず、参加アクト履歴へ登録しました。${privateNote}${manualNote}`, "success");
  } catch (error) {
    console.error(error);
    setStatus(error?.message || "参加アクト履歴の登録に失敗しました。", "error");
  } finally {
    registering = false;
    setHistoryButtonReady();
  }
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

function setHistoryButtonReady() {
  if (!historyButton) return;
  historyButton.disabled = registering;
  historyButton.setAttribute("aria-disabled", String(registering));
}

function updatePrivateSelectedCount() {
  if (privateSelectedCount) privateSelectedCount.textContent = String(selectedPrivateIds.length);
}

function setPrivateStatus(message, state = "") {
  if (!privateStatus) return;
  privateStatus.textContent = message;
  privateStatus.className = `generator-status${state ? ` is-${state}` : ""}`;
}

function setStatus(message, state = "") {
  if (!status) return;
  status.textContent = message;
  status.className = `generator-status${state ? ` is-${state}` : ""}`;
}

function normalizeSlug(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function visibilityLabel(value) {
  const labels = {
    draft: "下書き",
    private: "非公開",
    archived: "引退",
    unlisted: "限定公開"
  };
  return labels[String(value ?? "").toLowerCase()] || String(value ?? "非公開");
}

function formatHandle(value) {
  const handle = String(value ?? "").trim();
  return handle ? `“${handle}”` : "";
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
