import { getImageObjectPosition, getImageScale, getImageTransformOrigin } from "./image-focus.js?v=3";
import { prepareNeoTokyoLoading, runNeoTokyoIntro } from "./act-showcase-neotokyo.js?v=4";
import { loadPublicShowcase, normalizeShowcaseSlug } from "./public-showcase-service.js?v=1";

const POSTER_SAMPLE_BACKGROUND = "./assets/showcase/act-showcase-moon-city-v2.svg";
const HANDOUT_PLACEHOLDERS = new Set([
  "ハンドアウト詳細は未登録です。",
  "公開用ハンドアウトは登録されていません。"
]);

const status = document.querySelector("#act-showcase-status");
const root = document.querySelector("#act-showcase-root");
const story = document.querySelector("#showcase-story");
const opening = document.querySelector("#scene-opening");
const cinematicIntro = document.querySelector("#cinematic-intro");
const pageStartedAt = performance.now();

initialize();

async function initialize() {
  try {
    const params = new URLSearchParams(location.search);
    const slug = normalizeShowcaseSlug(params.get("id"));
    const isNeoTokyo = document.body?.id === "act-showcase-page";
    if (isNeoTokyo) prepareNeoTokyoLoading(cinematicIntro);
    if (!slug) throw new Error("アクト識別名が指定されていません。");

    const data = await loadPublicShowcase(slug);
    const model = createShowcaseModel(data);
    renderOpening(model);
    applyBackground(model.background);
    const board = renderPoster(model);

    status.hidden = true;
    root.hidden = false;
    document.body.classList.add("showcase-poster-v2-ready");
    document.body.classList.remove(
      "showcase-adaptive-ready",
      "showcase-editorial-ready",
      "showcase-poster-ready",
      "showcase-poster-motion",
      "showcase-scroll-motion"
    );
    requestAnimationFrame(() => story?.classList.add("is-ready"));

    if (isNeoTokyo) {
      await runNeoTokyoIntro({ intro: cinematicIntro, model });
      finishIntro(0);
    } else {
      finishIntro();
    }
    initializeMotion(opening, board);
  } catch (error) {
    console.error(error);
    finishIntro(0);
    status.textContent = error?.message || "アクト紹介を読み込めませんでした。";
    status.classList.add("is-error");
  }
}

function createShowcaseModel(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("指定されたアクト紹介は公開されていません。公開画面から再度『アクト紹介を公開』してください。");
  }

  const casts = Array.isArray(data.casts)
    ? data.casts.slice(0, 6).map(cast => ({
        ...cast,
        fullName: normalizeDisplayQuotes(cast?.fullName || cast?.full_name || cast?.name),
        reading: normalizeDisplayQuotes(cast?.reading)
      }))
    : [];
  if (!casts.length) throw new Error("このアクト紹介には表示できるキャストがありません。");

  const pageTitle = text(data.pageTitle) || "ACT SHOWCASE";
  const heroTitle = text(data.heroTitle) || pageTitle;
  const actName = text(data.actName) || heroTitle;
  const trailerSource = data.trailer && typeof data.trailer === "object" && !Array.isArray(data.trailer)
    ? data.trailer
    : null;
  const trailer = trailerSource
    ? text(trailerSource.body || trailerSource.text)
    : text(data.trailer || data.actTrailer || data.trailerText || data.trailerBody || data.intro);
  const trailerTitle = trailerSource
    ? text(trailerSource.title)
    : text(data.trailerTitle);

  return {
    pageTitle,
    heroTitle,
    heroSubTitle: text(data.heroSubTitle) || "CAST SHOWCASE",
    actName,
    rulerName: text(data.rulerName),
    trailer,
    trailerTitle,
    background: safeImageUrl(data.background),
    casts
  };
}

