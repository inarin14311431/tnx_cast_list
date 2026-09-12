import { formatShowcaseTagline, normalizeShowcaseDisplayQuotes } from "./showcase-display-format.js?v=1";

const preview = document.querySelector("#showcase-preview");
let normalizing = false;

if (preview) {
  new MutationObserver(() => normalizePreviewSource()).observe(preview, {
    attributes: true,
    attributeFilter: ["srcdoc"]
  });
  preview.addEventListener("load", normalizePreviewSource);
  normalizePreviewSource();
}

function normalizePreviewSource() {
  if (normalizing) return;
  const source = String(preview?.srcdoc || "");
  if (!source.trim()) return;

  const doc = new DOMParser().parseFromString(source, "text/html");
  let changed = false;

  for (const node of doc.querySelectorAll(".cast-card__name,.cast-card__reading,.guest-preview-card h3")) {
    const next = normalizeShowcaseDisplayQuotes(node.textContent);
    if (next !== node.textContent) {
      node.textContent = next;
      changed = true;
    }
  }

  for (const node of doc.querySelectorAll(".cast-card__tagline,.guest-preview-card p")) {
    const next = formatShowcaseTagline(node.textContent);
    if (next && next !== node.textContent) {
      node.textContent = next;
      changed = true;
    }
  }

  if (!changed) return;
  normalizing = true;
  preview.srcdoc = `<!doctype html>\n${doc.documentElement.outerHTML}`;
  queueMicrotask(() => { normalizing = false; });
}
