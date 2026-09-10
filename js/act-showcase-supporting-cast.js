import { loadPublicShowcase, loadPublicShowcaseGuests, normalizeShowcaseSlug } from "./public-showcase-service.js?v=1";

const params = new URLSearchParams(location.search);
const slug = normalizeShowcaseSlug(params.get("id"));
if (slug) void initializeSupportingCast(slug);

async function initializeSupportingCast(showcaseSlug) {
  const [showcaseResult, guestResult] = await Promise.allSettled([
    loadPublicShowcase(showcaseSlug),
    loadPublicShowcaseGuests(showcaseSlug)
  ]);
  if (showcaseResult.status === "rejected") console.warn("Showcase role map could not be loaded.", showcaseResult.reason);
  if (guestResult.status === "rejected") console.warn("Guest cast could not be loaded.", guestResult.reason);
  const showcase = showcaseResult.status === "fulfilled" ? showcaseResult.value : null;
  const guestRows = guestResult.status === "fulfilled" ? guestResult.value : [];
  const casts = Array.isArray(showcase?.casts) ? showcase.casts : [];
  const guests = Array.isArray(guestRows) ? guestRows.map(normalizeGuest).filter(item => item.name) : [];

  let queued = false;
  const sync = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      repairNeoTokyoRoles(casts);
      emphasizePosterRoles(casts);
      emphasizeNeoTokyoRoles();
      removeFinalTitleDuplicate();
      if (guests.length) {
        renderPosterGuests(guests);
        renderSummaryGuests(guests);
      }
    });
  };
  const observer = new MutationObserver(sync);
  // Dynamic showcase screens are inserted/replaced as child nodes. Keep every sync idempotent:
  // this observer must never create another child mutation when the visible value is unchanged.
  observer.observe(document.body, { childList: true, subtree: true });
  sync();
}

function normalizeGuest(row) {
  return {
    sortOrder: Number(row?.sort_order || 0), handle: clean(row?.handle), name: clean(row?.name),
    personaStyle: clean(row?.persona_style), affiliation: clean(row?.affiliation), gender: clean(row?.gender),
    age: clean(row?.age), tagline: clean(row?.tagline), summary: clean(row?.summary), imageUrl: safeImageUrl(row?.image_url)
  };
}

function roleForCast(cast) {
  const explicit = clean(cast?.participationRole || cast?.participation_role);
  if (explicit) return explicit;
  const roleStyle = Array.isArray(cast?.styles) ? cast.styles.find(style => style?.handoutRole || style?.handout_role) : null;
  return clean(roleStyle?.label);
}

function findCastByDisplayedName(casts, value) {
  const target = normalizeName(value);
  return casts.find(item => normalizeName(item?.fullName || item?.full_name || item?.name) === target);
}

function setTextIfChanged(target, value) {
  if (!target) return;
  const next = String(value ?? "");
  if (target.textContent !== next) target.textContent = next;
}

function repairNeoTokyoRoles(casts) {
  for (const card of document.querySelectorAll(".neotokyo-sequence__cast--linked")) {
    const cast = findCastByDisplayedName(casts, card.querySelector("h3")?.textContent);
    const role = roleForCast(cast);
    if (!role) continue;
    const slot = card.querySelector(".neotokyo-sequence__role-slot strong");
    setTextIfChanged(slot, role);
    markRoleChips(card.querySelector(".neotokyo-sequence__styles"), role);
  }

  const summaryCards = [...document.querySelectorAll(".neotokyo-sequence__summary-cast")];
  summaryCards.forEach((card, index) => {
    const cast = findCastByDisplayedName(casts, card.querySelector("h3")?.textContent) || casts[index];
    const role = roleForCast(cast);
    if (!role) return;
    const roleLabel = card.querySelector(".neotokyo-sequence__summary-cast-role");
    setTextIfChanged(roleLabel, role);
    const styles = card.querySelector(".neotokyo-sequence__summary-cast-styles");
    if (styles && !styles.querySelector("span")) {
      const labels = Array.isArray(cast?.styles) ? cast.styles.map(style => clean(style?.label)).filter(Boolean) : [];
      styles.replaceChildren(...labels.map(label => textNode("span", label)));
    }
    markRoleChips(styles, role);
    const vector = document.querySelectorAll(".neotokyo-story__entry-vector")[index];
    const vectorRole = vector?.querySelector("b");
    setTextIfChanged(vectorRole, role);
  });
}

function markRoleChips(group, role) {
  if (!group || !role) return;
  let found = false;
  for (const chip of group.querySelectorAll("span")) {
    const matches = normalizeStyle(chip.textContent) === normalizeStyle(role);
    const primary = matches && !found;
    const duplicate = matches && found;
    if (matches) found = true;
    chip.classList.toggle("is-role", primary);
    chip.classList.toggle("is-role-primary", primary);
    chip.classList.toggle("is-role-duplicate", duplicate);
  }
}

function emphasizePosterRoles(casts) {
  for (const profile of document.querySelectorAll(".poster-v2-panel--profile")) {
    const name = clean(profile.querySelector(".poster-v2-name")?.textContent);
    const cast = findCastByDisplayedName(casts, name);
    const role = roleForCast(cast);
    if (!role) continue;
    const tags = profile.querySelector(".poster-v2-tags");
    let found = false;
    for (const chip of tags?.querySelectorAll("span") || []) {
      const matches = normalizeStyle(chip.textContent) === normalizeStyle(role);
      const primary = matches && !found;
      const duplicate = matches && found;
      if (matches) found = true;
      chip.classList.toggle("is-assigned-style", primary);
      chip.classList.toggle("is-assigned-style-duplicate", duplicate);
      if (primary) chip.dataset.assignedLabel = "ASSIGNED";
      else delete chip.dataset.assignedLabel;
    }
    tags?.classList.toggle("has-assigned-style", found);
  }
}

