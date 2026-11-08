import { parseStyleLabel } from "./act-showcase-style-label.js?v=8a1b88dd";
import { castNumberFromSlot } from "./showcase-cast-number.js?v=944a948e";
import { keepCaretVisible } from "./act-showcase-caret.js?v=84d1801d";
import { DEFAULT_SCENE_PATTERN, playWithFallback } from "./act-showcase-scenes.js?v=2647c951";
import { createTrailerScreenB } from "./act-showcase-trailer-b.js?v=dc9ea1dc";
import { createTitleScreenB } from "./act-showcase-title-b.js?v=6f05db48";
import { createLoadingScreenB, bootLines } from "./act-showcase-loading-b.js?v=e2935443";
import { createReadyScreenB } from "./act-showcase-ready-b.js?v=b0bf110a";
import { createAssignScreenB } from "./act-showcase-assign-b.js?v=603b1dc4";
import { roleForCast } from "./act-showcase-visual-caption.js?v=47f6e034";
const SAMPLE_TRAILER_MESSAGE = "公開用アクトトレーラーは未登録です。\n公開データにトレーラーを登録すると、ここで読み上げ表示されます。";
export const FALLBACK_IMAGE = "./assets/placeholders/scan-failed.webp";
const SHOW_ACT_TITLE_SCREEN = true;

export function prepareNeoTokyoLoading(intro) {
  if (!intro) return;
  document.body.classList.add("showcase-neotokyo");
  const overline = intro.querySelector(".cinematic-intro__overline");
  const title = intro.querySelector(".cinematic-intro__title");
  const sub = intro.querySelector(".cinematic-intro__sub");
  if (overline) overline.textContent = "N◎VA MUNICIPAL DATABASE // PUBLIC ACT FILE";
  if (title) title.textContent = "ACT FILE // ACCESS";
  if (sub) sub.textContent = "CONNECTING TO PUBLIC ACT FILE…";
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
    revealAllStyleCards(intro);
    state.resolveWaiters();
    state.resolveAdvance();
    document.body.classList.remove("showcase-neotokyo-intro-active");
    intro.setAttribute("aria-hidden", "true");
  };

  state.skipButton.addEventListener("click", finish, { once: true });

  try {
    for (const scene of INTRO_SCENES) {
      if (scene.frame === "title" && !SHOW_ACT_TITLE_SCREEN) continue;
      await playWithFallback(
        scene.patterns,
        model.scenes?.[scene.frame],
        draw => draw(state, model, scene),
        (error, pattern) => console.warn(`ACT SHOWCASE: scene "${scene.frame}" pattern "${pattern}" failed, playing "${DEFAULT_SCENE_PATTERN}" instead`, error)
      );
      if (state.finished) return;
    }
  } finally {
    finish();
  }
}

// The scene frames the intro plays, in the order of SCENE_FRAMES (js/act-showcase-scenes.js), each with the function
// that draws it for every pattern it has (only "a" so far). "finale" is the page itself, shown by act-showcase-page.js
// once the intro ends, so it has no row here. step is the number in the eyebrow ("01 // ..."), progress the value of
// the progress bar; handout-assign repeats for every PC and spreads its progress over span, from the value at the
// start of a PC to +5 (searching) and +10 (assigned).
export const INTRO_SCENES = Object.freeze([
  Object.freeze({ frame: "loading", step: "01", progress: 5, patterns: Object.freeze({ a: showOpening, b: showOpeningB }) }),
  Object.freeze({ frame: "title", step: "02", progress: 18, patterns: Object.freeze({ a: showActTitle, b: showActTitleB }) }),
  Object.freeze({ frame: "trailer", step: "03", progress: 30, patterns: Object.freeze({ a: showTrailer, b: showTrailerB }) }),
  Object.freeze({
    frame: "handout-assign",
    step: "04",
    assignStep: "05",
    progress: 34,
    span: 50,
    patterns: Object.freeze({ a: showHandoutsAndAssigns, b: showHandoutAssignsB })
  }),
  Object.freeze({ frame: "ready", step: "06", progress: 100, patterns: Object.freeze({ a: showSummary, b: showReadyB }) })
]);

