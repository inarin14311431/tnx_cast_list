import { formatShowcaseTagline } from "./showcase-display-format.js?v=1";

const TAGLINE_SELECTORS = [
  ".cast-card__tagline",
  ".poster-v2-tagline",
  ".neotokyo-sequence__cast-tagline",
  ".neotokyo-sequence__summary-cast-tagline",
  ".poster-supporting-card blockquote",
  ".neotokyo-supporting-card small"
];

apply(document);
new MutationObserver(records => {
  for (const record of records) {
    for (const node of record.addedNodes) {
      if (node instanceof Element) apply(node);
    }
  }
}).observe(document.body || document.documentElement, { childList: true, subtree: true });

function apply(scope) {
  for (const selector of TAGLINE_SELECTORS) {
    for (const node of collect(scope, selector)) {
      const next = formatShowcaseTagline(node.textContent);
      if (next && next !== node.textContent) node.textContent = next;
    }
  }
}

function collect(scope, selector) {
  const nodes = [];
  if (scope instanceof Element && scope.matches(selector)) nodes.push(scope);
  nodes.push(...scope.querySelectorAll(selector));
  return nodes;
}
