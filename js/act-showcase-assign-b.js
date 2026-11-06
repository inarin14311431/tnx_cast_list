// HANDOUT / ASSIGN, pattern B (the portrait first): one screen per PC, the handout on the right and an empty round slot on
// the left that the assigned cast fills (face, then name, then the style cards turn over). Builds the static DOM of the
// screen only; js/act-showcase-neotokyo.js (showHandoutAssignB) types the handout, moves data-phase / data-flip and
// fills the slot. Those two attributes are the whole state of the screen: tests and the visual baselines wait for them.
//
// Everything here uses its own class names (neotokyo-assign-b__*), never the ones pattern A's layers look for
// (.neotokyo-sequence__screen--linked, __handout-panel, __assign-panel, __cast--linked, __styles, ...): those carry observers
// (handout-live-frame, scroll-cue, story-flow, writing-patterns, supporting-cast, ...) that would decorate this screen.
// So the facts beside the handout (ROLE, CONNECTION, SUIT ...) and the role highlight on the style cards are drawn here,
// from the model. Styles live in css-next/pages/act-showcase-patterns.css, scoped to
// [data-scene="handout-assign"][data-scene-pattern="b"]. See docs/ACT_SHOWCASE_SCENES.md section 6 #7 (4th pattern: handout-assign).
import { handoutFacts, splitCastName, splitHandoutTitle } from "./act-showcase-handout-fields.js?v=991c7b8e";
import { findAssignedStyle } from "./act-showcase-visual-caption.js?v=47f6e034";
import { parseStyleLabel } from "./act-showcase-style-label.js?v=8a1b88dd";

const clean = value => String(value ?? "").replace(/\s+/g, " ").trim();

