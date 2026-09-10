import {
  SHOWCASE_BACKGROUND_PRESETS,
  findShowcaseBackgroundPresetByUrl
} from "./showcase-background-presets.js?v=7";

const grid = document.querySelector("#background-preset-grid");
const keyField = document.querySelector("#background-preset");
const urlField = document.querySelector("#background-url");
const fileField = document.querySelector("#background-file");

let presetOwnedUrl = "";

if (grid && keyField && urlField) {
  renderPresets();
  syncFromUrl();

  grid.addEventListener("click", event => {
    const button = event.target.closest("[data-background-preset-key]");
    if (!button) return;
    const preset = SHOWCASE_BACKGROUND_PRESETS.find(item => item.key === button.dataset.backgroundPresetKey);
    if (!preset) return;

    keyField.value = preset.key;
    presetOwnedUrl = preset.url;
    urlField.value = preset.url;
    if (fileField) fileField.value = "";
    updateSelection(preset.key);
    urlField.dispatchEvent(new Event("input", { bubbles: true }));
  });

  urlField.addEventListener("input", () => {
    const preset = findShowcaseBackgroundPresetByUrl(urlField.value);
    keyField.value = preset?.key || "";
    presetOwnedUrl = preset?.url || "";
    updateSelection(preset?.key || "");
  });

  fileField?.addEventListener("change", () => {
    if (!fileField.files?.length) return;
    if (presetOwnedUrl && urlField.value.trim() === presetOwnedUrl) {
      urlField.value = "";
      urlField.dispatchEvent(new Event("input", { bubbles: true }));
    }
    keyField.value = "";
    presetOwnedUrl = "";
    updateSelection("");
  });
}

function renderPresets() {
  grid.innerHTML = SHOWCASE_BACKGROUND_PRESETS.map((preset, index) => `
    <button class="showcase-background-preset" type="button"
      data-background-preset-key="${escapeAttribute(preset.key)}" aria-pressed="false">
      <span class="showcase-background-preset__visual">
        <img src="${escapeAttribute(preset.url)}" alt="" loading="${index < 2 ? "eager" : "lazy"}">
        <span class="showcase-background-preset__index">BG ${String(index + 1).padStart(2, "0")}</span>
      </span>
      <span class="showcase-background-preset__body">
        <strong>${escapeHtml(preset.name)}</strong>
        <small>${escapeHtml(preset.description)}</small>
      </span>
      <span class="showcase-background-preset__state">SELECT</span>
    </button>`).join("");
}

function syncFromUrl() {
  const preset = findShowcaseBackgroundPresetByUrl(urlField.value);
  keyField.value = preset?.key || "";
  presetOwnedUrl = preset?.url || "";
  updateSelection(preset?.key || "");
}

function updateSelection(activeKey) {
  for (const button of grid.querySelectorAll("[data-background-preset-key]")) {
    const selected = button.dataset.backgroundPresetKey === activeKey;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
    const state = button.querySelector(".showcase-background-preset__state");
    if (state) state.textContent = selected ? "SELECTED" : "SELECT";
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[character]));
}

function escapeAttribute(value) {
  return String(value ?? "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}
