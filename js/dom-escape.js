export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[character]));
}

export function escapeAttribute(value) {
  return escapeHtml(value);
}

export function escapeAttributeWithBacktick(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

export function escapeAttributeMultiline(value) {
  return escapeAttribute(value).replace(/\r?\n/g, "&#10;");
}
