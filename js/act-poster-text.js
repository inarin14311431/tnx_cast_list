// The words around the announcement poster: the alt text of the picture, the text of the X post, the limits of the two inputs, the name of the
// file and what is remembered of the inputs for the tab. Pure (the storage is passed in), so tests/act-poster-text.test.mjs runs it in Node.
// The model comes from js/act-poster-layout.js buildPosterModel; the screen that uses this is js/showcase-poster-panel.js.
import { buildSharePostText, buildXIntentUrl } from "./showcase-publish-result-core.js?v=37f06130";
import { POSTER_MAX_DATE_LENGTH, POSTER_MAX_CATCH_LENGTH } from "./act-poster-layout.js?v=29613725";

export const POSTER_INPUT_LIMITS = Object.freeze({ date: POSTER_MAX_DATE_LENGTH, catchCopy: POSTER_MAX_CATCH_LENGTH });
export const POSTER_ALT_MAX_LENGTH = 1000; // X's limit for the description of a picture
export const POSTER_STORAGE_PREFIX = "tnx-act-poster-inputs:";

const clean = value => String(value ?? "").trim();

export const clampPosterInput = (value, max) => Array.from(String(value ?? "")).slice(0, max).join("");

// "HO1 カブト “EX-Rookie” ルカ 日向": one cast on a line, for the post and for the alt text.
export function posterCastLine(cast) {
  return [cast.ho, cast.style, cast.handle, cast.name].map(clean).filter(Boolean).join(" ");
}

// The alt text: what the picture shows, for people who cannot see it. The act, who runs it, then each HO with its style, handle, name and the readings.
export function buildPosterAltText(model, limit = POSTER_ALT_MAX_LENGTH) {
  const reading = (value, label) => (clean(value) ? `(${label}: ${clean(value)})` : "");
  const lines = [`アクト紹介の予告ポスター。アクト名「${clean(model.actName)}」${clean(model.subtitle) ? `、${clean(model.subtitle)}` : ""}。`];
  if (clean(model.rulerName)) lines.push(`RL: ${clean(model.rulerName)}`);
  if (clean(model.writerName)) lines.push(`ライター: ${clean(model.writerName)}`);
  for (const cast of model.casts) {
    lines.push([
      posterCastLine(cast),
      reading(cast.handleReading, "ハンドルの読み"),
      reading(cast.nameReading, "氏名の読み")
    ].filter(Boolean).join(" "));
  }
  if (clean(model.catchCopy)) lines.push(`キャッチコピー: ${clean(model.catchCopy)}`);
  lines.push(`日付: ${clean(model.dateText)}`);
  const text = lines.join("\n");
  const chars = Array.from(text);
  return chars.length > limit ? `${chars.slice(0, limit - 1).join("")}…` : text;
}

// The post text for X: the act (with its subtitle), who runs it, the HO list and the hashtag. (The public URL goes in the intent link's own parameter.)
function postPartsOf(model) {
  return { actName: model.actName, subtitle: model.subtitle, rulerName: model.rulerName, writerName: model.writerName, castLines: model.casts.map(posterCastLine) };
}
export const buildPosterPostText = model => buildSharePostText(postPartsOf(model));
export const buildPosterPostUrl = (model, url) => buildXIntentUrl({ ...postPartsOf(model), url });

export function posterFileName(slug, type = "image/png") {
  const id = String(slug ?? "").trim().replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "") || "act";
  return `act-poster-${id}.${type === "image/jpeg" ? "jpg" : "png"}`;
}

// ---- what is remembered for this tab (sessionStorage, per act; never the database) ----------------------------------------------------------
const keyOf = slug => `${POSTER_STORAGE_PREFIX}${String(slug ?? "").trim().toLowerCase()}`;

// {date, catchCopy} as last typed for this act, or null (nothing stored, damaged, or the storage cannot be used).
export function loadPosterInputs(storage, slug) {
  try {
    const stored = JSON.parse(storage?.getItem(keyOf(slug)) ?? "null");
    if (!stored || typeof stored !== "object") return null;
    return {
      date: clampPosterInput(typeof stored.date === "string" ? stored.date : "", POSTER_INPUT_LIMITS.date),
      catchCopy: clampPosterInput(typeof stored.catchCopy === "string" ? stored.catchCopy : "", POSTER_INPUT_LIMITS.catchCopy)
    };
  } catch {
    return null;
  }
}

export function savePosterInputs(storage, slug, { date, catchCopy } = {}) {
  if (!storage) return false;
  try {
    storage.setItem(keyOf(slug), JSON.stringify({
      date: clampPosterInput(date, POSTER_INPUT_LIMITS.date),
      catchCopy: clampPosterInput(catchCopy, POSTER_INPUT_LIMITS.catchCopy)
    }));
    return true;
  } catch {
    return false;
  }
}
