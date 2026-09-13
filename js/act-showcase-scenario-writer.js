import { loadPublicShowcase, normalizeShowcaseSlug } from "./public-showcase-service.js?v=1";

let scenarioWriterName = "";
let observer = null;
let syncQueued = false;

void initialize();

async function initialize() {
  try {
    const slug = normalizeShowcaseSlug(new URLSearchParams(location.search).get("id"));
    if (!slug) return;
    const data = await loadPublicShowcase(slug);
    scenarioWriterName = text(data?.scenarioWriterName);
    if (!scenarioWriterName) return;

    syncCredits();
    observer = new MutationObserver(records => {
      if (!hasStructuralElementMutation(records)) return;
      scheduleSync();
    });
    observer.observe(document.body, { subtree: true, childList: true });
  } catch (error) {
    console.warn("Scenario writer credit could not be rendered.", error);
  }
}

function scheduleSync() {
  if (syncQueued) return;
  syncQueued = true;
  requestAnimationFrame(() => {
    syncQueued = false;
    syncCredits();
  });
}

function hasStructuralElementMutation(records) {
  return records.some(record => record.type === "childList" && [...record.addedNodes, ...record.removedNodes]
    .some(node => node.nodeType === Node.ELEMENT_NODE));
}

function syncCredits() {
  if (!scenarioWriterName) return;
  syncOpeningCredit();
  syncPosterCredit();
  syncTitleCredit();
  syncSummaryCredit();
}

function syncOpeningCredit() {
  if (document.querySelector("#opening-scenario-writer")) return;
  const ruler = document.querySelector("#opening-ruler");
  if (!ruler) return;

  const credit = document.createElement("p");
  credit.id = "opening-scenario-writer";
  credit.className = "opening-ruler opening-scenario-writer";
  credit.textContent = `SCENARIO WRITER // ${scenarioWriterName}`;
  credit.hidden = false;
  ruler.after(credit);
}

function syncPosterCredit() {
  const table = document.querySelector(".poster-v2-credit-table");
  if (!table || table.querySelector('[data-scenario-writer-credit="poster"]')) return;
  const rows = [...table.querySelectorAll(".poster-v2-credit-row")];
  const ruler = rows.find(row => text(row.querySelector("span")?.textContent).toUpperCase() === "RULER");
  if (!ruler) return;

  const row = document.createElement("div");
  row.className = "poster-v2-credit-row";
  row.dataset.scenarioWriterCredit = "poster";
  const label = document.createElement("span");
  label.textContent = "SCENARIO WRITER";
  const value = document.createElement("strong");
  value.textContent = scenarioWriterName;
  row.append(label, value);
  ruler.after(row);
}

function syncTitleCredit() {
  const screen = document.querySelector(".neotokyo-sequence__screen--title");
  if (!screen || screen.querySelector('[data-scenario-writer-credit="title"]')) return;
  const ruler = screen.querySelector(".neotokyo-sequence__ruler-credit");
  if (!ruler) return;

  const credit = ruler.cloneNode(true);
  credit.dataset.scenarioWriterCredit = "title";
  const label = credit.querySelector(".neotokyo-sequence__ruler-label");
  const name = credit.querySelector(".neotokyo-sequence__ruler-name");
  const role = credit.querySelector(".neotokyo-sequence__ruler-role");
  if (label) label.textContent = "SCENARIO WRITER";
  if (name) name.textContent = scenarioWriterName;
  if (role) role.textContent = "SCENARIO CREDIT // TITLE CREDIT";
  ruler.after(credit);
}

function syncSummaryCredit() {
  const overview = document.querySelector(".neotokyo-sequence__overview");
  if (!overview || overview.querySelector('[data-scenario-writer-credit="summary"]')) return;
  const ruler = overview.querySelector(".neotokyo-sequence__summary-ruler");
  if (!ruler) return;

  const credit = ruler.cloneNode(true);
  credit.dataset.scenarioWriterCredit = "summary";
  const label = credit.querySelector("span");
  const name = credit.querySelector("strong");
  if (label) label.textContent = "SCENARIO WRITER // ACT CREDIT";
  if (name) name.textContent = scenarioWriterName;
  ruler.after(credit);
}

function text(value) {
  return String(value ?? "").trim();
}
