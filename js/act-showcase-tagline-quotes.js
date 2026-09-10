(() => {
  const root = document;
  const observerRoot = document.body || document.documentElement;
  const FALLBACKS = new Set(["PUBLIC CAST ARCHIVE", "PUBLIC CAST"]);
  const SELECTORS = [
    ".poster-v2-tagline",
    ".neotokyo-sequence__cast-tagline",
    ".neotokyo-sequence__summary-cast-tagline"
  ];
  const QUOTE_PAIRS = [
    ["「", "」"],
    ["『", "』"],
    ["“", "”"],
    ["\"", "\""],
    ["‘", "’"],
    ["'", "'"]
  ];

  const normalizeTagline = value => {
    let source = String(value ?? "").trim();
    if (!source || FALLBACKS.has(source)) return source;

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
    return source ? `「${source}」` : "";
  };

  const apply = scope => {
    const base = scope?.querySelectorAll ? scope : root;
    for (const selector of SELECTORS) {
      const nodes = [];
      if (base instanceof Element && base.matches?.(selector)) nodes.push(base);
      nodes.push(...base.querySelectorAll(selector));
      for (const node of nodes) {
        const current = String(node.textContent ?? "").trim();
        const normalized = normalizeTagline(current);
        if (!normalized || normalized === current) continue;
        node.textContent = normalized;
        node.dataset.taglineQuote = "ja";
      }
    }
  };

  apply(root);
  const observer = new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        apply(node);
      }
    }
  });
  observer.observe(observerRoot, { childList: true, subtree: true });
})();
