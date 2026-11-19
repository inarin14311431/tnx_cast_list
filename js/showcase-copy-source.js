// Copying someone's published act showcase into the generator as a new draft of one's own (js/showcase-copy-from-public.js does the
// page side). Pure: no DOM, no Supabase client; what talks to the network is passed in, so the rules below can be tested.
//
// The copy never writes to the source: its slug is never reused (the new draft gets the next automatic number, past the source's),
// its pictures are fetched and uploaded again under the copier's own folder, and nothing of the source's act row, guests or files is
// updated or removed. Registered casts are referred to, as when they are picked by hand.
import { obfuscatePublicId, normalizeSerial } from "./showcase-restore-matching.js?v=80d34654";
import { nextActSlugFromRows } from "./showcase-slug.js";

export const COPY_MAX_CASTS = 6;
export const COPY_MAX_GUESTS = 12;
const PLACEHOLDER_PATTERN = /\/assets\/placeholders\/scan-failed\.webp(?:[?#].*)?$/;

export function normalizeCopySlug(value) {
  return String(value || "").normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);
}

// The slug of the showcase to copy, from what the writer pasted: a public URL (act-showcase.html?id=… or the standard version), or the
// slug itself. "" when nothing usable was given.
export function parseCopySource(input) {
  const text = String(input || "").trim();
  if (!text) return "";
  if (/^https?:\/\//i.test(text) || /[?&]id=/.test(text)) {
    try {
      const url = new URL(text, "https://invalid.example/");
      return normalizeCopySlug(url.searchParams.get("id"));
    } catch {
      return "";
    }
  }
  return /^[a-z0-9-]+$/i.test(text) ? normalizeCopySlug(text) : "";
}

// The slug of the new draft: the next automatic number, counted past the source's own slug as well, so it can never be the source's.
export function copyDraftSlug(ownRows, sourceSlug) {
  const rows = [...(Array.isArray(ownRows) ? ownRows : []), { slug: normalizeCopySlug(sourceSlug) }];
  const slug = nextActSlugFromRows(rows);
  return slug === normalizeCopySlug(sourceSlug) ? nextActSlugFromRows([...rows, { slug }]) : slug;
}

// True when publishing to `slug` would write over the copied source: the publish is stopped then.
export function isCopySourceSlug(slug, sourceSlug) {
  const source = normalizeCopySlug(sourceSlug);
  return Boolean(source) && normalizeCopySlug(slug) === source;
}

export function isPlaceholderImage(url) {
  return !String(url || "").trim() || PLACEHOLDER_PATTERN.test(String(url).trim());
}

// How each saved card comes back. A registered cast (its serial is the obfuscated public id) is looked up among the public casts and
// then among the copier's own private ones; a card without an archive id ("ScanFailed", "PRIVATE" of old data, or no serial at all) is
// copied as a manual cast, as the edit restore does (js/showcase-restore-matching.js); a registered cast that is not public any more
// cannot be reached: it is left out and named in the notice.
export function planCopiedCasts(casts, { publicCharacters = [], ownPrivateCharacters = [] } = {}) {
  const used = new Set();
  const find = (library, serial) => library.find(character => !used.has(character) && normalizeSerial(obfuscatePublicId(character?.public_id)) === serial);
  const entries = [];
  const skipped = [];
  for (const cast of (Array.isArray(casts) ? casts : []).slice(0, COPY_MAX_CASTS)) {
    const serial = normalizeSerial(cast?.serial);
    if (!serial || serial === "SCANFAILED" || serial === "PRIVATE") {
      entries.push({ kind: "manual", cast });
      continue;
    }
    const publicMatch = find(publicCharacters, serial);
    const privateMatch = publicMatch ? null : find(ownPrivateCharacters, serial);
    const character = publicMatch || privateMatch;
    if (!character) {
      skipped.push({ cast, name: castDisplayName(cast), reason: "unavailable" });
      continue;
    }
    used.add(character);
    entries.push({ kind: publicMatch ? "public" : "private", cast, character });
  }
  return { entries, skipped };
}

export function castDisplayName(cast) {
  return String(cast?.fullName || "").trim() || "名称未登録のキャスト";
}

// A saved full name is “handle” name; the manual row keeps the two in their own fields.
export function splitSavedFullName(fullName) {
  const text = String(fullName || "").trim();
  const match = /^[“"「『]([^”"」』]+)[”"」』]\s*(.*)$/.exec(text);
  return match ? { handle: match[1].trim(), name: match[2].trim() } : { handle: "", name: text };
}

// The public guest rows (get_public_act_showcase_guests) as the guest editor's values. The picture is decided separately.
export function guestFromPublicRow(row = {}) {
  return {
    handle: String(row.handle || ""),
    name: String(row.name || ""),
    personaStyle: String(row.persona_style || row.personaStyle || ""),
    affiliation: String(row.affiliation || ""),
    gender: String(row.gender || ""),
    age: String(row.age || ""),
    tagline: String(row.tagline || ""),
    summary: String(row.summary || ""),
    sourceImageUrl: isPlaceholderImage(row.image_url || row.imageUrl) ? "" : String(row.image_url || row.imageUrl).trim()
  };
}

export function sortedGuestRows(rows) {
  return [...(Array.isArray(rows) ? rows : [])]
    .sort((a, b) => (Number(a?.sort_order) || 0) - (Number(b?.sort_order) || 0))
    .slice(0, COPY_MAX_GUESTS);
}

const EXTENSION_TYPES = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

// Fetches a picture of the source and uploads it again with `upload(file)` (uploadManualImage under the copier's own folder).
// Returns { url, path } of the copy, or null for no picture; throws when the picture exists but could not be copied.
export async function copyImageToOwnStorage(sourceUrl, { fetchImpl = globalThis.fetch, upload, FileImpl = globalThis.File } = {}) {
  if (isPlaceholderImage(sourceUrl)) return null;
  const response = await fetchImpl(String(sourceUrl).trim(), { mode: "cors", cache: "no-store" });
  if (!response?.ok) throw new Error(`HTTP ${response?.status ?? "error"}`);
  const blob = await response.blob();
  const extension = (/\.([a-z0-9]+)(?:[?#].*)?$/i.exec(String(sourceUrl))?.[1] || "").toLowerCase();
  const type = blob.type || EXTENSION_TYPES[extension] || "";
  const file = new FileImpl([blob], `copy.${extension || "jpg"}`, { type });
  return upload(file);
}
