const FOCUS_HASH_KEY_X = "tnx-focus-x";
const FOCUS_HASH_KEY_Y = "tnx-focus-y";
const ZOOM_HASH_KEY = "tnx-zoom";
const DEFAULT_FOCUS_X = 50;
const DEFAULT_FOCUS_Y = 0;
const DEFAULT_ZOOM = 100;
const MIN_ZOOM = 100;
const MAX_ZOOM = 200;

function clampFocus(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(100, Math.max(0, Math.round(numeric)));
}

function clampZoom(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_ZOOM;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(numeric)));
}

function splitImageUrl(value) {
  const source = String(value ?? "").trim();
  const hashIndex = source.indexOf("#");
  if (hashIndex < 0) return { base: source, hash: "" };
  return {
    base: source.slice(0, hashIndex),
    hash: source.slice(hashIndex + 1)
  };
}

export function getImageFocusY(imageUrl) {
  const { hash } = splitImageUrl(imageUrl);
  if (!hash) return DEFAULT_FOCUS_Y;
  const raw = new URLSearchParams(hash).get(FOCUS_HASH_KEY_Y);
  return raw === null ? DEFAULT_FOCUS_Y : clampFocus(raw, DEFAULT_FOCUS_Y);
}

export function getImageFocusX(imageUrl) {
  const { hash } = splitImageUrl(imageUrl);
  if (!hash) return DEFAULT_FOCUS_X;
  const raw = new URLSearchParams(hash).get(FOCUS_HASH_KEY_X);
  return raw === null ? DEFAULT_FOCUS_X : clampFocus(raw, DEFAULT_FOCUS_X);
}

export function getImageZoom(imageUrl) {
  const { hash } = splitImageUrl(imageUrl);
  if (!hash) return DEFAULT_ZOOM;
  const raw = new URLSearchParams(hash).get(ZOOM_HASH_KEY);
  return raw === null ? DEFAULT_ZOOM : clampZoom(raw);
}

function setFocusValue(imageUrl, key, focus, defaultFocus) {
  const { base, hash } = splitImageUrl(imageUrl);
  if (!base) return "";

  const params = new URLSearchParams(hash);
  const normalized = clampFocus(focus, defaultFocus);
  if (normalized === defaultFocus) params.delete(key);
  else params.set(key, String(normalized));

  const nextHash = params.toString();
  return nextHash ? `${base}#${nextHash}` : base;
}

export function setImageFocusX(imageUrl, focusX) {
  return setFocusValue(imageUrl, FOCUS_HASH_KEY_X, focusX, DEFAULT_FOCUS_X);
}

export function setImageFocusY(imageUrl, focusY) {
  return setFocusValue(imageUrl, FOCUS_HASH_KEY_Y, focusY, DEFAULT_FOCUS_Y);
}

export function setImageZoom(imageUrl, zoom) {
  const { base, hash } = splitImageUrl(imageUrl);
  if (!base) return "";

  const params = new URLSearchParams(hash);
  const normalized = clampZoom(zoom);
  if (normalized === DEFAULT_ZOOM) params.delete(ZOOM_HASH_KEY);
  else params.set(ZOOM_HASH_KEY, String(normalized));

  const nextHash = params.toString();
  return nextHash ? `${base}#${nextHash}` : base;
}

export function getImageObjectPosition(imageUrl) {
  return `${getImageFocusX(imageUrl)}% ${getImageFocusY(imageUrl)}%`;
}

export function getImageScale(imageUrl) {
  return getImageZoom(imageUrl) / 100;
}

export function getImageTransformOrigin(imageUrl) {
  return getImageObjectPosition(imageUrl);
}
