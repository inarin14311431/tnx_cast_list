// Pure rules for the final board's visual caption (the line under the cast image) and for deciding
// which style is the cast's assigned ENTRY style. Nothing here reads the DOM: act-showcase-page.js
// builds the caption in its final form from the cast data, and act-showcase-supporting-cast.js uses
// the same role/style matching to mark the assigned chip, so the two can never disagree.

export const AFFILIATION_LABEL = /所属|affiliation/i;

function clean(value) {
  return String(value ?? "").trim();
}

export function normalizeStyleKey(value) {
  return clean(value).replace(/[◎●]/g, "").replace(/[\s　]+/g, "").toLocaleLowerCase("ja-JP");
}

// The style label a cast is assigned to: an explicit participation role, else the style flagged as the handout role.
export function roleForCast(cast) {
  const explicit = clean(cast?.participationRole || cast?.participation_role);
  if (explicit) return explicit;
  const roleStyle = Array.isArray(cast?.styles) ? cast.styles.find(style => style?.handoutRole || style?.handout_role) : null;
  return clean(roleStyle?.label);
}

// The first displayed style label that matches the role (the one that gets the is-assigned-style mark).
export function findAssignedStyle(styleLabels, role) {
  const key = normalizeStyleKey(role);
  if (!key) return "";
  return (styleLabels || []).find(label => normalizeStyleKey(label) === key) || "";
}

export function styleLabelsForCast(cast) {
  return Array.isArray(cast?.styles) ? cast.styles.map(item => clean(item?.label)).filter(Boolean) : [];
}

// First displayed profile row (the poster shows at most 6) whose label is 所属 / AFFILIATION and has a value.
export function affiliationForCast(cast) {
  const items = Array.isArray(cast?.meta) ? cast.meta.slice(0, 6) : [];
  for (const item of items) {
    if (!AFFILIATION_LABEL.test(clean(item?.label) || "DATA")) continue;
    const value = clean(item?.value) || "—";
    if (value !== "—") return value;
  }
  return "";
}

export function buildVisualMeta({ assignedStyle = "", affiliation = "" } = {}) {
  const assigned = clean(assignedStyle);
  const affiliated = clean(affiliation);
  if (assigned && affiliated) return `ENTRY STYLE // ${assigned}  /  AFFILIATION // ${affiliated}`;
  if (assigned) return `ENTRY STYLE // ${assigned}  /  CAST VISUAL CHANNEL`;
  if (affiliated) return `AFFILIATION // ${affiliated}  /  CAST VISUAL CHANNEL`;
  return "CAST VISUAL // PUBLIC ARCHIVE  /  SIGNAL:OPEN";
}

export function buildVisualCode(publicName) {
  const source = String(publicName || "PUBLIC CAST");
  let hash = 2166136261;
  for (const character of source) {
    hash ^= character.codePointAt(0) || 0;
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  const hex = hash.toString(16).toUpperCase().padStart(8, "0");
  return `VISUAL TRACE // NX-${hex.slice(0, 4)}-${hex.slice(4)} // NODE:PUBLIC`;
}

// publicName is the displayed (already quote-normalized) cast name.
export function buildVisualCaption(cast, publicName) {
  const assignedStyle = findAssignedStyle(styleLabelsForCast(cast), roleForCast(cast));
  return {
    meta: buildVisualMeta({ assignedStyle, affiliation: affiliationForCast(cast) }),
    code: buildVisualCode(publicName)
  };
}

// The final board's KEY STYLE: each cast's assigned style (same role/style matching as the caption and the
// assigned chip), in cast order, joined by " × ". Casts without an assigned style are skipped; the same style
// assigned to several casts is listed once per cast. The ◎ ● marks and surrounding spaces are dropped.
export function buildKeyStyle(casts) {
  const names = (Array.isArray(casts) ? casts : [])
    .map(cast => findAssignedStyle(styleLabelsForCast(cast), roleForCast(cast)).replace(/[◎●]/g, "").trim())
    .filter(Boolean);
  return names.length ? names.join(" × ") : "—";
}
