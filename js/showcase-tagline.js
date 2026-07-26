import { supabase } from "./supabase-client.js";

const selectedCasts = document.querySelector("#selected-casts");
const preview = document.querySelector("#showcase-preview");
const downloadButton = document.querySelector("#download-button");
const copyButton = document.querySelector("#copy-button");
const publicGrid = document.querySelector("#public-cast-grid");
const privateGrid = document.querySelector("#owned-private-cast-grid");
const manualAddButton = document.querySelector("#add-manual-cast");
const publishSlug = document.querySelector("#publish-slug");
const generatorStatus = document.querySelector("#generator-status");
const taglines = [];

if (selectedCasts) {
  bindLibrarySelection(publicGrid, "publicCharacterId");
  bindLibrarySelection(privateGrid, "privateCharacterId");
  bindSelectionActions();
  bindTaglineInputs();
  bindManualAddition();
  observeSelectionRendering();
  injectTaglineFields();
}

if (preview) {
  preview.addEventListener("load", () => {
    const source = String(preview.srcdoc || "");
    if (!source) return;
    const transformed = applyTaglines(source);
    if (transformed !== source) preview.srcdoc = transformed;
  });
}

bindOutputActions();
wrapShowcasePublication();

function bindLibrarySelection(grid, datasetKey) {
  grid?.addEventListener("click", event => {
    const card = event.target.closest(`[data-${toKebabCase(datasetKey)}]`);
    if (!card || card.disabled) return;

    if (card.getAttribute("aria-pressed") === "true") {
      const characterId = card.dataset[datasetKey];
      const row = [...selectedCasts.querySelectorAll("[data-selected-index]")]
        .find(item => String(item.dataset.characterId || "") === String(characterId || ""));
      const index = Number(row?.dataset.selectedIndex);
      if (Number.isInteger(index) && index >= 0) taglines.splice(index, 1);
    } else {
      taglines.push("");
    }

    scheduleFieldInjection();
  }, true);
}

function bindManualAddition() {
  manualAddButton?.addEventListener("click", () => {
    if (manualAddButton.disabled) return;
    taglines.push("");
    scheduleFieldInjection();
  }, true);
}

function bindSelectionActions() {
  selectedCasts.addEventListener("click", event => {
    const button = event.target.closest("[data-action]");
    const row = event.target.closest("[data-selected-index]");
    if (!button || !row) return;

    const index = Number(row.dataset.selectedIndex);
    if (!Number.isInteger(index) || index < 0 || index >= taglines.length) return;

    if (button.dataset.action === "up" && index > 0) {
      [taglines[index - 1], taglines[index]] = [taglines[index], taglines[index - 1]];
    } else if (button.dataset.action === "down" && index < taglines.length - 1) {
      [taglines[index], taglines[index + 1]] = [taglines[index + 1], taglines[index]];
    } else if (button.dataset.action === "remove") {
      taglines.splice(index, 1);
    }

    scheduleFieldInjection();
  }, true);
}

function bindTaglineInputs() {
  selectedCasts.addEventListener("input", event => {
    const field = event.target.closest('[data-field="tagline"]');
    const row = event.target.closest("[data-selected-index]");
    if (!field || !row) return;

    const index = Number(row.dataset.selectedIndex);
    if (!Number.isInteger(index) || index < 0) return;
    taglines[index] = field.value;
  }, true);
}

function observeSelectionRendering() {
  const observer = new MutationObserver(mutations => {
    if (mutations.some(mutation => mutation.addedNodes.length || mutation.removedNodes.length)) {
      scheduleFieldInjection();
    }
  });
  observer.observe(selectedCasts, { childList: true, subtree: true });
}

function scheduleFieldInjection() {
  window.setTimeout(injectTaglineFields, 0);
}

