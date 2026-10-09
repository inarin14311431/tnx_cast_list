import { getCharacter } from "./cast-data-store.js?v=2";
import { abilityValues, createAbilitySummary } from "./ability-summary-view.js?v=1";

/* Shows the final ability values in the headings of the skill panels (general skills, style skills) so the
 * skill tables can be read next to them. Display only: the list ignores the pointer (see the shared CSS), and it
 * is hidden as a whole when the heading is too narrow, like the editor's. */
const headings = new Set();
let values = null;

function skillPanels() {
  return [
    document.querySelector("#skills-container")?.closest(".data-panel"),
    document.querySelector("#style-skill-panel")
  ].filter(Boolean);
}

function fit(heading) {
  const summary = heading.querySelector(".sheet-ability-summary");
  if (!summary) return;
  summary.hidden = false;
  const style = getComputedStyle(heading);
  const required = [...heading.children].reduce((total, child) => total + child.getBoundingClientRect().width, 0)
    + parseFloat(style.columnGap || 0) * (heading.children.length - 1)
    + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  summary.hidden = required > heading.clientWidth;
}

const resize = new ResizeObserver(entries => entries.forEach(entry => fit(entry.target)));

function attach() {
  if (!values) return;
  for (const panel of skillPanels()) {
    const heading = panel.querySelector(":scope > .data-panel__header");
    if (!heading || heading.querySelector(".sheet-ability-summary")) continue;
    heading.classList.add("has-ability-summary");
    heading.append(createAbilitySummary(document, values));
    headings.add(heading);
    resize.observe(heading);
    fit(heading);
  }
}

async function initializeCastAbilitySummary() {
  let character = null;
  try { character = await getCharacter(); } catch (error) { console.error("Ability summary data load failed", error); return; }
  if (!character) return;
  values = abilityValues(character);
  const content = document.querySelector("#cast-content");
  if (!content || !content.hidden) attach();
  else window.addEventListener("tnx:cast-rendered", attach, { once: true });
  // The style-skill panel is built after the cast is rendered.
  document.addEventListener("tnx:style-skills-rendered", attach);
  document.fonts?.ready.then(() => headings.forEach(fit));
}

initializeCastAbilitySummary();
