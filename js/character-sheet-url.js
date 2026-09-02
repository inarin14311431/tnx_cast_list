const CHARACTER_SHEETS_ORIGIN = "https://character-sheets.appspot.com";
const TNX_EDIT_PATH = "/tnx/edit.html";
const TNX_DISPLAY_PATHS = new Set(["/tnx/display", "/tnx/display.html"]);
const KEY_PATTERN = /^[A-Za-z0-9_-]+$/;

export function extractCharacterSheetKey(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.origin !== CHARACTER_SHEETS_ORIGIN) return null;
    if (url.pathname !== TNX_EDIT_PATH && !TNX_DISPLAY_PATHS.has(url.pathname)) return null;
    const key = String(url.searchParams.get("key") || "").trim();
    return KEY_PATTERN.test(key) ? key : null;
  } catch {
    return null;
  }
}

export function buildCharacterSheetEditUrl(key) {
  const value = String(key || "").trim();
  if (!KEY_PATTERN.test(value)) return null;
  const url = new URL(TNX_EDIT_PATH, CHARACTER_SHEETS_ORIGIN);
  url.searchParams.set("key", value);
  return url.href;
}

export function normalizeCharacterSheetUrl(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";
  const key = extractCharacterSheetKey(value);
  return key ? buildCharacterSheetEditUrl(key) : null;
}

export function buildCharacterSheetReadUrl(raw) {
  const key = extractCharacterSheetKey(raw);
  if (!key) return key === "" ? "" : null;
  const url = new URL("/tnx/display", CHARACTER_SHEETS_ORIGIN);
  url.searchParams.set("ajax", "1");
  url.searchParams.set("key", key);
  return url.href;
}

export function isValidCharacterSheetUrl(raw) {
  return normalizeCharacterSheetUrl(raw) !== null;
}
