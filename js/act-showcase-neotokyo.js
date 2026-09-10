const SAMPLE_TRAILER_MESSAGE = "公開用アクトトレーラーは未登録です。\n公開データにトレーラーを登録すると、ここで読み上げ表示されます。";
const FALLBACK_IMAGE = "./assets/placeholders/scan-failed.webp";
const DEFAULT_OVERVIEW = "CAST SHOWCASE";
const SHOW_ACT_TITLE_SCREEN = true;

export function prepareNeoTokyoLoading(intro) {
  if (!intro) return;
  document.body.classList.add("showcase-neotokyo");
  const overline = intro.querySelector(".cinematic-intro__overline");
  const title = intro.querySelector(".cinematic-intro__title");
  const sub = intro.querySelector(".cinematic-intro__sub");
  if (overline) overline.textContent = "N◎VA MUNICIPAL DATABASE // PUBLIC ACT FILE";
  if (title) title.textContent = "SYSTEM ACCESS";
  if (sub) sub.textContent = "公開アクトファイルへ接続中…";
}

export async function runNeoTokyoIntro({ intro, model }) {
  if (!intro || !model) return;
  if (prefersReducedMotion()) {
    document.body.classList.add("showcase-neotokyo-reduced");
  }

  const state = createSequenceState();
  const shell = createSequenceShell(state);
  intro.setAttribute("aria-hidden", "false");
  intro.classList.add("neotokyo-sequence");
  intro.replaceChildren(shell);
  document.body.classList.add("showcase-neotokyo-intro-active");

  const finish = () => {
    if (state.finished) return;
    state.finished = true;
    state.skipRequested = true;
    state.resolveWaiters();
    state.resolveAdvance();
    document.body.classList.remove("showcase-neotokyo-intro-active");
    intro.setAttribute("aria-hidden", "true");
  };

  state.skipButton.addEventListener("click", finish, { once: true });

  try {
    await showOpening(state);
    if (state.finished) return;
    if (SHOW_ACT_TITLE_SCREEN) {
      await showActTitle(state, model);
      if (state.finished) return;
    }
    await showTrailer(state, model);
    if (state.finished) return;

    for (let index = 0; index < model.casts.length; index += 1) {
      await showHandoutAndAssign(state, model.casts[index], index, model.casts.length);
      if (state.finished) return;
    }

    await showSummary(state, model);
  } finally {
    finish();
  }
}

function createSequenceState() {
  return {
    finished: false,
    skipRequested: false,
    waiters: new Set(),
    stage: null,
    progress: null,
    progressLabel: null,
    skipButton: null,
    advanceButton: null,
    advanceResolver: null,
    resolveWaiters() {
      for (const resolve of this.waiters) resolve();
      this.waiters.clear();
    },
    requestAdvance() {
      if (!this.advanceResolver) return;
      const resolve = this.advanceResolver;
      this.advanceResolver = null;
      this.stage?.classList.remove("is-awaiting-advance");
      if (this.advanceButton) this.advanceButton.hidden = true;
      resolve();
    },
    resolveAdvance() {
      if (!this.advanceResolver) return;
      const resolve = this.advanceResolver;
      this.advanceResolver = null;
      this.stage?.classList.remove("is-awaiting-advance");
      if (this.advanceButton) this.advanceButton.hidden = true;
      resolve();
    }
  };
}

