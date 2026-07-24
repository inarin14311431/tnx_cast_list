import { supabase } from "./supabase-client.js";

const panel = document.querySelector("#style-skill-panel") || document.querySelector("#skills-container");
const publicId = new URLSearchParams(location.search).get("id")?.trim() || "";
let styleNames = [];
let queued = false;

function normalizeNewlines(value) {
  return String(value ?? "").replace(/\r\n?/g, "\n").replace(/\\n/g, "\n");
}

function fit(field) {
  field.style.height = "auto";
  field.style.height = `${Math.max(35, field.scrollHeight + 2)}px`;
}

function replaceNameInput(input, value) {
  const field = document.createElement("textarea");
  field.className = "style-field-scroll style-skill-name-view";
  field.rows = 1;
  field.wrap = "soft";
  field.readOnly = true;
  field.setAttribute("aria-label", "名称");
  field.value = normalizeNewlines(value ?? input.value);
  input.replaceWith(field);
  fit(field);
}

function enhance() {
  queued = false;
  const rows = [...document.querySelectorAll("#style-skill-panel .style-skill-view-table tbody tr")];
  rows.forEach((row, index) => {
    const cell = row.querySelector(".style-view-cell--name");
    if (!cell) return;
    const input = cell.querySelector('input[type="text"]');
    if (input) replaceNameInput(input, styleNames[index]);
    const field = cell.querySelector("textarea.style-skill-name-view");
    if (!field) return;
    if (styleNames[index] !== undefined && field.value !== styleNames[index]) field.value = styleNames[index];
    fit(field);
  });
}

function queue() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(enhance);
}

async function loadNames() {
  if (!publicId) return;
  const { data: character, error } = await supabase.from("characters").select("id").eq("public_id", publicId).maybeSingle();
  if (error || !character) return;
  const { data } = await supabase.from("character_skills").select("name").eq("character_id", character.id).eq("category", "style").order("sort_order");
  styleNames = (data || []).map(item => normalizeNewlines(item.name));
  queue();
}

panel && new MutationObserver(queue).observe(panel, { childList: true, subtree: true });
queue();
loadNames();
