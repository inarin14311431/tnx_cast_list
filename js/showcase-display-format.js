const QUOTE_PAIRS = [
  ["「", "」"],
  ["『", "』"],
  ["“", "”"],
  ['"', '"'],
  ["‘", "’"],
  ["'", "'"]
];

export function stripOuterDisplayQuotes(value) {
  let source = String(value ?? "").trim();
  let changed = true;
  while (changed && source.length >= 2) {
    changed = false;
    for (const [open, close] of QUOTE_PAIRS) {
      if (!source.startsWith(open) || !source.endsWith(close)) continue;
      source = source.slice(open.length, source.length - close.length).trim();
      changed = true;
      break;
    }
  }
  return source;
}

export function normalizeShowcaseDisplayQuotes(value) {
  return String(value ?? "")
    .replace(/“\s*[“"「『‘']+/g, "“")
    .replace(/[”"」』’']+\s*”/g, "”")
    .replace(/“{2,}/g, "“")
    .replace(/”{2,}/g, "”")
    .replace(/"{2,}/g, '"')
    .trim();
}

export function formatShowcaseHandle(value) {
  const handle = stripOuterDisplayQuotes(value);
  return handle ? `“${handle}”` : "";
}

export function formatShowcaseFullName(handle, name) {
  return [formatShowcaseHandle(handle), String(name ?? "").trim()].filter(Boolean).join(" ");
}

export function formatShowcaseTagline(value) {
  const tagline = stripOuterDisplayQuotes(value);
  return tagline ? `「${tagline}」` : "";
}
