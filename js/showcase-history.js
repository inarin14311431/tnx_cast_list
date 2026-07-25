import { supabase } from "./supabase-client.js";

const FUNCTION_NAME = "publish-showcase";
const MAX_CASTS = 6;
const publicGrid = document.querySelector("#public-cast-grid");
const selectedCasts = document.querySelector("#selected-casts");
const manualAddButton = document.querySelector("#add-manual-cast");
const historyButton = document.querySelector("#history-button");
const publishSlug = document.querySelector("#publish-slug");
const actName = document.querySelector("#act-name");
const rulerName = document.querySelector("#ruler-name");
const status = document.querySelector("#generator-status");

// Mirrors the generator's selected-cast order. Registered casts keep their DB UUID;
// manual casts use null because they cannot be referenced by act_participants.
const selectedEntries = [];
let registering = false;

bindSelectionTracking();
setHistoryButtonReady();

function bindSelectionTracking() {
  // Capture the click before the generator redraws the public cast grid.
  publicGrid?.addEventListener("click", event => {
    const card = event.target.closest("[data-character-id]");
    if (!card) return;

    const characterId = card.dataset.characterId;
    const wasSelected = card.classList.contains("is-selected");
    const currentIndex = selectedEntries.indexOf(characterId);

    if (wasSelected) {
      if (currentIndex >= 0) selectedEntries.splice(currentIndex, 1);
    } else if (currentIndex < 0 && selectedEntries.length < MAX_CASTS) {
      selectedEntries.push(characterId);
    }

    queueMicrotask(reconcileEntryCount);
  }, true);

  // Manual casts are appended to the generator selection order.
  manualAddButton?.addEventListener("click", () => {
    const rowCount = selectedCasts?.querySelectorAll("[data-selected-index]").length ?? 0;
    if (rowCount < MAX_CASTS) selectedEntries.push(null);
    queueMicrotask(reconcileEntryCount);
  }, true);

  // Capture order changes and removal before the generator replaces the rows.
  selectedCasts?.addEventListener("click", event => {
    const actionButton = event.target.closest("[data-action]");
    const row = event.target.closest("[data-selected-index]");
    if (!actionButton || !row) return;

    const index = Number(row.dataset.selectedIndex);
    const action = actionButton.dataset.action;
    if (!Number.isInteger(index)) return;

    if (action === "up" && index > 0 && index < selectedEntries.length) {
      [selectedEntries[index - 1], selectedEntries[index]] = [selectedEntries[index], selectedEntries[index - 1]];
    } else if (action === "down" && index >= 0 && index < selectedEntries.length - 1) {
      [selectedEntries[index], selectedEntries[index + 1]] = [selectedEntries[index + 1], selectedEntries[index]];
    } else if (action === "remove" && index >= 0 && index < selectedEntries.length) {
      selectedEntries.splice(index, 1);
    }

    queueMicrotask(reconcileEntryCount);
  }, true);

  historyButton?.addEventListener("click", registerHistoryOnly);
}

function reconcileEntryCount() {
  const rowCount = selectedCasts?.querySelectorAll("[data-selected-index]").length ?? 0;
  while (selectedEntries.length < rowCount) selectedEntries.push(null);
  if (selectedEntries.length > rowCount) selectedEntries.length = rowCount;
}

function setHistoryButtonReady() {
  if (!historyButton) return;
  historyButton.disabled = registering;
  historyButton.setAttribute("aria-disabled", String(registering));
}

function registeredParticipantIds() {
  return selectedEntries.filter(value => typeof value === "string" && value.length > 0);
}

async function registerHistoryOnly() {
  if (!historyButton || registering) return;

  try {
    reconcileEntryCount();
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
    registering = true;
    setHistoryButtonReady();
    setStatus("参加アクト履歴を登録中…");

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
    registering = false;
    setHistoryButtonReady();
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
