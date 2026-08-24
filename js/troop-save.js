import { supabase } from "./supabase-client.js";
import { STYLE_DATA, UTSUWA_ATTRIBUTES } from "./style-data.js";
import { initialGeneralSkillSuit } from "./general-skill-catalog.js";

const editor = document.querySelector("#troop-editor");
const status = document.querySelector("#troop-editor-status");
const saveButton = editor?.querySelector('.troop-editor-actions button[type="submit"]');
const params = new URLSearchParams(location.search);
let publicId = params.get("id")?.trim() || "";
const ABILITIES = ["reason", "passion", "life", "mundane"];
const STYLE_COST = { none:0, normal:10, secret:20, ultimate:50, direction:2 };
const GENERAL_KIND_COST = { general:10, proper:5, social:5, connection:5 };
let saving = false;

export function registerTroopSave(editorNode = editor) {
  if (!editorNode || editorNode.dataset.troopSaveHandler === "canonical") return;
  editorNode.dataset.troopSaveHandler = "canonical";
  editorNode.addEventListener("submit", saveTroop);
}

async function saveTroop(event) {
  event.preventDefault();
  if (saving) return;
  if (!editor.reportValidity()) return;

  const styleName = value("#troop-style");
  if (!styleName) return setStatus("スタイルを選択してください。", true);
  const utsuwaAttribute = value("#troop-utsuwa-attribute");
  if (styleName === "ウツワ" && !utsuwaAttribute) return setStatus("ウツワの属性を選択してください。", true);

  const generalSkills = collectSkills("#troop-general-skills-editor", "general");
  const styleSkills = collectSkills("#troop-style-skills-editor", "style");
  if (styleSkills.filter(item => item.kind === "secret").length > 2) return setStatus("秘技は2つまでです。", true);
  if (styleSkills.filter(item => item.kind === "ultimate").length > 1) return setStatus("奥義は1つまでです。", true);

  const auth = await supabase.auth.getUser();
  const user = auth.data?.user;
  if (!user) return setStatus("ログイン状態を確認できません。再ログインしてから保存してください。", true);

  saving = true;
  setSavingState(true);
  setStatus("保存中…");

  try {
    const level = intValue("#troop-level");
    const memberMax = Math.max(1, intValue("#troop-member-max"));
    const abilities = calculateAbilities(styleName, utsuwaAttribute, level);
    const payload = {
      owner_id: user.id,
      character_id: value("#troop-character") || null,
      name: value("#troop-name"),
      visibility: value("#troop-visibility") || "private",
      level,
      member_max: memberMax,
      member_current: memberMax,
      style_1: styleName,
      style_2: "",
      style_3: "",
      utsuwa_attribute: styleName === "ウツワ" ? utsuwaAttribute : "",
      reason_value: abilities.reason.value,
      reason_control: abilities.reason.control,
      passion_value: abilities.passion.value,
      passion_control: abilities.passion.control,
      life_value: abilities.life.value,
      life_control: abilities.life.control,
      mundane_value: abilities.mundane.value,
      mundane_control: abilities.mundane.control,
      skills: [...generalSkills, ...styleSkills],
      combos: collectCombos(),
      outfits: collectRows("#troop-outfits-editor", ["name","attack","defense_s","defense_p","defense_i","notes"]).filter(item => item.name),
      experience_spent: [...generalSkills, ...styleSkills].reduce((sum, item) => sum + Number(item.exp_cost || 0), 0),
      notes: value("#troop-notes")
    };

    const query = publicId
      ? supabase.from("troops").update(payload).eq("public_id", publicId).eq("owner_id", user.id)
      : supabase.from("troops").insert(payload);
    const result = await query.select("public_id").single();
    if (result.error) throw result.error;
    if (!result.data?.public_id) throw new Error("保存後のトループIDを取得できませんでした。");

    publicId = result.data.public_id;
    const target = new URL(location.href);
    target.searchParams.set("id", publicId);
    target.searchParams.set("edit", "1");
    history.replaceState(null, "", target.href);
    const cancel = document.querySelector("#troop-cancel");
    if (cancel) cancel.href = `./troop.html?id=${encodeURIComponent(publicId)}`;
    saving = false;
    setSavingState(false);
    setStatus("保存しました。編集を続けられます。");
  } catch (error) {
    console.error("Troop save failed.", error);
    setStatus(`保存に失敗しました：${error instanceof Error ? error.message : String(error)}`, true);
    saving = false;
    setSavingState(false);
  }
}

