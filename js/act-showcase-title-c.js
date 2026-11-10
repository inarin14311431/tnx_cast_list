// TITLE & CREDITS, pattern C: the opening of a film. Black bands above and below a wide frame that opens from a single line of light, the act
// name in the middle with its letter spacing closing in as it comes into focus, then the subtitle and the credits. Builds the static DOM of
// the screen only; js/act-showcase-neotokyo.js swaps it in and waits for NEXT.
//
// Like pattern B, everything here uses its own class names (neotokyo-title-c__*), never the ones pattern A's layers look for
// (.neotokyo-sequence__screen--title, __act-title, __ruler-credit, ...): those carry observers that would decorate this screen, so the
// subtitle and the scenario-writer credit are drawn from the model. Styles live in css-next/pages/act-showcase-patterns.css, scoped to
// [data-scene="title"][data-scene-pattern="c"]. See docs/ACT_SHOWCASE_SCENES.md section 6 #7 (4th pattern: title C).

const clean = value => String(value ?? "").replace(/\s+/g, " ").trim();

// The same rule patterns A and B use for the subtitle: the hero's default "CAST SHOWCASE" says nothing, so it is left out. It is written here
// again on purpose: importing it from js/act-showcase-title-b.js would tie C to B, and a broken B module (which the E2E for B's fallback
// simulates) would then stop C, and the whole sequence with it, from loading.
export function meaningfulSubtitle(value) {
  const text = clean(value);
  return !text || text.toUpperCase() === "CAST SHOWCASE" ? "" : text;
}

// How wide the letters start apart (in em) before they close in. A short name starts wide; a long one starts closer, so that it does not
// wrap differently while it animates (the wide spacing would push it onto more lines, and the lines would jump as it closes).
export const TITLE_TRACK_MAX = 0.7;
export const TITLE_TRACK_MIN = 0.1;
export function titleTrackStart(title) {
  const length = Array.from(clean(title)).length || 1;
  return Math.round(Math.max(TITLE_TRACK_MIN, Math.min(TITLE_TRACK_MAX, 5 / length)) * 100) / 100;
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function credit(label, name) {
  const item = element("div", "neotokyo-title-c__credit");
  item.append(element("span", "neotokyo-title-c__credit-label", label), element("strong", "neotokyo-title-c__credit-name", name));
  return item;
}

// step: the number in the eyebrow ("02"). The caller sets data-scene / data-scene-pattern before the screen is inserted.
export function createTitleScreenC({ step, title, subtitle, rulerName, scenarioWriterName }) {
  const screen = element("section", "neotokyo-sequence__screen neotokyo-title-c");

  const top = element("div", "neotokyo-title-c__band neotokyo-title-c__band--top");
  top.append(element("p", "neotokyo-title-c__eyebrow", `${step} // TITLE & CREDITS`), element("p", "neotokyo-title-c__note", "ACT FILE // TITLE LOCK"));

  const frame = element("div", "neotokyo-title-c__frame");
  const flare = element("i", "neotokyo-title-c__flare");
  flare.setAttribute("aria-hidden", "true");
  const heading = element("h1", "neotokyo-title-c__title", clean(title) || "ACT SHOWCASE");
  heading.style.setProperty("--neotokyo-title-c-start", `${titleTrackStart(heading.textContent)}em`);
  frame.append(flare, heading);
  const sub = meaningfulSubtitle(subtitle);
  if (sub) frame.append(element("p", "neotokyo-title-c__subtitle", sub));
  const credits = element("div", "neotokyo-title-c__credits");
  credits.append(credit("RULER", clean(rulerName) || "UNREGISTERED"));
  if (clean(scenarioWriterName)) credits.append(credit("SCENARIO WRITER", clean(scenarioWriterName)));
  frame.append(credits);

  const bottom = element("div", "neotokyo-title-c__band neotokyo-title-c__band--bottom");
  bottom.append(element("p", "neotokyo-title-c__status", "TITLE LOCKED // PREPARING ACT TRAILER"));

  screen.append(top, frame, bottom);
  return { screen };
}
