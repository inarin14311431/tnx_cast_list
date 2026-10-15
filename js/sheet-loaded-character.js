/* Page-scoped hand-off of the cast read by loadSheetBundle (sheet.js publishes, feature modules consume).
 * Holds state only: no DB access (that stays in sheet-load-persistence.js) and no DOM rendering. */

const SHEET_CHARACTER_LOADED_EVENT = "tnx:sheet-character-loaded";

let latest = null;
let settled = false;
let resolveFirst;
const first = new Promise(resolve => { resolveFirst = resolve; });
const listeners = new Set();

/** The page's initial load finished; share the bundle ({ character, skills, outfits }) with every module. */
export function publishSheetCharacterLoaded(bundle) {
  latest = bundle;
  settled = true;
  resolveFirst(bundle);
  for (const listener of [...listeners]) listener(bundle);
  globalThis.window?.dispatchEvent?.(new CustomEvent(SHEET_CHARACTER_LOADED_EVENT, {
    detail: { character: bundle.character, skills: bundle.skills, outfits: bundle.outfits }
  }));
}

/** The page's initial load failed; waiting modules resolve with null instead of hanging. */
export function publishSheetCharacterLoadFailed() {
  if (settled) return;
  settled = true;
  resolveFirst(null);
}

/** Resolves with the first published bundle (null on failure), however late the caller asks. */
export function whenSheetCharacterLoaded() {
  return first;
}

/** Calls back with the latest bundle immediately (if any) and on every later publish. Returns an unsubscribe function. */
export function subscribeSheetCharacterLoaded(listener) {
  listeners.add(listener);
  if (latest) listener(latest);
  return () => listeners.delete(listener);
}