async function showHandoutsAndAssigns(state, model, scene) {
  for (let index = 0; index < model.casts.length; index += 1) {
    await showHandoutAndAssign(state, model.casts[index], index, model.casts, scene);
    if (state.finished) return;
  }
}

// Pattern B: the same PC loop, each PC a screen of its own (js/act-showcase-assign-b.js). Built before anything else is touched, so
// a failure there leaves the page as it was and playWithFallback plays pattern A instead.
async function showHandoutAssignsB(state, model, scene) {
  for (let index = 0; index < model.casts.length; index += 1) {
    await showHandoutAssignB(state, model.casts[index], index, model.casts, scene);
    if (state.finished) return;
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
    textNode("span", "", "NODE // TOKYO N◎VA")
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

async function showOpening(state, model, scene) {
  setProgress(state, scene.progress, "ACT FILE ACCESS");
  replaceStage(state, scene, {
    eyebrow: `${scene.step} // N◎VA MUNICIPAL DATABASE`,
    title: "ACT FILE // ACCESS",
    sub: "ESTABLISHING PUBLIC SESSION",
    status: ["PUBLIC ACT FILE // DETECTED", "SHOWCASE DATA // VERIFIED", "TITLE & CREDITS // READY"]
  });
  await wait(state, 2900);
}

// ---- LOADING, pattern B (the boot terminal, js/act-showcase-loading-b.js). Timings in ms.
// The typing of all the lines takes about LOADING_B_TYPE_MS however many there are (one PC or six), then ACCESS GRANTED is held for
// LOADING_B_HOLD_MS: about 3.4 s from the first letter to the next screen, against 2.9 s for pattern A (docs/ACT_SHOWCASE_SCENES.md
// section 6 #7, 6th pattern), which is at most 1 s longer. With reduced motion nothing is typed and the screen is held as long as A's.
const LOADING_B_TYPE_MS = 2200;
const LOADING_B_HOLD_MS = 1200;
const LOADING_B_REDUCED_HOLD_MS = 2900;
const LOADING_B_FONT_WAIT_MS = 1500;
const LOADING_B_MIN_INTERVAL_MS = 6;
const LOADING_B_MAX_INTERVAL_MS = 24;

// How many characters one typing step adds, and the wait between steps, so that `total` characters take about `budget` ms: the
// step is never shorter than the minimum interval, so a long log types several characters at a time. Pure.
export function bootTypingPlan(total, budget = LOADING_B_TYPE_MS) {
  const characters = Math.max(0, Math.floor(total) || 0);
  if (!characters) return { chunk: 1, interval: LOADING_B_MIN_INTERVAL_MS };
  const chunk = Math.max(1, Math.ceil((characters * LOADING_B_MIN_INTERVAL_MS) / budget));
  const steps = Math.ceil(characters / chunk);
  return { chunk, interval: Math.min(LOADING_B_MAX_INTERVAL_MS, Math.max(LOADING_B_MIN_INTERVAL_MS, Math.floor(budget / steps))) };
}

// The screen is built before anything else is touched, so a failure there leaves the page as it was and playWithFallback plays
// pattern A instead. It is shown at once (the frame and a blinking caret): this is the first screen the visitor sees after the static
// one, which is already gone, so it must not wait for fonts the way the later screens do. Only the typing waits, for the web fonts
// the log itself needs (Share Tech Mono for the Latin, Noto Sans JP for the handles), at most LOADING_B_FONT_WAIT_MS.
async function showOpeningB(state, model, scene) {
  const { screen, rows, granted } = createLoadingScreenB({ step: scene.step, lines: bootLines(model) });
  markScene(screen, scene, "b");
  setProgress(state, scene.progress, "ACT FILE ACCESS");
  const reduced = prefersReducedMotion() || document.body.classList.contains("showcase-neotokyo-reduced");
  if (reduced) {
    for (const { row, textNode, text } of rows) {
      textNode.data = text;
      row.hidden = false;
    }
    granted.hidden = false;
  } else if (rows.length) {
    rows[0].row.hidden = false;
    rows[0].row.dataset.typing = "true";
  }
  swapScreen(state, screen);
  if (reduced) {
    await wait(state, LOADING_B_REDUCED_HOLD_MS);
    return;
  }
  await fontsForText(state, rows.map(item => item.text).join(" "));
  await typeBootLines(state, rows);
  if (state.finished) return;
  granted.hidden = false;
  await wait(state, LOADING_B_HOLD_MS);
}

// Asks for the faces the log needs (only the unicode-range pieces that cover its characters are fetched) and waits for them, or for
// the limit, or for a skip. The families are the ones css-next/pages/act-showcase-patterns.css gives the terminal: Share Tech Mono
// for the Latin lines, Noto Sans JP only for what it has to draw that is not ASCII (the handles), Orbitron for ACCESS GRANTED.
async function fontsForText(state, text) {
  if (state.finished || !document.fonts?.load) return;
  const loads = [
    document.fonts.load('400 14px "Share Tech Mono"', text),
    document.fonts.load('900 14px Orbitron', "ACCESS GRANTED")
  ];
  const wide = text.replace(/[\u0000-\u007f]/g, "");
  if (wide) loads.push(document.fonts.load('400 14px "Noto Sans JP"', wide));
  await Promise.race([Promise.allSettled(loads), wait(state, LOADING_B_FONT_WAIT_MS)]);
}

// Types the lines one after the other into their own text nodes (data, not textContent: no node is added or replaced).
async function typeBootLines(state, rows) {
  const total = rows.reduce((sum, item) => sum + Array.from(item.text).length, 0);
  const { chunk, interval } = bootTypingPlan(total);
  for (const item of rows) {
    if (state.finished) return;
    const characters = Array.from(item.text);
    item.row.hidden = false;
    item.row.dataset.typing = "true";
    try {
      for (let index = 0; index < characters.length && !state.finished; ) {
        index = Math.min(characters.length, index + chunk);
        item.textNode.data = characters.slice(0, index).join("");
        await wait(state, interval);
      }
    } finally {
      // finished, skipped or the last character typed: the whole line is shown and the caret leaves it
      item.textNode.data = item.text;
      delete item.row.dataset.typing;
    }
  }
}

async function showActTitle(state, model, scene) {
  setProgress(state, scene.progress, "TITLE & CREDITS");
  const content = markScene(node("section", "neotokyo-sequence__screen neotokyo-sequence__screen--title"), scene);
  content.append(
    textNode("p", "neotokyo-sequence__eyebrow", `${scene.step} // TITLE & CREDITS`),
    textNode("p", "neotokyo-sequence__micro", "ACT TITLE"),
    textNode("h1", "neotokyo-sequence__act-title", model.actName || "ACT SHOWCASE"),
    createRulerCredit(model.rulerName)
  );

  content.append(textNode("p", "neotokyo-sequence__terminal", "TITLE & CREDITS LOCKED // PREPARING ACT TRAILER"));
  await swapScreen(state, content, { waitForFonts: true });
  await waitForAdvance(state, "NEXT // ACT TRAILER");
}

// Pattern B: one large title card with its credits (js/act-showcase-title-b.js). The screen is built before anything else is
// touched, so a failure there leaves the page as it was and playWithFallback plays pattern A instead.
async function showActTitleB(state, model, scene) {
  const { screen } = createTitleScreenB({
    step: scene.step,
    title: model.actName,
    subtitle: model.heroSubTitle,
    rulerName: model.rulerName,
    scenarioWriterName: model.scenarioWriterName
  });
  markScene(screen, scene, "b");
  setProgress(state, scene.progress, "TITLE & CREDITS");
  await swapScreen(state, screen, { waitForFonts: true });
  await waitForAdvance(state, "NEXT // ACT TRAILER");
}

async function showTrailer(state, model, scene) {
  setProgress(state, scene.progress, "ACT TRAILER");
  const content = markScene(node("section", "neotokyo-sequence__screen neotokyo-sequence__screen--trailer"), scene);
  const heading = model.trailerTitle || "ACT TRAILER";
  const trailer = model.trailer || SAMPLE_TRAILER_MESSAGE;
  const copy = textNode("p", "neotokyo-sequence__readout neotokyo-sequence__readout--split", "");
  if (!model.trailer) copy.classList.add("is-placeholder");
  const readout = prepareSplitReadout(copy, trailer);
  content.append(
    textNode("p", "neotokyo-sequence__eyebrow", `${scene.step} // ACT TRAILER`),
    textNode("p", "neotokyo-sequence__micro", "PRE-ACT READOUT / PUBLIC BROADCAST"),
    textNode("h2", "neotokyo-sequence__section-title", heading),
    copy,
    textNode("p", "neotokyo-sequence__terminal", "READOUT CHANNEL // TEXT SYNTHESIS")
  );
  await swapScreen(state, content, { waitForFonts: true });
  await typeSplitReadout(state, readout, 4200, 34);
  if (state.finished) return;
  await waitForAdvance(state, "NEXT // HANDOUT 01");
}

// Pattern B: the text is set vertically in a box of its own (js/act-showcase-trailer-b.js). The screen is built before
// anything else is touched, so a failure there leaves the page as it was and playWithFallback plays pattern A instead.
async function showTrailerB(state, model, scene) {
  const { screen, copy, body } = createTrailerScreenB({ step: scene.step, heading: model.trailerTitle || "ACT TRAILER" });
  markScene(screen, scene, "b");
  if (!model.trailer) copy.classList.add("is-placeholder");
  const readout = prepareSplitReadout(copy, model.trailer || SAMPLE_TRAILER_MESSAGE);
  setProgress(state, scene.progress, "ACT TRAILER");
  await swapScreen(state, screen, { waitForFonts: true });
  // the text scrolls inside its own box, so the caret is followed there (js/act-showcase-caret.js)
  await typeSplitReadout(state, readout, 4200, 34, () => keepCaretVisible(body, readout.readText));
  if (state.finished) return;
  await waitForAdvance(state, "NEXT // HANDOUT 01");
}

async function showHandoutAndAssign(state, cast, index, casts, scene) {
  const pcNumber = castNumberFromSlot(cast?.slot, index);
  const nextCast = casts[index + 1];
  const pcLabel = String(pcNumber).padStart(2, "0");
  const handout = cast?.handout && typeof cast.handout === "object" ? cast.handout : {};
  const handoutTitle = clean(handout.title) || `PC${pcNumber} HANDOUT`;
  const handoutBody = clean(handout.body) || "公開用ハンドアウト本文は登録されていません。";
  const participationRole = getParticipationRole(cast);
  const progressBase = scene.progress + Math.round((index / Math.max(casts.length, 1)) * scene.span);

  setProgress(state, progressBase, `HANDOUT ${pcLabel}`);

  const sequence = markScene(node("section", "neotokyo-sequence__screen neotokyo-sequence__screen--linked"), scene);
  const header = node("header", "neotokyo-sequence__linked-head");
  const phaseLabel = textNode("p", "neotokyo-sequence__eyebrow", `${scene.step} // HANDOUT ${pcLabel} // PC${pcNumber}`);
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
    textNode("p", "neotokyo-sequence__micro", `${scene.assignStep} // ASSIGNMENT ${pcLabel}`),
    textNode("h2", "neotokyo-sequence__assign-word", "ASSIGN"),
    textNode("p", "neotokyo-sequence__assign-sub", participationRole
      ? `ASSIGN SLOT // ${participationRole}`
      : "CAST MATCHING CHANNEL // STANDBY")
  );
  assignPanel.append(assignFrame);

  layout.append(handoutPanel, connector, assignPanel);
  sequence.append(header, layout);
  await swapScreen(state, sequence, { waitForFonts: true });
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
  phaseLabel.textContent = `${scene.step} // HANDOUT ${pcLabel}  →  ${scene.assignStep} // ASSIGNMENT ${pcLabel}`;
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
  // The three style cards turn face-up one at a time; the hold is the whole reveal plus a short rest (FLIP_SETTLE_MS),
  // not a fixed number. The status text above is set at once, as before: changing it later could re-wrap the header
  // and move the scroll. Only the "CAST ASSIGNED" badge in the card waits for the last turn. Reduced motion has no
  // face-down cards (and no reveal), so it keeps the plain hold.
  const flipMs = startStyleCardFlip(state, castCard);
  await wait(state, flipMs ? flipMs + FLIP_SETTLE_MS : STYLE_HOLD_MS);
  revealAllStyleCards(castCard);
  if (state.finished) return;

  const nextLabel = nextCast
    ? `NEXT // HANDOUT ${String(castNumberFromSlot(nextCast?.slot, index + 1)).padStart(2, "0")}`
    : "NEXT // ACT SUMMARY";
  await waitForAdvance(state, nextLabel);
}

// The state of pattern B's screen is two attributes: data-phase (reading > read > searching > found > assigned) and data-flip
// (idle > running > done: the style cards turning over). Every wait goes through wait(), so a skip ends them at once.
async function showHandoutAssignB(state, cast, index, casts, scene) {
  const pcNumber = castNumberFromSlot(cast?.slot, index);
  const nextCast = casts[index + 1];
  const pcLabel = String(pcNumber).padStart(2, "0");
  const handout = cast?.handout && typeof cast.handout === "object" ? cast.handout : {};
  const role = roleForCast(cast);
  const progressBase = scene.progress + Math.round((index / Math.max(casts.length, 1)) * scene.span);
  const faceUp = cardsStayFaceUp();
  const { turn, gap } = flipTiming();
  const { screen, copy, body, ringLabel, status, cards } = createAssignScreenB({
    step: scene.step, assignStep: scene.assignStep, pcNumber, pcLabel, cast, handout, role,
    styles: getStyleLabels(cast), timing: { turn, gap }, faceUp, createImage: createCastImage
  });
  markScene(screen, scene, "b");
  const readout = prepareSplitReadout(copy, clean(handout.body) ? String(handout.body).trim() : "公開用ハンドアウト本文は登録されていません。");
  setProgress(state, progressBase, `HANDOUT ${pcLabel}`);
  await swapScreen(state, screen, { waitForFonts: true });
  // the text scrolls inside its own box, so the caret is followed there (js/act-showcase-caret.js)
  await typeSplitReadout(state, readout, 2400, 24, () => keepCaretVisible(body, readout.readText));
  if (state.finished) return;

  screen.dataset.phase = "read";
  status.textContent = role ? `HANDOUT COMPLETE // ASSIGN SLOT ${role}` : "HANDOUT COMPLETE // AWAITING ASSIGN";
  await waitForAdvance(state, `ASSIGN // PC${pcNumber}`);
  if (state.finished) return;

  setProgress(state, progressBase + 5, `SEARCHING CAST // PC${pcNumber}`);
  screen.dataset.phase = "searching";
  ringLabel.textContent = "SEARCHING";
  status.textContent = "CAST ARCHIVE // SEARCHING";
  await wait(state, B_SEARCH_MS);
  if (state.finished) return;

  screen.dataset.phase = "found";
  ringLabel.textContent = "MATCH FOUND";
  status.textContent = "MATCH FOUND // ROUTING CAST FILE";
  await wait(state, B_FOUND_MS);
  if (state.finished) return;

  screen.dataset.phase = "assigned";
  status.textContent = role ? `PC${pcNumber} // ${role} // CAST ASSIGNED` : `PC${pcNumber} // CAST ASSIGNED`;
  setProgress(state, progressBase + 10, `CAST ASSIGNED // PC${pcNumber}`);
  // on a short screen the name and the cards are below the fold (the layout keeps their room from the start): scroll the
  // screen down to them, gently
  if (screen.scrollHeight > screen.clientHeight + 1) screen.scrollTo({ top: screen.scrollHeight, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  const turning = cards.querySelectorAll(".neotokyo-assign-b__card").length;
  if (turning && !faceUp) {
    // the face appears first (a short fade), then the cards turn one by one, left to right
    await wait(state, B_FACE_REVEAL_MS);
    if (state.finished) return;
    screen.dataset.flip = "running";
    void cards.offsetWidth; // commit the face-down state so the first turn is a transition, not a jump
    for (const card of cards.querySelectorAll(".neotokyo-assign-b__card")) card.classList.add("is-flipped");
    await wait(state, (turning - 1) * gap + turn + FLIP_SETTLE_MS);
  } else {
    await wait(state, STYLE_HOLD_MS);
  }
  if (state.finished) return;
  cards.classList.remove("is-face-down");
  screen.dataset.flip = "done";

  const nextLabel = nextCast
    ? `NEXT // HANDOUT ${String(castNumberFromSlot(nextCast?.slot, index + 1)).padStart(2, "0")}`
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

// Timing of the style-card reveal (ms): one card's turn and the start-to-start gap. This table is the only place the
// numbers live: they reach the CSS as --flip-turn / --flip-gap on the card row (the turns are CSS transitions whose delay
// is --flip-index x --flip-gap), and the timers below use the same two values. ?flip=fast|normal|slow picks a row
// (anything else is normal); nothing is shown on the page.
const FLIP_PRESETS = {
  fast: { turn: 320, gap: 100 },
  normal: { turn: 600, gap: 300 },
  slow: { turn: 900, gap: 450 }
};
const STYLE_MARK_UNITS = 0.9; // width of one mark beside the name, in name characters
const FLIP_SETTLE_MS = 300; // rest after the last card has turned
const STYLE_HOLD_MS = 700; // the hold when nothing turns (reduced motion, no cards)
// Pattern B (js/act-showcase-assign-b.js): how long each state of the assignment lasts before the next one (ms). The face fades in
// over the CSS 0.9 s; the cards start turning B_FACE_REVEAL_MS after the phase became "assigned".
const B_SEARCH_MS = 1000;
const B_FOUND_MS = 600;
const B_FACE_REVEAL_MS = 700;

export function resolveFlipTiming(search) {
  const key = new URLSearchParams(search || "").get("flip");
  return Object.prototype.hasOwnProperty.call(FLIP_PRESETS, key) ? FLIP_PRESETS[key] : FLIP_PRESETS.normal;
}
const flipTiming = () => resolveFlipTiming(typeof location === "object" ? location.search : "");

// Cards are div/b/i on purpose: the legacy chip rules and role markers target `.neotokyo-sequence__styles span`.
function createStyleRow(cast, participationRole) {
  const row = node("div", "neotokyo-sequence__styles neotokyo-sequence__style-cards");
  const role = participationRole || handoutRoleLabel(cast);
  const faceUp = cardsStayFaceUp();
  const { turn, gap } = flipTiming();
  row.style.setProperty("--flip-turn", `${turn}ms`);
  row.style.setProperty("--flip-gap", `${gap}ms`);
  let primaryFound = false;
  for (const label of getStyleLabels(cast)) {
    const style = parseStyleLabel(label);
    const card = node("div", "neotokyo-style-card");
    // Only assigned marks are drawn, on the same line as the name; the font size is fixed from the whole label's width
    // (name characters + a mark counts as 0.9 character at the name's size) so the label always fits the face.
    const litMarks = [["persona", "◎", style.persona], ["key", "●", style.key]].filter(([, , lit]) => lit);
    const labelUnits = Math.max(3, Array.from(style.name).length) + litMarks.length * STYLE_MARK_UNITS;
    card.style.setProperty("--style-label-units", String(labelUnits));
    if (role && roleMatchesStyle(role, label)) {
      card.classList.add("is-role");
      card.classList.add(primaryFound ? "is-role-duplicate" : "is-role-primary");
      primaryFound = true;
    }
    card.style.setProperty("--flip-index", String(row.childElementCount));
    if (faceUp) card.classList.add("is-flipped");

    const back = node("div", "neotokyo-style-card__back");
    back.setAttribute("aria-hidden", "true");
    const front = node("div", "neotokyo-style-card__front");
    front.append(textNode("b", "neotokyo-style-card__name", style.name));
    if (litMarks.length) {
      const marks = node("i", "neotokyo-style-card__marks");
      for (const [kind, glyph] of litMarks) marks.append(createStyleMark(kind, glyph));
      front.append(marks);
    }
    const inner = node("div", "neotokyo-style-card__inner");
    inner.append(back, front);
    card.append(inner);
    row.append(card);
  }
  if (!faceUp && row.childElementCount) row.classList.add("is-face-down");
  return row;
}

// An assigned mark is real text; styles without one draw nothing.
function createStyleMark(kind, glyph) {
  const mark = node("i", `neotokyo-style-card__mark neotokyo-style-card__mark--${kind} is-lit`);
  mark.textContent = glyph;
  return mark;
}

function handoutRoleLabel(cast) {
  const style = Array.isArray(cast?.styles) ? cast.styles.find(item => item?.handoutRole || item?.handout_role) : null;
  return clean(style?.label);
}

// Reduced motion (media query or the body flag set at the start of the sequence): cards are face-up from the start.
function cardsStayFaceUp() {
  return prefersReducedMotion() || document.body.classList.contains("showcase-neotokyo-reduced");
}

// Turns the cards over left to right without waiting: the CSS delays stagger the turns and a timer lifts
// the "CAST ASSIGNED" badge after the last one. Returns the length of the reveal in ms, or 0 when there is nothing to
// animate (no cards, reduced motion).
// A skip or the end of the sequence calls revealAllStyleCards, which also cancels the timer's effect.
function startStyleCardFlip(state, castCard) {
  const row = castCard.querySelector(".neotokyo-sequence__style-cards.is-face-down");
  const cards = row ? [...row.querySelectorAll(".neotokyo-style-card")] : [];
  if (!cards.length || state.finished) return 0;
  castCard.classList.add("is-styles-pending");
  void row.offsetWidth; // commit the face-down state so the first turn is a transition, not a jump
  for (const card of cards) card.classList.add("is-flipped");
  const done = () => {
    if (state.finished) return;
    castCard.classList.remove("is-styles-pending");
  };
  const { turn, gap } = flipTiming();
  const total = (cards.length - 1) * gap + turn;
  window.setTimeout(done, total);
  return total;
}

// Final state: every card face-up at once (no transition) and "CAST ASSIGNED" shown. Safe to call at any time and more than once.
function revealAllStyleCards(root) {
  if (!root) return;
  for (const row of root.querySelectorAll(".neotokyo-sequence__style-cards")) {
    row.classList.add("is-revealed");
    row.classList.remove("is-face-down");
  }
  for (const card of root.querySelectorAll(".neotokyo-style-card")) card.classList.add("is-flipped");
  root.classList.remove("is-styles-pending");
  for (const cast of root.querySelectorAll(".is-styles-pending")) cast.classList.remove("is-styles-pending");
}

async function showSummary(state, model, scene) {
  setProgress(state, scene.progress, "ACT READY");
  const content = markScene(node("section", "neotokyo-sequence__screen neotokyo-sequence__screen--summary"), scene);
  const heading = node("div", "neotokyo-sequence__summary-head");
  heading.append(
    textNode("p", "neotokyo-sequence__eyebrow", `${scene.step} // ASSIGNMENT COMPLETE`),
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
  await swapScreen(state, content, { waitForFonts: true });
  await waitForAdvance(state, "OPEN FULL SHOWCASE");
}

// Pattern B: the casts as round portraits (js/act-showcase-ready-b.js). Built before anything else is touched, so a failure
// there leaves the page as it was and playWithFallback plays pattern A instead.
async function showReadyB(state, model, scene) {
  const { screen } = createReadyScreenB({ step: scene.step, model, createImage: createCastImage });
  markScene(screen, scene, "b");
  setProgress(state, scene.progress, "ACT READY");
  await swapScreen(state, screen, { waitForFonts: true });
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

export function createCastImage(cast, fallbackAlt) {
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

function replaceStage(state, scene, { eyebrow, title, sub, status = [] }) {
  const content = markScene(node("section", "neotokyo-sequence__screen neotokyo-sequence__screen--opening"), scene);
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

// Marks a screen with the scene frame it belongs to and the pattern drawing it (data-scene / data-scene-pattern). Set while
// the element is still detached, so it arrives with its marks and no MutationObserver sees an attribute change.
function markScene(element, scene, pattern = DEFAULT_SCENE_PATTERN) {
  element.dataset.scene = scene.frame;
  element.dataset.scenePattern = pattern;
  return element;
}

// waitForFonts: the screen draws text in web fonts, which load lazily and (display=block) keep their text invisible until they
// arrive, while the screen's animations and typing already run: the visitor would see the title or the readout start from the
// middle. So the screen is put in hidden, shown once the fonts it needs are in (at most FONT_WAIT_MS), and the caller's own
// animation or typing starts only after the returned promise resolves. Without it the screen is shown on the next frame.
const FONT_WAIT_MS = 2500;

function swapScreen(state, content, { waitForFonts = false } = {}) {
  state.stage.classList.remove("is-awaiting-advance");
  if (state.advanceButton) state.advanceButton.hidden = true;
  const hadScreen = Boolean(state.stage.querySelector(":scope > .neotokyo-sequence__screen"));
  state.stage.replaceChildren(content);
  if (!waitForFonts) {
    if (hadScreen) playSwapNoise(state);
    requestAnimationFrame(() => content.classList.add("is-visible"));
    return Promise.resolve();
  }
  return revealWhenFontsAreIn(state, content, hadScreen);
}

async function revealWhenFontsAreIn(state, content, hadScreen) {
  // Layout is what requests the faces a screen needs, and the layers that decorate a screen add their own text right after it
  // is inserted: lay it out now, let two frames pass (the second one comes after the decorated screen was laid out), then wait.
  void content.offsetWidth;
  // Pattern A's animations start with the element, not with .is-visible: hold them while the screen waits and play them from the
  // start once it is shown. Those begun by the layers that decorate the screen a frame later are held too.
  const held = new Set();
  const hold = () => {
    for (const animation of content.getAnimations?.({ subtree: true }) ?? []) {
      // only the CSS animations: the ones a layer drives from script (the trailer's height following) are not ours to restart
      if (held.has(animation) || (typeof CSSAnimation !== "undefined" && !(animation instanceof CSSAnimation))) continue;
      held.add(animation);
      animation.pause();
    }
  };
  hold();
  await nextFrame();
  hold();
  await nextFrame();
  hold();
  if (document.fonts?.ready) await Promise.race([document.fonts.ready, wait(state, FONT_WAIT_MS)]);
  if (hadScreen) playSwapNoise(state);
  content.classList.add("is-visible");
  for (const animation of held) {
    animation.currentTime = 0;
    animation.play();
  }
}

function nextFrame() {
  return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

// Short scanline/flash overlay (stage:after) on screen-to-screen swaps only. Re-triggered by toggling the class with a forced reflow.
function playSwapNoise(state) {
  if (state.finished || state.skipRequested) return;
  if (document.body.classList.contains("showcase-neotokyo-reduced")) return;
  const stage = state.stage;
  stage.classList.remove("is-screen-swap");
  void stage.offsetWidth;
  stage.classList.add("is-screen-swap");
  stage.addEventListener("animationend", event => {
    if (event.target === stage && event.animationName === "neotokyo-screen-swap-noise") stage.classList.remove("is-screen-swap");
  }, { once: true });
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

// The ACT TRAILER readout lays out its whole text from the start, split into the part already read and the part
// still to come (visibility:hidden, not display:none, so the line breaks are final from the first frame and a
// character that is shown never moves). The frame around it is sized from the caret's line by
// js/act-showcase-cinematic-layout-v2.js while data-typing is set. The unread part is aria-hidden, so a screen reader
// hears the text once (the read part, which becomes the whole text when the reading ends).
function prepareSplitReadout(target, value) {
  const source = clean(value);
  const read = node("span", "neotokyo-sequence__readout-read");
  const unread = node("span", "neotokyo-sequence__readout-unread");
  unread.setAttribute("aria-hidden", "true");
  const readText = document.createTextNode("");
  const unreadText = document.createTextNode(source);
  read.append(readText);
  unread.append(unreadText);
  target.append(read, unread);
  if (source) target.dataset.typing = "true";
  return { target, readText, unreadText, characters: Array.from(source), source };
}

// onStep (optional) runs after every typed step and once more when the reading ends, with the text already updated: a
// pattern whose text scrolls inside its own box passes () => keepCaretVisible(box, readout.readText). Pattern A passes
// nothing: its frame follows the caret by itself (js/act-showcase-cinematic-layout-v2.js).
async function typeSplitReadout(state, readout, maxDuration, maxInterval = 24, onStep = null) {
  const { target, readText, unreadText, characters, source } = readout;
  if (!source) return;
  const interval = Math.max(6, Math.min(maxInterval, Math.floor(maxDuration / Math.max(characters.length, 1))));
  const chunkSize = characters.length > 360 ? 3 : characters.length > 180 ? 2 : 1;
  let index = 0;
  try {
    while (index < characters.length && !state.finished) {
      index = Math.min(characters.length, index + chunkSize);
      readText.data = characters.slice(0, index).join("");
      unreadText.data = characters.slice(index).join("");
      onStep?.();
      await wait(state, interval);
    }
  } finally {
    // reading ended (completed, skipped or the sequence finished): the whole text is "read" and the frame is released
    readText.data = source;
    unreadText.data = "";
    delete target.dataset.typing;
    onStep?.();
  }
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