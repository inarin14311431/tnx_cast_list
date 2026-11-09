// Pure helpers of the publish result card (js/showcase-publish-result.js): the label of each version, the text of the X post and
// which publish buttons read "update and republish". No DOM here, so tests/showcase-publish-result.test.mjs can run it in Node.

// The hashtag of the X post. One place, so it can be changed later.
export const SHOWCASE_HASHTAG = "#トーキョーNOVA";

export const X_INTENT_ENDPOINT = "https://x.com/intent/post";

export function normalizeMode(mode) {
  return mode === "standard" ? "standard" : "cinematic";
}

export function modeLabel(mode) {
  return normalizeMode(mode) === "standard" ? "スタンダード版" : "豪華版";
}

export function otherMode(mode) {
  return normalizeMode(mode) === "standard" ? "cinematic" : "standard";
}

// 『<act title>』のアクト紹介を公開しました — with " ― <subtitle>" after the title when there is one.
export function buildSharePostText({ actName, subtitle } = {}, hashtag = SHOWCASE_HASHTAG) {
  const title = String(actName ?? "").trim();
  const sub = String(subtitle ?? "").trim();
  const heading = sub ? `${title} ― ${sub}` : title;
  return `『${heading}』のアクト紹介を公開しました\n${hashtag}`;
}

// The X compose screen with the post text and the public URL (no API, no login): the person edits and sends it there.
export function buildXIntentUrl({ actName, subtitle, url } = {}, hashtag = SHOWCASE_HASHTAG) {
  const text = buildSharePostText({ actName, subtitle }, hashtag);
  return `${X_INTENT_ENDPOINT}?text=${encodeURIComponent(text)}&url=${encodeURIComponent(String(url ?? ""))}`;
}

// The slug the way the publisher normalizes it (js/showcase-dynamic-publish-v3.js), so "the slug of the form" and "the slug that
// was published" compare equal.
export function normalizeSlug(value) {
  return String(value ?? "").normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);
}

// State of "which act is published, and in which versions". `modes` is null for an act that was loaded for editing: its version is
// not known, so both buttons read "update and republish".
export function emptyPublishedState() {
  return { slug: "", modes: new Set() };
}

export function afterPublished(state, slug, mode) {
  const next = normalizeSlug(slug);
  const modes = state.slug === next && state.modes ? new Set(state.modes) : new Set();
  modes.add(normalizeMode(mode));
  return { slug: next, modes };
}

export function afterRestored(slug) {
  return { slug: normalizeSlug(slug), modes: null };
}

export function isRepublish(state, currentSlug, mode) {
  const slug = normalizeSlug(currentSlug);
  if (!slug || state.slug !== slug) return false;
  return state.modes === null || state.modes.has(normalizeMode(mode));
}