function createSequenceShell(state) {
  const shell = node("div", "neotokyo-sequence__shell");
  const header = node("header", "neotokyo-sequence__header");
  const brand = node("div", "neotokyo-sequence__brand");
  brand.append(
    textNode("strong", "", "N◎VA"),
    textNode("span", "", "MUNICIPAL DATABASE"),
    textNode("small", "", "ACT ASSIGNMENT SYSTEM // PUBLIC ACCESS")
  );

  const system = node("div", "neotokyo-sequence__system");
  system.append(
    textNode("span", "", "CONNECTION // SECURE"),
    textNode("span", "", "NODE // NEOTOKYO")
  );

  const skip = textNode("button", "neotokyo-sequence__skip", "SKIP SEQUENCE");
  skip.type = "button";
  skip.setAttribute("aria-label", "アクト紹介の導入演出をスキップ");
  state.skipButton = skip;
  header.append(brand, system, skip);

  const stage = node("main", "neotokyo-sequence__stage");
  stage.setAttribute("aria-live", "polite");
  state.stage = stage;
  stage.addEventListener("click", event => {
    if (event.target.closest("button")) return;
    state.requestAdvance();
  });

  const footer = node("footer", "neotokyo-sequence__footer");
  const progress = node("div", "neotokyo-sequence__progress");
  progress.append(node("i", ""));
  const progressLabel = textNode("span", "", "INITIALIZING // 00%");
  const advance = textNode("button", "neotokyo-sequence__advance", "CLICK TO CONTINUE");
  advance.type = "button";
  advance.hidden = true;
  advance.addEventListener("click", event => {
    event.stopPropagation();
    state.requestAdvance();
  });
  state.progress = progress;
  state.progressLabel = progressLabel;
  state.advanceButton = advance;
  footer.append(progress, progressLabel, advance, textNode("small", "", "TOKYO N◎VA // PUBLIC ACT ARCHIVE"));

  shell.append(header, stage, footer);
  return shell;
}

async function showOpening(state) {
  setProgress(state, 5, "SYSTEM ACCESS");
  replaceStage(state, {
    eyebrow: "01 // SYSTEM ACCESS",
    title: "ACT FILE",
    sub: "公開アクトファイルへ接続中…",
    status: ["PUBLIC ACT FILE // DETECTED", "SHOWCASE DATA // VERIFIED", "TITLE & CREDITS // READY"]
  });
  await wait(state, 2900);
}

async function showActTitle(state, model) {
  setProgress(state, 18, "TITLE & CREDITS");
  const content = node("section", "neotokyo-sequence__screen neotokyo-sequence__screen--title");
  content.append(
    textNode("p", "neotokyo-sequence__eyebrow", "02 // TITLE & CREDITS"),
    textNode("p", "neotokyo-sequence__micro", "ACT TITLE"),
    textNode("h1", "neotokyo-sequence__act-title", model.actName || "ACT SHOWCASE"),
    createRulerCredit(model.rulerName)
  );

  const overview = getActOverview(model);
  if (overview) {
    const overviewBox = node("div", "neotokyo-sequence__act-overview");
    overviewBox.append(
      textNode("span", "neotokyo-sequence__act-overview-label", "ACT OVERVIEW // アクト概要"),
      textNode("p", "neotokyo-sequence__act-overview-copy", overview)
    );
    content.append(overviewBox);
  }

  content.append(textNode("p", "neotokyo-sequence__terminal", "TITLE & CREDITS LOCKED // PREPARING ACT TRAILER"));
  swapScreen(state, content);
  await waitForAdvance(state, "NEXT // ACT TRAILER");
}

async function showTrailer(state, model) {
  setProgress(state, 30, "ACT TRAILER");
  const content = node("section", "neotokyo-sequence__screen neotokyo-sequence__screen--trailer");
  const heading = model.trailerTitle || "ACT TRAILER";
  const trailer = model.trailer || SAMPLE_TRAILER_MESSAGE;
  const copy = textNode("p", "neotokyo-sequence__readout", "");
  if (!model.trailer) copy.classList.add("is-placeholder");
  const definition = node("p", "neotokyo-sequence__trailer-definition");
  definition.append(
    textNode("strong", "", "ACT TRAILER"),
    textNode("span", "", "プレアクトで読み上げるトレーラー")
  );
  content.append(
    textNode("p", "neotokyo-sequence__eyebrow", "03 // ACT TRAILER"),
    definition,
    textNode("p", "neotokyo-sequence__micro", "PRE-ACT READOUT / PUBLIC BROADCAST"),
    textNode("h2", "neotokyo-sequence__section-title", heading),
    copy,
    textNode("p", "neotokyo-sequence__terminal", "READOUT CHANNEL // TEXT SYNTHESIS")
  );
  swapScreen(state, content);
  await typeReadout(state, copy, trailer, 4200, 34);
  if (state.finished) return;
  await waitForAdvance(state, "NEXT // HANDOUT 01");
}