function injectTaglineFields() {
  selectedCasts.querySelectorAll("[data-selected-index]").forEach(row => {
    const index = Number(row.dataset.selectedIndex);
    if (!Number.isInteger(index) || index < 0) return;
    if (taglines[index] === undefined) taglines[index] = "";

    let input = row.querySelector('[data-field="tagline"]');
    if (!input) {
      const manual = row.dataset.manual === "true";
      const fields = row.querySelector(manual ? ".selected-cast__manual-fields" : ".selected-cast__fields");
      const handout = fields?.querySelector(manual ? ".manual-field--handout" : ".selected-cast__handout-field");
      if (!fields) return;

      const label = document.createElement("label");
      label.className = manual ? "manual-field--tagline" : "selected-cast__tagline-field";
      label.append("一言／キャッチコピー");
      input = document.createElement("input");
      input.type = "text";
      input.dataset.field = "tagline";
      input.maxLength = 240;
      input.placeholder = "例：真実は、いつだって硝煙の向こうにある";
      label.append(input);
      fields.insertBefore(label, handout || null);
    }

    if (input.value !== taglines[index]) input.value = taglines[index];
  });
}

function bindOutputActions() {
  downloadButton?.addEventListener("click", event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const html = getOutputHtml();
    if (!html) return setStatus("先にHTMLを生成してください。", "error");

    const slug = normalizeSlug(publishSlug?.value) || "act-showcase";
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${slug}.html`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, true);

  copyButton?.addEventListener("click", async event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const html = getOutputHtml();
    if (!html) return setStatus("先にHTMLを生成してください。", "error");

    try {
      await navigator.clipboard.writeText(html);
      setStatus("一言／キャッチコピーを含むHTMLをクリップボードへコピーしました。", "success");
    } catch (error) {
      console.error(error);
      setStatus("クリップボードへのコピーに失敗しました。", "error");
    }
  }, true);
}

function wrapShowcasePublication() {
  const functions = supabase?.functions;
  if (!functions || typeof functions.invoke !== "function") return;
  const originalInvoke = functions.invoke.bind(functions);

  functions.invoke = (functionName, options) => {
    if (functionName !== "publish-showcase" || !options?.body?.html) {
      return originalInvoke(functionName, options);
    }

    return originalInvoke(functionName, {
      ...options,
      body: {
        ...options.body,
        html: applyTaglines(String(options.body.html))
      }
    });
  };
}

function getOutputHtml() {
  const source = String(preview?.srcdoc || "");
  return source ? applyTaglines(source) : "";
}

function applyTaglines(source) {
  if (!source.trim()) return source;
  const signature = createSignature();
  if (!taglines.some(value => String(value || "").trim())) return source;

  const documentNode = new DOMParser().parseFromString(source, "text/html");
  if (documentNode.documentElement.dataset.showcaseTaglineSignature === signature) return source;

  documentNode.querySelectorAll(".cast-card__tagline").forEach(node => node.remove());
  documentNode.querySelectorAll("style[data-showcase-tagline-style]").forEach(node => node.remove());

  let inserted = 0;
  documentNode.querySelectorAll(".cast-card").forEach((card, index) => {
    const text = String(taglines[index] || "").trim();
    if (!text) return;

    const tagline = documentNode.createElement("p");
    tagline.className = "cast-card__tagline";
    tagline.textContent = `“${text}”`;
    const anchor = card.querySelector(".cast-card__handout, .cast-card__link");
    card.querySelector(".cast-card__body")?.insertBefore(tagline, anchor || null);
    inserted += 1;
  });

  if (!inserted) return source;

  const style = documentNode.createElement("style");
  style.dataset.showcaseTaglineStyle = "true";
  style.textContent = `.cast-card__tagline{margin:24px 0 0;padding:14px 16px;border-left:3px solid var(--pink);color:#ffd8eb;background:rgba(255,84,181,.045);font-size:1.05rem;font-weight:900;line-height:1.75;white-space:pre-wrap}`;
  documentNode.head.append(style);
  documentNode.documentElement.dataset.showcaseTaglineSignature = signature;
  return `<!doctype html>\n${documentNode.documentElement.outerHTML}`;
}

function createSignature() {
  const source = taglines.map(value => String(value || "").trim()).join("\u241f");
  let hash = 0x811c9dc5;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `v1-${(hash >>> 0).toString(16)}`;
}

function setStatus(message, state = "") {
  if (!generatorStatus) return;
  generatorStatus.textContent = message;
  generatorStatus.className = `generator-status${state ? ` is-${state}` : ""}`;
}

function normalizeSlug(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function toKebabCase(value) {
  return String(value).replace(/[A-Z]/g, match => `-${match.toLowerCase()}`);
}