function renderOpening(model) {
  document.title = model.pageTitle;
  setText("#showcase-kicker", "PUBLIC ACT SHOWCASE");
  setText("#opening-act-name", model.actName);
  setText("#opening-subtitle", model.heroSubTitle);

  const ruler = document.querySelector("#opening-ruler");
  if (ruler) {
    ruler.hidden = !model.rulerName;
    ruler.textContent = model.rulerName ? `RULER // ${model.rulerName}` : "";
  }

  const topbar = el("div", "poster-v2-topbar");
  const brand = el("div", "poster-v2-brand");
  brand.append(
    textEl("strong", "poster-v2-brand__logo", "N◎VA"),
    textEl("span", "poster-v2-brand__sub", "TRPG\nACT SHOWCASE")
  );

  const note = el("div", "poster-v2-topnote");
  note.append(textEl("span", "", "PUBLIC ACT ARCHIVE"), textEl("small", "", "NOVA MUNICIPAL DATABASE"));
  topbar.append(brand, note);
  opening.prepend(topbar);
  opening.append(createPosterOrnament());
  opening.append(
    textEl("div", "poster-v2-sidecopy", "この都市で、まだ見ぬ物語を。"),
    Object.assign(el("div", "poster-v2-aside"), {
      innerHTML: "<strong>CITY LIVES.</strong><span>STORIES REMAIN.</span><small>PUBLIC ARCHIVE</small>"
    })
  );
}

function createPosterOrnament() {
  const layer = el("div", "poster-ornament");
  layer.setAttribute("aria-hidden", "true");
  const seal = el("div", "poster-ornament__seal");
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 800 800");
  const shape = (tag, attributes, parent = svg) => {
    const item = document.createElementNS(ns, tag);
    for (const [key, value] of Object.entries(attributes)) item.setAttribute(key, String(value));
    parent.append(item);
    return item;
  };
  const outer = shape("g", { class: "poster-ornament__orbit", fill: "none", stroke: "#70dfee" });
  for (const [r, dash, opacity] of [[370, "2 12", .55], [351, "130 25 4 25", .45], [325, "1 0", .18]]) {
    shape("circle", { cx: 400, cy: 400, r, "stroke-dasharray": dash, opacity }, outer);
  }
  for (let i = 0; i < 60; i += 1) {
    shape("path", { d: `M400 30V${i % 5 === 0 ? 56 : 40}`, transform: `rotate(${i * 6} 400 400)`, "stroke-width": i % 5 === 0 ? 3 : 1, opacity: .65 }, outer);
  }
  const inner = shape("g", { class: "poster-ornament__orbit poster-ornament__orbit--reverse", fill: "none" });
  shape("circle", { cx: 400, cy: 400, r: 290, stroke: "#ee83c9", "stroke-width": 2, "stroke-dasharray": "220 80 20 80", opacity: .55 }, inner);
  shape("path", { d: "M400 137L628 268V532L400 663L172 532V268Z", stroke: "#76def1", opacity: .35 }, inner);
  shape("circle", { cx: 400, cy: 400, r: 225, stroke: "#76def1", "stroke-dasharray": "3 9", opacity: .45 }, inner);
  shape("path", { d: "M0 400H160M640 400H800M400 0V150M400 650V800", stroke: "#76def1", opacity: .3 });
  const core = el("div", "poster-ornament__core");
  core.append(textEl("span", "", "TOKYO // NEURO AGE"), textEl("strong", "", "N◎VA"), textEl("span", "", "PUBLIC ACT ARCHIVE"));
  seal.append(svg, core);
  layer.append(el("div", "poster-ornament__grid"), seal, el("div", "poster-ornament__scan"), el("div", "poster-ornament__ticks"));
  return layer;
}

function applyBackground(background) {
  const selected = background || POSTER_SAMPLE_BACKGROUND;
  document.body.style.setProperty("--showcase-background", `url("${escapeCssString(selected)}")`);
  document.body.classList.add("has-showcase-background");
  document.body.classList.toggle("showcase-poster-sample-background", !background);
}

