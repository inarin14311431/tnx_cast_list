import { supabase } from "./supabase-client.js";
import { SITE_BASE_PATH } from "./config.js?v=2";

const VISIBILITIES = new Set(["public", "unlisted", "private"]);
const UNLISTED_LABEL = "限定公開 / UNLISTED";
let currentCharacter = null;
let currentShareToken = "";
let loadingShareToken = false;

function normalizeVisibility(value) {
  return VISIBILITIES.has(String(value || "")) ? String(value) : "private";
}

function getVisibilitySelects() {
  return [
    document.querySelector("#visibility"),
    document.querySelector('[data-mobile-character-field="visibility"]'),
    document.querySelector("#mobile-global-visibility")
  ].filter(Boolean);
}

function ensureUnlistedOption(select) {
  if (!select || [...select.options].some(option => option.value === "unlisted")) return;
  const option = document.createElement("option");
  option.value = "unlisted";
  option.textContent = UNLISTED_LABEL;
  const privateOption = [...select.options].find(item => item.value === "private");
  select.insertBefore(option, privateOption || null);
}

function currentVisibility() {
  const source = document.querySelector("#visibility")
    || document.querySelector('[data-mobile-character-field="visibility"]')
    || document.querySelector("#mobile-global-visibility");
  return normalizeVisibility(source?.value);
}

function savedVisibility() {
  return normalizeVisibility(currentCharacter?.visibility);
}

function shouldShowSharePanel() {
  return currentVisibility() === "unlisted" || savedVisibility() === "unlisted";
}

function buildShareUrl(publicId, shareToken) {
  if (!publicId || !shareToken) return "";
  const url = new URL(`${SITE_BASE_PATH}cast.html`, window.location.origin);
  url.searchParams.set("id", publicId);
  url.searchParams.set("share", shareToken);
  return url.toString();
}

function activeShareUrl() {
  if (savedVisibility() !== "unlisted") return "";
  return buildShareUrl(currentCharacter?.public_id, currentShareToken);
}

function findPanelHost() {
  const mobileActions = document.querySelector(".mobile-sheet-actions");
  if (mobileActions) return { host: mobileActions, before: document.querySelector("#mobile-save") };
  const visibility = document.querySelector("#visibility");
  const label = visibility?.closest("label");
  return label?.parentElement ? { host: label.parentElement, before: label.nextSibling } : null;
}

function ensurePanel() {
  let panel = document.querySelector("#character-share-panel");
  if (panel) return panel;
  const target = findPanelHost();
  if (!target) return null;

  panel = document.createElement("section");
  panel.id = "character-share-panel";
  panel.className = "character-share-panel";
  panel.hidden = !shouldShowSharePanel();
  panel.innerHTML = `
    <strong>限定公開URL <small>UNLISTED SHARE LINK</small></strong>
    <p>URLを知っている人のみ閲覧できます。一覧・検索には表示されません。</p>
    <div class="character-share-panel__controls">
      <button id="character-share-copy" type="button">URLをコピー</button>
    </div>
    <p id="character-share-status" class="character-share-panel__status" aria-live="polite"></p>
    <p id="character-share-url-fallback" class="character-share-panel__url" hidden></p>
  `;
  target.host.insertBefore(panel, target.before || null);
  panel.querySelector("#character-share-copy")?.addEventListener("click", copyShareUrl);
  return panel;
}

function setStatus(message) {
  const element = document.querySelector("#character-share-status");
  if (element) element.textContent = message || "";
}

function setFallbackUrl(url = "") {
  const element = document.querySelector("#character-share-url-fallback");
  if (!element) return;
  element.textContent = url;
  element.hidden = !url;
}

