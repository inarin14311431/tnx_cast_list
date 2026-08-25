import { registerSheetSaveRequester, setSheetSaveState } from "./sheet-save-state.js?v=2";
import { installLegacyOutfitCompatibility } from "./sheet-legacy-outfit-compat.js?v=1";

const SAVE_ERROR_EVENT = "tnx:sheet-save-error";

export function createSheetSaveCoordinator({ persist, validate, onSaved, onError } = {}) {
  let dirty = false;
  let saving = false;
  let pending = false;
  let changeRevision = 0;

  function publish(state, text = "") { setSheetSaveState(state, text); }

  function publishError(error, text) {
    globalThis.window?.dispatchEvent?.(new CustomEvent(SAVE_ERROR_EVENT, {
      detail: { error, text: String(text || "") }
    }));
  }

  function markDirty() {
    dirty = true;
    changeRevision += 1;
    if (saving) { pending = true; return; }
    publish("unsaved", "未保存");
  }

  function markSaved() { dirty = false; pending = false; publish("saved", "保存済み"); }
  function markLoading(text = "読込中…") { publish("saving", text); }
  function markLoadError(text) { dirty = false; pending = false; publish("error", text); }
  function hasUnsavedChanges() { return dirty; }
  function isSaving() { return saving; }

  async function save(force = false) {
    if (saving) { pending = true; return false; }
    if (!dirty) { if (force) markSaved(); return true; }
    const validationMessage = typeof validate === "function" ? validate({ force, dirty }) : "";
    if (validationMessage) { if (force) publish("error", validationMessage); return false; }
    saving = true;
    const revisionAtStart = changeRevision;
    publish("saving", "保存中…");
    try {
      const result = await persist?.();
      if (!result) throw new Error("保存結果を確認できませんでした。");
      const changedWhileSaving = changeRevision !== revisionAtStart;
      dirty = changedWhileSaving;
      if (changedWhileSaving) pending = true; else publish("saved", "保存済み");
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
      if (pending) { pending = false; queueMicrotask(() => save(false)); }
    }
  }

  registerSheetSaveRequester(() => save(true));
  installLegacyOutfitCompatibility({ markSaved });
  return Object.freeze({ markDirty, markSaved, markLoading, markLoadError, hasUnsavedChanges, isSaving, save });
}