function renderPoster(model) {
  const board = el("section", "poster-v2-board");
  board.id = "poster-showcase-board-v2";
  board.setAttribute("aria-label", "アクト紹介ショーケース");
  const frame = el("div", "poster-v2-frame");
  let activeCastIndex = 0;
  let grid = createCastGrid(model, model.casts[activeCastIndex]);
  frame.append(grid);

  let roster = null;
  if (model.casts.length > 1) {
    roster = createRoster(model.casts, index => {
      if (index === activeCastIndex || !model.casts[index]) return;
      activeCastIndex = index;
      const nextGrid = createCastGrid(model, model.casts[activeCastIndex]);
      grid.replaceWith(nextGrid);
      grid = nextGrid;
      setActiveRosterItem(roster, activeCastIndex);
    });
    frame.append(roster);
  }

  board.append(frame);
  story.append(board);

  const cue = opening?.querySelector(".opening-scroll");
  if (cue) {
    const label = cue.querySelector("span");
    if (label) label.textContent = "SCROLL TO SHOWCASE";
    cue.addEventListener("click", () => board.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "start"
    }));
  }
  return board;
}

function createCastGrid(model, cast) {
  const visual = createVisualPanel(cast);
  const profile = createProfilePanel(cast);
  const handout = createHandoutPanel([cast]);
  const credits = createCreditsPanel(model);
  const grid = el("div", `poster-v2-grid ${handout ? "poster-v2-grid--4" : "poster-v2-grid--3"}`);
  grid.append(visual, profile);
  if (handout) grid.append(handout);
  grid.append(credits);
  return grid;
}

function createVisualPanel(cast) {
  const name = text(cast?.fullName) || "CAST";
  const tagline = text(cast?.tagline);
  const visual = createPanel("01 / CAST", "CAST VISUAL", "poster-v2-panel--visual");
  const visualImage = el("div", "poster-v2-visual");
  const image = document.createElement("img");
  const source = safeImageUrl(cast?.imageUrl) || "./assets/placeholders/scan-failed.webp";
  image.src = source;
  image.alt = text(cast?.imageAlt) || name;
  image.loading = "eager";
  image.decoding = "async";
  image.style.objectPosition = getImageObjectPosition(cast?.imageUrl);
  image.style.setProperty("--tnx-image-scale", String(getImageScale(cast?.imageUrl)));
  image.style.setProperty("--tnx-image-origin", getImageTransformOrigin(cast?.imageUrl));
  image.addEventListener("error", () => {
    if (!image.src.endsWith("scan-failed.webp")) image.src = "./assets/placeholders/scan-failed.webp";
  });
  visualImage.append(image);

  const caption = el("div", "poster-v2-visual__caption");
  caption.append(textEl("span", "", tagline || "PUBLIC CAST ARCHIVE"), textEl("strong", "", name));
  visualImage.append(caption);
  visual.querySelector(".poster-v2-panel__body").append(visualImage);
  return visual;
}

function createProfilePanel(cast) {
  const profile = createPanel("CAST PROFILE", "PUBLIC DOSSIER", "poster-v2-panel--profile");
  const body = profile.querySelector(".poster-v2-panel__body");
  const name = text(cast?.fullName) || "CAST";
  const reading = text(cast?.reading);
  const tagline = text(cast?.tagline);

  if (reading) body.append(textEl("p", "poster-v2-reading", reading));
  body.append(textEl("h2", "poster-v2-name", name));
  if (tagline) body.append(textEl("p", "poster-v2-tagline", tagline));

  const styles = Array.isArray(cast?.styles) ? cast.styles.map(item => text(item?.label)).filter(Boolean) : [];
  if (styles.length) {
    const tags = el("div", "poster-v2-tags");
    styles.forEach(value => tags.append(textEl("span", "", value)));
    body.append(tags);
  }

  const metaItems = Array.isArray(cast?.meta) ? cast.meta.slice(0, 6) : [];
  if (metaItems.length) {
    const meta = el("dl", "poster-v2-meta");
    for (const item of metaItems) {
      meta.append(
        textEl("dt", "", text(item?.label) || "DATA"),
        textEl("dd", "", text(item?.value) || "—")
      );
    }
    body.append(meta);
  }

  const href = !cast?.link?.disabled ? safeLinkUrl(cast?.link?.href) : "";
  if (href) {
    const anchor = textEl("a", "poster-v2-cta", "VIEW FULL PROFILE →");
    anchor.href = href;
    anchor.target = "_blank";
    anchor.rel = "noopener";
    body.append(anchor);
  }
  return profile;
}

