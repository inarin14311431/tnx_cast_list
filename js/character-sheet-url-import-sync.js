import { buildCharacterSheetEditUrl, extractCharacterSheetKey } from "./character-sheet-url.js?v=2";

const RUN_SELECTOR = "#character-sheets-import-run";
const SOURCE_SELECTOR = "#character-sheets-import-url";
const TARGET_SELECTOR = "#character-sheet-url";
const DIALOG_SELECTOR = "#legacy-import-dialog";
const MESSAGE_SELECTOR = "#legacy-import-message";

function setStoredUrl(url) {
  const target = document.querySelector(TARGET_SELECTOR);
  if (!target || target.value === url) return;
  target.value = url;
  target.dispatchEvent(new Event("input", { bubbles: true }));
  target.dispatchEvent(new Event("change", { bubbles: true }));
}

function importSucceeded(dialog, message) {
  if (dialog?.dataset.importing === "1") return false;
  if (message?.dataset.state === "error") return false;
  return !String(message?.textContent || "").includes("取込エラー");
}

function waitForImportCompletion(candidateUrl, timeout = 180000) {
  const dialog = document.querySelector(DIALOG_SELECTOR);
  const message = document.querySelector(MESSAGE_SELECTOR);
  const started = Date.now();
  let sawBusy = dialog?.dataset.importing === "1";

  const tick = () => {
    if (!dialog || Date.now() - started > timeout) return;
    if (dialog.dataset.importing === "1") sawBusy = true;
    const finished = sawBusy && dialog.dataset.importing !== "1";
    if (finished) {
      if (importSucceeded(dialog, message)) setStoredUrl(candidateUrl);
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
  import("./sheet-character-sheet-compare.js?v=6").catch(error => {
    console.error("character sheet comparison could not be initialized", error);
  });
}