async function showHandoutAndAssign(state, cast, index, total) {
  const pcNumber = index + 1;
  const pcLabel = String(pcNumber).padStart(2, "0");
  const handout = cast?.handout && typeof cast.handout === "object" ? cast.handout : {};
  const handoutTitle = clean(handout.title) || `PC${pcNumber} HANDOUT`;
  const handoutBody = clean(handout.body) || "公開用ハンドアウト本文は登録されていません。";
  const participationRole = getParticipationRole(cast);
  const progressBase = 34 + Math.round((index / Math.max(total, 1)) * 50);

  setProgress(state, progressBase, `HANDOUT ${pcLabel}`);

  const sequence = node("section", "neotokyo-sequence__screen neotokyo-sequence__screen--linked");
  const header = node("header", "neotokyo-sequence__linked-head");
  const phaseLabel = textNode("p", "neotokyo-sequence__eyebrow", `04 // HANDOUT ${pcLabel} // PC${pcNumber}`);
  const linkStatus = textNode("span", "neotokyo-sequence__link-status", "HANDOUT CHANNEL // ACTIVE");
  header.append(phaseLabel, linkStatus);

  const layout = node("div", "neotokyo-sequence__linked-layout");
  const handoutPanel = node("article", "neotokyo-sequence__handout-panel");
  const handoutMeta = textNode("p", "neotokyo-sequence__micro", "PLAYER INFORMATION / CAST REQUIREMENT");
  const handoutHeading = createHandoutHeading(handoutTitle);
  const copy = textNode("p", "neotokyo-sequence__readout", "");
  const handoutTerminal = textNode("p", "neotokyo-sequence__terminal", `READING HANDOUT // PC${pcNumber}`);
  handoutPanel.append(handoutMeta, handoutHeading, copy, handoutTerminal);

  const connector = node("div", "neotokyo-sequence__link-bridge");
  connector.setAttribute("aria-hidden", "true");
  connector.append(
    node("i", "neotokyo-sequence__link-line"),
    textNode("span", "", "LINKING"),
    node("i", "neotokyo-sequence__link-pulse")
  );

  const assignPanel = node("aside", "neotokyo-sequence__assign-panel");
  assignPanel.setAttribute("aria-label", `PC${pcNumber} キャスト割り当て`);
  const assignFrame = node("div", "neotokyo-sequence__assign-frame");
  assignFrame.append(
    textNode("p", "neotokyo-sequence__micro", `05 // ASSIGNMENT ${pcLabel}`),
    textNode("h2", "neotokyo-sequence__assign-word", "ASSIGN"),
    textNode("p", "neotokyo-sequence__assign-sub", participationRole
      ? `ASSIGN SLOT // ${participationRole}`
      : "CAST MATCHING CHANNEL // STANDBY")
  );
  assignPanel.append(assignFrame);

  layout.append(handoutPanel, connector, assignPanel);
  sequence.append(header, layout);
  swapScreen(state, sequence);
  await typeReadout(state, copy, handoutBody, 2400);
  if (state.finished) return;

  sequence.classList.add("is-read");
  handoutTerminal.textContent = `HANDOUT COMPLETE // PC${pcNumber}`;
  linkStatus.textContent = participationRole
    ? `HANDOUT COMPLETE // ASSIGN SLOT ${participationRole}`
    : "HANDOUT COMPLETE // AWAITING ASSIGN";
  await waitForAdvance(state, `ASSIGN // PC${pcNumber}`);
  if (state.finished) return;

  setProgress(state, progressBase + 5, `SEARCHING CAST // PC${pcNumber}`);
  phaseLabel.textContent = `04 // HANDOUT ${pcLabel}  →  05 // ASSIGNMENT ${pcLabel}`;
  linkStatus.textContent = "CROSS LINK // ESTABLISHING";
  sequence.classList.add("is-splitting");
  await wait(state, 780);
  if (state.finished) return;

  const search = node("div", "neotokyo-sequence__search neotokyo-sequence__search--linked");
  search.append(
    textNode("span", "", participationRole ? `PC${pcNumber} // SLOT ${participationRole}` : `PC${pcNumber} // ${handoutTitle}`),
    textNode("strong", "", "SEARCHING CAST..."),
    textNode("small", "", "CROSS-REFERENCING PUBLIC CAST ARCHIVE")
  );
  assignPanel.replaceChildren(search);
  sequence.classList.add("is-searching");
  linkStatus.textContent = "CAST ARCHIVE // SEARCHING";
  await wait(state, 850);
  if (state.finished) return;

  search.querySelector("strong").textContent = "MATCH FOUND";
  search.querySelector("small").textContent = participationRole
    ? `ASSIGN SLOT ${participationRole} // VERIFIED`
    : "IDENTITY MATCH // VERIFIED";
  search.classList.add("is-found");
  linkStatus.textContent = "MATCH FOUND // ROUTING CAST FILE";
  sequence.classList.add("is-found");
  await wait(state, 560);
  if (state.finished) return;

  const castCard = createAssignedCast(cast, pcNumber);
  castCard.classList.add("neotokyo-sequence__cast--linked");
  assignPanel.replaceChildren(castCard);
  sequence.classList.remove("is-searching");
  sequence.classList.add("is-assigned");
  linkStatus.textContent = participationRole
    ? `PC${pcNumber} // ${participationRole} // CAST ASSIGNED`
    : `PC${pcNumber} // CAST ASSIGNED`;
  setProgress(state, progressBase + 10, `CAST ASSIGNED // PC${pcNumber}`);
  await wait(state, 700);
  if (state.finished) return;

  const nextLabel = pcNumber < total
    ? `NEXT // HANDOUT ${String(pcNumber + 1).padStart(2, "0")}`
    : "NEXT // ACT SUMMARY";
  await waitForAdvance(state, nextLabel);
}

