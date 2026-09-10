(() => {
  const intro = document.querySelector("#cinematic-intro");
  if (!intro) return;

  const clean = value => String(value ?? "").trim();
  const compact = (value, limit = 72) => {
    const source = clean(value).replace(/[\s　]+/g, " ");
    const chars = Array.from(source);
    return chars.length > limit ? `${chars.slice(0, limit).join("")}…` : source;
  };
  const node = (tag, className = "", value = "") => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (value) element.textContent = value;
    return element;
  };

  const FIELD_DEFS = [
    { key: "style", label: "STYLE", names: ["推奨スタイル", "スタイル", "推奨ペルソナ"] },
    { key: "setting", label: "SETTING", names: ["推奨設定", "設定"] },
    { key: "connection", label: "CONNECTION", names: ["コネ", "コネクション"] },
    { key: "suit", label: "SUIT", names: ["推奨スート", "スート"] },
    { key: "quick", label: "QUICK START", names: ["クイックスタート", "QS", "ＱＳ"] },
    { key: "condition", label: "CONDITION", names: ["条件", "必須条件"] },
    { key: "castConnection", label: "CAST LINK", names: ["キャスト間コネクション", "キャスト間コネ", "キャストコネ"] },
    { key: "relation", label: "RELATION", names: ["関係"] },
    { key: "ps", label: "PS", names: ["PS", "ＰＳ", "目的", "使命"] }
  ];
  const fieldNamePattern = FIELD_DEFS.flatMap(item => item.names)
    .sort((a, b) => b.length - a.length)
    .map(value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const fieldMatcher = new RegExp(`(?:^|[\\s　・●○■□▼▽◆◇※／/|]+)(${fieldNamePattern})\\s*[:：]\\s*`, "giu");

  const fieldDefFor = name => FIELD_DEFS.find(item => item.names.some(value => value.toLocaleLowerCase("ja-JP") === clean(name).toLocaleLowerCase("ja-JP")));

  const parsePackedFields = line => {
    const source = clean(line);
    if (!source) return [];
    const matches = Array.from(source.matchAll(fieldMatcher));
    if (!matches.length) return [];
    const fields = [];
    matches.forEach((match, index) => {
      const def = fieldDefFor(match[1]);
      if (!def) return;
      const start = (match.index || 0) + match[0].length;
      const end = index + 1 < matches.length ? matches[index + 1].index : source.length;
      const value = clean(source.slice(start, end).replace(/^[\s　・●○■□▼▽◆◇※／/|]+|[\s　・●○■□▼▽◆◇※／/|]+$/gu, ""));
      if (value) fields.push({ ...def, value });
    });
    return fields;
  };

  const firstNarrativeHook = lines => {
    for (const line of lines) {
      if (!line) continue;
      if (parsePackedFields(line).length) continue;
      if (/^(?:各キャスト|キャスト\s*\d+|PC\s*\d+|PCHO|ハンドアウト|ペルソナ)/iu.test(line)) continue;
      if (/^[『「【\[]?.{0,24}(?:用)?ハンドアウト[』」】\]]?$/u.test(line)) continue;
      const normalized = line.replace(/^[\s　・●○■□▼▽◆◇※]+/u, "");
      if (normalized.length >= 8) return normalized;
    }
    return "";
  };

  const analyzeHandout = value => {
    const raw = String(value ?? "").replace(/\r\n?/g, "\n").trim();
    const lines = raw.split("\n").map(clean);
    const fields = new Map();
    let fieldCount = 0;
    for (const line of lines) {
      for (const field of parsePackedFields(line)) {
        fieldCount += 1;
        if (!fields.has(field.key)) fields.set(field.key, field);
      }
    }
    const narrative = firstNarrativeHook(lines);
    const nonEmpty = lines.filter(Boolean);
    const pattern = fieldCount >= 3
      ? "structured"
      : fieldCount >= 1
        ? "mixed"
        : nonEmpty.length <= 4 && raw.length < 180
          ? "compact"
          : "prose";
    return { raw, lines, fields, narrative, pattern };
  };

  const analyzeTrailer = value => {
    const raw = String(value ?? "").replace(/\r\n?/g, "\n").trim();
    const lines = raw.split("\n");
    const nonEmpty = lines.map(clean).filter(Boolean);
    const lengths = nonEmpty.map(line => Array.from(line.replace(/[\s　]+/g, "")).length);
    const average = lengths.length ? lengths.reduce((sum, value) => sum + value, 0) / lengths.length : 0;
    const blankLines = Math.max(0, lines.length - nonEmpty.length);
    const total = Array.from(raw).length;
    let pattern = "hybrid";
    if (total <= 110 && nonEmpty.length <= 5) pattern = "compact";
    else if (nonEmpty.length >= 6 && average <= 24) pattern = "verse";
    else if (nonEmpty.length <= 5 && average >= 34) pattern = "prose";
    else if (blankLines >= 2 && average <= 30) pattern = "verse";
    return { pattern, lineCount: nonEmpty.length };
  };

  const createCell = (label, value, className = "") => {
    const cell = node("div", `neotokyo-story__context-cell ${className}`.trim());
    cell.append(node("span", "", label), node("strong", "", value || "—"));
    return cell;
  };

  const bestFields = analysis => {
    const result = [];
    const add = (key, limit, className = "") => {
      const field = analysis.fields.get(key);
      if (field?.value && !result.some(item => item.key === key)) result.push({ key, label: field.label, value: compact(field.value, limit), className });
    };
    add("connection", 38);
    add("relation", 38);
    add("setting", 42);
    add("condition", 42);
    add("ps", 46, "is-ps");
    if (result.length < 3 && analysis.narrative) result.push({ key: "hook", label: "HOOK", value: compact(analysis.narrative, 50), className: "is-hook" });
    add("castConnection", 34);
    add("quick", 34);
    return result.slice(0, 3);
  };

  const normalizeHandoutContext = sequence => {
    if (!sequence.classList.contains("is-read")) return;
    const panel = sequence.querySelector(".neotokyo-sequence__handout-panel");
    const readout = panel?.querySelector(".neotokyo-sequence__readout");
    const context = panel?.querySelector(".neotokyo-story__handout-context");
    const cells = context?.querySelector(".neotokyo-story__context-cells");
    if (!panel || !readout || !context || !cells) return;
    const text = readout.textContent || "";
    const signature = `${text.length}:${text.slice(-20)}`;
    if (context.dataset.writingSignature === signature) return;
    context.dataset.writingSignature = signature;
    context.dataset.storyFilled = "1";

    const analysis = analyzeHandout(text);
    panel.dataset.handoutPattern = analysis.pattern;
    sequence.dataset.handoutPattern = analysis.pattern;
    const roleValue = clean(cells.querySelector(".is-role strong")?.textContent) || "UNREGISTERED";
    cells.replaceChildren(createCell("ROLE", roleValue, "is-role"));
    for (const item of bestFields(analysis)) cells.append(createCell(item.label, item.value, item.className));

    const preferredRoute = analysis.fields.get("connection")?.value
      || analysis.fields.get("relation")?.value
      || analysis.fields.get("setting")?.value
      || analysis.narrative
      || analysis.fields.get("ps")?.value
      || "";
    sequence.dataset.storyConnection = compact(preferredRoute, 110);
    sequence.dataset.storyPs = compact(analysis.fields.get("ps")?.value || "", 96);
  };

  const normalizeAssignedRoute = sequence => {
    if (!sequence.classList.contains("is-assigned")) return;
    const route = sequence.querySelector(".neotokyo-story__assigned-route>strong");
    if (!route) return;
    const value = clean(sequence.dataset.storyConnection) || clean(sequence.dataset.storyPs);
    if (value && route.textContent !== value) route.textContent = value;
  };

  const trailerObservers = new WeakMap();
  const armTrailerPattern = screen => {
    const readout = screen.querySelector(".neotokyo-sequence__readout");
    if (!readout || trailerObservers.has(readout)) return;
    let timer = 0;
    const apply = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const analysis = analyzeTrailer(readout.textContent);
        screen.dataset.trailerPattern = analysis.pattern;
        screen.style.setProperty("--trailer-lines", String(Math.max(1, analysis.lineCount)));
      }, 160);
    };
    const observer = new MutationObserver(apply);
    observer.observe(readout, { childList: true, subtree: true, characterData: true });
    trailerObservers.set(readout, observer);
    apply();
  };

  let queued = false;
  const sync = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      intro.querySelectorAll(".neotokyo-sequence__screen--trailer").forEach(armTrailerPattern);
      intro.querySelectorAll(".neotokyo-sequence__screen--linked").forEach(sequence => {
        normalizeHandoutContext(sequence);
        normalizeAssignedRoute(sequence);
      });
    });
  };

  const observer = new MutationObserver(sync);
  // Typed text and screen replacement are sufficient to schedule normalization. Watching the
  // sequence's own class changes makes route decoration observe its own writes and can churn forever.
  observer.observe(intro, { childList: true, subtree: true });
  sync();
})();
