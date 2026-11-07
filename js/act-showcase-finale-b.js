// FINALE, pattern B ("key visual"): the page after the sequence, drawn from the model into a detached tree.
// js/act-showcase-page.js puts it in place of the static hero only once this has returned, so a failure here leaves the page as
// it was and playWithFallback plays pattern A on it. See docs/ACT_SHOWCASE_SCENES.md section 6 #7 (5th pattern: finale).
//
// Everything here uses its own class names (neotokyo-finale-b__*) and none of the ids and classes pattern A's observers look for
// (#opening-act-name, #opening-ruler, #poster-showcase-board-v2, .poster-v2-*, #poster-final-act-trailer, #poster-supporting-cast, ...):
// the final ACT TRAILER, the guest section and the scenario-writer credit that pattern A gets from those observers are drawn here,
// from the model. Styles live in css-next/pages/act-showcase-patterns.css, scoped to [data-scene="finale"][data-scene-pattern="b"].
import { castCards, creditItems, finaleTrailer, guestCards, heroBands, heroSubtitle, MAX_BANDS } from "./act-showcase-finale-b-model.js?v=76278f9e";

function element(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// The portrait of a band: the picture cropped from the top (css), or, when there is none or it does not load, a themed surface
// with the handle on it (never the placeholder picture), so the row of bands keeps its shape.
function createBandFallback(label) {
  return element("span", "neotokyo-finale-b__band-fallback", label);
}

function createBandImage(band) {
  if (!band.imageUrl) return createBandFallback(band.label);
  const image = document.createElement("img");
  image.className = "neotokyo-finale-b__band-image";
  image.src = band.imageUrl;
  image.alt = band.alt;
  image.loading = "eager";
  image.decoding = "async";
  image.addEventListener("error", () => image.replaceWith(createBandFallback(band.label)), { once: true });
  return image;
}

function createHero(model) {
  const bands = heroBands(model.casts);
  const hero = element("header", "neotokyo-finale-b__hero");
  const list = element("ul", "neotokyo-finale-b__bands");
  const count = String(Math.min(Math.max(bands.length, 1), MAX_BANDS));
  list.style.setProperty("--finale-b-count", count);
  list.setAttribute("data-count", count);
  for (const band of bands) {
    const item = element("li", "neotokyo-finale-b__band");
    item.append(createBandImage(band));
    list.append(item);
  }

  const heading = element("div", "neotokyo-finale-b__heading");
  heading.append(element("p", "neotokyo-finale-b__kicker", "PUBLIC ACT SHOWCASE"), element("h1", "neotokyo-finale-b__title", model.actName || "ACT SHOWCASE"));
  const subtitle = heroSubtitle(model);
  if (subtitle) heading.append(element("p", "neotokyo-finale-b__subtitle", subtitle));
  hero.append(list, heading);
  return hero;
}

function createCredits(model) {
  const items = creditItems(model);
  if (!items.length) return null;
  const strip = element("dl", "neotokyo-finale-b__credits");
  strip.setAttribute("aria-label", "クレジット");
  for (const item of items) {
    const group = element("div", "neotokyo-finale-b__credit");
    group.append(element("dt", "neotokyo-finale-b__credit-label", item.label), element("dd", "neotokyo-finale-b__credit-value", item.value));
    strip.append(group);
  }
  return strip;
}

function createTrailer(model) {
  const trailer = finaleTrailer(model);
  if (!trailer) return null;
  const section = element("section", "neotokyo-finale-b__trailer");
  section.setAttribute("aria-label", "アクトトレーラー");
  section.append(
    element("p", "neotokyo-finale-b__trailer-eyebrow", "ACT TRAILER"),
    element("p", "neotokyo-finale-b__trailer-title", trailer.title),
    element("blockquote", "neotokyo-finale-b__trailer-body", trailer.body)
  );
  return section;
}

// The head of a card: the square portrait (left out when there is none or it does not load), the slot, the role and reading
// when given, the handle and name side by side (they wrap onto two lines only when the pair does not fit) and the tagline.
function createCardHead(card, nameTag) {
  const head = element("div", "neotokyo-finale-b__card-head");
  if (card.imageUrl) {
    const thumb = element("span", "neotokyo-finale-b__thumb");
    const image = document.createElement("img");
    image.className = "neotokyo-finale-b__thumb-image";
    image.src = card.imageUrl;
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    image.addEventListener("error", () => thumb.remove(), { once: true });
    thumb.append(image);
    head.append(thumb);
  }
  const identity = element("div", "neotokyo-finale-b__identity");
  identity.append(element("p", "neotokyo-finale-b__slot", card.slot));
  if (card.role) identity.append(element("p", "neotokyo-finale-b__role", card.role));
  if (card.reading) identity.append(element("p", "neotokyo-finale-b__reading", card.reading));
  const name = element(nameTag, "neotokyo-finale-b__name");
  if (card.handle) name.append(element("span", "neotokyo-finale-b__handle", card.handle));
  if (card.name) name.append(element("span", "neotokyo-finale-b__real", card.name));
  identity.append(name);
  if (card.tagline) identity.append(element("p", "neotokyo-finale-b__tagline", card.tagline));
  head.append(identity);
  return head;
}

function createStyles(labels) {
  const styles = element("ul", "neotokyo-finale-b__styles");
  for (const label of labels) styles.append(element("li", "neotokyo-finale-b__style", label));
  return styles;
}

function createMeta(entries) {
  const meta = element("dl", "neotokyo-finale-b__meta");
  for (const entry of entries) {
    const row = element("div", "neotokyo-finale-b__meta-row");
    row.append(element("dt", "neotokyo-finale-b__meta-label", entry.label), element("dd", "neotokyo-finale-b__meta-value", entry.value));
    meta.append(row);
  }
  return meta;
}

function createCard(card) {
  const item = element("li", "neotokyo-finale-b__card");
  item.append(createCardHead(card, "h3"));
  if (card.styles.length) item.append(createStyles(card.styles));
  if (card.meta.length) item.append(createMeta(card.meta));
  if (card.handout) {
    const handout = element("div", "neotokyo-finale-b__handout");
    handout.append(
      element("p", "neotokyo-finale-b__handout-eyebrow", "PLAYER INFORMATION"),
      element("h4", "neotokyo-finale-b__handout-title", card.handout.title),
      element("p", "neotokyo-finale-b__handout-body", card.handout.body)
    );
    item.append(handout);
  }
  if (card.link) {
    const link = element("a", "neotokyo-finale-b__link", "VIEW FULL PROFILE →");
    link.href = card.link;
    link.target = "_blank";
    link.rel = "noopener";
    item.append(link);
  }
  return item;
}

function createCards(model) {
  const section = element("section", "neotokyo-finale-b__cards");
  section.setAttribute("aria-label", "キャスト");
  const list = element("ul", "neotokyo-finale-b__card-list");
  for (const card of castCards(model.casts)) list.append(createCard(card));
  section.append(list);
  return section;
}

// A guest card: the same parts as a cast card (portrait, slot, name, tagline, persona style, data) and the summary.
function createGuestCard(guest) {
  const item = element("li", "neotokyo-finale-b__card neotokyo-finale-b__card--guest");
  item.append(createCardHead(guest, "h3"));
  if (guest.personaStyle) item.append(createStyles([guest.personaStyle]));
  if (guest.meta.length) item.append(createMeta(guest.meta));
  if (guest.summary) item.append(element("p", "neotokyo-finale-b__guest-summary", guest.summary));
  return item;
}

function createGuests(model) {
  const guests = guestCards(model.guestRows);
  if (!guests.length) return null;
  const section = element("section", "neotokyo-finale-b__guests");
  section.setAttribute("aria-label", "ゲストキャスト");
  const list = element("ul", "neotokyo-finale-b__card-list neotokyo-finale-b__guest-list");
  for (const guest of guests) list.append(createGuestCard(guest));
  section.append(element("h2", "neotokyo-finale-b__guests-title", "GUEST CAST"), list);
  return section;
}

// model: { actName, heroSubTitle, rulerName, scenarioWriterName, trailer, trailerTitle, guestRows: rows of the published guests,
// casts }.
// Returns the section to put in the page; nothing outside it is touched.
export function createFinaleB({ model }) {
  if (!model || !Array.isArray(model.casts) || !model.casts.length) throw new Error("finale B needs at least one cast");
  const root = element("section", "neotokyo-finale-b");
  root.setAttribute("aria-label", "アクト紹介ショーケース");
  const parts = [createHero(model), createCredits(model), createTrailer(model), createCards(model), createGuests(model)];
  for (const part of parts) if (part) root.append(part);
  return root;
}