function createHandoutHeading(title) {
  const heading = node("h2", "neotokyo-sequence__section-title neotokyo-sequence__handout-title");
  const match = title.match(/^(.*?)用ハンドアウト$/u);
  if (match && clean(match[1])) {
    heading.append(
      textNode("span", "neotokyo-sequence__handout-subject", clean(match[1]).replace(/^[『「](.*)[』」]$/u, "$1")),
      textNode("span", "neotokyo-sequence__handout-caption", "用ハンドアウト")
    );
  } else {
    heading.append(textNode("span", "neotokyo-sequence__handout-subject", title));
  }
  return heading;
}

function createAssignedCast(cast, pcNumber) {
  const card = node("article", "neotokyo-sequence__cast");
  const imageFrame = node("figure", "neotokyo-sequence__cast-image");
  imageFrame.append(createCastImage(cast, `PC${pcNumber} CAST`));

  const detail = node("div", "neotokyo-sequence__cast-detail");
  const participationRole = getParticipationRole(cast);
  const roleSlot = createRoleSlot(participationRole);
  const styleRow = createStyleRow(cast, participationRole);
  detail.append(
    textNode("p", "neotokyo-sequence__micro", `PC${pcNumber} // CAST ASSIGNED`),
    roleSlot,
    textNode("h3", "", clean(cast?.fullName) || `CAST ${pcNumber}`),
    textNode("p", "neotokyo-sequence__cast-tagline", clean(cast?.tagline) || "PUBLIC CAST ARCHIVE"),
    styleRow,
    textNode("strong", "neotokyo-sequence__assigned", "CAST ASSIGNED")
  );
  card.append(imageFrame, detail);
  return card;
}

function createRoleSlot(participationRole) {
  const slot = node("div", "neotokyo-sequence__role-slot");
  slot.append(
    textNode("span", "", "ASSIGN SLOT // 参加スタイル枠"),
    textNode("strong", "", participationRole || "UNREGISTERED"),
    textNode("small", "", "HANDOUT ROLE")
  );
  return slot;
}

function createStyleRow(cast, participationRole) {
  const row = node("div", "neotokyo-sequence__styles");
  for (const style of getStyleLabels(cast)) {
    const chip = textNode("span", "", style);
    if (participationRole && roleMatchesStyle(participationRole, style)) chip.classList.add("is-role");
    row.append(chip);
  }
  return row;
}

