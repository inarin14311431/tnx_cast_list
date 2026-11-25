import { extractCharacterSheetKey, buildCharacterSheetEditUrl } from "./character-sheet-url.js?v=9b3404e3";

/* URL-fragment transfer payload shared by the cast page (encode) and the bookmarklet (decode).
 * Format: #tnxcast=v1.<base64url(gzip(JSON { mode, key, publicId, tsv }))>. gzip keeps a CRC, so a
 * truncated or altered fragment is rejected. mode "new" has an empty key and opens a blank sheet;
 * mode "update" carries the key of the sheet it may be written to. */
export const FRAGMENT_PREFIX = "#tnxcast=";
export const FRAGMENT_VERSION = "v1";
const NEW_SHEET_URL = "https://character-sheets.appspot.com/tnx/edit.html";
const TSV_FORMAT = "TNX_CAST_TRANSFER_TSV";
const MAX_ENCODED_LENGTH = 200000;
const MAX_DECODED_BYTES = 1024 * 1024;

function payloadError(userMessage) {
  return Object.assign(new Error(userMessage), { userMessage });
}

export function supportsTransferFragment() {
  return typeof CompressionStream === "function" && typeof DecompressionStream === "function";
}

/** "new" without a sheet URL, "update" with a valid one, null when the URL cannot be used. */
export function transferModeFor(sheetUrl) {
  const key = extractCharacterSheetKey(sheetUrl);
  if (key === null) return null;
  return key ? "update" : "new";
}

export function isTransferTsv(text) {
  const value = String(text || "");
  if (!value.startsWith(`${TSV_FORMAT}\t1\t`)) return false;
  return value.split("\n").filter(line => line.startsWith(`${TSV_FORMAT}\t`)).length > 1;
}

function toBase64Url(bytes) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

async function readLimited(stream) {
  const reader = stream.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_DECODED_BYTES) {
      await reader.cancel().catch(() => {});
      throw payloadError("転記データが大きすぎます。");
    }
    chunks.push(value);
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(await new Blob(chunks).arrayBuffer());
}

export async function buildTransferUrl({ sheetUrl, publicId, tsv }) {
  if (!supportsTransferFragment()) {
    throw payloadError("このブラウザは転記ボタンに対応していません。「転記TSV」を使ってください。");
  }
  const mode = transferModeFor(sheetUrl);
  if (!mode) throw payloadError("倉庫URLの形式を確認してください。");
  const key = extractCharacterSheetKey(sheetUrl);
  if (!isTransferTsv(tsv)) throw payloadError("転記データを作成できませんでした。");
  const bytes = new TextEncoder().encode(JSON.stringify({ mode, key, publicId: String(publicId || ""), tsv }));
  const compressed = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
  const encoded = toBase64Url(new Uint8Array(await new Response(compressed).arrayBuffer()));
  if (bytes.length > MAX_DECODED_BYTES || encoded.length > MAX_ENCODED_LENGTH) {
    throw payloadError("転記データが大きすぎます。");
  }
  const target = mode === "new" ? NEW_SHEET_URL : buildCharacterSheetEditUrl(key);
  return `${target}${FRAGMENT_PREFIX}${FRAGMENT_VERSION}.${encoded}`;
}

export async function decodeTransferFragment(hash) {
  const value = String(hash || "");
  if (!value.startsWith(FRAGMENT_PREFIX)) throw payloadError("転記データがありません。");
  const match = value.slice(FRAGMENT_PREFIX.length).match(/^(v\d+)\.([A-Za-z0-9_-]+)$/);
  if (!match) throw payloadError("転記データが壊れています。");
  if (match[1] !== FRAGMENT_VERSION) throw payloadError("転記データの形式が、このブックマークレットに対応していません。");
  if (match[2].length > MAX_ENCODED_LENGTH) throw payloadError("転記データが大きすぎます。");
  if (!supportsTransferFragment()) throw payloadError("このブラウザは転記データの展開に対応していません。");

  let payload;
  try {
    const stream = new Blob([fromBase64Url(match[2])]).stream().pipeThrough(new DecompressionStream("gzip"));
    payload = JSON.parse(await readLimited(stream));
  } catch (error) {
    if (error?.userMessage) throw error;
    throw payloadError("転記データが壊れています。");
  }
  const key = payload?.key;
  // Links made before modes existed carry a key only.
  const mode = payload?.mode ?? "update";
  const keyMatchesMode = typeof key === "string"
    && (mode === "update" ? /^[A-Za-z0-9_-]+$/.test(key) : mode === "new" && key === "");
  if (!keyMatchesMode || typeof payload.tsv !== "string" || !isTransferTsv(payload.tsv)) {
    throw payloadError("転記データが壊れています。");
  }
  return { mode, key, publicId: String(payload.publicId || ""), tsv: payload.tsv };
}