function renderPanel() {
  getVisibilitySelects().forEach(ensureUnlistedOption);
  const panel = ensurePanel();
  if (!panel) return;
  const shouldShow = shouldShowSharePanel();
  panel.hidden = !shouldShow;
  if (!shouldShow) {
    setFallbackUrl();
    return;
  }

  const button = panel.querySelector("#character-share-copy");
  const isSavedUnlisted = savedVisibility() === "unlisted";
  const url = activeShareUrl();
  if (button) button.disabled = !url;
  setFallbackUrl();

  if (!currentCharacter?.id) {
    setStatus("キャストを限定公開で保存すると共有URLが発行されます。");
  } else if (!isSavedUnlisted) {
    setStatus("限定公開を保存すると共有URLが有効になります。");
  } else if (loadingShareToken) {
    setStatus("共有URLを取得しています…");
  } else if (url) {
    setStatus("このURLはログインしていない相手にも共有できます。");
  } else {
    setStatus("共有URLを取得できませんでした。保存後に再読み込みしてください。");
  }
}

async function fetchShareToken(character) {
  currentCharacter = character || currentCharacter;
  currentShareToken = "";
  if (!currentCharacter?.id) {
    renderPanel();
    return;
  }

  loadingShareToken = true;
  renderPanel();
  try {
    const { data, error } = await supabase
      .from("character_share_links")
      .select("share_token")
      .eq("character_id", currentCharacter.id)
      .maybeSingle();
    if (error) throw error;
    currentShareToken = data?.share_token || "";
  } catch (error) {
    console.error("Share link could not be loaded.", error);
    currentShareToken = "";
  } finally {
    loadingShareToken = false;
    renderPanel();
  }
}

async function loadCharacterFromLocation() {
  const publicId = new URLSearchParams(window.location.search).get("id")?.trim();
  if (!publicId) {
    renderPanel();
    return;
  }
  try {
    const { data, error } = await supabase
      .from("characters")
      .select("id,public_id,visibility")
      .eq("public_id", publicId)
      .maybeSingle();
    if (error) throw error;
    if (data) await fetchShareToken(data);
  } catch (error) {
    console.error("Character share context could not be loaded.", error);
    renderPanel();
  }
}

async function copyShareUrl() {
  const text = activeShareUrl();
  if (!text) return;
  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard API is unavailable.");
    await navigator.clipboard.writeText(text);
    setFallbackUrl();
    setStatus("共有URLをコピーしました。");
  } catch (error) {
    console.error(error);
    setFallbackUrl(text);
    setStatus("コピーに失敗しました。下のURLを手動でコピーしてください。");
  }
}

function syncVisibilityValue(value) {
  const normalized = normalizeVisibility(value);
  for (const select of getVisibilitySelects()) {
    ensureUnlistedOption(select);
    if (select.value !== normalized) select.value = normalized;
  }
  renderPanel();
}

function bindEvents() {
  document.addEventListener("change", event => {
    const select = event.target.closest?.("#visibility, [data-mobile-character-field=\"visibility\"], #mobile-global-visibility");
    if (select) event.__tnxVisibilityValue = normalizeVisibility(select.value);
  }, true);

  document.addEventListener("change", event => {
    const value = event.__tnxVisibilityValue;
    if (!value) return;
    queueMicrotask(() => syncVisibilityValue(value));
  });

  window.addEventListener("tnx:character-saved", event => {
    const detail = event.detail || {};
    fetchShareToken({
      ...(currentCharacter || {}),
      id: detail.id || currentCharacter?.id,
      public_id: detail.publicId || currentCharacter?.public_id,
      visibility: currentVisibility()
    });
  });

  document.addEventListener("tnx:mobile-profile-loaded", event => {
    const character = event.detail?.character;
    if (character?.id) fetchShareToken(character);
    else renderPanel();
  });

  const observer = new MutationObserver(() => {
    const hadPanel = Boolean(document.querySelector("#character-share-panel"));
    getVisibilitySelects().forEach(ensureUnlistedOption);
    const panel = ensurePanel();
    if (!hadPanel && panel) queueMicrotask(renderPanel);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

function init() {
  if (window.__TNXCharacterShareEditorInitialized) return;
  window.__TNXCharacterShareEditorInitialized = true;
  getVisibilitySelects().forEach(ensureUnlistedOption);
  ensurePanel();
  bindEvents();
  loadCharacterFromLocation();
  renderPanel();
}

init();
