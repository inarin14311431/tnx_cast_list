import { SHEET_HELP_ORDER, SHEET_HELP_TOPICS } from "./help-content.js";
import "./sheet-import-help.js";

const page = document.body?.dataset.page;
if (page === "sheet.html") initializeSheetHelp();

function initializeSheetHelp() {
  if (document.querySelector("#sheet-global-help")) return;
  ensureHelpStyles();
  removeLegacyHelpTriggers();

  const dialog = createDialog();
  const trigger = createGlobalHelpButton();
  document.body.append(dialog, trigger);

  trigger.addEventListener("click", () => openHelp("save"));

  dialog.addEventListener("click", event => {
    const topicButton = event.target.closest("[data-help-topic]");
    if (topicButton) {
      renderTopic(topicButton.dataset.helpTopic);
      return;
    }
    if (event.target.matches("[data-help-close]")) dialog.close();
    else if (event.target === dialog) dialog.close();
  });

  function openHelp(key) {
    renderTopic(key);
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function renderTopic(key) {
    const topic = SHEET_HELP_TOPICS[key] || SHEET_HELP_TOPICS.save;
    dialog.dataset.helpCurrent = key;
    dialog.querySelectorAll("[data-help-topic]").forEach(button => {
      const active = button.dataset.helpTopic === key;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });

    const title = dialog.querySelector("#sheet-help-title");
    const body = dialog.querySelector(".sheet-help-dialog__content");
    title.innerHTML = `${escapeHtml(topic.title)} <small>${escapeHtml(topic.en)}</small>`;
    body.innerHTML = `<p class="sheet-help-dialog__intro">${escapeHtml(topic.intro)}</p>${topic.sections.map(section => `
      <section class="sheet-help-block">
        <h3>${escapeHtml(section.heading)}</h3>
        ${section.body.map(text => `<p>${escapeHtml(text)}</p>`).join("")}
      </section>`).join("")}`;
    body.scrollTop = 0;
  }
}

function removeLegacyHelpTriggers() {
  document.querySelectorAll(".sheet-help-trigger, .floating-help-link, [data-sheet-help-link], .sheet-sidebar-help-row").forEach(element => element.remove());
  document.querySelectorAll(".toolbar--with-help").forEach(element => element.classList.remove("toolbar--with-help"));
}

function ensureHelpStyles() {
  if (document.querySelector('link[data-sheet-help-style]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "./css-next/components/help.css?v=4";
  link.dataset.sheetHelpStyle = "1";
  document.head.append(link);
}

function createGlobalHelpButton() {
  const button = document.createElement("button");
  button.type = "button";
  button.id = "sheet-global-help";
  button.className = "sheet-global-help";
  button.setAttribute("aria-label", "WEBアプリ操作ガイドを開く");
  button.title = "WEBアプリ操作ガイド";
  button.innerHTML = '<span>HELP</span><small>GUIDE</small>';
  return button;
}

function createDialog() {
  const dialog = document.createElement("dialog");
  dialog.id = "sheet-help-dialog";
  dialog.className = "sheet-help-dialog";
  dialog.setAttribute("aria-labelledby", "sheet-help-title");
  dialog.innerHTML = `
    <div class="sheet-help-dialog__shell">
      <header class="sheet-help-dialog__header">
        <div><span>WEB APP GUIDE</span><strong id="sheet-help-title">ヘルプ</strong></div>
        <button type="button" class="sheet-help-dialog__close" data-help-close aria-label="ヘルプを閉じる">×</button>
      </header>
      <div class="sheet-help-dialog__layout">
        <nav class="sheet-help-dialog__nav" aria-label="ヘルプ項目">
          ${SHEET_HELP_ORDER.map(key => {
            const item = SHEET_HELP_TOPICS[key];
            return `<button type="button" data-help-topic="${key}"><span>${escapeHtml(item.title)}</span><small>${escapeHtml(item.en)}</small></button>`;
          }).join("")}
        </nav>
        <article class="sheet-help-dialog__content"></article>
      </div>
    </div>`;
  return dialog;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}