function createHandoutPanel(casts) {
  const cast = casts.find(item => {
    const handout = item?.handout;
    if (!handout || typeof handout !== "object") return false;
    const copy = text(handout.body);
    return Boolean(copy) && !HANDOUT_PLACEHOLDERS.has(copy);
  });
  if (!cast) return null;

  const panel = createPanel("02 / HANDOUT", "PLAYER INFORMATION", "poster-v2-panel--handout");
  const body = panel.querySelector(".poster-v2-panel__body");
  body.append(
    textEl("h3", "poster-v2-section-title", text(cast.handout?.title) || "HANDOUT"),
    textEl("p", "poster-v2-handout-copy", text(cast.handout?.body))
  );
  return panel;
}

function createCreditsPanel(model) {
  const panel = createPanel("03 / CREDITS", "PUBLIC DATA", "poster-v2-panel--credits");
  const body = panel.querySelector(".poster-v2-panel__body");
  const names = model.casts.map(item => text(item?.fullName)).filter(Boolean);
  const styles = [...new Set(model.casts.flatMap(item =>
    Array.isArray(item?.styles) ? item.styles.map(style => text(style?.label)).filter(Boolean) : []
  ))];
  const table = el("div", "poster-v2-credit-table");
  table.append(
    creditRow("RULER", model.rulerName || "—"),
    creditRow("CAST", names.join(" / ") || "—"),
    creditRow("KEY STYLE", styles.slice(0, 3).join(" × ") || "—")
  );
  body.append(
    table,
    textEl("p", "poster-v2-credit-kicker", "データの向こうに、人がいる。"),
    textEl("p", "poster-v2-credit-note", `${model.actName}\nPUBLIC ACT SHOWCASE / NOVA MUNICIPAL DATABASE`)
  );
  return panel;
}

function createRoster(casts, onSelect) {
  const roster = el("div", "poster-v2-roster");
  roster.append(textEl("div", "poster-v2-roster__title", "CAST FILES // SELECT CAST"));
  const list = el("div", "poster-v2-roster__list");
  casts.forEach((cast, index) => {
    const styles = Array.isArray(cast?.styles)
      ? cast.styles.map(item => text(item?.label)).filter(Boolean).join(" / ")
      : "";
    const item = el("article", "poster-v2-roster__item");
    item.dataset.castIndex = String(index);
    item.setAttribute("role", "button");
    item.setAttribute("tabindex", "0");
    item.setAttribute("aria-pressed", index === 0 ? "true" : "false");
    item.setAttribute("aria-label", `PC${index + 1} ${text(cast?.fullName) || `CAST ${index + 1}`} を表示`);
    if (index === 0) item.classList.add("is-active");
    item.append(
      textEl("span", "", String(index + 1).padStart(2, "0")),
      textEl("strong", "", text(cast?.fullName) || `CAST ${index + 1}`),
      textEl("small", "", styles || "PUBLIC CAST")
    );
    item.addEventListener("click", () => onSelect(index));
    item.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      onSelect(index);
    });
    list.append(item);
  });
  roster.append(list);
  return roster;
}

