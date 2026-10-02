export function displayValue(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return String(value);
}

const OUTER_QUOTES = /^[\s　]*[“”"「『](.*)[“”"」』][\s　]*$/s;

function stripOuterQuotes(value) {
  let text = String(value ?? "").trim();
  for (let index = 0; index < 8; index++) {
    const match = text.match(OUTER_QUOTES);
    if (!match) break;
    const next = String(match[1] ?? "").trim();
    if (next === text) break;
    text = next;
  }
  return text;
}

export function formatHandle(handle) {
  const text = stripOuterQuotes(handle);
  if (!text) {
    return "NO HANDLE";
  }

  return `“${text}”`;
}


