// TITLE & CREDITS, pattern B: the act name as one large title card, lit by a light edge that sweeps across it and settles
// with a short colour split, then the credits. Builds the static DOM of the screen only; js/act-showcase-neotokyo.js
// swaps it in and waits for NEXT.
//
// Everything here uses its own class names (neotokyo-title-b__*), never the ones pattern A's layers look for
// (.neotokyo-sequence__screen--title, __act-title, __ruler-credit, ...): those carry observers (meta strip, ghost title,
// rule, subtitle, scenario-writer credit) that would decorate this screen. So the subtitle and the scenario-writer credit
// that pattern A gets from those observers are drawn here from the model. Styles live in
// css-next/pages/act-showcase-patterns.css, scoped to [data-scene="title"][data-scene-pattern="b"].
// See docs/ACT_SHOWCASE_SCENES.md section 6 #8.

const clean = value => String(value ?? "").replace(/\s+/g, " ").trim();

// The same rule pattern A uses for its subtitle: the hero's default "CAST SHOWCASE" says nothing, so it is left out.
export function meaningfulSubtitle(value) {
  const text = clean(value);
  return !text || text.toUpperCase() === "CAST SHOWCASE" ? "" : text;
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function credit(label, name) {
  const item = element("div", "neotokyo-title-b__credit");
  item.append(element("span", "neotokyo-title-b__credit-label", label), element("strong", "neotokyo-title-b__credit-name", name));
  return item;
}

// step: the number in the eyebrow ("02"). The caller sets data-scene / data-scene-pattern before the screen is inserted.
export function createTitleScreenB({ step, title, subtitle, rulerName, scenarioWriterName }) {
  const screen = element("section", "neotokyo-sequence__screen neotokyo-title-b");
  const line = element("div", "neotokyo-title-b__line");
  line.append(element("h1", "neotokyo-title-b__title", clean(title) || "ACT SHOWCASE"), element("span", "neotokyo-title-b__edge"));
  line.lastChild.setAttribute("aria-hidden", "true");

  const rule = element("div", "neotokyo-title-b__rule");
  rule.setAttribute("aria-hidden", "true");
  rule.append(element("i", "neotokyo-title-b__rule-half"), element("span", "neotokyo-title-b__rule-mark"), element("i", "neotokyo-title-b__rule-half"));

  const credits = element("div", "neotokyo-title-b__credits");
  credits.append(credit("RULER", clean(rulerName) || "UNREGISTERED"));
  if (clean(scenarioWriterName)) credits.append(credit("SCENARIO WRITER", clean(scenarioWriterName)));

  screen.append(element("p", "neotokyo-title-b__eyebrow", `${step} // TITLE & CREDITS`), line, rule);
  const sub = meaningfulSubtitle(subtitle);
  if (sub) screen.append(element("p", "neotokyo-title-b__subtitle", sub));
  screen.append(credits, element("p", "neotokyo-title-b__status", "TITLE LOCKED // PREPARING ACT TRAILER"));
  return { screen };
}
