// ACT READY, pattern B: the title and the cast as one centred screen, ACT READY on the axis and the casts as round portraits.
// Builds the static DOM of the screen only; js/act-showcase-neotokyo.js swaps it in and waits for the footer button.
//
// Everything here uses its own class names (neotokyo-ready-b__*), never the ones pattern A's layers look for
// (.neotokyo-sequence__screen--summary, __summary-*, __act-ready, ...): those carry observers (finale lockup, FINAL BRIEFING
// heading, guest rail, scenario-writer credit, the access button, the click guard) that would decorate this screen. So the
// guests and the scenario-writer credit that pattern A gets from those observers are drawn here, from the model, as two small
// rows under the casts. Styles live in css-next/pages/act-showcase-patterns.css, scoped to
// [data-scene="ready"][data-scene-pattern="b"]. See docs/ACT_SHOWCASE_SCENES.md section 6 #7 (3rd pattern: ready).
import { normalizeShowcaseDisplayQuotes } from "./showcase-display-format.js";
import { roleForCast } from "./act-showcase-visual-caption.js";

const clean = value => String(value ?? "").replace(/\s+/g, " ").trim();

function element(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// The role a cast was given ("PC1" is the slot, this is the role): the participation role, else the style flagged as the handout
// role, the same one pattern A ends up showing (js/act-showcase-supporting-cast.js). Nothing when there is none: no placeholder is drawn.
export const readyRole = cast => roleForCast(cast);

function styleLabels(cast) {
  return Array.isArray(cast?.styles) ? cast.styles.map(item => clean(item?.label || item?.name || item)).filter(Boolean) : [];
}

// Guest rows as public-showcase-service returns them: the displayed name is the handle in quotes and the name, and a row
// without a name is not a guest.
export function normalizeReadyGuests(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map(row => {
      const handle = clean(row?.handle);
      const name = clean(row?.name);
      return name ? normalizeShowcaseDisplayQuotes([handle ? `“${handle}”` : "", name].filter(Boolean).join(" ")) : "";
    })
    .filter(Boolean);
}

function extra(label, names) {
  const row = element("p", "neotokyo-ready-b__extra");
  row.append(element("span", "neotokyo-ready-b__extra-label", label), element("span", "neotokyo-ready-b__extra-names", names.join(" / ")));
  return row;
}

// model: { actName, rulerName, scenarioWriterName, guests: string[] (display names), casts }.
// createImage(cast, fallbackAlt): the cast image with its fallback (createCastImage of act-showcase-neotokyo.js, handed in
// because that module imports this one). step: the number in the eyebrow ("06").
export function createReadyScreenB({ step, model, createImage }) {
  const casts = Array.isArray(model?.casts) ? model.casts : [];
  const screen = element("section", "neotokyo-sequence__screen neotokyo-ready-b");
  // The stage turns a click on empty space into "next" (js/act-showcase-neotokyo.js); this screen is left only with its footer button.
  screen.dataset.advanceGuard = "button";
  screen.style.setProperty("--ready-count", String(casts.length));

  const ruler = element("p", "neotokyo-ready-b__ruler");
  ruler.append(element("span", "neotokyo-ready-b__ruler-label", "RULER"), element("strong", "neotokyo-ready-b__ruler-name", clean(model?.rulerName) || "UNREGISTERED"));

  const list = element("ul", "neotokyo-ready-b__casts");
  casts.forEach((cast, index) => {
    const item = element("li", "neotokyo-ready-b__cast");
    const figure = element("figure", "neotokyo-ready-b__image");
    figure.append(createImage(cast, `PC${index + 1} CAST`));
    const name = element("h3", "neotokyo-ready-b__name", clean(cast?.fullName) || `CAST ${index + 1}`);
    item.append(figure, element("p", "neotokyo-ready-b__slot", `PC${index + 1}`));
    const role = readyRole(cast);
    if (role) item.append(element("p", "neotokyo-ready-b__role", role));
    item.append(name);
    const styles = styleLabels(cast).join(" / ");
    if (styles) item.append(element("p", "neotokyo-ready-b__styles", styles));
    list.append(item);
  });

  const extras = element("div", "neotokyo-ready-b__extras");
  const guests = Array.isArray(model?.guests) ? model.guests.map(clean).filter(Boolean) : [];
  if (guests.length) extras.append(extra("GUEST", guests));
  const writer = clean(model?.scenarioWriterName);
  if (writer) extras.append(extra("SCENARIO WRITER", [writer]));

  screen.append(
    element("p", "neotokyo-ready-b__eyebrow", `${step} // ASSIGNMENT COMPLETE`),
    element("strong", "neotokyo-ready-b__ready", "ACT READY"),
    element("span", "neotokyo-ready-b__status", `ALL CASTS ASSIGNED // ${casts.length} CAST FILES LINKED`),
    element("h2", "neotokyo-ready-b__title", clean(model?.actName) || "ACT SHOWCASE"),
    ruler,
    list
  );
  if (extras.childElementCount) screen.append(extras);
  return { screen };
}