function emphasizeNeoTokyoRoles() {
  for (const group of document.querySelectorAll(".neotokyo-sequence__styles,.neotokyo-sequence__summary-cast-styles")) {
    const selected = group.querySelector(".is-role-primary");
    group.classList.toggle("has-assigned-style", Boolean(selected));
    if (selected && selected.dataset.assignedLabel !== "ASSIGNED STYLE") selected.dataset.assignedLabel = "ASSIGNED STYLE";
  }
}

function removeFinalTitleDuplicate() {
  const summary = document.querySelector(".neotokyo-sequence__screen--summary");
  const title = summary?.querySelector(".neotokyo-sequence__overview .neotokyo-sequence__summary-title");
  if (!title || title.dataset.finalBriefing === "1") return;
  title.dataset.finalBriefing = "1";
  title.textContent = "FINAL BRIEFING";
  title.classList.add("neotokyo-supporting__briefing-title");
  const label = summary.querySelector(".neotokyo-sequence__overview .neotokyo-sequence__micro");
  if (label) label.textContent = "ACT CORE // OPENING BRIEF";
}

function renderPosterGuests(guests) {
  const board = document.querySelector("#poster-showcase-board-v2");
  if (!board || document.querySelector("#poster-supporting-cast")) return;
  const section = document.createElement("section");
  section.id = "poster-supporting-cast";
  section.className = "poster-supporting-cast";
  section.setAttribute("aria-label", "ゲストキャスト");
  section.append(createGuestHeading("04 / SUPPORTING", "GUEST CAST", `${guests.length} SUPPORTING FILES`));
  const grid = document.createElement("div");
  grid.className = "poster-supporting-cast__grid";
  guests.forEach((guest, index) => grid.append(createPosterGuestCard(guest, index)));
  section.append(grid);
  board.after(section);
}

function renderSummaryGuests(guests) {
  const screen = document.querySelector(".neotokyo-sequence__screen--summary");
  const area = screen?.querySelector(".neotokyo-sequence__summary-cast-area");
  if (!area || area.querySelector(".neotokyo-supporting-cast")) return;
  const section = document.createElement("section");
  section.className = "neotokyo-supporting-cast";
  const head = document.createElement("div");
  head.className = "neotokyo-supporting-cast__head";
  head.append(textNode("span", "SUPPORTING CHANNEL // GUEST FILES"), textNode("strong", `${guests.length} LINKED`));
  const rail = document.createElement("div");
  rail.className = "neotokyo-supporting-cast__rail";
  guests.forEach((guest, index) => rail.append(createSummaryGuestCard(guest, index)));
  section.append(head, rail);
  area.append(section);
}

function createGuestHeading(kicker, title, status) {
  const head = document.createElement("header");
  head.className = "poster-supporting-cast__head";
  const copy = document.createElement("div");
  copy.append(textNode("span", kicker), textNode("h2", title));
  head.append(copy, textNode("p", status));
  return head;
}

function createPosterGuestCard(guest, index) {
  const card = document.createElement("article");
  card.className = "poster-supporting-card";
  card.dataset.guest = String(index + 1);
  const visual = document.createElement("div");
  visual.className = "poster-supporting-card__visual";
  const image = document.createElement("img");
  image.src = guest.imageUrl || "./assets/placeholders/scan-failed.webp";
  image.alt = fullGuestName(guest);
  image.loading = "lazy";
  visual.append(image, textNode("span", `GUEST ${String(index + 1).padStart(2, "0")}`));
  const body = document.createElement("div");
  body.className = "poster-supporting-card__body";
  body.append(textNode("small", "SUPPORTING CAST // PERSONA FILE"), textNode("h3", fullGuestName(guest)), textNode("b", guest.personaStyle || "PERSONA UNREGISTERED"));
  const meta = [guest.affiliation, guest.age && `AGE ${guest.age}`, guest.gender].filter(Boolean).join(" / ");
  if (meta) body.append(textNode("p", meta, "poster-supporting-card__meta"));
  if (guest.tagline) body.append(textNode("blockquote", `「${guest.tagline}」`));
  if (guest.summary) body.append(textNode("p", guest.summary, "poster-supporting-card__summary"));
  card.append(visual, body);
  return card;
}

function createSummaryGuestCard(guest, index) {
  const card = document.createElement("article");
  card.className = "neotokyo-supporting-card";
  const image = document.createElement("img");
  image.src = guest.imageUrl || "./assets/placeholders/scan-failed.webp";
  image.alt = "";
  const body = document.createElement("div");
  body.append(textNode("span", `G${String(index + 1).padStart(2, "0")} // GUEST`), textNode("strong", fullGuestName(guest)), textNode("b", guest.personaStyle || "UNREGISTERED"));
  if (guest.tagline) body.append(textNode("small", `「${guest.tagline}」`));
  card.append(image, body);
  return card;
}

function fullGuestName(guest) { return [guest.handle ? `“${guest.handle}”` : "", guest.name].filter(Boolean).join(" "); }
function textNode(tag, value, className = "") { const node = document.createElement(tag); if (className) node.className = className; node.textContent = value; return node; }
function normalizeStyle(value) { return clean(value).replace(/[◎●]/g, "").replace(/[\s　]+/g, "").toLocaleLowerCase("ja-JP"); }
function normalizeName(value) { return clean(value).replace(/[“”"「」『』\s　]+/g, "").toLocaleLowerCase("ja-JP"); }
function clean(value) { return String(value ?? "").trim(); }
function safeImageUrl(value) { const source = clean(value); if (!source) return ""; if (/^(?:https?:|data:image\/|\.\/|\/)/i.test(source)) return source; return ""; }
