(() => {
  const story = document.querySelector("#showcase-story");
  const intro = document.querySelector("#cinematic-intro");
  if (!story && !intro) return;

  const text = value => String(value ?? "").trim();
  const setTextIfChanged = (target, value) => {
    if (!target) return;
    const next = String(value ?? "");
    if (target.textContent !== next) target.textContent = next;
  };
  const node = (tag, className, value = "") => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (value) element.textContent = value;
    return element;
  };

  const readCreditRows = panel => {
    const values = new Map();
    panel?.querySelectorAll(".poster-v2-credit-row").forEach(row => {
      const label = text(row.querySelector("span")?.textContent).toUpperCase();
      const value = text(row.querySelector("strong")?.textContent);
      if (label) values.set(label, value);
    });
    return values;
  };

  const createMetaCell = (label, className) => {
    const cell = node("div", `poster-v2-act-meta__cell ${className}`);
    cell.append(node("span", "", label), node("strong", "", "—"));
    return cell;
  };

  const ensureActMeta = (frame, credits) => {
    let bar = frame.querySelector(":scope > .poster-v2-act-meta");
    if (!bar) {
      bar = node("section", "poster-v2-act-meta");
      bar.setAttribute("aria-label", "アクト公開情報");

      const identity = node("div", "poster-v2-act-meta__identity");
      identity.append(
        node("span", "poster-v2-act-meta__eyebrow", "ACT FILE // PUBLIC DATA"),
        node("strong", "poster-v2-act-meta__title", "ACT SHOWCASE"),
        node("small", "", "N◎VA MUNICIPAL DATABASE // PUBLIC ARCHIVE")
      );

      const ruler = createMetaCell("RULER", "is-ruler");
      const styles = createMetaCell("KEY STYLE", "is-style");
      const status = node("div", "poster-v2-act-meta__status");
      status.append(node("i", ""), node("span", "", "PUBLIC LINK"), node("strong", "", "VERIFIED"));
      bar.append(identity, ruler, styles, status);
      frame.prepend(bar);
    }

    const rows = readCreditRows(credits);
    const actTitle = text(document.querySelector("#opening-act-name")?.textContent) || "ACT SHOWCASE";
    const openingRuler = text(document.querySelector("#opening-ruler")?.textContent).replace(/^RULER\s*\/\/\s*/i, "");
    const ruler = rows.get("RULER") || openingRuler || "—";
    const styles = rows.get("KEY STYLE") || "—";

    setTextIfChanged(bar.querySelector(".poster-v2-act-meta__title"), actTitle);
    setTextIfChanged(bar.querySelector(".poster-v2-act-meta__cell.is-ruler strong"), ruler);
    setTextIfChanged(bar.querySelector(".poster-v2-act-meta__cell.is-style strong"), styles);
  };

  const polishBoard = () => {
    story?.querySelectorAll(".poster-v2-frame").forEach(frame => {
      frame.querySelectorAll(".poster-v2-grid").forEach(grid => {
        const credits = grid.querySelector(".poster-v2-panel--credits");
        if (!credits && grid.classList.contains("poster-v2-grid--showcase3")) return;
        ensureActMeta(frame, credits);
        if (credits) credits.remove();
        grid.classList.remove("poster-v2-grid--4");
        grid.classList.add("poster-v2-grid--showcase3");
      });
    });
  };

  const polishAccess = () => {
    const access = intro?.querySelector(".neotokyo-finale__access-button");
    if (!access || access.dataset.accessPolished === "1") return;
    access.dataset.accessPolished = "1";
    access.setAttribute("aria-label", "アクト紹介へアクセス");
    const code = access.querySelector("span");
    setTextIfChanged(code, "CLICK TO ENTER // AUTHORIZED");
    const marker = node("b", "neotokyo-finale__access-marker", "ENTER");
    marker.setAttribute("aria-hidden", "true");
    access.append(marker);
  };

  let queued = false;
  const sync = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      polishBoard();
      polishAccess();
    });
  };

  const observer = new MutationObserver(sync);
  if (story) observer.observe(story, { childList: true, subtree: true });
  if (intro) observer.observe(intro, { childList: true, subtree: true });
  sync();
})();
