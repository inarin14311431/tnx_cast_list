import { registerSheetSaveRequester, setSheetSaveState } from "./sheet-save-state.js?v=2";

const SAVE_ERROR_EVENT = "tnx:sheet-save-error";
const OUTFIT_ROOT_SELECTOR = "#outfit-list";
const OUTFIT_GROUP_SELECTOR = ".outfit-table-group";
const OUTFIT_ROW_SELECTOR = "[data-outfit-key]";
const OUTFIT_READY_FIELD_SELECTOR = '[data-ofc="manufacturer"]';
const HYDRATION_POLL_MS = 25;
const HYDRATION_QUIET_MS = 300;

function scheduleFrame(callback) {
  if (typeof globalThis.requestAnimationFrame === "function") {
    globalThis.requestAnimationFrame(callback);
    return;
  }
  globalThis.setTimeout?.(callback, 0);
}

function outfitEditorIsHydrated() {
  const root = globalThis.document?.querySelector?.(OUTFIT_ROOT_SELECTOR);
  if (!root) return false;
  const groups = root.querySelectorAll?.(OUTFIT_GROUP_SELECTOR) || [];
  if (!groups.length) return false;
  const rows = [...(root.querySelectorAll?.(OUTFIT_ROW_SELECTOR) || [])];
  if (!rows.length) return true;
  return rows.every(row => Boolean(row.querySelector?.(OUTFIT_READY_FIELD_SELECTOR)));
}

export function createSheetSaveCoordinator({ persist, validate, onSaved, onError } = {}) {
  let dirty = false;
  let saving = false;
  let pending = false;
  let changeRevision = 0;
  let hydrationGeneration = 0;
  let hydrationPending = false;
  let trustedEditDuringHydration = false;
  let hydrationLastActivity = 0;
  let hydrationObserver = null;

  function publish(state, text = "") { setSheetSaveState(state, text); }

  function publishError(error, text) {
    globalThis.window?.dispatchEvent?.(new CustomEvent(SAVE_ERROR_EVENT, {
      detail: { error, text: String(text || "") }
    }));
  }

  function noteHydrationActivity() {
    if (hydrationPending) hydrationLastActivity = Date.now();
  }

  function handleHydrationEdit(event) {
    if (!hydrationPending) return;
    noteHydrationActivity();
    if (event?.isTrusted) trustedEditDuringHydration = true;
  }

  globalThis.document?.addEventListener?.("input", handleHydrationEdit, true);
  globalThis.document?.addEventListener?.("change", handleHydrationEdit, true);

  function stopHydrationObserver() {
    hydrationObserver?.disconnect?.();
    hydrationObserver = null;
  }

  function startHydrationObserver() {
    stopHydrationObserver();
    const root = globalThis.document?.querySelector?.(OUTFIT_ROOT_SELECTOR);
    const Observer = globalThis.MutationObserver;
    if (!root || typeof Observer !== "function") return;
    hydrationObserver = new Observer(noteHydrationActivity);
    hydrationObserver.observe(root, { childList: true, subtree: true, attributes: true });
  }

  function settleHydration(generation) {
    if (!hydrationPending || generation !== hydrationGeneration) return;
    if (!outfitEditorIsHydrated()) {
      globalThis.setTimeout?.(() => settleHydration(generation), HYDRATION_POLL_MS);
      return;
    }

    const quietFor = Date.now() - hydrationLastActivity;
    if (quietFor < HYDRATION_QUIET_MS) {
      globalThis.setTimeout?.(() => settleHydration(generation), HYDRATION_QUIET_MS - quietFor);
      return;
    }

    scheduleFrame(() => scheduleFrame(() => {
      if (!hydrationPending || generation !== hydrationGeneration) return;
      hydrationPending = false;
      stopHydrationObserver();
      if (trustedEditDuringHydration) return;
      dirty = false;
      pending = false;
      publish("saved", "保存済み");
    }));
  }

  function beginHydrationSettle() {
    hydrationGeneration += 1;
    hydrationPending = true;
    trustedEditDuringHydration = false;
    hydrationLastActivity = Date.now();
    startHydrationObserver();
    settleHydration(hydrationGeneration);
  }

  function cancelHydrationSettle() {
    hydrationGeneration += 1;
    hydrationPending = false;
    trustedEditDuringHydration = false;
    stopHydrationObserver();
  }

  function markDirty() {
    if (hydrationPending && !trustedEditDuringHydration) return;
    dirty = true;
    changeRevision += 1;
    if (saving) {
      pending = true;
      return;
    }
    publish("unsaved", "未保存");
  }

  function markSaved() {
    dirty = false;
    pending = false;
    publish("saved", "保存済み");
  }

  function markLoading(text = "読込中…") {
    beginHydrationSettle();
    publish("saving", text);
  }

  function markLoadError(text) {
    cancelHydrationSettle();
    dirty = false;
    pending = false;
    publish("error", text);
  }

  function hasUnsavedChanges() { return dirty; }
  function isSaving() { return saving; }

  async function save(force = false) {
    if (saving) {
      pending = true;
      return false;
    }
    if (!dirty) {
      if (force) markSaved();
      return true;
    }

    const validationMessage = typeof validate === "function" ? validate({ force, dirty }) : "";
    if (validationMessage) {
      if (force) publish("error", validationMessage);
      return false;
    }

    saving = true;
    const revisionAtStart = changeRevision;
    publish("saving", "保存中…");
    try {
      const result = await persist?.();
      if (!result) throw new Error("保存結果を確認できませんでした。");
      const changedWhileSaving = changeRevision !== revisionAtStart;
      dirty = changedWhileSaving;
      if (changedWhileSaving) pending = true;
      else publish("saved", "保存済み");
      onSaved?.(result);
      return !changedWhileSaving;
    } catch (error) {
      console.error(error);
      dirty = true;
      const text = onError?.(error) || error?.message || "保存に失敗しました。";
      publishError(error, text);
      publish("error", text);
      return false;
    } finally {
      saving = false;
      if (pending) {
        pending = false;
        queueMicrotask(() => save(false));
      }
    }
  }

  registerSheetSaveRequester(() => save(true));

  return Object.freeze({ markDirty, markSaved, markLoading, markLoadError, hasUnsavedChanges, isSaving, save });
}
