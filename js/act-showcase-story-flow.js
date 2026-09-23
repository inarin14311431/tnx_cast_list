(() => {
  const intro = document.querySelector("#cinematic-intro");
  const story = document.querySelector("#showcase-story");
  if (!intro && !story) return;

  const clean = value => String(value ?? "").trim();
  const normalizeStyle = value => clean(value)
    .replace(/[◎●]/g, "")
    .replace(/[\s　]+/g, "")
    .toLocaleLowerCase("ja-JP");
  const compact = (value, limit = 84) => {
    const source = clean(value).replace(/[\s　]+/g, " ");
    return Array.from(source).length > limit
      ? `${Array.from(source).slice(0, limit).join("")}…`
      : source;
  };
  const node = (tag, className = "", value = "") => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (value) element.textContent = value;
    return element;
  };

  const readRole = sequence => {
    if (sequence.dataset.storyRole) return sequence.dataset.storyRole;
    const source = clean(sequence.querySelector(".neotokyo-sequence__assign-sub")?.textContent);
    const match = source.match(/ASSIGN SLOT\s*\/\/\s*(.+)$/iu);
    const role = clean(match?.[1]);
    if (role) sequence.dataset.storyRole = role;
    return role;
  };

  const createContextCell = (label, value, className = "") => {
    const cell = node("div", `neotokyo-story__context-cell ${className}`.trim());
    cell.append(node("span", "", label), node("strong", "", value || "—"));
    return cell;
  };

  const ensureRoute = sequence => {
    const bridge = sequence.querySelector(".neotokyo-sequence__link-bridge");
    if (!bridge || bridge.querySelector(".neotokyo-story__signal")) return;
    const signal = node("i", "neotokyo-story__signal");
    const source = node("i", "neotokyo-story__signal-node neotokyo-story__signal-node--source");
    const target = node("i", "neotokyo-story__signal-node neotokyo-story__signal-node--target");
    bridge.append(signal, source, target);
  };

  const emphasizeRoleStyle = (root, role) => {
    if (!root || !role) return;
    let primaryFound = false;
    for (const chip of root.querySelectorAll(".neotokyo-sequence__styles span")) {
      const matches = normalizeStyle(chip.textContent) === normalizeStyle(role);
      const primary = matches && !primaryFound;
      const duplicate = matches && primaryFound;
      if (matches) primaryFound = true;
      chip.classList.toggle("is-role", primary);
      chip.classList.toggle("is-role-primary", primary);
      chip.classList.toggle("is-role-duplicate", duplicate);
    }
  };

  // このensureHandoutContext()は「枠組み」(.neotokyo-story__handout-contextセクション・kicker文言・
  // ROLEセルのみを持つcells)の初期構築だけを担う。ENTRY/CONNECTION/PSセルの実際の内容や
  // .neotokyo-story__assigned-route>strongの文言は、js/act-showcase-writing-patterns.jsの
  // normalizeHandoutContext()/normalizeAssignedRoute()が本文をより高度なパーサーで解析し直して
  // 決定・上書きする(story-flow.js自身のこの関数はもうcellsにROLE以外を追加しない)。
  // writing-patterns.jsが何らかの理由で動作しなくなると、ROLE以外のセルとassigned-routeの文言は
  // プレースホルダー(「—」/「HANDOUT CHANNEL VERIFIED // CAST FILE LINKED」)のまま表示される。
  const ensureHandoutContext = sequence => {
    const panel = sequence.querySelector(".neotokyo-sequence__handout-panel");
    const heading = panel?.querySelector(".neotokyo-sequence__handout-title");
    if (!panel || !heading) return;
    const role = readRole(sequence);
    ensureRoute(sequence);

    if (!panel.querySelector(".neotokyo-story__handout-context")) {
      const context = node("section", "neotokyo-story__handout-context");
      context.setAttribute("aria-label", "ハンドアウト参加情報");
      context.append(node("p", "neotokyo-story__context-kicker", "ENTRY VECTOR // CAST INVOLVEMENT"));
      const cells = node("div", "neotokyo-story__context-cells");
      cells.append(createContextCell("ROLE", role || "UNREGISTERED", "is-role"));
      context.append(cells);
      heading.after(context);
    }

    if (!sequence.classList.contains("is-read")) return;
    const context = panel.querySelector(".neotokyo-story__handout-context");
    if (!context || context.dataset.storyFilled === "1") return;
    context.dataset.storyFilled = "1";
  };

  const ensureAssignedJourney = sequence => {
    if (!sequence.classList.contains("is-assigned")) return;
    const card = sequence.querySelector(".neotokyo-sequence__cast--linked");
    if (!card) return;
    const role = readRole(sequence);
    emphasizeRoleStyle(card, role);
    if (card.querySelector(".neotokyo-story__assigned-route")) return;

    const route = node("section", "neotokyo-story__assigned-route");
    route.append(node("span", "", "ENTRY VECTOR // 参加経緯"));
    const source = sequence.dataset.storyConnection || sequence.dataset.storySetting || sequence.dataset.storyPs;
    route.append(node("strong", "", source || "HANDOUT CHANNEL VERIFIED // CAST FILE LINKED"));
    const trace = node("div", "neotokyo-story__route-trace");
    trace.append(
      node("b", "is-done", "HANDOUT"),
      node("i", ""),
      node("b", "is-active", role || "ROLE"),
      node("i", ""),
      node("b", "is-done", "CAST FILE")
    );
    route.append(trace);
    const detail = card.querySelector(".neotokyo-sequence__cast-detail");
    const assigned = detail?.querySelector(".neotokyo-sequence__assigned");
    if (detail && assigned) assigned.before(route);
    else detail?.append(route);
  };

  const decorateLinked = sequence => {
    if (!sequence) return;
    sequence.classList.add("neotokyo-story__linked");
    ensureHandoutContext(sequence);
    ensureAssignedJourney(sequence);
  };

  const decorateTrailer = screen => {
    if (!screen || screen.querySelector(".neotokyo-story__trailer-outro")) return;
    const outro = node("section", "neotokyo-story__trailer-outro");
    outro.append(
      node("span", "", "INCITING SIGNAL // OPEN"),
      node("strong", "", "WHO ANSWERS THIS CALL?"),
      node("small", "", "NEXT // HANDOUTS DEFINE HOW EACH CAST ENTERS THE ACT")
    );
    const terminal = screen.querySelector(".neotokyo-sequence__terminal");
    if (terminal) terminal.before(outro);
    else screen.append(outro);
  };

  const decorateTitle = screen => {
    if (!screen || screen.dataset.storyTitle === "1") return;
    screen.dataset.storyTitle = "1";
    const ruler = screen.querySelector(".neotokyo-sequence__ruler-credit");
    const note = node("p", "neotokyo-story__title-note", "TRAILER LOCKED // CAST ENTRY CHANNELS STANDBY");
    if (ruler) ruler.after(note);
    else screen.append(note);
  };

  const convertSummaryStyles = card => {
    const styleLine = card.querySelector(".neotokyo-sequence__summary-cast-styles");
    if (!styleLine || styleLine.dataset.storyChips === "1") return;
    styleLine.dataset.storyChips = "1";
    const role = clean(card.querySelector(".neotokyo-sequence__summary-cast-role")?.textContent);
    const styles = clean(styleLine.textContent).split(/\s*\/\s*/).map(clean).filter(Boolean);
    styleLine.replaceChildren();
    let highlighted = false;
    for (const style of styles) {
      const chip = node("span", "", style);
      if (!highlighted && role && normalizeStyle(style) === normalizeStyle(role)) {
        chip.classList.add("is-role-primary");
        highlighted = true;
      }
      styleLine.append(chip);
    }
  };

  const decorateSummary = screen => {
    if (!screen) return;
    for (const card of screen.querySelectorAll(".neotokyo-sequence__summary-cast")) convertSummaryStyles(card);
    const overview = screen.querySelector(".neotokyo-sequence__overview");
    if (!overview || overview.querySelector(".neotokyo-story__entry-vectors")) return;

    const block = node("section", "neotokyo-story__entry-vectors");
    block.append(node("p", "", "ENTRY VECTORS // HOW THE CASTS ARRIVE"));
    const list = node("div", "neotokyo-story__entry-vector-list");
    const cards = Array.from(screen.querySelectorAll(".neotokyo-sequence__summary-cast"));
    cards.forEach((card, index) => {
      const row = node("div", "neotokyo-story__entry-vector");
      row.append(
        node("span", "", `PC${index + 1}`),
        node("strong", "", clean(card.querySelector("h3")?.textContent) || `CAST ${index + 1}`),
        node("b", "", clean(card.querySelector(".neotokyo-sequence__summary-cast-role")?.textContent) || "UNREGISTERED")
      );
      list.append(row);
    });
    block.append(list, node("strong", "neotokyo-story__ignition", "ALL THREADS CONVERGE // THE ACT BEGINS NOW"));
    const trailerLabel = overview.querySelector(".neotokyo-sequence__overview-label");
    if (trailerLabel) trailerLabel.before(block);
    else overview.append(block);
  };

  const splitGenderId = () => {
    for (const meta of story?.querySelectorAll(".poster-v2-meta") || []) {
      if (meta.dataset.genderIdSplit === "1") continue;
      const terms = Array.from(meta.querySelectorAll(":scope > dt"));
      for (const term of terms) {
        const label = clean(term.textContent).toUpperCase().replace(/[\s　]+/g, " ");
        if (!(label.includes("GENDER") && label.includes("ID"))) continue;
        const value = term.nextElementSibling;
        if (!value || value.tagName !== "DD") continue;
        const parts = clean(value.textContent).split(/\s*\/\s*/, 2);
        term.textContent = "GENDER";
        value.textContent = parts[0] || "—";
        const idTerm = node("dt", "", "ID");
        const idValue = node("dd", "", parts[1] || "—");
        value.after(idTerm, idValue);
        meta.dataset.genderIdSplit = "1";
        break;
      }
    }
  };

  let queued = false;
  const sync = () => {
    // Title markup must be finalized before swapScreen() exposes it on the next animation frame.
    // Deferring this decoration to rAF made the title-note appear one frame late and caused layout jitter.
    intro?.querySelectorAll(".neotokyo-sequence__screen--title").forEach(decorateTitle);

    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      intro?.querySelectorAll(".neotokyo-sequence__screen--linked").forEach(decorateLinked);
      intro?.querySelectorAll(".neotokyo-sequence__screen--trailer").forEach(decorateTrailer);
      intro?.querySelectorAll(".neotokyo-sequence__screen--summary").forEach(decorateSummary);
      splitGenderId();
    });
  };

  const hasStructuralElementMutation = record => record.type === "childList"
    && [...record.addedNodes, ...record.removedNodes].some(item => item.nodeType === Node.ELEMENT_NODE);
  const hasLinkedScreenStateMutation = record => record.type === "attributes"
    && record.attributeName === "class"
    && record.target instanceof Element
    && record.target.matches(".neotokyo-sequence__screen--linked");
  const observer = new MutationObserver(records => {
    if (!records.some(record => hasStructuralElementMutation(record) || hasLinkedScreenStateMutation(record))) return;
    sync();
  });
  // Typewriter text changes are intentionally ignored. Linked-screen class changes are observed only
  // on the screen root, so is-read/is-assigned state transitions still update context without following
  // the role-chip classes that this module itself owns.
  if (intro) observer.observe(intro, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  if (story) observer.observe(story, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  sync();
})();
