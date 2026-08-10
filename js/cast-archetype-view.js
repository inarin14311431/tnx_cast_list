/* Public-view presentation for cast styles, divine works and style skills.
 * Presentation only: data rendering belongs to cast.js / cast-style-skills.js.
 */
(async function () {
  const scriptUrl = document.currentScript?.src || location.href;
  const styleDataUrl = new URL("./style-data.js", scriptUrl).href;
  const divineYomiByName = new Map([
    ["死の舞踏", "ダンスマカブル"],
    ["天変地異", "カタストロフ"],
    ["突然変異", "ミューテーション"]
  ]);
  const divineYomiByStyle = new Map();

  try {
    const module = await import(styleDataUrl);
    for (const item of module.STYLE_DATA || []) {
      const yomi = divineYomiByName.get(item.divine) || item.divineYomi || "";
      divineYomiByStyle.set(item.name, yomi);
      if (item.divine && !divineYomiByName.has(item.divine)) {
        divineYomiByName.set(item.divine, yomi);
      }
    }
  } catch (error) {
    console.warn("Divine work readings could not be loaded.", error);
  }

  const ready = await waitForRenderedView();
  if (!ready) return;

  enhanceStyles();
  enhanceDivines();
  enhanceStyleSkillPanel();

  function stateFor(mark) {
    const value = String(mark || "").trim();
    if (value.includes("◎") && value.includes("●")) return "is-dual";
    if (value.includes("◎")) return "is-persona";
    if (value.includes("●")) return "is-key";
    return "is-standard";
  }

  function roleFor(mark) {
    const value = String(mark || "").trim();
    if (value.includes("◎") && value.includes("●")) return "PERSONA=KEY";
    if (value.includes("◎")) return "PERSONA";
    if (value.includes("●")) return "KEY";
    return "SHADOW";
  }

  function enhanceStyles() {
    const styles = document.querySelector("#cast-styles");
    const chips = [...document.querySelectorAll("#cast-styles .style-chip")];
    if (!styles || !chips.length) return;

    styles.classList.remove("cast-archetype-grid");
    styles.classList.add("cast-style-grid-simple");

    let heading = styles.previousElementSibling;
    if (!heading?.classList.contains("cast-style-heading-simple")) {
      if (heading?.classList.contains("cast-archetype-heading")) heading.remove();
      heading = document.createElement("header");
      heading.className = "cast-style-heading-simple";
      heading.innerHTML = '<strong>スタイル <small>STYLE</small></strong>';
      styles.before(heading);
    }
    heading.classList.add("cast-unified-heading");

    chips.forEach((chip, index) => {
      chip.querySelectorAll(".cast-archetype-card__scan,.cast-archetype-card__role")
        .forEach(element => element.remove());
      chip.classList.remove("cast-archetype-card", "is-persona", "is-key", "is-dual", "is-standard");

      const markElement = chip.querySelector(".style-chip__mark");
      const mark = markElement?.getAttribute("aria-label") || markElement?.textContent || "";
      chip.classList.add("cast-style-card-simple", stateFor(mark));
      chip.dataset.styleRole = roleFor(mark);
      chip.dataset.castStyleSlot = String(index + 1).padStart(2, "0");
      delete chip.dataset.archetypeCode;
      delete chip.dataset.archetypeEnhanced;
    });
  }

  function enhanceDivines() {
    const panel = document.querySelector(".hero-divine-panel");
    const cards = [...document.querySelectorAll("#divine-list .divine-card")];
    if (!panel || !cards.length) return;

    panel.classList.add("cast-divine-authority");
    const panelHeader = panel.querySelector(":scope > header");
    panelHeader?.classList.add("cast-unified-heading");

    const heading = panel.querySelector("header h2");
    if (heading) heading.innerHTML = '神業 <small>DIVINE WORK</small>';

    let status = panelHeader?.querySelector(".cast-divine-authority__status");
    if (!status && panelHeader) {
      status = document.createElement("span");
      status.className = "cast-divine-authority__status";
      panelHeader.append(status);
    }
    if (status) status.textContent = "AUTHORITY CHANNEL // ONLINE";

    cards.forEach((card, index) => {
      card.dataset.divineEnhanced = "true";
      card.dataset.divineCode = `MIRACLE-${String(index + 1).padStart(2, "0")}`;
      card.classList.add("cast-divine-card", `cast-divine-card--${index + 1}`);
      card.querySelectorAll(".cast-divine-card__seal,.cast-divine-card__channel")
        .forEach(element => element.remove());

      let code = card.querySelector(".cast-divine-card__code");
      if (!code) {
        code = document.createElement("span");
        code.className = "cast-divine-card__code";
        card.prepend(code);
      }
      code.textContent = card.dataset.divineCode;

      const styleName = card.querySelector(".divine-card__style")?.textContent.trim() || "";
      const name = card.querySelector(".divine-card__name");
      const divineName = name?.textContent.trim() || "";
      let yomi = card.querySelector(".divine-card__yomi");
      if (!yomi) {
        yomi = document.createElement("span");
        yomi.className = "divine-card__yomi";
        name?.insertAdjacentElement("afterend", yomi);
      }
      yomi.textContent = divineYomiByName.get(divineName) || divineYomiByStyle.get(styleName) || "";
      yomi.hidden = !yomi.textContent;
    });
  }

  function enhanceStyleSkillPanel() {
    const panel = document.querySelector("#style-skill-panel");
    const table = panel?.querySelector(".style-skill-view-table");
    if (!panel || !table) return;

    panel.classList.add("cast-style-skill-analysis");
    const heading = panel.querySelector(".data-panel__header h2");
    if (heading) heading.innerHTML = 'スタイル技能 <small>STYLE SKILLS</small>';
  }

  async function waitForRenderedView() {
    const deadline = performance.now() + 8000;
    while (performance.now() < deadline) {
      const stylesReady = document.querySelectorAll("#cast-styles .style-chip").length > 0;
      const divinesReady = document.querySelectorAll("#divine-list .divine-card").length > 0;
      const styleSkillsReady = Boolean(document.querySelector("#style-skill-panel .style-skill-view-table"));
      if (stylesReady && divinesReady && styleSkillsReady) return true;
      await nextFrame();
    }
    return false;
  }

  function nextFrame() {
    return new Promise(resolve => requestAnimationFrame(resolve));
  }
})();