function calculateAbilities(styleName, utsuwaAttribute, level) {
  const record = styleName === "ウツワ"
    ? UTSUWA_ATTRIBUTES.find(item => item.name === utsuwaAttribute)
    : STYLE_DATA.find(item => item.name === styleName);
  return Object.fromEntries(ABILITIES.map(key => [key, {
    value: (Number(record?.[key]?.[0]) || 0) + level,
    control: (Number(record?.[key]?.[1]) || 0) + level
  }]));
}

function collectSkills(selector, category) {
  const root = document.querySelector(selector);
  if (!root) return [];
  return [...root.querySelectorAll(":scope > .troop-skill-row")].map(row => {
    const level = rowInt(row, "level");
    const kind = rowValue(row, "kind") || (category === "style" ? "normal" : "general");
    const name = rowValue(row, "name");
    const freeLevel = category === "general" && kind === "general" && initialGeneralSkillSuit(name) ? 1 : 0;
    const costLevel = Math.max(0, level - freeLevel);
    const cost = costLevel * (category === "style" ? (STYLE_COST[kind] ?? 10) : (GENERAL_KIND_COST[kind] ?? 10));
    return {
      category,
      name,
      kind,
      type: kind,
      level,
      reason: Boolean(row.querySelector('[data-suit="reason"]')?.checked),
      passion: Boolean(row.querySelector('[data-suit="passion"]')?.checked),
      life: Boolean(row.querySelector('[data-suit="life"]')?.checked),
      mundane: Boolean(row.querySelector('[data-suit="mundane"]')?.checked),
      exp_cost: cost,
      timing: category === "style" ? rowValue(row, "timing") : "",
      confrontation: category === "style" ? rowValue(row, "confrontation") : "",
      notes: category === "general" ? "" : rowValue(row, "notes")
    };
  }).filter(item => item.name);
}

function collectCombos() {
  return collectRows("#troop-combos-editor", ["name","skills","ability","modifier","target_value","timing","target","range","act_use_limit","description"])
    .filter(item => item.name)
    .map(item => ({ ...item, act_use_limit: null }));
}

function collectRows(selector, fields) {
  const root = document.querySelector(selector);
  if (!root) return [];
  return [...root.children].map(row => Object.fromEntries(fields.map(field => {
    const node = row.querySelector(`[data-field="${field}"]`);
    if (field === "act_use_limit") return [field, null];
    return [field, String(node?.value || "").trim()];
  })));
}

function setSavingState(active) {
  if (!saveButton) return;
  saveButton.disabled = active;
  saveButton.setAttribute("aria-busy", active ? "true" : "false");
  const main = saveButton.querySelector("span") || saveButton.childNodes[0];
  if (main?.nodeType === Node.TEXT_NODE) main.textContent = active ? "保存中… " : "保存 ";
}

function setStatus(message, error = false) {
  if (!status) return;
  status.textContent = message;
  status.dataset.state = error ? "error" : "working";
}
function rowValue(row, field) { return String(row.querySelector(`[data-field="${field}"]`)?.value || "").trim(); }
function rowInt(row, field) { return Math.max(0, Number.parseInt(rowValue(row, field) || "0", 10) || 0); }
function value(selector) { return String(document.querySelector(selector)?.value ?? "").trim(); }
function intValue(selector) { return Math.max(0, Number.parseInt(value(selector) || "0", 10) || 0); }
