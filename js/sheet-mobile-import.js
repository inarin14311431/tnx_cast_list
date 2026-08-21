import { SITE_BASE_PATH } from "./config.js?v=2";

const $ = selector => document.querySelector(selector);
const IMPORT_SUCCESS_PREFIX = "取込が完了し";
let frameLoaded = false;
let savingImportedState = false;

function pcUrl() {
  const publicId = new URLSearchParams(location.search).get("id") || "";
  const params = new URLSearchParams();
  if (publicId) params.set("id", publicId);
  params.set("mobileImportFrame", "1");
  return `${SITE_BASE_PATH}sheet.html?${params}`;
}

function injectButton() {
  if ($("#mobile-data-import-open")) return;
  const notice = $("#mobile-edit-notice"), nav = $(".mobile-sheet-nav"), main = $(".mobile-sheet-shell");
  const anchor = notice || nav;
  if (!main || !anchor) return;
  const row = document.createElement("div");
  row.className = "mobile-data-import-entry";
  row.innerHTML = '<button id="mobile-data-import-open" type="button"><strong>データ取込</strong><small>IMPORT DATA / PC互換取込</small></button>';
  if (anchor === notice) notice.after(row); else main.insertBefore(row, nav);
}

function injectDialog() {
  if ($("#mobile-data-import-dialog")) return;
  const dialog = document.createElement("dialog");
  dialog.id = "mobile-data-import-dialog";
  dialog.className = "mobile-editor-dialog mobile-pc-import-dialog";
  dialog.innerHTML = `<form method="dialog"><header class="mobile-editor-dialog__header mobile-editor-dialog__header--close-only"><button id="mobile-data-import-close" type="button">閉じる</button><strong>データ取込</strong></header><div class="mobile-editor-dialog__body mobile-pc-import-dialog__body"><p class="mobile-pc-import-note">PC版編集画面のデータ取込をそのまま開きます。</p><iframe id="mobile-data-import-frame" title="PC版データ取込"></iframe></div></form>`;
  document.body.append(dialog);
}

function setOuterNote(text) {
  const note = $(".mobile-pc-import-note");
  if (note) note.textContent = text;
}

function openPcImport() {
  const dialog = $("#mobile-data-import-dialog"), frame = $("#mobile-data-import-frame");
  if (!dialog || !frame || savingImportedState) return;
  setOuterNote("PC版編集画面のデータ取込をそのまま開きます。");
  if (!dialog.open) dialog.showModal();
  const url = pcUrl();
  if (frame.dataset.url !== url) {
    frameLoaded = false;
    frame.dataset.url = url;
    frame.src = url;
  } else if (frameLoaded) openInnerDialog(frame);
}

function closeOuter() {
  const dialog = $("#mobile-data-import-dialog");
  if (dialog?.open) dialog.close();
}

function completedSuccessfully(frame) {
  try {
    const text = frame.contentDocument?.querySelector("#legacy-import-message")?.textContent?.trim() || "";
    return text.startsWith(IMPORT_SUCCESS_PREFIX);
  } catch {
    return false;
  }
}

async function persistImportedFrame(frame) {
  const saveState = frame?.contentWindow?.TNXSheetSaveState;
  if (!saveState?.requestSave || !saveState?.waitForSaved) {
    throw new Error("PC版編集画面の保存機能を確認できませんでした。");
  }
  setOuterNote("取込結果を保存しています…");
  const requested = await saveState.requestSave();
  if (requested === false) throw new Error("取込結果を保存できませんでした。");
  await saveState.waitForSaved(30000);
}

function wireInnerClose(frame, importDialog) {
  if (!importDialog || importDialog.dataset.mobileOuterCloseBound === "1") return;
  importDialog.dataset.mobileOuterCloseBound = "1";
  importDialog.addEventListener("close", async () => {
    if (!completedSuccessfully(frame)) {
      window.setTimeout(closeOuter, 0);
      return;
    }
    if (savingImportedState) return;
    savingImportedState = true;
    try {
      await persistImportedFrame(frame);
      closeOuter();
      location.reload();
    } catch (error) {
      console.error("モバイル取込結果の保存に失敗しました。", error);
      setOuterNote(`取込結果の保存に失敗しました：${error?.message || error}`);
      const outer = $("#mobile-data-import-dialog");
      if (outer && !outer.open) outer.showModal();
    } finally {
      savingImportedState = false;
    }
  });
}

function openInnerDialog(frame) {
  try {
    const doc = frame.contentDocument;
    const importDialog = doc?.querySelector("#legacy-import-dialog");
    const openButton = doc?.querySelector("#legacy-import-open");
    if (!importDialog) return;
    wireInnerClose(frame, importDialog);
    if (importDialog.open) return;
    if (openButton) {
      openButton.click();
      return;
    }
    importDialog.showModal?.();
  } catch (error) {
    console.error("PC版データ取込を開けませんでした。", error);
  }
}

function bind() {
  const frame = $("#mobile-data-import-frame");
  $("#mobile-data-import-open")?.addEventListener("click", openPcImport);
  $("#mobile-data-import-close")?.addEventListener("click", () => {
    if (!savingImportedState) closeOuter();
  });
  $("#mobile-data-import-dialog")?.addEventListener("cancel", event => {
    event.preventDefault();
    if (!savingImportedState) closeOuter();
  });
  frame?.addEventListener("load", () => {
    frameLoaded = true;
    window.setTimeout(() => openInnerDialog(frame), 120);
  });
}

function init() {
  injectButton();
  injectDialog();
  bind();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
else init();
