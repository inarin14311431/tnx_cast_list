// Decides which saved showcase card belongs to which registered participant when an owned showcase
// is restored into the generator. Pure: no DOM, no Supabase.
//
// Cards published from a manual (unregistered) cast carry the serial "ScanFailed" and have no
// participant row, so they must never borrow a participant by position. Each participant is used
// at most once; using it twice would toggle the same archive card off again.
const NON_ARCHIVE_SERIALS = new Set(["", "SCANFAILED", "PRIVATE"]);

export function obfuscatePublicId(value) {
  const source = `TNX_CAST_ARCHIVE::${String(value ?? "")}`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `TNX-${(hash >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
}

export function normalizeSerial(value) {
  return String(value || "").normalize("NFKC").trim().toUpperCase();
}

export function planShowcaseRestore(casts = [], participants = []) {
  const ordered = [...participants].sort((a, b) => orderOf(a) - orderOf(b));
  const used = new Set();
  const plan = casts.map(cast => {
    const serial = normalizeSerial(cast?.serial);
    if (NON_ARCHIVE_SERIALS.has(serial)) return { cast, participant: null, legacy: !serial };
    const index = ordered.findIndex((item, i) => !used.has(i) && normalizeSerial(obfuscatePublicId(item?.characterPublicId)) === serial);
    if (index < 0) return { cast, participant: null, legacy: false };
    used.add(index);
    return { cast, participant: ordered[index], legacy: false };
  });
  // Very old data has no serial at all: fall back to the remaining participants in cast order.
  for (const entry of plan) {
    if (!entry.legacy) continue;
    const index = ordered.findIndex((_, i) => !used.has(i));
    if (index < 0) break;
    used.add(index);
    entry.participant = ordered[index];
  }
  return plan.map(({ cast, participant }) => ({ cast, participant }));
}

function orderOf(item) {
  const number = Number(item?.castOrder);
  return Number.isFinite(number) ? number : Number.MAX_SAFE_INTEGER;
}
