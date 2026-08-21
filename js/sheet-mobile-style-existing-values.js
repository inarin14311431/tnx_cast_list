import { supabase } from "./supabase-client.js";
import { getMobileEditorContext } from "./sheet-mobile-runtime.js?v=1";
import { STYLE_DETAIL_FIELDS, normalizeStyleSkillRow } from "./sheet-mobile-style-normalizer.js?v=1";

let rows = new Map();

function assignControl(control, value) {
  if (!control) return;
  const text = String(value ?? "");
  if (control.tagName === "SELECT" && text && ![...control.options].some(option => option.value === text)) {
    const option = document.createElement("option");
    option.value = text;
    option.textContent = text;
    option.dataset.legacyValue = "1";
    control.append(option);
  }
  control.value = text;
}

function hydrate(id) {
  const row = rows.get(String(id));
  if (!row) return;
  const detail = normalizeStyleSkillRow(row);
  for (const key of STYLE_DETAIL_FIELDS) {
    assignControl(document.querySelector(`[data-mobile-style-detail="${key}"]`), detail[key]);
  }
}

function patchCard(card, row) {
  const detail = normalizeStyleSkillRow(row);
  const cells = card.querySelectorAll(".mobile-style-skill-card__secondary > span");
  const values = [null, detail.skill || "—", detail.timing || "—", detail.target || "—"];
  for (let i = 1; i < values.length; i += 1) {
    if (cells[i] && cells[i].textContent !== values[i]) cells[i].textContent = values[i];
  }
}

function patchCards() {
  document.querySelectorAll("#mobile-style-skills [data-style-id]").forEach(card => {
    const row = rows.get(String(card.dataset.styleId || ""));
    if (row) patchCard(card, row);
  });
}

function bind() {
  document.addEventListener("click", event => {
    const card = event.target.closest?.("#mobile-style-skills [data-style-id]");
    if (!card) return;
    requestAnimationFrame(() => hydrate(card.dataset.styleId));
  });

  const root = document.querySelector("#mobile-style-skills");
  if (root) new MutationObserver(() => requestAnimationFrame(patchCards)).observe(root, { childList: true, subtree: true });
  document.addEventListener("tnx:mobile-skills-saved", load);
}

async function load() {
  const { character } = await getMobileEditorContext();
  if (!character) return;
  const result = await supabase.from("character_skills").select("*").eq("character_id", character.id).eq("category", "style");
  if (result.error) {
    console.error(result.error);
    return;
  }
  rows = new Map((result.data || []).map(row => [String(row.id), row]));
  patchCards();
}

function init() {
  bind();
  load();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
else init();
