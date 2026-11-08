// LOADING (the ACCESS screen once the data has arrived), pattern B, the "boot terminal": a terminal that fills the stage and
// types a boot log made of the act's own data, line by line, then shows ACCESS GRANTED. This module builds the lines (pure) and the
// static DOM of the screen; js/act-showcase-neotokyo.js swaps it in, types the lines and waits.
//
// Everything here uses its own class names (neotokyo-loading-b__*), never the ones pattern A's layers look for
// (.neotokyo-sequence__screen--opening, __bootlog, __access-seal, is-cinematic-access): js/act-showcase-cinematic-enhancer.js would
// decorate this screen. The static loading screen before the data arrives is common to every pattern and is not touched.
// Styles live in css-next/pages/act-showcase-patterns.css, scoped to [data-scene="loading"][data-scene-pattern="b"].
// See docs/ACT_SHOWCASE_SCENES.md section 6 #7 (6th pattern: loading).
import { splitCastName } from "./act-showcase-handout-fields.js?v=991c7b8e";
import { formatShowcaseHandle } from "./showcase-display-format.js?v=728d9084";

export const MAX_PCS = 6;

const clean = value => String(value ?? "").replace(/\s+/g, " ").trim();

// A line that has no data says nothing: it is left out (no "UNREGISTERED" or "NO HANDLE" in its place).
const line = (label, value) => (clean(value) ? [`${label}: ${clean(value)}`] : []);

// The boot log, in the order it is typed. model: { slug, actName, themeCode, rulerName, scenarioWriterName, casts, guestRows }.
// A PC without a handle has no line; the PCs keep their own numbers, so a missing one leaves a gap. A guest list that did not arrive
// (or is empty) has no line either.
export function bootLines(model) {
  const lines = ["handshake ... ok"];
  if (clean(model?.slug)) lines.push(`act file ${clean(model.slug)} located`);
  lines.push(...line("act", model?.actName));
  lines.push(...line("theme", model?.themeCode));
  lines.push(...line("ruler", model?.rulerName));
  lines.push(...line("scenario writer", model?.scenarioWriterName));
  (Array.isArray(model?.casts) ? model.casts.slice(0, MAX_PCS) : []).forEach((cast, index) => {
    const handle = formatShowcaseHandle(splitCastName(cast?.fullName).handle);
    if (handle) lines.push(`PC${index + 1} ${handle} linked`);
  });
  const guests = (Array.isArray(model?.guestRows) ? model.guestRows : []).filter(row => clean(row?.name)).length;
  if (guests > 0) lines.push(`guest files: ${guests}`);
  lines.push("decrypt ... done");
  return lines;
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// step: the number in the title bar ("01"). The caller sets data-scene / data-scene-pattern before the screen is inserted.
// Every line is built now, empty and hidden, and the caller types into its text node (Text.data) and unhides it: the DOM
// changes by one insertion, not by a node per typed character, so the observers on the sequence (which look at childList)
// stay quiet while it types. The log box is anchored to the bottom, so the line being typed is always its last row.
export function createLoadingScreenB({ step, lines }) {
  const screen = element("section", "neotokyo-sequence__screen neotokyo-loading-b");
  screen.setAttribute("aria-label", "アクトファイルへのアクセス");

  const bar = element("div", "neotokyo-loading-b__bar");
  bar.setAttribute("aria-hidden", "true");
  bar.append(element("span", "neotokyo-loading-b__bar-title", `${step} // ACT FILE // ACCESS`), element("span", "neotokyo-loading-b__bar-state", "PUBLIC SESSION"));

  const log = element("div", "neotokyo-loading-b__log");
  // the typed text is decoration (the same facts come on the screens that follow); the live region around the stage must not read it out letter by letter
  log.setAttribute("aria-hidden", "true");
  const rows = lines.map(text => {
    const row = element("p", "neotokyo-loading-b__line");
    row.hidden = true;
    const textNode = document.createTextNode("");
    row.append(textNode);
    log.append(row);
    return { row, textNode, text };
  });
  const granted = element("p", "neotokyo-loading-b__granted", "ACCESS GRANTED");
  granted.hidden = true;
  log.append(granted);

  screen.append(bar, log);
  return { screen, rows, granted };
}
