export const LEGACY_OUTFIT_CUTOFF = "2026-08-19T08:00:08.000Z";

const LOAD_EVENT = "tnx:sheet-character-loaded";
const OUTFIT_ROOT_SELECTOR = "#outfit-list";
const QUIET_MS = 500;
const MAX_WAIT_MS = 5000;

export function isLegacyOutfitCharacter(character) {
  const updatedAt = Date.parse(String(character?.updated_at || ""));
  const cutoff = Date.parse(LEGACY_OUTFIT_CUTOFF);
  return Number.isFinite(updatedAt) && updatedAt < cutoff;
}

export function installLegacyOutfitCompatibility({ root = globalThis.document, windowRef = globalThis.window, markSaved = () => {} } = {}) {
  if (!root?.addEventListener || !windowRef?.addEventListener) return () => {};
  let cleanupActive = () => {};
  const handleLoaded = event => {
    cleanupActive(); cleanupActive = () => {};
    const character = event?.detail?.character;
    if (!isLegacyOutfitCharacter(character)) return;
    const outfitRoot = root.querySelector?.(OUTFIT_ROOT_SELECTOR);
    if (!outfitRoot) return;
    let finished = false, userEdited = false, quietTimer = null, maxTimer = null, observer = null;
    const cleanup = () => {
      if (quietTimer) globalThis.clearTimeout?.(quietTimer);
      if (maxTimer) globalThis.clearTimeout?.(maxTimer);
      observer?.disconnect?.();
      root.removeEventListener?.("input", handleEdit, true);
      root.removeEventListener?.("change", handleEdit, true);
    };
    const finish = () => { if (finished) return; finished = true; cleanup(); if (!userEdited) markSaved(); };
    const scheduleFinish = () => { if (finished || userEdited) return; if (quietTimer) globalThis.clearTimeout?.(quietTimer); quietTimer = globalThis.setTimeout?.(finish, QUIET_MS); };
    const handleEdit = inputEvent => {
      if (inputEvent?.isTrusted) { userEdited = true; cleanup(); return; }
      if (inputEvent?.target?.closest?.(OUTFIT_ROOT_SELECTOR)) scheduleFinish();
    };
    root.addEventListener("input", handleEdit, true);
    root.addEventListener("change", handleEdit, true);
    const Observer = globalThis.MutationObserver;
    if (typeof Observer === "function") { observer = new Observer(scheduleFinish); observer.observe(outfitRoot, { childList: true, subtree: true, attributes: true }); }
    scheduleFinish();
    maxTimer = globalThis.setTimeout?.(finish, MAX_WAIT_MS);
    cleanupActive = cleanup;
  };
  windowRef.addEventListener(LOAD_EVENT, handleLoaded);
  return () => { cleanupActive(); windowRef.removeEventListener(LOAD_EVENT, handleLoaded); };
}
