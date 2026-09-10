(() => {
  const story = document.querySelector("#showcase-story");
  if (!story) return;

  const clean = value => String(value ?? "").trim();

  const buildCode = value => {
    const source = String(value || "PUBLIC CAST");
    let hash = 2166136261;
    for (const character of source) {
      hash ^= character.codePointAt(0) || 0;
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    const hex = hash.toString(16).toUpperCase().padStart(8, "0");
    return `VISUAL TRACE // NX-${hex.slice(0, 4)}-${hex.slice(4)} // NODE:PUBLIC`;
  };

  const findMetaValue = (grid, matcher) => {
    const terms = Array.from(grid?.querySelectorAll(".poster-v2-meta dt") || []);
    for (const term of terms) {
      if (!matcher.test(clean(term.textContent))) continue;
      const value = clean(term.nextElementSibling?.textContent);
      if (value && value !== "—") return value;
    }
    return "";
  };

  const buildVisualMeta = grid => {
    const assigned = clean(grid?.querySelector(".poster-v2-tags .is-assigned-style")?.textContent);
    const affiliation = findMetaValue(grid, /所属|affiliation/i);
    if (assigned && affiliation) return `ENTRY STYLE // ${assigned}  /  AFFILIATION // ${affiliation}`;
    if (assigned) return `ENTRY STYLE // ${assigned}  /  CAST VISUAL CHANNEL`;
    if (affiliation) return `AFFILIATION // ${affiliation}  /  CAST VISUAL CHANNEL`;
    return "CAST VISUAL // PUBLIC ARCHIVE  /  SIGNAL:OPEN";
  };

  const decorate = root => {
    const scope = root?.querySelectorAll ? root : document;
    const captions = [];
    if (scope instanceof Element && scope.matches?.(".poster-v2-visual__caption")) captions.push(scope);
    captions.push(...scope.querySelectorAll(".poster-v2-visual__caption"));

    for (const caption of captions) {
      const grid = caption.closest(".poster-v2-grid");
      const span = caption.querySelector("span");
      const strong = caption.querySelector("strong");
      if (!strong) continue;

      const publicName = clean(grid?.querySelector(".poster-v2-name")?.textContent) || clean(strong.textContent) || "PUBLIC CAST";
      if (span) {
        const visualMeta = buildVisualMeta(grid);
        if (span.textContent !== visualMeta) span.textContent = visualMeta;
        span.classList.add("poster-v2-visual__meta");
        span.dataset.visualMetaApplied = "true";
        span.setAttribute("aria-label", "キャスト公開ビジュアル情報");
      }

      const code = buildCode(publicName);
      if (strong.textContent !== code) strong.textContent = code;
      strong.classList.add("poster-v2-visual__code");
      strong.dataset.visualCodeApplied = "true";
      strong.setAttribute("aria-label", "公開ビジュアル識別コード");
    }
  };

  decorate(story);
  const observer = new MutationObserver(records => {
    const scopes = new Set();
    for (const record of records) {
      for (const addedNode of record.addedNodes) {
        const element = addedNode instanceof Element ? addedNode : addedNode.parentElement;
        if (!element) continue;
        const grid = element.closest?.(".poster-v2-grid") || element.querySelector?.(".poster-v2-grid");
        scopes.add(grid || element);
      }
    }
    for (const scope of scopes) decorate(scope);
  });
  // The decorator owns classes/data attributes inside each caption. Watching those attributes would
  // feed its own decorations back into the observer. Structural mutations are enough to catch renders.
  observer.observe(story, { childList: true, subtree: true });
})();
