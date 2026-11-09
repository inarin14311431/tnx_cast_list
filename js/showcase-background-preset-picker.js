import {
  SHOWCASE_BACKGROUND_PRESETS,
  findShowcaseBackgroundPresetByUrl
} from "./showcase-background-presets.js?v=7068197c";
import { escapeHtml, escapeAttribute } from "./dom-escape.js?v=46402d5f";

const grid = document.querySelector("#background-preset-grid");
const keyField = document.querySelector("#background-preset");
const urlField = document.querySelector("#background-url");
const fileField = document.querySelector("#background-file");
const currentBox = document.querySelector("#background-current");

let presetOwnedUrl = "";
let fileUrl = "";

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
      data-background-preset-key="${escapeAttribute(preset.key)}" aria-pressed="false"
      aria-label="BG ${String(index + 1).padStart(2, "0")} ${escapeAttribute(preset.name)}" title="${escapeAttribute(preset.name)}">
      <img src="${escapeAttribute(preset.url)}" alt="" loading="${index < 6 ? "eager" : "lazy"}">
      <span class="showcase-background-preset__index">BG ${String(index + 1).padStart(2, "0")}</span>
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
  }
  updateCurrent(activeKey);
}

// The big card above the thumbnails: the chosen preset (number, name, description) or the custom image.
function updateCurrent(activeKey = keyField.value) {
  if (!currentBox) return;
  const preset = SHOWCASE_BACKGROUND_PRESETS.find(item => item.key === activeKey);
  const url = urlField.value.trim();
  const file = fileField?.files?.[0] ?? null;
  if (fileUrl) { URL.revokeObjectURL(fileUrl); fileUrl = ""; }
  let image = "";
  let label = "";
  let title = "";
  let detail = "";
  if (preset) {
    const index = SHOWCASE_BACKGROUND_PRESETS.indexOf(preset);
    image = preset.url;
    label = `BG ${String(index + 1).padStart(2, "0")} / PRESET`;
    title = preset.name;
    detail = preset.description;
  } else if (url) {
    image = url;
    label = "CUSTOM / URL";
    title = "自分の画像(URL)";
    detail = url;
  } else if (file) {
    fileUrl = URL.createObjectURL(file);
    image = fileUrl;
    label = "CUSTOM / FILE";
    title = "自分の画像(ファイル)";
    detail = file.name;
  }
  if (!image) {
    currentBox.dataset.state = "empty";
    currentBox.innerHTML = `<p class="background-current__empty">背景は未設定です。下の一覧から選ぶか、「自分の画像を使う」で指定できます。</p>`;
    return;
  }
  currentBox.dataset.state = preset ? "preset" : "custom";
  currentBox.innerHTML = `
    <div class="background-current__visual"><img src="${escapeAttribute(image)}" alt=""></div>
    <div class="background-current__body">
      <small>${escapeHtml(label)}</small>
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(detail)}</span>
    </div>`;
}
