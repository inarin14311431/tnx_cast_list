(() => {
  const normalize = value => String(value ?? "")
    .replace(/“\s*[“"「『‘']+/g, "“")
    .replace(/[”"」』’']+\s*”/g, "”")
    .replace(/“{2,}/g, "“")
    .replace(/”{2,}/g, "”")
    .replace(/"{2,}/g, '"');

  const normalizeNode = node => {
    if (!(node instanceof Element)) return;
    const selector = ".cast-pick-card__handle,.selected-cast__identity h3,.cast-card__name,.cast-card__reading";
    const targets = node.matches(selector) ? [node] : [...node.querySelectorAll(selector)];
    for (const target of targets) {
      const next = normalize(target.textContent);
      if (next !== target.textContent) target.textContent = next;
    }
  };

  const normalizePreview = () => {
    const frame = document.querySelector("#showcase-preview");
    try {
      if (frame?.contentDocument?.documentElement) normalizeNode(frame.contentDocument.documentElement);
    } catch (error) {
      console.warn("Showcase preview quote normalization skipped.", error);
    }
  };

  const start = () => {
    normalizeNode(document.body);
    const observer = new MutationObserver(records => {
      for (const record of records) {
        for (const added of record.addedNodes) {
          if (added.nodeType === Node.ELEMENT_NODE) normalizeNode(added);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    document.querySelector("#showcase-preview")?.addEventListener("load", normalizePreview);
    document.querySelector("#generate-button")?.addEventListener("click", () => {
      window.setTimeout(normalizePreview, 0);
      window.setTimeout(normalizePreview, 120);
    });
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
