import { loadPublicShowcase, normalizeShowcaseSlug } from "./public-showcase-service.js?v=20260912a";

if (document.body?.id === "act-showcase-page") {
  const slug = normalizeShowcaseSlug(new URLSearchParams(location.search).get("id"));
  if (slug) void initializeFinalTrailer(slug);
}

async function initializeFinalTrailer(slug) {
  try {
    const data = await loadPublicShowcase(slug);
    const model = normalizeTrailer(data);
    if (!model.trailer) return;

    const story = document.querySelector("#showcase-story");
    if (!story || document.querySelector("#poster-final-act-trailer")) return;

    const section = createTrailerSection(model);
    mountAtStoryEnd(story, section);
  } catch (error) {
    console.warn("Final ACT TRAILER could not be rendered.", error);
  }
}

function normalizeTrailer(data) {
  const trailerSource = data?.trailer && typeof data.trailer === "object" && !Array.isArray(data.trailer)
    ? data.trailer
    : null;
  const trailer = trailerSource
    ? text(trailerSource.body || trailerSource.text)
    : text(data?.trailer || data?.actTrailer || data?.trailerText || data?.trailerBody || data?.intro);
  const trailerTitle = trailerSource
    ? text(trailerSource.title)
    : text(data?.trailerTitle);

  return {
    actName: text(data?.actName || data?.heroTitle || data?.pageTitle) || "ACT SHOWCASE",
    trailerTitle: trailerTitle || "ACT TRAILER",
    trailer
  };
}

function createTrailerSection(model) {
  const section = node("section", "poster-v2-final-trailer");
  section.id = "poster-final-act-trailer";
  section.setAttribute("aria-labelledby", "poster-final-act-trailer-title");

  const frame = node("div", "poster-v2-final-trailer__frame");
  const head = node("header", "poster-v2-final-trailer__head");
  head.append(
    node("span", "", "FINAL PAGE // PRE-ACT READOUT"),
    node("strong", "", "N◎VA MUNICIPAL DATABASE // ACT ARCHIVE")
  );

  const body = node("div", "poster-v2-final-trailer__body");
  body.append(
    node("p", "poster-v2-final-trailer__kicker", "ACT TRAILER"),
    node("p", "poster-v2-final-trailer__act", model.actName),
    node("h2", "poster-v2-final-trailer__title", model.trailerTitle),
    node("p", "poster-v2-final-trailer__copy", model.trailer)
  );
  body.querySelector("h2").id = "poster-final-act-trailer-title";

  const footer = node("footer", "poster-v2-final-trailer__footer");
  footer.append(
    node("span", "", "END OF ACT FILE"),
    node("strong", "", "THE ACT BEGINS NOW")
  );

  frame.append(head, body, footer);
  section.append(frame);
  return section;
}

function mountAtStoryEnd(story, section) {
  const mount = () => {
    const board = story.querySelector("#poster-showcase-board-v2");
    if (!board) return false;
    story.append(section);
    return true;
  };
  if (mount()) return;

  const observer = new MutationObserver(() => {
    if (!mount()) return;
    observer.disconnect();
  });
  observer.observe(story, { childList: true, subtree: true });
}

function node(tag, className = "", value = "") {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (value) element.textContent = value;
  return element;
}

function text(value) {
  return String(value ?? "").trim();
}
