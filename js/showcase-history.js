import { supabase } from "./supabase-client.js";

const FUNCTION_NAME = "publish-showcase";
const publicGrid = document.querySelector("#public-cast-grid");
const selectedCasts = document.querySelector("#selected-casts");
const manualAddButton = document.querySelector("#add-manual-cast");
const historyButton = document.querySelector("#history-button");
const publishSlug = document.querySelector("#publish-slug");
const actName = document.querySelector("#act-name");
const rulerName = document.querySelector("#ruler-name");
const status = document.querySelector("#generator-status");

// This mirrors the generator's selection order. Registered casts are stored by
// database UUID; manual casts occupy a null slot because they have no history FK.
const selectedEntries = [];

bindSelectionTracking();
refreshHistoryButton();

function bindSelectionTracking() {
  publicGrid?.addEventListener("click", event => {
    const card = event.target.closest("[data-character-id]");
    if (!card) return;
    const characterId = card.dataset.characterId;

    queueMicrotask(() => {
      const currentCard = publicGrid.querySelector(`[data-character-id="${characterId}"]`);
      const selected = currentCard?.classList.contains("is-selected") ?? false;
      const currentIndex = selectedEntries.indexOf(characterId);

      if (selected && currentIndex < 0) selectedEntries.push(characterId);
      if (!selected && currentIndex >= 0) selectedEntries.splice(currentIndex, 1);
      reconcileEntryCount();
      refreshHistoryButton();
    });
  });

  manualAddButton?.addEventListener("click", () => {
    queueMicrotask(() => {
      reconcileEntryCount();
      refreshHistoryButton();
    });
  });

  selectedCasts?.addEventListener("click", event => {
    const actionButton = event.target.closest("[data-action]");
    const row = event.target.closest("[data-selected-index]");
    if (!actionButton || !row) return;

    const index = Number(row.dataset.selectedIndex);
    const action = actionButton.dataset.action;
    if (!Number.isInteger(index)) return;

    queueMicrotask(() => {
      if (action === "up" && index > 0 && selectedEntries[index] !== undefined) {
        [selectedEntries[index - 1], selectedEntries[index]] = [selectedEntries[index], selectedEntries[index - 1]];
      } else if (action === "down" && index < selectedEntries.length - 1) {
        [selectedEntries[index], selectedEntries[index + 1]] = [selectedEntries[index + 1], selectedEntries[index]];
      } else if (action === "remove" && index < selectedEntries.length) {
        selectedEntries.splice(index, 1);
      }

      reconcileEntryCount();
      refreshHistoryButton();
    });
  });

  historyButton?.addEventListener("click", registerHistoryOnly);
}

function reconcileEntryCount() {
  const rowCount = selectedCasts?.querySelectorAll("[data-selected-index]").length ?? 0;
  while (selectedEntries.length < rowCount) selectedEntries.push(null);
  if (selectedEntries.length > rowCount) selectedEntries.length = rowCount;
}

function refreshHistoryButton() {
  if (!historyButton) return;
  historyButton.disabled = registeredParticipantIds().length < 1;
}

function registeredParticipantIds() {
  return selectedEntries.filter(value => typeof value === "string" && value.length > 0);
}

async function registerHistoryOnly() {
  if (!historyButton) return;

  try {
    const participantIds = registeredParticipantIds();
    if (!participantIds.length) {
      throw new Error("履歴へ登録するには、データベース上の公開キャストを1名以上選択してください。");
    }

    const slug = normalizeSlug(publishSlug?.value);
    if (!slug) throw new Error("アクト識別名を半角英数字とハイフンで入力してください。");

    const title = actName?.value.trim();
    if (!title) throw new Error("アクト名を入力してください。");

    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError) throw authError;
    if (!session) throw new Error("ログイン情報を確認できません。再ログインしてください。");

    const manualCount = selectedEntries.filter(value => value === null).length;
    setStatus("参加アクト履歴を登録中…");
    historyButton.disabled = true;

    const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
      body: {
        mode: "history",
        slug,
        actName: title,
        rulerName: rulerName?.value.trim() || "",
        participantIds
      }
    });

    if (error) throw new Error(await extractFunctionError(error));
    if (!data?.actId) throw new Error("登録したアクト履歴を確認できませんでした。");

    const manualNote = manualCount
      ? ` 手動追加キャスト${manualCount}名はサイト未登録のため履歴対象外です。`
      : "";
    setStatus(`GitHub Pagesへ公開せず、参加アクト履歴へ登録しました。${manualNote}`, "success");
  } catch (error) {
    console.error(error);
    setStatus(error?.message || "参加アクト履歴の登録に失敗しました。", "error");
  } finally {
    refreshHistoryButton();
  }
}

async function extractFunctionError(error) {
  try {
    const response = error?.context;
    if (response instanceof Response) {
      const payload = await response.clone().json();
      return payload?.error || payload?.message || error.message;
    }
  } catch {
    // Fall through to the client error message.
  }
  return error?.message || "Edge Functionの呼び出しに失敗しました。";
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
