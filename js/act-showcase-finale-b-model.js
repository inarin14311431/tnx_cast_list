// FINALE, pattern B ("key visual"): what the page shows, read from the model. Pure: no DOM, no timers (js/act-showcase-finale-b.js draws it).
// The hero is the casts side by side as equal vertical bands under the act name; under it come a credits strip, the trailer, one
// card per cast (the handout, styles and data of that cast) and one card per guest (portrait, persona style, data, tagline, summary). See docs/ACT_SHOWCASE_SCENES.md section 6 #7 (5th pattern: finale).
import { roleForCast } from "./act-showcase-visual-caption.js?v=47f6e034";
import { splitCastName } from "./act-showcase-handout-fields.js?v=991c7b8e";
import { formatShowcaseHandle, normalizeShowcaseDisplayQuotes, stripOuterDisplayQuotes } from "./showcase-display-format.js?v=728d9084";

const clean = value => String(value ?? "").replace(/\s+/g, " ").trim();
const trim = value => String(value ?? "").trim();

// A handout whose text is one of these says nothing: no handout block is drawn for it (pattern A does the same).
export const HANDOUT_PLACEHOLDERS = Object.freeze(new Set([
  "ハンドアウト詳細は未登録です。",
  "公開用ハンドアウトは登録されていません。"
]));

export const MAX_BANDS = 6;

function resolveUrl(value, allowDataImage, base) {
  const source = trim(value);
  if (!source) return "";
  if (allowDataImage && source.startsWith("data:image/")) return source;
  try {
    const url = new URL(source, base ?? globalThis.location?.href ?? "http://localhost/");
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

// The same reading as act-showcase-page.js: http(s) and data:image URLs only. "" when there is no usable image.
export const safeImageUrl = (value, base) => resolveUrl(value, true, base);
export const safeLinkUrl = (value, base) => resolveUrl(value, false, base);

// One band of the hero per cast, in order (at most six). A cast with no usable image has no imageUrl: its band is a plain
// themed surface with the handle (or the name) on it, never the placeholder picture.
export function heroBands(casts, base) {
  const list = Array.isArray(casts) ? casts.slice(0, MAX_BANDS) : [];
  return list.map((cast, index) => {
    const { handle, name } = splitCastName(cast?.fullName);
    return {
      slot: `PC${index + 1}`,
      imageUrl: safeImageUrl(cast?.imageUrl, base),
      alt: clean(cast?.imageAlt) || clean(cast?.fullName) || `PC${index + 1} CAST`,
      label: handle || name || `CAST ${index + 1}`
    };
  });
}

// The cards: the same content as the cast board of pattern A (reading, name, tagline, styles, data, link, handout), one per cast.
export function castCards(casts, base) {
  const list = Array.isArray(casts) ? casts.slice(0, MAX_BANDS) : [];
  return list.map((cast, index) => {
    const { handle, name } = splitCastName(cast?.fullName);
    const styles = Array.isArray(cast?.styles) ? cast.styles.map(item => clean(item?.label)).filter(Boolean) : [];
    const meta = (Array.isArray(cast?.meta) ? cast.meta.slice(0, 6) : []).map(item => ({
      label: clean(item?.label) || "DATA",
      value: clean(item?.value) || "—"
    }));
    const handoutBody = trim(cast?.handout?.body);
    const handout = handoutBody && !HANDOUT_PLACEHOLDERS.has(handoutBody)
      ? { title: clean(cast?.handout?.title) || "HANDOUT", body: handoutBody }
      : null;
    return {
      slot: `PC${index + 1}`,
      imageUrl: safeImageUrl(cast?.imageUrl, base),
      handle,
      name: name || (handle ? "" : `CAST ${index + 1}`),
      reading: clean(cast?.reading),
      tagline: clean(cast?.tagline),
      role: roleForCast(cast),
      styles,
      meta,
      link: cast?.link?.disabled ? "" : safeLinkUrl(cast?.link?.href, base),
      handout
    };
  });
}

// The strip under the hero, like the credits under a film poster: RULER, SCENARIO WRITER and the cast. Nothing for what is missing.
export function creditItems(model) {
  const items = [];
  const ruler = clean(model?.rulerName);
  if (ruler) items.push({ label: "RULER", value: ruler });
  const writer = clean(model?.scenarioWriterName);
  if (writer) items.push({ label: "SCENARIO WRITER", value: writer });
  const names = (Array.isArray(model?.casts) ? model.casts : []).map(cast => clean(cast?.fullName)).filter(Boolean);
  if (names.length) items.push({ label: "CAST", value: names.join(" / ") });
  return items;
}

// "CAST SHOWCASE" is the default sub title and says nothing: left out, as on the title card.
export function heroSubtitle(model) {
  const text = clean(model?.heroSubTitle);
  return !text || text.toUpperCase() === "CAST SHOWCASE" ? "" : text;
}

// The trailer under the credits, or null when the act has none.
export function finaleTrailer(model) {
  const body = trim(model?.trailer);
  if (!body) return null;
  const title = clean(model?.trailerTitle);
  return { title: !title || /^ACT\s*TRAILER$/i.test(title) ? "アクトトレーラー" : title, body };
}

// The persona is shown as its style name followed by ◎ (no text label), like the cast styles ("トーキー◎"); a value that
// already carries ◎ or ● is left as it is.
const personaStyleLabel = value => (!value || /[◎●]/u.test(value) ? value : `${value}◎`);

// A data value that is only a dash ("—", "-", "―") says nothing: the row is left out.
const isBlankValue = value => !value || /^[\-‐‑–—―ー－]+$/u.test(value);

// The guests registered for the act (rows of get_public_act_showcase_guests, in their order): one card each, with the same
// kind of content as the guest cards of pattern A (portrait, display name, persona style, affiliation / age / gender, tagline,
// summary). The tagline has no quotes around it, as on the cast cards. A row without a name is left out. A guest with no usable image has no imageUrl: the card has no portrait.
export function guestCards(rows, base) {
  const list = Array.isArray(rows) ? rows : [];
  return list
    .filter(row => clean(row?.name))
    .map((row, index) => {
      const meta = [
        ["AFFILIATION", clean(row?.affiliation)],
        ["AGE", clean(row?.age)],
        ["GENDER", clean(row?.gender)]
      ]
        .filter(([, value]) => !isBlankValue(value))
        .map(([label, value]) => ({ label, value }));
      return {
        slot: `GUEST ${String(index + 1).padStart(2, "0")}`,
        imageUrl: safeImageUrl(row?.image_url, base),
        handle: normalizeShowcaseDisplayQuotes(formatShowcaseHandle(clean(row?.handle))),
        name: normalizeShowcaseDisplayQuotes(clean(row?.name)),
        personaStyle: personaStyleLabel(clean(row?.persona_style)),
        meta,
        tagline: stripOuterDisplayQuotes(clean(row?.tagline)),
        summary: trim(row?.summary)
      };
    });
}
