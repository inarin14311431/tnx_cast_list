const params = new URLSearchParams(location.search);
const publicId = params.get("id")?.trim() || "";

const FORMAT = "TNX_CAST_TRANSFER_TSV";
const FRAGMENT_PREFIX = "tnx-transfer=";
const WAREHOUSE_URL = "https://character-sheets.appspot.com/tnx/edit.html";
const MOBILE_LOADER_URL = new URL(
  "./tnx-transfer-mobile-loader.js?v=2",
  import.meta.url
).href;

const castLabel = document.querySelector("#mobile-transfer-cast");
const backLink = document.querySelector("#mobile-transfer-back");
const bookmarkletSlot = document.querySelector("#mobile-transfer-bookmarklet-slot");
const tsvSlot = document.querySelector("#mobile-transfer-tsv-slot");
const status = document.querySelector("#mobile-transfer-status");
const warehouseLink = document.querySelector("#mobile-transfer-open");

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

  await import("./transfer-tsv-export.js?v=8");

  const transferButton = document.querySelector("#transfer-tsv-copy-button");
  const originalBookmarkletButton = document.querySelector("#transfer-bookmarklet-copy-button");

  if (
    !(transferButton instanceof HTMLButtonElement) ||
    !(originalBookmarkletButton instanceof HTMLButtonElement)
  ) {
    throw new Error("転記ツールを読み込めませんでした。");
  }

  const bookmarkletButton = originalBookmarkletButton.cloneNode(true);
  originalBookmarkletButton.replaceWith(bookmarkletButton);

  bookmarkletSlot?.append(bookmarkletButton);
  tsvSlot?.append(transferButton);

  bookmarkletButton.addEventListener("click", copyMobileBookmarklet);
  observeTransferState(transferButton);

  transferButton.addEventListener("click", () => {
    setStatus("転記データをコピーしています…", "working");
  });

  warehouseLink?.addEventListener("click", prepareAndOpenWarehouse);
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
      "スマホ用転記BMをコピーしました。ブックマークURLを最新版へ更新してください。",
      "success"
    );
  } catch (error) {
    console.error(error);
    setStatus(
      error instanceof Error ? error.message : "転記BMをコピーできませんでした。",
      "error"
    );
  }
}

async function prepareAndOpenWarehouse(event) {
  event.preventDefault();
  setStatus("転記データを確認・圧縮しています…", "working");

  try {
    const transferText = await readClipboard();
    const stats = validateTransferText(transferText);
    const payload = await compressToBase64Url(transferText);
    const targetUrl = `${WAREHOUSE_URL}#${FRAGMENT_PREFIX}${payload}`;

    setStatus(
      `転記データ確認済み：${stats.rows}行 / ${stats.characters.toLocaleString()}文字。倉庫を開きます…`,
      "success"
    );

    window.setTimeout(() => {
      location.href = targetUrl;
    }, 120);
  } catch (error) {
    console.error("Mobile transfer preparation failed", error);
    setStatus(
      error instanceof Error ? error.message : "転記データを確認できませんでした。",
      "error"
    );
  }
}

function validateTransferText(text) {
  const normalized = String(text || "").replace(/\r/g, "");
  const lines = normalized.split("\n").filter(Boolean);

  if (!lines[0]?.startsWith(`${FORMAT}\t`)) {
    throw new Error(
      "クリップボードに転記TSVがありません。先に「転記TSV」を押してください。"
    );
  }

  const rows = lines.filter(line => line.startsWith(`${FORMAT}\t`)).length;
  if (rows <= 1) {
    throw new Error(
      "転記TSVに実データがありません。「転記TSV」をもう一度押してから倉庫を開いてください。"
    );
  }

  return {
    rows: rows - 1,
    characters: normalized.length
  };
}

async function compressToBase64Url(text) {
  if (typeof CompressionStream !== "function") {
    throw new Error("このブラウザはスマホ転記用の圧縮機能に対応していません。最新のSafari / Chromeを使用してください。");
  }

  const source = new Blob([new TextEncoder().encode(text)]).stream();
  const compressed = source.pipeThrough(new CompressionStream("gzip"));
  const bytes = new Uint8Array(await new Response(compressed).arrayBuffer());

  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function readClipboard() {
  if (!navigator.clipboard?.readText || !window.isSecureContext) {
    throw new Error(
      "このブラウザでは転記データを確認できません。Safari / Chrome のHTTPS画面から実行してください。"
    );
  }

  try {
    return await navigator.clipboard.readText();
  } catch (error) {
    console.error("Clipboard read failed on mobile transfer page", error);
    throw new Error(
      "クリップボードを読み取れませんでした。アクセスを許可してから、もう一度「倉庫を開く」を押してください。"
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

function observeTransferState(transferButton) {
  const updateFromButton = () => {
    const copyState = transferButton.dataset.copyState || "";

    if (copyState === "copying") {
      setStatus("転記データをコピーしています…", "working");
      return;
    }

    if (copyState === "success") {
      setStatus(
        "転記TSVをコピーしました。続けて「キャラクターシート倉庫を開く」を押してください。",
        "success"
      );
      return;
    }

    if (copyState === "error") {
      setStatus(
        transferButton.title || "転記TSVをコピーできませんでした。",
        "error"
      );
    }
  };

  const observer = new MutationObserver(mutations => {
    if (
      mutations.some(
        mutation =>
          mutation.type === "attributes" &&
          mutation.attributeName === "data-copy-state"
      )
    ) {
      updateFromButton();
    }
  });

  observer.observe(transferButton, {
    attributes: true,
    attributeFilter: ["data-copy-state"]
  });

  updateFromButton();
}

function setStatus(message, state = "") {
  if (!status) return;
  status.textContent = message;
  status.dataset.state = state;
}
