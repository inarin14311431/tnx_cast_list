(() => {
  const intro = document.querySelector("#cinematic-intro");
  if (!intro) return;

  const TITLE_SELECTOR = ".neotokyo-sequence__screen--title";
  const SUMMARY_SELECTOR = ".neotokyo-sequence__screen--summary";

  const node = (tag, className, text = "") => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  };

  const classifyTitleFit = value => {
    const length = Array.from(String(value || "").replace(/[\s　]+/g, "")).length;
    if (length <= 10) return "short";
    if (length <= 14) return "medium";
    if (length <= 20) return "long";
    return "xlong";
  };

  const decorateTitle = screen => {
    if (!screen || screen.dataset.titleLogoEnhanced === "1") return;
    const title = screen.querySelector(".neotokyo-sequence__act-title");
    if (!title) return;

    const titleText = title.textContent.trim() || "ACT SHOWCASE";
    screen.dataset.titleLogoEnhanced = "1";
    screen.classList.add("neotokyo-sequence__screen--title-logo");
    title.classList.add(
      "neotokyo-sequence__act-title--logo",
      "showcase-fit-title",
      "is-cinematic-title"
    );
    title.dataset.title = titleText;
    title.dataset.fit = classifyTitleFit(titleText);

    const meta = node("div", "neotokyo-title-logo__meta");
    meta.append(
      node("span", "", "ACT FILE // TITLE LOCK"),
      node("span", "", "N◎VA MUNICIPAL DATABASE // PUBLIC ARCHIVE"),
      node("span", "is-live", "SIGNAL // STABLE")
    );

    const ghost = node("p", "neotokyo-title-logo__ghost", titleText);
    ghost.setAttribute("aria-hidden", "true");

    const rule = node("div", "neotokyo-title-logo__rule");
    rule.setAttribute("aria-hidden", "true");
    rule.append(node("i", ""), node("span", "", "TITLE VERIFIED"), node("i", ""));

    title.before(meta, ghost);
    const subtitle = screen.querySelector(".neotokyo-sequence__act-subtitle");
    (subtitle || title).after(rule);
  };

  const decorateSummary = screen => {
    if (!screen || screen.dataset.finaleEnhanced === "1") return;
    screen.dataset.finaleEnhanced = "1";
    screen.classList.add("neotokyo-sequence__screen--finale");

    const head = screen.querySelector(".neotokyo-sequence__summary-head");
    const summaryTitle = screen.querySelector(".neotokyo-sequence__summary-title");
    if (head && summaryTitle) {
      const lockup = node("div", "neotokyo-finale__title-lockup");
      lockup.append(
        node("span", "", "FINAL ACT FILE // CAST ASSEMBLED"),
        node("strong", "", summaryTitle.textContent.trim() || "ACT SHOWCASE"),
        node("small", "", "ALL ASSIGNMENT CHANNELS VERIFIED // ACT READY")
      );
      head.append(lockup);
    }

    const overview = screen.querySelector(".neotokyo-sequence__overview");
    if (overview) {
      overview.classList.add("neotokyo-finale__core");
      const coreHead = node("div", "neotokyo-finale__core-head");
      coreHead.append(
        node("span", "", "ACT CORE"),
        node("strong", "", "LINKED"),
        node("small", "", "STATUS // READY")
      );
      overview.prepend(coreHead);
    }

    const castArea = screen.querySelector(".neotokyo-sequence__summary-cast-area");
    const castGrid = screen.querySelector(".neotokyo-sequence__summary-casts");
    if (castArea && castGrid) {
      const cards = Array.from(castGrid.querySelectorAll(".neotokyo-sequence__summary-cast"));
      castGrid.dataset.castCount = String(cards.length);
      castArea.classList.add("neotokyo-finale__cast-bay");

      const linkLayer = node("div", "neotokyo-finale__links");
      linkLayer.setAttribute("aria-hidden", "true");
      cards.forEach(() => linkLayer.append(node("i", "")));
      castArea.insertBefore(linkLayer, castGrid);

      cards.forEach((card, index) => {
        card.classList.add("neotokyo-finale__cast-card");
        card.dataset.pc = `PC${index + 1}`;
        const badge = node("span", "neotokyo-finale__assigned-badge", "ASSIGNED");
        badge.setAttribute("aria-hidden", "true");
        card.append(badge);
      });
    }

    const signal = node("div", "neotokyo-finale__signal");
    signal.setAttribute("aria-hidden", "true");
    for (let index = 0; index < 14; index += 1) signal.append(node("i", ""));
    screen.prepend(signal);
  };

  const sync = () => {
    const title = intro.querySelector(TITLE_SELECTOR);
    const summary = intro.querySelector(SUMMARY_SELECTOR);
    decorateTitle(title);
    decorateSummary(summary);

    const active = intro.getAttribute("aria-hidden") !== "true";
    document.body.classList.toggle("showcase-neotokyo-title-logo-active", Boolean(active && title));
    document.body.classList.toggle("showcase-neotokyo-finale-active", Boolean(active && summary));
  };

  const observer = new MutationObserver(sync);
  observer.observe(intro, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["aria-hidden", "class"]
  });
  sync();
})();
