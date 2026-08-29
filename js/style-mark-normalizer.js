/* Converts textual ◎ / ● style marks into accessible, theme-aware glyphs. */
(() => {
  const selector = ".cast-card__style-chip b, .owned-cast__style b";
  const rootSelectors = ["#cast-grid", "#owned-casts"];

  function createStyleMarks(mark) {
    const value = String(mark || "").trim();
    if (!value || !/[◎●]/.test(value)) return null;
    const wrapper = document.createElement("span");
    wrapper.className = "tnx-style-marks";
    wrapper.setAttribute("role", "img");
    wrapper.setAttribute("aria-label", value);
    for (const character of value) {
      if (character !== "◎" && character !== "●") continue;
      const dot = document.createElement("span");
      dot.className = `tnx-style-mark ${character === "◎" ? "tnx-style-mark--persona" : "tnx-style-mark--key"}`;
      dot.setAttribute("aria-hidden", "true");
      wrapper.append(dot);
    }
    return wrapper;
  }

  function normalize(root = document) {
    const nodes = [];
    if (root instanceof Element && root.matches(selector)) nodes.push(root);
    if (root.querySelectorAll) nodes.push(...root.querySelectorAll(selector));
    nodes.forEach(node => {
      if (node.dataset.styleMarkNormalized === "1") return;
      const marks = createStyleMarks(node.textContent);
      if (!marks) return;
      node.dataset.styleMarkNormalized = "1";
      node.replaceChildren(marks);
    });
  }

  function bind() {
    normalize(document);
    const roots = rootSelectors.map(selector => document.querySelector(selector)).filter(Boolean);
    if (!roots.length) return;
    const observer = new MutationObserver(records => {
      records.forEach(record => {
        record.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) normalize(node);
        });
      });
    });
    roots.forEach(root => observer.observe(root, { childList: true, subtree: true }));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind, { once: true });
  else bind();
})();
