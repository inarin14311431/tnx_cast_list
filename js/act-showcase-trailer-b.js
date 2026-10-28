// ACT TRAILER, pattern B: the trailer text set vertically (right to left) beside a horizontal title. Builds the static
// DOM of the screen only; js/act-showcase-neotokyo.js splits the text into read / unread and types it out.
//
// Everything here uses its own class names (neotokyo-trailer-b__*), never the ones pattern A's layers look for
// (.neotokyo-sequence__screen--trailer, __readout, __trailer-terminal, ...): those carry observers and theme rules that
// would decorate this screen. Its styles live in css-next/pages/act-showcase-patterns.css, scoped to
// [data-scene="trailer"][data-scene-pattern="b"]. See docs/ACT_SHOWCASE_SCENES.md section 6 #7.

function paragraph(className, text) {
  const element = document.createElement("p");
  element.className = className;
  element.textContent = text;
  return element;
}

// step: the number in the eyebrow ("03"); heading: the trailer title. Returns the screen, the text element (copy) and
// the box that scrolls it (body); the caller sets data-scene / data-scene-pattern before the screen is inserted.
export function createTrailerScreenB({ step, heading }) {
  const screen = document.createElement("section");
  screen.className = "neotokyo-sequence__screen neotokyo-trailer-b";
  const title = document.createElement("h2");
  title.className = "neotokyo-trailer-b__title";
  title.textContent = heading;
  const copy = paragraph("neotokyo-trailer-b__copy", "");
  const body = document.createElement("div");
  body.className = "neotokyo-trailer-b__body";
  body.append(copy);
  screen.append(
    paragraph("neotokyo-trailer-b__index", step),
    paragraph("neotokyo-trailer-b__eyebrow", `${step} // ACT TRAILER // PUBLIC BROADCAST`),
    title,
    body,
    paragraph("neotokyo-trailer-b__meta", "READOUT CHANNEL // TEXT SYNTHESIS")
  );
  return { screen, copy, body };
}