function setActiveRosterItem(roster, activeIndex) {
  roster?.querySelectorAll(".poster-v2-roster__item").forEach(item => {
    const active = Number(item.dataset.castIndex) === activeIndex;
    item.classList.toggle("is-active", active);
    item.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function createPanel(slot, title, extraClass) {
  const panel = el("article", `poster-v2-panel ${extraClass}`);
  const head = el("header", "poster-v2-panel__head");
  head.append(textEl("span", "", slot), textEl("strong", "", title));
  panel.append(head, el("div", "poster-v2-panel__body"));
  return panel;
}

function creditRow(label, value) {
  const row = el("div", "poster-v2-credit-row");
  row.append(textEl("span", "", label), textEl("strong", "", value));
  return row;
}

function initializeMotion(openingSection, board) {
  if (!openingSection || !board) return;
  if (prefersReducedMotion()) {
    document.body.classList.add("showcase-poster-v2-reduced");
    return;
  }

  document.body.classList.add("showcase-poster-v2-motion");
  const frame = board.querySelector(".poster-v2-frame");
  const panels = [...board.querySelectorAll(".poster-v2-panel")];
  let raf = 0;
  const schedule = () => {
    if (!raf) raf = requestAnimationFrame(update);
  };
  const update = () => {
    raf = 0;
    const vh = Math.max(window.innerHeight, 1);
    const max = Math.max(document.documentElement.scrollHeight - vh, 1);
    document.documentElement.style.setProperty(
      "--poster-v2-page-progress",
      `${(clamp(window.scrollY / max, 0, 1) * 100).toFixed(2)}%`
    );

    const openingRect = openingSection.getBoundingClientRect();
    const op = clamp((-openingRect.top) / Math.max(openingRect.height * 0.78, 1), 0, 1);
    openingSection.style.setProperty("--poster-v2-open-y", `${(-op * 24).toFixed(2)}px`);
    openingSection.style.setProperty("--poster-v2-open-opacity", (1 - smoothstep(0.46, 0.94, op)).toFixed(4));
    openingSection.style.setProperty("--poster-v2-bg-y", `${(op * 34).toFixed(2)}px`);
    openingSection.style.setProperty("--poster-v2-bg-scale", (1 + op * 0.03).toFixed(4));

    const rect = board.getBoundingClientRect();
    const p = clamp((vh * 0.9 - rect.top) / Math.max(board.offsetHeight - vh * 0.12, vh * 0.86), 0, 1);
    const frameIn = smoothstep(0.02, 0.24, p);
    if (frame) {
      frame.style.setProperty("--poster-v2-frame-opacity", (0.18 + frameIn * 0.82).toFixed(4));
      frame.style.setProperty("--poster-v2-frame-y", `${((1 - frameIn) * 56).toFixed(2)}px`);
      frame.style.setProperty("--poster-v2-frame-scale", (0.972 + frameIn * 0.028).toFixed(4));
    }
    panels.forEach((panel, index) => {
      const start = 0.08 + index * 0.09;
      const enter = smoothstep(start, start + 0.24, p);
      const shift = (1 - enter) * (index < 2 ? 34 : 24);
      panel.style.setProperty("--poster-v2-panel-opacity", (0.04 + enter * 0.96).toFixed(4));
      panel.style.setProperty("--poster-v2-panel-x", `${(index === 0 ? -shift : index === 1 ? shift : 0).toFixed(2)}px`);
      panel.style.setProperty("--poster-v2-panel-y", `${(index >= 2 ? shift : 14 * (1 - enter)).toFixed(2)}px`);
      panel.style.setProperty("--poster-v2-panel-scale", (0.965 + enter * 0.035).toFixed(4));
    });
  };

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  requestAnimationFrame(() => requestAnimationFrame(schedule));
}

function finishIntro(delay) {
  if (!cinematicIntro) return;
  const elapsed = performance.now() - pageStartedAt;
  const wait = delay ?? Math.max(220, 1150 - elapsed);
  window.setTimeout(() => cinematicIntro.classList.add("is-hidden"), wait);
  window.setTimeout(() => cinematicIntro.remove(), wait + 850);
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
}

function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function textEl(tag, className, value) {
  const node = el(tag, className);
  node.textContent = value || "";
  return node;
}

function setText(selector, value) {
  const node = document.querySelector(selector);
  if (node) node.textContent = value;
}

function safeImageUrl(value) {
  const source = text(value);
  if (!source) return "";
  if (source.startsWith("data:image/")) return source;
  try {
    const url = new URL(source, location.href);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function safeLinkUrl(value) {
  const source = text(value);
  if (!source) return "";
  try {
    const url = new URL(source, location.href);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function escapeCssString(value) {
  return String(value).replace(/["\\\n\r]/g, character => ({
    '"': '\\"',
    "\\": "\\\\",
    "\n": "",
    "\r": ""
  }[character]));
}

function normalizeDisplayQuotes(value) {
  return String(value ?? "")
    .replace(/“\s*[“"「『‘']+/g, "“")
    .replace(/[”"」』’']+\s*”/g, "”")
    .replace(/“{2,}/g, "“")
    .replace(/”{2,}/g, "”")
    .replace(/"{2,}/g, '"')
    .trim();
}

function smoothstep(a, b, value) {
  if (a === b) return value >= b ? 1 : 0;
  const x = clamp((value - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function text(value) {
  return String(value ?? "").trim();
}
