const STATUS_SELECTOR = "#save-status";
const BUTTON_SELECTOR = "#save-button";
const STATE_EVENT = "tnx:sheet-save-state";

const labels = Object.freeze({
  unsaved: ["未保存", "NOT SAVED"],
  saving: ["保存中…", "SAVING"],
  saved: ["保存済み", "SAVED"],
  error: ["保存失敗", "SAVE ERROR"]
});

const VALID_STATES = new Set(Object.keys(labels));
let currentState = "saving";
let currentText = "初期化中…";
let installed = false;
let saveRequester = null;

export function getSheetSaveState() {
  return currentState;
}

export function getSheetSaveText() {
  return currentText;
}

export function hasUnsavedSheetChanges() {
  return currentState === "unsaved" || currentState === "error";
}

export function setSheetSaveState(state, text = "") {
  const nextState = VALID_STATES.has(state) ? state : "unsaved";
  const nextText = String(text || labels[nextState][0]);
  currentState = nextState;
  currentText = nextText;
  renderSheetSaveState();
  window.dispatchEvent(new CustomEvent(STATE_EVENT, { detail: { state: currentState, text: currentText } }));
  return currentState;
}

export function registerSheetSaveRequester(requester) {
  saveRequester = typeof requester === "function" ? requester : null;
  return () => {
    if (saveRequester === requester) saveRequester = null;
  };
}

export function requestSheetSave() {
  if (!saveRequester) return false;
  return saveRequester();
}

export function focusSheetSaveButton() {
  document.querySelector(BUTTON_SELECTOR)?.focus();
}

export function waitForSheetSaved(timeout = 20000) {
  if (currentState === "saved") return Promise.resolve(true);
  if (currentState === "error") return Promise.reject(new Error(currentText || "キャスト本体の保存に失敗しました。"));

  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      window.removeEventListener(STATE_EVENT, onState);
      reject(new Error("キャスト本体の保存完了を確認できませんでした。"));
    }, timeout);

    function onState(event) {
      const state = event.detail?.state;
      if (state !== "saved" && state !== "error") return;
      window.clearTimeout(timer);
      window.removeEventListener(STATE_EVENT, onState);
      if (state === "saved") resolve(true);
      else reject(new Error(event.detail?.text || "キャスト本体の保存に失敗しました。"));
    }

    window.addEventListener(STATE_EVENT, onState);
  });
}

function renderSheetSaveState() {
  const status = document.querySelector(STATUS_SELECTOR);
  const button = document.querySelector(BUTTON_SELECTOR);

  if (status) {
    status.textContent = currentText;
    status.className = currentState;
  }

  if (!button) return;
  button.classList.remove("is-unsaved", "is-saving", "is-saved", "is-error");
  button.classList.add(`is-${currentState}`);
  button.dataset.saveState = currentState;

  const [jp, en] = labels[currentState];
  button.replaceChildren(document.createTextNode(jp + " "));
  const small = document.createElement("small");
  small.textContent = en;
  button.append(small);
  button.setAttribute("aria-label", jp);
}

export function installSheetSaveState() {
  if (installed) return;
  installed = true;
  renderSheetSaveState();
}

installSheetSaveState();

globalThis.TNXSheetSaveState = Object.freeze({
  getState: getSheetSaveState,
  getText: getSheetSaveText,
  hasUnsavedChanges: hasUnsavedSheetChanges,
  setState: setSheetSaveState,
  registerRequester: registerSheetSaveRequester,
  requestSave: requestSheetSave,
  waitForSaved: waitForSheetSaved,
  focusButton: focusSheetSaveButton
});
