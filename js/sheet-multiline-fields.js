import { supabase } from "./supabase-client.js";

const styleRoot = document.querySelector("#style-skills");
const outfitRoot = document.querySelector("#outfit-list");
const publicId = new URLSearchParams(location.search).get("id")?.trim() || "";
const restoredStyleNames = new Map();
const restoredOutfits = new Map();
let queued = false;

function normalizeNewlines(value) {
  return String(value ?? "").replace(/\r\n?/g, "\n").replace(/\\n/g, "\n");
}

function fitTextarea(field) {
  if (!(field instanceof HTMLTextAreaElement)) return;
  field.style.height = "auto";
  field.style.height = `${Math.max(36, field.scrollHeight + 2)}px`;
}

function copyControl(input, extraClass = "") {
  if (!(input instanceof HTMLInputElement) || input.dataset.multilineConverted === "true") return input;
  if (["number", "hidden", "checkbox", "radio", "file"].includes(input.type)) return input;

  const field = document.createElement("textarea");
  for (const attribute of [...input.attributes]) {
    if (["type", "value"].includes(attribute.name)) continue;
    field.setAttribute(attribute.name, attribute.value);
  }
  field.rows = 1;
  field.value = normalizeNewlines(input.value);
  field.dataset.multilineConverted = "true";
  if (extraClass) field.classList.add(extraClass);
  field.oninput = input.oninput;
  field.onchange = input.onchange;
  input.replaceWith(field);
  fitTextarea(field);
  return field;
}

function restoreStyleName(field) {
  const key = field.closest("tr[data-skill-key]")?.dataset.skillKey;
  if (!key || !restoredStyleNames.has(key)) return;
  const value = restoredStyleNames.get(key);
  if (field.value !== value) field.value = value;
  fitTextarea(field);
}

function restoreOutfitFields(scope) {
  const key = scope.closest("[data-outfit-key]")?.dataset.outfitKey;
  const data = key ? restoredOutfits.get(key) : null;
  if (!data) return;
  scope.querySelectorAll("textarea[data-o]").forEach(field => {
    const name = field.dataset.o;
    if (!name || data[name] === undefined || data[name] === null) return;
    const value = normalizeNewlines(data[name]);
    if (field.value !== value) field.value = value;
    fitTextarea(field);
  });
}

function enhanceStyleNames() {
  styleRoot?.querySelectorAll('tr[data-skill-key] td:first-child input[data-f="name"]').forEach(input => {
    const field = copyControl(input, "style-skill-name-multiline");
    restoreStyleName(field);
  });
  styleRoot?.querySelectorAll('textarea[data-f="name"]').forEach(field => {
    restoreStyleName(field);
    fitTextarea(field);
  });
}

function enhanceOutfitFields() {
  outfitRoot?.querySelectorAll('input[data-o]').forEach(input => {
    const field = copyControl(input, "outfit-field-multiline");
    restoreOutfitFields(field);
  });
  outfitRoot?.querySelectorAll('textarea[data-o]').forEach(field => {
    field.value = normalizeNewlines(field.value);
    restoreOutfitFields(field);
    fitTextarea(field);
  });
}

function enhance() {
  queued = false;
  enhanceStyleNames();
  enhanceOutfitFields();
}

function queueEnhance() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(enhance);
}

function parseTsv(text) {
  const lines = String(text ?? "").replace(/\r/g, "").trim().split("\n").filter(Boolean).map(line => line.split("\t"));
  if (!lines.length) return [];
  const headings = lines.shift().map(value => value.trim());
  return lines.map(row => Object.fromEntries(headings.map((heading, index) => [heading, normalizeNewlines(row[index] || "")])));
}

function restoreTsvImport(mode, rows) {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    enhance();
    if (mode === "skd") {
      const controls = [...(styleRoot?.querySelectorAll('tr[data-skill-key] textarea[data-f="name"]') || [])].slice(-rows.length);
      controls.forEach((field, index) => {
        field.value = rows[index]?.["名称"] || field.value;
        fitTextarea(field);
      });
      return;
    }

    const used = new Set();
    for (const row of rows) {
      const expectedName = normalizeNewlines(row.name || "");
      const candidates = [...(outfitRoot?.querySelectorAll('[data-outfit-key]') || [])].reverse();
      const target = candidates.find(item => {
        if (used.has(item)) return false;
        const name = item.querySelector('[data-o="name"]')?.value || "";
        return normalizeNewlines(name) === expectedName;
      });
      if (!target) continue;
      used.add(target);
      const values = {
        name: row.name,
        purchase_value: row.purchase,
        concealment: [row.concealA, row.concealB].filter(Boolean).join("/"),
        attack: row.attack,
        defense: row.defense,
        range: row.range,
        slot: row.part || row.slot,
        description: row.notes
      };
      for (const [fieldName, value] of Object.entries(values)) {
        const field = target.querySelector(`textarea[data-o="${fieldName}"]`);
        if (!field || value === undefined) continue;
        field.value = normalizeNewlines(value);
        fitTextarea(field);
      }
    }
  }));
}

async function loadOriginalValues() {
  if (!publicId) return;
  const { data: character, error } = await supabase.from("characters").select("id").eq("public_id", publicId).maybeSingle();
  if (error || !character) return;
  const [skillResult, outfitResult] = await Promise.all([
    supabase.from("character_skills").select("id,name").eq("character_id", character.id).eq("category", "style").order("sort_order"),
    supabase.from("character_outfits").select("*").eq("character_id", character.id).order("sort_order")
  ]);
  for (const skill of skillResult.data || []) restoredStyleNames.set(String(skill.id), normalizeNewlines(skill.name));
  for (const outfit of outfitResult.data || []) restoredOutfits.set(String(outfit.id), outfit);
  queueEnhance();
}

styleRoot && new MutationObserver(queueEnhance).observe(styleRoot, { childList: true, subtree: true });
outfitRoot && new MutationObserver(queueEnhance).observe(outfitRoot, { childList: true, subtree: true });

document.addEventListener("input", event => {
  const field = event.target.closest?.('#style-skills textarea[data-f="name"],#outfit-list textarea[data-o]');
  if (field) fitTextarea(field);
}, true);

document.addEventListener("click", event => {
  if (!event.target.closest?.("#tsv-apply")) return;
  const mode = document.querySelector("#tsv-title")?.textContent.includes("SKD") ? "skd" : "ofc";
  restoreTsvImport(mode, parseTsv(document.querySelector("#tsv-text")?.value));
}, true);

queueEnhance();
loadOriginalValues();