async function showSummary(state, model) {
  setProgress(state, 100, "ACT READY");
  const content = node("section", "neotokyo-sequence__screen neotokyo-sequence__screen--summary");
  const heading = node("div", "neotokyo-sequence__summary-head");
  heading.append(
    textNode("p", "neotokyo-sequence__eyebrow", "06 // ASSIGNMENT COMPLETE"),
    textNode("strong", "neotokyo-sequence__act-ready", "ACT READY"),
    textNode("span", "neotokyo-sequence__summary-status", `ALL CASTS ASSIGNED // ${model.casts.length} CAST FILES LINKED`)
  );

  const grid = node("div", "neotokyo-sequence__summary-grid");
  const overview = node("article", "neotokyo-sequence__overview");
  const overviewMeta = node("dl", "neotokyo-sequence__overview-meta");
  overviewMeta.append(
    textNode("dt", "", "CAST"),
    textNode("dd", "", String(model.casts.length)),
    textNode("dt", "", "STATUS"),
    textNode("dd", "", "READY")
  );
  overview.append(
    textNode("p", "neotokyo-sequence__micro", "ACT FILE // FINAL OVERVIEW"),
    textNode("h2", "neotokyo-sequence__summary-title", model.actName || "ACT SHOWCASE"),
    createSummaryRuler(model.rulerName),
    overviewMeta
  );

  const actOverview = getActOverview(model);
  if (actOverview) {
    overview.append(
      textNode("p", "neotokyo-sequence__overview-intro-label", "ACT OVERVIEW // アクト概要"),
      textNode("p", "neotokyo-sequence__overview-intro", actOverview)
    );
  }
  overview.append(
    textNode("p", "neotokyo-sequence__overview-label", `${model.trailerTitle || "ACT TRAILER"} // 読み上げ用トレーラー`),
    textNode("p", "neotokyo-sequence__overview-copy", model.trailer || SAMPLE_TRAILER_MESSAGE)
  );

  const castArea = node("section", "neotokyo-sequence__summary-cast-area");
  castArea.append(textNode("p", "neotokyo-sequence__micro", "CAST FILES // ASSIGNMENT ROSTER"));
  const castGrid = node("div", "neotokyo-sequence__summary-casts");
  model.casts.forEach((cast, index) => castGrid.append(createSummaryCast(cast, index + 1)));
  castArea.append(castGrid);
  grid.append(overview, castArea);
  content.append(heading, grid);
  swapScreen(state, content);
  await waitForAdvance(state, "OPEN FULL SHOWCASE");
}

function createSummaryRuler(rulerName) {
  const ruler = node("div", "neotokyo-sequence__summary-ruler");
  ruler.append(
    textNode("span", "", "RULER // ACT DIRECTION"),
    textNode("strong", "", clean(rulerName) || "UNREGISTERED")
  );
  return ruler;
}

function createSummaryCast(cast, pcNumber) {
  const card = node("article", "neotokyo-sequence__summary-cast");
  const imageFrame = node("figure", "neotokyo-sequence__summary-cast-image");
  imageFrame.append(createCastImage(cast, `PC${pcNumber} CAST`));
  const body = node("div", "neotokyo-sequence__summary-cast-body");
  const styles = getStyleLabels(cast);
  const participationRole = getParticipationRole(cast);
  body.append(
    textNode("p", "neotokyo-sequence__micro", `PC${pcNumber} // ASSIGN SLOT`),
    textNode("p", "neotokyo-sequence__summary-cast-role", participationRole || "UNREGISTERED"),
    textNode("h3", "", clean(cast?.fullName) || `CAST ${pcNumber}`),
    textNode("p", "neotokyo-sequence__summary-cast-styles", styles.join(" / ") || "PUBLIC CAST"),
    textNode("p", "neotokyo-sequence__summary-cast-tagline", clean(cast?.tagline) || "PUBLIC CAST ARCHIVE")
  );
  card.append(imageFrame, body);
  return card;
}

function createRulerCredit(rulerName) {
  const ruler = node("div", "neotokyo-sequence__ruler-credit");
  ruler.append(
    textNode("span", "neotokyo-sequence__ruler-label", "RULER"),
    textNode("strong", "neotokyo-sequence__ruler-name", clean(rulerName) || "UNREGISTERED"),
    textNode("small", "neotokyo-sequence__ruler-role", "ACT DIRECTION // TITLE CREDIT")
  );
  return ruler;
}

