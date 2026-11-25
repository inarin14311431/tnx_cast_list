const params = new URLSearchParams(location.search);
const publicId = params.get("id")?.trim() || "";

const MOBILE_LOADER_URL = new URL(
  "./tnx-transfer-mobile-loader.js?v=2",
  import.meta.url
).href;

const castLabel = document.querySelector("#mobile-transfer-cast");
const backLink = document.querySelector("#mobile-transfer-back");
const bookmarkletSlot = document.querySelector("#mobile-transfer-bookmarklet-slot");
const tsvSlot = document.querySelector("#mobile-transfer-tsv-slot");
const status = document.querySelector("#mobile-transfer-status");
const openSlot = document.querySelector("#mobile-transfer-open-slot");
const tsvFallback = document.querySelector("#mobile-transfer-tsv-fallback");

initialize().catch(error => {
  console.error("Mobile bookmarklet transfer initialization failed", error);
  setStatus(
    error instanceof Error ? error.message : "スマホ転記を初期化できませんでした。",
    "error"
  );
});

async function initialize() {
  if (!publicId) {
    if (castLabel) castLabel.textContent = "CAST ID が指定されていません。";
    setStatus("キャスト画面からスマホ転記を開いてください。", "error");
    return;
  }

  if (castLabel) castLabel.textContent = `CAST ID ${publicId}`;
  if (backLink) backLink.href = `./cast.html?id=${encodeURIComponent(publicId)}`;

  await import("./transfer-tsv-export.js?v=ea37be54");

  // Exactly one exists: the transfer button, or TSV copy where the browser cannot build the fragment.
  const openButton = document.querySelector("#transfer-open-button");
  const transferButton = document.querySelector("#transfer-tsv-copy-button");
  const originalBookmarkletButton = document.querySelector("#transfer-bookmarklet-copy-button");

  if (
    !(originalBookmarkletButton instanceof HTMLButtonElement) ||
    !((openButton || transferButton) instanceof HTMLButtonElement)
  ) {
    throw new Error("転記ツールを読み込めませんでした。");
  }

  const bookmarkletButton = originalBookmarkletButton.cloneNode(true);
  originalBookmarkletButton.replaceWith(bookmarkletButton);

  bookmarkletSlot?.append(bookmarkletButton);
  bookmarkletButton.addEventListener("click", copyMobileBookmarklet);

  if (openButton) {
    openSlot?.append(openButton);
    observeButton(openButton, "新しいタブで倉庫を開きました。登録したブックマークを実行してください。");
    return;
  }

  if (tsvFallback) tsvFallback.hidden = false;
  tsvSlot?.append(transferButton);
  observeButton(transferButton, "転記TSVをコピーしました。続けて「キャラクターシート倉庫を開く」を押してください。");
}

async function copyMobileBookmarklet() {
  const bookmarklet =
    `javascript:(()=>{const s=document.createElement('script');` +
    `s.src='${MOBILE_LOADER_URL}&t='+Date.now();` +
    `s.onload=()=>s.remove();` +
    `s.onerror=()=>alert('転記スクリプトを読み込めませんでした。');` +
    `document.documentElement.append(s)})()`;

  try {
    await writeClipboard(bookmarklet);
    setStatus(
      "スマホ用転記ブックマークレットをコピーしました。ブックマークURLを最新版へ更新してください。",
      "success"
    );
  } catch (error) {
    console.error(error);
    setStatus(
      error instanceof Error ? error.message : "転記ブックマークレットをコピーできませんでした。",
      "error"
    );
  }
}

async function writeClipboard(text) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();

  if (!copied) {
    throw new Error("クリップボードへコピーできませんでした。");
  }
}

function observeButton(button, successMessage) {
  const update = () => {
    const state = button.dataset.copyState || "idle";
    if (state === "copying") setStatus("転記データを準備しています…", "working");
    else if (state === "success") setStatus(successMessage, "success");
    else if (state === "error") setStatus(button.title || "転記データを準備できませんでした。", "error");
    else if (button.title) setStatus(button.title, "");
  };

  new MutationObserver(update).observe(button, {
    attributes: true,
    attributeFilter: ["data-copy-state", "title"]
  });
  update();
}

function setStatus(message, state = "") {
  if (!status) return;
  status.textContent = message;
  status.dataset.state = state;
}
