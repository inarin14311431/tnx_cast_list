import { loadPublicShowcaseGuests, normalizeShowcaseSlug } from "./public-showcase-service.js?v=1";
import { formatShowcaseFullName, formatShowcaseTagline } from "./showcase-display-format.js?v=1";

const slug = normalizeShowcaseSlug(new URLSearchParams(location.search).get("id"));
if (slug) void renderGuests(slug);

async function renderGuests(showcaseSlug) {
  try {
    const rows = await loadPublicShowcaseGuests(showcaseSlug);
    const guests = Array.isArray(rows) ? rows.map(normalizeGuest).filter(guest => guest.name) : [];
    if (!guests.length) return;

    const end = document.querySelector(".showcase-end");
    const navigation = document.querySelector("#showcase-navigation");
    if (!end || document.querySelector("#standard-showcase-guests")) return;

    const section = document.createElement("section");
    section.id = "standard-showcase-guests";
    section.className = "cast-list wrap standard-showcase-guests";
    section.setAttribute("aria-label", "ゲストキャスト");
    section.replaceChildren(...guests.map(createGuestCard));
    end.before(section);

    guests.forEach((guest, index) => navigation?.append(createNavigationItem(guest, index)));
  } catch (error) {
    console.warn("Standard showcase guests could not be loaded.", error);
  }
}

function normalizeGuest(row) {
  return {
    handle: clean(row?.handle),
    name: clean(row?.name),
    personaStyle: clean(row?.persona_style),
    affiliation: clean(row?.affiliation),
    gender: clean(row?.gender),
    age: clean(row?.age),
    tagline: clean(row?.tagline),
    summary: clean(row?.summary),
    imageUrl: safeImageUrl(row?.image_url)
  };
}

function createNavigationItem(guest, index) {
  const anchor = document.createElement("a");
  anchor.href = `#guest-${index + 1}`;
  const number = document.createElement("span");
  number.textContent = `G${String(index + 1).padStart(2, "0")}`;
  anchor.append(number, formatShowcaseFullName(guest.handle, guest.name));
  return anchor;
}

function createGuestCard(guest, index) {
  const card = element("article", "cast-card standard-showcase-guest");
  card.id = `guest-${index + 1}`;

  const imageWrap = element("div", "cast-card__image");
  const image = document.createElement("img");
  image.src = guest.imageUrl || "./assets/placeholders/scan-failed.webp";
  image.alt = formatShowcaseFullName(guest.handle, guest.name);
  image.loading = "lazy";
  image.decoding = "async";
  imageWrap.append(image);

  const body = element("div", "cast-card__body");
  body.append(paragraph("cast-card__slot", `GUEST ${String(index + 1).padStart(2, "0")} // SUPPORTING CAST`));
  body.append(heading("h2", "cast-card__name", formatShowcaseFullName(guest.handle, guest.name)));

  if (guest.personaStyle) {
    const styles = element("div", "cast-card__styles");
    styles.append(heading("span", "style", guest.personaStyle));
    body.append(styles);
  }

  const metaValues = [
    ["AFFILIATION", guest.affiliation],
    ["AGE", guest.age],
    ["GENDER", guest.gender]
  ].filter(([, value]) => value);
  if (metaValues.length) {
    const meta = element("div", "cast-card__meta");
    for (const [label, value] of metaValues) {
      const box = document.createElement("div");
      box.append(heading("small", "", label), heading("strong", "", value));
      meta.append(box);
    }
    body.append(meta);
  }

  if (guest.tagline) body.append(paragraph("cast-card__tagline", formatShowcaseTagline(guest.tagline)));
  if (guest.summary) {
    const summary = element("div", "cast-card__handout");
    summary.append(paragraph("cast-card__handout-body", guest.summary));
    body.append(summary);
  }

  card.append(imageWrap, body, paragraph("cast-card__serial", `GUEST-${String(index + 1).padStart(2, "0")}`));
  return card;
}

function element(tagName, className = "") {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  return node;
}
function paragraph(className, value) { return heading("p", className, value); }
function heading(tagName, className, value) { const node = element(tagName, className); node.textContent = value; return node; }
function clean(value) { return String(value ?? "").trim(); }
function safeImageUrl(value) {
  const source = clean(value);
  if (!source) return "";
  if (/^(?:https?:|data:image\/|\.\/|\/)/i.test(source)) return source;
  return "";
}