function createCastImage(cast, fallbackAlt) {
  const image = document.createElement("img");
  image.src = safeImageUrl(cast?.imageUrl || cast?.image_url) || FALLBACK_IMAGE;
  image.alt = clean(cast?.imageAlt || cast?.image_alt) || clean(cast?.fullName || cast?.full_name) || fallbackAlt;
  image.addEventListener("error", () => {
    if (!image.src.endsWith("scan-failed.webp")) image.src = FALLBACK_IMAGE;
  });
  return image;
}

function getStyleLabels(cast) {
  return Array.isArray(cast?.styles)
    ? cast.styles.map(item => clean(item?.label || item?.name || item)).filter(Boolean)
    : [];
}

function getParticipationRole(cast) {
  return clean(
    cast?.participationRole ||
    cast?.participation_role ||
    cast?.handoutRole ||
    cast?.handout_role
  );
}

function roleMatchesStyle(role, style) {
  const normalize = value => clean(value)
    .replace(/[◎●]/g, "")
    .replace(/[\s　]+/g, "")
    .toLocaleLowerCase("ja-JP");
  return Boolean(role && style && normalize(role) === normalize(style));
}

function getActOverview(model) {
  const value = clean(model?.heroSubTitle);
  if (!value || value.toUpperCase() === DEFAULT_OVERVIEW) return "";
  return value;
}

function replaceStage(state, { eyebrow, title, sub, status = [] }) {
  const content = node("section", "neotokyo-sequence__screen neotokyo-sequence__screen--opening");
  content.append(
    textNode("p", "neotokyo-sequence__eyebrow", eyebrow),
    textNode("h2", "neotokyo-sequence__opening-title", title),
    textNode("p", "neotokyo-sequence__opening-sub", sub)
  );
  const log = node("div", "neotokyo-sequence__bootlog");
  for (const line of status) log.append(textNode("span", "", `> ${line}`));
  content.append(log);
  swapScreen(state, content);
}

function swapScreen(state, content) {
  state.stage.classList.remove("is-awaiting-advance");
  if (state.advanceButton) state.advanceButton.hidden = true;
  state.stage.replaceChildren(content);
  requestAnimationFrame(() => content.classList.add("is-visible"));
}

function setProgress(state, value, label) {
  const progress = Math.max(0, Math.min(100, Number(value) || 0));
  state.progress.style.setProperty("--neotokyo-progress", `${progress}%`);
  state.progressLabel.textContent = `${label} // ${String(progress).padStart(2, "0")}%`;
}

function waitForAdvance(state, label) {
  if (state.finished || state.skipRequested) return Promise.resolve();
  return new Promise(resolve => {
    state.advanceResolver = resolve;
    state.stage.classList.add("is-awaiting-advance");
    state.advanceButton.textContent = label || "CLICK TO CONTINUE";
    state.advanceButton.hidden = false;
    state.advanceButton.focus({ preventScroll: true });
  });
}

async function typeReadout(state, target, value, maxDuration, maxInterval = 24) {
  const source = clean(value);
  if (!source || state.finished) return;
  const characters = Array.from(source);
  const interval = Math.max(6, Math.min(maxInterval, Math.floor(maxDuration / Math.max(characters.length, 1))));
  const chunkSize = characters.length > 360 ? 3 : characters.length > 180 ? 2 : 1;
  let index = 0;
  while (index < characters.length && !state.finished) {
    index = Math.min(characters.length, index + chunkSize);
    target.textContent = characters.slice(0, index).join("");
    await wait(state, interval);
  }
  if (!state.finished) target.textContent = source;
}

function wait(state, milliseconds) {
  if (state.finished || state.skipRequested || milliseconds <= 0) return Promise.resolve();
  return new Promise(resolve => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      state.waiters.delete(done);
      resolve();
    };
    const timer = window.setTimeout(done, milliseconds);
    state.waiters.add(done);
  });
}

function safeImageUrl(value) {
  const source = clean(value);
  if (!source) return "";
  if (source.startsWith("data:image/")) return source;
  try {
    const url = new URL(source, location.href);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
}

function node(tag, className = "") {
  const element = document.createElement(tag);
  if (className) element.className = className;
  return element;
}

function textNode(tag, className, value) {
  const element = node(tag, className);
  element.textContent = value || "";
  return element;
}

function clean(value) {
  return String(value ?? "").trim();
}