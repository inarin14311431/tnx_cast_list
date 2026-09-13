import { loadPublicShowcase, normalizeShowcaseSlug } from "./public-showcase-service.js?v=1";

void initialize();

async function initialize() {
  try {
    const slug = normalizeShowcaseSlug(new URLSearchParams(location.search).get("id"));
    if (!slug) return;
    const data = await loadPublicShowcase(slug);
    const name = String(data?.scenarioWriterName || "").trim();
    if (!name || document.querySelector("#showcase-scenario-writer")) return;

    const ruler = document.querySelector("#showcase-ruler");
    const credit = document.createElement("p");
    credit.id = "showcase-scenario-writer";
    credit.className = "hero__ruler hero__scenario-writer";
    credit.textContent = `SCENARIO WRITER：${name}`;
    credit.hidden = false;
    ruler?.after(credit);
  } catch (error) {
    console.warn("Scenario writer credit could not be rendered.", error);
  }
}
