import { buildCharacterSheetEditUrl, extractCharacterSheetKey } from "./character-sheet-url.js?v=2";

const RUN_SELECTOR = "#character-sheets-import-run";
const SOURCE_SELECTOR = "#character-sheets-import-url";
const TARGET_SELECTOR = "#character-sheet-url";
const DIALOG_SELECTOR = "#legacy-import-dialog";
const MESSAGE_SELECTOR = "#legacy-import-message";
// Dispatched by js/sheet-import.js (and consumed the same way by
// js/sheet-import-outfit-compat.js's waitBaseImport()) once the base
// JSON import settles, with detail.ok reporting the real outcome.
const BASE_IMPORT_EVENT = "tnx:legacy-import-base-finished";

function setStoredUrl(url) {
  const target = document.querySelector(TARGET_SELECTOR);
  if (!target || target.value === url) return;
  target.value = url;
  target.dispatchEvent(new Event("input", { bubbles: true }));
  target.dispatchEvent(new Event("change", { bubbles: true }));
}

export function importSucceeded(dialog, message, baseImportOk) {
  if (dialog?.dataset.importing === "1") return false;
  // tnx:legacy-import-base-finished's detail.ok is the authoritative signal
  // for the base import: unlike the message text/state below, it cannot go
  // stale if the base importer finishes later than our own polling timeout
  // (e.g. it was delayed by a background/hidden tab) and then overwrites the
  // message with a success string after we already gave up.
  if (baseImportOk !== undefined) return baseImportOk;
  // Fallback for the rare case the event never arrived at all (e.g. the
  // dialog was closed before it fired): keep the previous message-based guess.
  if (message?.dataset.state === "error") return false;
  return !String(message?.textContent || "").includes("取込エラー");
}

function waitForImportCompletion(candidateUrl, timeout = 180000) {
  const dialog = document.querySelector(DIALOG_SELECTOR);
  const message = document.querySelector(MESSAGE_SELECTOR);
  const started = Date.now();
  let sawBusy = dialog?.dataset.importing === "1";
  let baseImportOk;

  const onBaseImportFinished = event => {
    baseImportOk = Boolean(event.detail?.ok);
  };
  document.addEventListener(BASE_IMPORT_EVENT, onBaseImportFinished);

  const stopListening = () => document.removeEventListener(BASE_IMPORT_EVENT, onBaseImportFinished);

  const tick = () => {
    if (!dialog || Date.now() - started > timeout) {
      stopListening();
      return;
    }
    if (dialog.dataset.importing === "1") sawBusy = true;
    const finished = sawBusy && dialog.dataset.importing !== "1";
    if (finished) {
      stopListening();
      if (importSucceeded(dialog, message, baseImportOk)) setStoredUrl(candidateUrl);
      return;
    }
    window.setTimeout(tick, 150);
  };
  window.setTimeout(tick, 150);
}

function handleImportStart(event) {
  if (!event.target.closest(RUN_SELECTOR)) return;
  const source = document.querySelector(SOURCE_SELECTOR);
  const key = extractCharacterSheetKey(source?.value);
  const candidateUrl = key ? buildCharacterSheetEditUrl(key) : null;
  if (!candidateUrl) return;
  waitForImportCompletion(candidateUrl);
}

if (typeof document !== "undefined") {
  document.addEventListener("click", handleImportStart);
  import("./sheet-character-sheet-compare.js?v=7").catch(error => {
    console.error("character sheet comparison could not be initialized", error);
  });
}