function element(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function fact(label, value) {
  const item = element("div", "neotokyo-assign-b__fact");
  item.append(element("span", "neotokyo-assign-b__fact-label", label), element("strong", "neotokyo-assign-b__fact-value", value));
  return item;
}

// One style as a card with two faces. `role` is the style label the cast was assigned to ("" when none): that card is marked.
function styleCard(label, index, { assigned, faceUp }) {
  const style = parseStyleLabel(label);
  const card = element("div", "neotokyo-assign-b__card");
  card.style.setProperty("--flip-index", String(index));
  if (assigned && label === assigned) card.classList.add("is-role");
  if (faceUp) card.classList.add("is-flipped");
  const back = element("div", "neotokyo-assign-b__card-back");
  back.setAttribute("aria-hidden", "true");
  const front = element("div", "neotokyo-assign-b__card-front", "");
  front.append(element("b", "neotokyo-assign-b__card-name", style.name));
  const marks = [style.persona ? "◎" : "", style.key ? "●" : ""].filter(Boolean).join("");
  if (marks) front.append(element("i", "neotokyo-assign-b__card-marks", marks));
  const inner = element("div", "neotokyo-assign-b__card-inner");
  inner.append(back, front);
  card.append(inner);
  return card;
}

// step / assignStep: the numbers of the eyebrows ("04" / "05"); pcNumber and pcLabel ("1" / "01"); handout: { title, body };
// role: the role of the cast ("" when it has none: no ROLE fact and no highlighted card); styles: the style labels;
// timing: { turn, gap } in ms for the card turns; faceUp: reduced motion, the cards start face-up;
// createImage(cast, fallbackAlt): the cast image with its fallback (createCastImage of act-showcase-neotokyo.js, handed in
// because that module imports this one). Returns the screen and the parts the sequence needs.
export function createAssignScreenB({ step, assignStep, pcNumber, pcLabel, cast, handout, role, styles, timing, faceUp, createImage }) {
  const screen = element("section", "neotokyo-sequence__screen neotokyo-assign-b");
  screen.dataset.phase = "reading";
  screen.dataset.flip = "idle";
  screen.style.setProperty("--flip-turn", `${timing.turn}ms`);
  screen.style.setProperty("--flip-gap", `${timing.gap}ms`);

  const title = splitHandoutTitle(clean(handout?.title) || `PC${pcNumber} HANDOUT`);
  const bodyText = String(handout?.body ?? "").trim() || "公開用ハンドアウト本文は登録されていません。";

  const eyebrow = element("p", "neotokyo-assign-b__eyebrow", `${step} // HANDOUT ${pcLabel} // PC${pcNumber}`);
  const status = element("p", "neotokyo-assign-b__status", "HANDOUT CHANNEL // ACTIVE");
  const head = element("header", "neotokyo-assign-b__head");
  head.append(eyebrow, status);

  // The slot is a HUD reticle until the cast arrives: corner brackets, a double ring with a scale, a dashed arc that turns,
  // a faint scan, a small SCANNING. All of it is decoration drawn by CSS (aria-hidden); the text is the PC number and the state.
  const ring = element("figure", "neotokyo-assign-b__ring");
  for (const part of ["frame", "ticks", "arc", "scan"]) {
    const decoration = element("span", `neotokyo-assign-b__ring-${part}`);
    decoration.setAttribute("aria-hidden", "true");
    ring.append(decoration);
  }
  const ringLabel = element("span", "neotokyo-assign-b__ring-label", `PC${pcNumber}`);
  const portrait = element("div", "neotokyo-assign-b__portrait");
  portrait.append(createImage(cast, `PC${pcNumber} CAST`));
  ring.append(ringLabel, element("span", "neotokyo-assign-b__ring-tag", "SCANNING"), portrait);
  const left = element("div", "neotokyo-assign-b__left");
  left.append(ring);

  const subject = element("h2", "neotokyo-assign-b__subject");
  subject.append(element("span", "neotokyo-assign-b__subject-text", title.subject));
  if (title.caption) subject.append(element("small", "neotokyo-assign-b__caption", title.caption));
  const facts = element("div", "neotokyo-assign-b__facts");
  if (role) facts.append(fact("ROLE", role));
  for (const item of handoutFacts(bodyText)) facts.append(fact(item.label, item.value));
  const copy = element("p", "neotokyo-assign-b__copy", "");
  const body = element("div", "neotokyo-assign-b__body");
  body.append(copy);
  const right = element("div", "neotokyo-assign-b__right");
  right.append(subject);
  if (facts.childElementCount) right.append(facts);
  right.append(body);

  const main = element("div", "neotokyo-assign-b__main");
  main.append(left, right);

  // The name gets the full width under both columns. Handle and name sit side by side; they break onto two lines only when
  // the pair does not fit (a long one also wraps here instead of in a narrow column).
  const who = element("div", "neotokyo-assign-b__who");
  const { handle, name } = splitCastName(cast?.fullName);
  const heading = element("h3", "neotokyo-assign-b__name");
  if (handle) heading.append(element("span", "neotokyo-assign-b__handle", handle));
  if (name || !handle) heading.append(element("span", "neotokyo-assign-b__real", name || `CAST ${pcNumber}`));
  who.append(element("p", "neotokyo-assign-b__micro", `${assignStep} // PC${pcNumber} // CAST ASSIGNED`));
  if (role) who.append(element("p", "neotokyo-assign-b__role", role));
  who.append(heading);
  const tagline = clean(cast?.tagline);
  if (tagline) who.append(element("p", "neotokyo-assign-b__tagline", tagline));

  const assigned = findAssignedStyle(styles, role);
  const cards = element("div", "neotokyo-assign-b__cards");
  (styles || []).forEach((label, index) => cards.append(styleCard(label, index, { assigned, faceUp })));
  if (!faceUp && cards.childElementCount) cards.classList.add("is-face-down");

  screen.append(head, main, who);
  if (cards.childElementCount) screen.append(cards);
  return { screen, copy, body, ring, ringLabel, status, cards, who };
}
