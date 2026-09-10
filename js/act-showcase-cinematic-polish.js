(() => {
  const intro = document.querySelector("#cinematic-intro");
  const pageRoot = document.querySelector("#act-showcase-root");
  if (document.body?.id !== "act-showcase-page" || !intro || !pageRoot) return;

  const classify = (text, kind) => {
    const length = Array.from(String(text || "").replace(/[\s　]+/g, "")).length;
    if (kind === "title") {
      if (length <= 10) return "short";
      if (length <= 14) return "medium";
      if (length <= 20) return "long";
      return "xlong";
    }
    if (length <= 7) return "short";
    if (length <= 12) return "medium";
    if (length <= 16) return "long";
    return "xlong";
  };

  const fit = (element, kind) => {
    if (!element) return;
    const value = element.textContent.trim();
    element.classList.add(kind === "title" ? "showcase-fit-title" : "showcase-fit-cast-name");
    const size = classify(value, kind);
    element.dataset.fit = size;
    const assigned = element.closest(".neotokyo-sequence__cast--linked");
    if (assigned) assigned.dataset.nameFit = size;
  };

  let typographyFrame = 0;
  const syncTypography = () => {
    typographyFrame = 0;
    fit(document.querySelector("#opening-act-name"), "title");
    for (const element of pageRoot.querySelectorAll(".poster-v2-name")) fit(element, "cast");
    for (const element of intro.querySelectorAll(".neotokyo-sequence__act-title")) fit(element, "title");
    for (const element of intro.querySelectorAll(".neotokyo-sequence__cast-detail h3,.neotokyo-sequence__summary-cast-body h3")) fit(element, "cast");
  };

  const queueTypography = () => {
    if (typographyFrame) return;
    typographyFrame = requestAnimationFrame(syncTypography);
  };

  const typographyObserver = new MutationObserver(queueTypography);
  typographyObserver.observe(pageRoot, { childList: true, subtree: true, characterData: true });
  typographyObserver.observe(intro, { childList: true, subtree: true, characterData: true });
  queueTypography();

  const decorateSummaryAccess = () => {
    const summary = intro.querySelector(".neotokyo-sequence__screen--summary");
    if (!summary) return;
    const footer = intro.querySelector(".neotokyo-sequence__footer");
    if (!footer || footer.querySelector(".neotokyo-finale__access-button")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "neotokyo-finale__access-button";
    button.setAttribute("aria-label", "アクト紹介本編を開く");

    const code = document.createElement("span");
    code.textContent = "ACCESS // AUTHORIZED";
    const label = document.createElement("strong");
    label.textContent = "ACCESS ACT";
    const note = document.createElement("small");
    note.textContent = "OPEN FULL SHOWCASE";
    button.append(code, label, note);

    button.addEventListener("click", event => {
      event.stopPropagation();
      intro.querySelector(".neotokyo-sequence__advance")?.click();
    });
    footer.append(button);
  };

  const sequenceObserver = new MutationObserver(() => {
    queueTypography();
    decorateSummaryAccess();
  });
  sequenceObserver.observe(intro, { childList: true, subtree: true });
})();
