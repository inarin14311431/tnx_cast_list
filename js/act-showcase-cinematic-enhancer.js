(() => {
  if (document.body?.id !== "act-showcase-page") return;

  document.documentElement.classList.add("showcase-cinematic-enhancer");

  const ready = () => {
    const intro = document.querySelector("#cinematic-intro");
    if (!intro) return;
    enhanceTree(intro);
    const observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === "characterData") {
          pulseTyping(record.target.parentElement);
          continue;
        }
        for (const added of record.addedNodes) {
          if (added.nodeType === Node.ELEMENT_NODE) enhanceTree(added);
        }
        if (record.type === "childList") pulseTyping(record.target);
      }
    });
    observer.observe(intro, { subtree: true, childList: true, characterData: true });
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready, { once: true });
  else ready();

  function enhanceTree(root) {
    if (!(root instanceof Element)) return;
    const screens = root.matches(".neotokyo-sequence__screen") ? [root] : [...root.querySelectorAll(".neotokyo-sequence__screen")];
    for (const screen of screens) enhanceScreen(screen);
    normalizeVisibleQuotes(root);
  }

  function enhanceScreen(screen) {
    if (screen.dataset.cinematicEnhanced === "true") return;
    screen.dataset.cinematicEnhanced = "true";

    if (screen.classList.contains("neotokyo-sequence__screen--opening")) enhanceAccess(screen);
    if (screen.classList.contains("neotokyo-sequence__screen--title")) enhanceTitle(screen);
    if (screen.classList.contains("neotokyo-sequence__screen--trailer")) enhanceTrailer(screen);
    if (screen.classList.contains("neotokyo-sequence__screen--summary")) {
      screen.querySelectorAll(".neotokyo-sequence__overview-intro-label,.neotokyo-sequence__overview-intro").forEach(node => node.remove());
    }
  }

  function enhanceAccess(screen) {
    screen.classList.add("is-cinematic-access");
    const eyebrow = screen.querySelector(".neotokyo-sequence__eyebrow");
    const title = screen.querySelector(".neotokyo-sequence__opening-title");
    const sub = screen.querySelector(".neotokyo-sequence__opening-sub");
    if (eyebrow) eyebrow.textContent = "01 // N◎VA MUNICIPAL DATABASE";
    if (title) title.textContent = "ACT FILE // ACCESS";
    if (sub) sub.textContent = "ESTABLISHING PUBLIC SESSION";
    if (!screen.querySelector(".neotokyo-sequence__access-seal")) {
      const seal = document.createElement("div");
      seal.className = "neotokyo-sequence__access-seal";
      seal.textContent = "PUBLIC ACCESS // AUTHORIZED";
      screen.append(seal);
      window.setTimeout(() => seal.classList.add("is-authorized"), 620);
    }
  }

  function enhanceTitle(screen) {
    screen.querySelectorAll(".neotokyo-sequence__act-overview").forEach(node => node.remove());
    const title = screen.querySelector(".neotokyo-sequence__act-title");
    if (!title) return;
    requestAnimationFrame(() => title.classList.add("is-cinematic-title"));
  }

  function enhanceTrailer(screen) {
    const copy = screen.querySelector(".neotokyo-sequence__readout");
    if (!copy || copy.closest(".neotokyo-sequence__trailer-terminal")) return;
    copy.classList.add("is-terminal-readout");
    const terminal = document.createElement("div");
    terminal.className = "neotokyo-sequence__trailer-terminal";
    const bar = document.createElement("div");
    bar.className = "neotokyo-sequence__terminal-bar";
    bar.append(
      createText("strong", "ACT_TRAILER.TXT"),
      createText("small", "N◎VA MUNICIPAL DATABASE / PRE-ACT"),
      createText("span", "INPUT MODE // REC")
    );
    copy.parentNode.insertBefore(terminal, copy);
    terminal.append(bar, copy);
  }

  function normalizeVisibleQuotes(root) {
    const selectors = [
      ".neotokyo-sequence__cast-detail h3",
      ".neotokyo-sequence__summary-cast-body h3",
      ".poster-v2-name",
      ".poster-v2-visual__caption strong",
      ".poster-v2-roster__name"
    ];
    const nodes = root.matches?.(selectors.join(",")) ? [root] : [...root.querySelectorAll?.(selectors.join(",")) || []];
    for (const node of nodes) {
      const normalized = normalizeDuplicateHandleQuotes(node.textContent);
      if (normalized !== node.textContent) node.textContent = normalized;
    }
  }

  function normalizeDuplicateHandleQuotes(value) {
    return String(value ?? "")
      .replace(/“\s*[“"「『‘']+/g, "“")
      .replace(/[”"」』’']+\s*”/g, "”")
      .replace(/“{2,}/g, "“")
      .replace(/”{2,}/g, "”")
      .replace(/"{2,}/g, '"');
  }

  function pulseTyping(target) {
    const readout = target?.closest?.(".is-terminal-readout") || (target?.matches?.(".is-terminal-readout") ? target : null);
    const terminal = readout?.closest(".neotokyo-sequence__trailer-terminal");
    if (!terminal) return;
    terminal.classList.remove("is-inputting");
    requestAnimationFrame(() => terminal.classList.add("is-inputting"));
  }

  function createText(tag, value) {
    const element = document.createElement(tag);
    element.textContent = value;
    return element;
  }
})();
