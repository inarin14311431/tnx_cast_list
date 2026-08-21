const $ = selector => document.querySelector(selector);

let replaying = false;
let saving = false;

function setBusy(busy) {
  const button = $("#mobile-save");
  if (!button) return;
  button.disabled = busy;
  if (busy) {
    button.dataset.state = "saving";
    button.textContent = "保存中…";
  }
}

function setError(error) {
  const status = $("#mobile-save-status");
  if (!status) return;
  status.dataset.state = "error";
  status.textContent = `保存に失敗しました：${error?.message || "不明なエラー"}`;
}

function markSaved(button) {
  if (!button) return;
  button.disabled = false;
  button.dataset.state = "saved";
  button.textContent = "保存済み";
  const status = $("#mobile-save-status");
  if (status && status.dataset.state !== "error") {
    status.dataset.state = "saved";
    status.textContent = "保存済み";
  }
}

async function handleSave(event) {
  const button = event.target.closest?.("#mobile-save");
  if (!button || replaying || saving) return;

  const tasks = [];
  const detail = { add(task) { if (task) tasks.push(Promise.resolve(task)); } };
  document.dispatchEvent(new CustomEvent("tnx:mobile-before-save", { detail }));
  if (!tasks.length) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  saving = true;
  setBusy(true);
  try {
    await Promise.all(tasks);
    replaying = true;
    markSaved(button);
    button.click();
    if (button.dataset.state !== "saving") markSaved(button);
  } catch (error) {
    console.error(error);
    button.disabled = false;
    button.dataset.state = "dirty";
    button.textContent = "変更を保存";
    setError(error);
  } finally {
    replaying = false;
    saving = false;
  }
}

document.addEventListener("click", handleSave, true);
