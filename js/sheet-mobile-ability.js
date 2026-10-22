import { supabase } from "./supabase-client.js";
import { getMobileEditorContext } from "./sheet-mobile-runtime.js?v=7e020e46";
import { STYLE_DATA, UTSUWA_ATTRIBUTES } from "./style-data.js";
import { calculateCombatSpeed } from "./sheet-ability-calculation.js?v=6b9385e5";
const ABILITIES = [
  ["reason", "理性", "REASON"],
  ["passion", "感情", "PASSION"],
  ["life", "生命", "LIFE"],
  ["mundane", "外界", "MUNDANE"]
];
const $ = selector => document.querySelector(selector),
  num = value => Number(value || 0),
  signed = value => {
    const n = num(value);
    return n ? `${n > 0 ? "+" : ""}${n}` : "";
  },
  displayBreakdown = (base, growth = 0, mod = 0) =>
    `${num(base)}${num(growth) > 0 ? `+${num(growth)}` : ""}${signed(mod)}`;
let user = null,
  character = null,
  activeAbility = null,
  abilityDirty = false,
  csNeedsPersist = false,
  repairingSummary = false;
function styleRecord(name, attribute = "") {
  if (name === "ウツワ") return UTSUWA_ATTRIBUTES.find(item => item.name === attribute) || null;
  return STYLE_DATA.find(item => item.name === name) || null;
}
function styleBaseline(key, control = false) {
  let total = 0;
  for (let i = 1; i <= 3; i++) {
    const record = styleRecord(character?.[`style_${i}`] || "", character?.[`style_${i}_attribute`] || "");
    if (record) total += num(record[key]?.[control ? 1 : 0]);
  }
  return total;
}
function growthOptions(value) {
  const current = Math.max(0, num(value)),
    values = [...Array(11)].map((_, i) => i);
  if (!values.includes(current)) values.push(current);
  return values
    .sort((a, b) => a - b)
    .map(v => `<option value="${v}" ${v === current ? "selected" : ""}>${v}</option>`)
    .join("");
}
function modifierOptions(value) {
  const current = num(value),
    values = [0, ...Array.from({ length: 10 }, (_, i) => i + 1), ...Array.from({ length: 10 }, (_, i) => -(i + 1))];
  if (!values.includes(current)) values.push(current);
  return [...new Set(values)]
    .sort((a, b) => a - b)
    .map(v => `<option value="${v}" ${v === current ? "selected" : ""}>${v > 0 ? `+${v}` : v}</option>`)
    .join("");
}
function rebuildAbilityDialog() {
  const body = $("#mobile-ability-dialog .mobile-editor-dialog__body");
  if (!body) return;
  body.innerHTML = `<div class="mobile-ability-editor-grid"><section class="mobile-ability-editor-panel"><h3>能力値</h3><div class="mobile-ability-fixed"><span>基本値</span><strong data-mobile-ability-fixed="ability">0</strong></div><label>成長分<select data-mobile-ability-input="ability-growth"></select></label><label>補正値<select data-mobile-ability-input="ability-mod"></select></label><div class="mobile-ability-preview"><span>最終値</span><strong id="mobile-ability-final">0</strong></div></section><section class="mobile-ability-editor-panel"><h3>制御値</h3><div class="mobile-ability-fixed"><span>基本値</span><strong data-mobile-ability-fixed="control">0</strong></div><label>成長分<select data-mobile-ability-input="control-growth"></select></label><label>補正値<select data-mobile-ability-input="control-mod"></select></label><div class="mobile-ability-preview"><span>最終値</span><strong id="mobile-control-final">0</strong></div></section></div>`;
}
function normalizeAbilityState() {
  if (!character) return;
  for (const [key] of ABILITIES) {
    const abilityBase = styleBaseline(key),
      controlBase = styleBaseline(key, true),
      abilityGrowth = Math.max(0, num(character[`${key}_growth`] ?? num(character[`${key}_base`]) - abilityBase)),
      controlGrowth = Math.max(
        0,
        num(character[`${key}_control_growth`] ?? num(character[`${key}_control_base`]) - controlBase)
      );
    character[`${key}_growth`] = abilityGrowth;
    character[`${key}_base`] = abilityBase + abilityGrowth;
    character[`${key}_value`] =
      character[`${key}_base`] + num(character[`${key}_gear`]) + num(character[`${key}_manual`]);
    character[`${key}_control_growth`] = controlGrowth;
    character[`${key}_control_base`] = controlBase + controlGrowth;
    character[`${key}_control`] =
      character[`${key}_control_base`] +
      num(character[`${key}_control_gear`]) +
      num(character[`${key}_control_manual`]);
  }
}
function abilityTotal(key) {
  return num(character[`${key}_base`]) + num(character[`${key}_gear`]) + num(character[`${key}_manual`]);
}
function csModifier() {
  return num(character.cs_gear) + num(character.cs_manual);
}
function combatSpeed(modifier = csModifier()) {
  return calculateCombatSpeed({
    reason: abilityTotal("reason"),
    passion: abilityTotal("passion"),
    life: abilityTotal("life"),
    modifier
  });
}
// Same rule as the PC editor: CS is always derived from reason/passion/life and the CS
// modifier, and the saved fields mean the same thing (cs_base + cs_gear === cs, cs_manual 0).
// Returns whether the stored CS differed from the derived one.
function applyCombatSpeed() {
  if (!character) return false;
  const cs = combatSpeed(),
    changed =
      num(character.cs_base) !== cs.storedBase ||
      num(character.cs_gear) !== cs.modifier ||
      num(character.cs_manual) !== 0 ||
      num(character.cs) !== cs.final;
  character.cs_base = cs.storedBase;
  character.cs_gear = cs.modifier;
  character.cs_manual = 0;
  character.cs = cs.final;
  return changed;
}
function renderSummary() {
  const root = $("#mobile-ability-summary");
  if (!root || !character) return;
  const header = ABILITIES.map(
      ([key, jp]) =>
        `<button type="button" class="mobile-ability-matrix__head" data-mobile-ability="${key}">${jp}</button>`
    ).join(""),
    abilityRow = ABILITIES.map(
      ([key]) =>
        `<button type="button" class="mobile-ability-matrix__value" data-mobile-ability="${key}">${displayBreakdown(styleBaseline(key), character[`${key}_growth`], num(character[`${key}_gear`]) + num(character[`${key}_manual`]))}</button>`
    ).join(""),
    controlRow = ABILITIES.map(
      ([key]) =>
        `<button type="button" class="mobile-ability-matrix__value" data-mobile-ability="${key}">${displayBreakdown(styleBaseline(key, true), character[`${key}_control_growth`], num(character[`${key}_control_gear`]) + num(character[`${key}_control_manual`]))}</button>`
    ).join("");
  root.innerHTML = `<div class="mobile-ability-matrix"><span class="mobile-ability-matrix__corner"></span>${header}<strong class="mobile-ability-matrix__rowlabel">能力値</strong>${abilityRow}<strong class="mobile-ability-matrix__rowlabel">制御値</strong>${controlRow}</div><button type="button" class="mobile-cs-cell" data-mobile-cs="1"><span>CS <small>COMBAT SPEED</small></span><strong>${displayBreakdown(combatSpeed().base, 0, csModifier())}</strong></button>`;
}
function observeSummaryOwner() {
  const root = $("#mobile-ability-summary");
  if (!root) return;
  new MutationObserver(() => {
    if (!character || repairingSummary || root.querySelector("[data-mobile-ability]")) return;
    repairingSummary = true;
    renderSummary();
    repairingSummary = false;
  }).observe(root, { childList: true, subtree: true });
}
function abilityInput(name) {
  return num($(`[data-mobile-ability-input="${name}"]`)?.value);
}
function openAbilityDialog(key, keepOpen = false) {
  if (!character || !ABILITIES.some(([ability]) => ability === key)) return;
  activeAbility = key;
  const definition = ABILITIES.find(([ability]) => ability === key),
    abilityBase = styleBaseline(key),
    controlBase = styleBaseline(key, true),
    abilityGrowth = Math.max(0, num(character[`${key}_growth`])),
    controlGrowth = Math.max(0, num(character[`${key}_control_growth`])),
    abilityMod = num(character[`${key}_gear`]) + num(character[`${key}_manual`]),
    controlMod = num(character[`${key}_control_gear`]) + num(character[`${key}_control_manual`]);
  $("#mobile-ability-dialog-title").textContent = `${definition[1]} / ${definition[2]}`;
  $('[data-mobile-ability-fixed="ability"]').textContent = String(abilityBase);
  $('[data-mobile-ability-fixed="control"]').textContent = String(controlBase);
  $('[data-mobile-ability-input="ability-growth"]').innerHTML = growthOptions(abilityGrowth);
  $('[data-mobile-ability-input="control-growth"]').innerHTML = growthOptions(controlGrowth);
  $('[data-mobile-ability-input="ability-mod"]').innerHTML = modifierOptions(abilityMod);
  $('[data-mobile-ability-input="control-mod"]').innerHTML = modifierOptions(controlMod);
  refreshAbilityPreview();
  if (!keepOpen) $("#mobile-ability-dialog")?.showModal();
}
function refreshAbilityPreview() {
  if (!character || !activeAbility) return;
  const abilityBase = styleBaseline(activeAbility),
    controlBase = styleBaseline(activeAbility, true),
    abilityGrowth = Math.max(0, abilityInput("ability-growth")),
    abilityMod = abilityInput("ability-mod"),
    controlGrowth = Math.max(0, abilityInput("control-growth")),
    controlMod = abilityInput("control-mod");
  $("#mobile-ability-final").textContent = String(abilityBase + abilityGrowth + abilityMod);
  $("#mobile-control-final").textContent = String(controlBase + controlGrowth + controlMod);
}
function commitAbility() {
  if (!character || !activeAbility) return;
  const key = activeAbility,
    abilityBase = styleBaseline(key),
    controlBase = styleBaseline(key, true),
    abilityGrowth = Math.max(0, abilityInput("ability-growth")),
    abilityMod = abilityInput("ability-mod"),
    controlGrowth = Math.max(0, abilityInput("control-growth")),
    controlMod = abilityInput("control-mod"),
    before = JSON.stringify([
      character[`${key}_growth`],
      character[`${key}_gear`],
      character[`${key}_control_growth`],
      character[`${key}_control_gear`]
    ]);
  character[`${key}_growth`] = abilityGrowth;
  character[`${key}_base`] = abilityBase + abilityGrowth;
  character[`${key}_gear`] = abilityMod;
  character[`${key}_manual`] = 0;
  character[`${key}_value`] = character[`${key}_base`] + abilityMod;
  character[`${key}_control_growth`] = controlGrowth;
  character[`${key}_control_base`] = controlBase + controlGrowth;
  character[`${key}_control_gear`] = controlMod;
  character[`${key}_control_manual`] = 0;
  character[`${key}_control`] = character[`${key}_control_base`] + controlMod;
  applyCombatSpeed();
  if (before !== JSON.stringify([abilityGrowth, abilityMod, controlGrowth, controlMod])) markAbilityDirty();
  renderSummary();
}
function closeAbility() {
  commitAbility();
  activeAbility = null;
  $("#mobile-ability-dialog")?.close();
}
function openCsDialog() {
  if (!character) return;
  const cs = combatSpeed();
  $('[data-mobile-cs-input="base"]').value = String(cs.base);
  $('[data-mobile-cs-input="mod"]').value = String(cs.modifier);
  refreshCsPreview();
  $("#mobile-cs-dialog")?.showModal();
}
function refreshCsPreview() {
  if (!character) return;
  const cs = combatSpeed($('[data-mobile-cs-input="mod"]')?.value);
  $('[data-mobile-cs-input="base"]').value = String(cs.base);
  $("#mobile-cs-final").textContent = String(cs.final);
}
function commitCs() {
  if (!character) return;
  const before = csModifier(),
    mod = combatSpeed($('[data-mobile-cs-input="mod"]')?.value).modifier;
  character.cs_gear = mod;
  character.cs_manual = 0;
  applyCombatSpeed();
  if (before !== mod) markAbilityDirty();
  renderSummary();
}
function closeCs() {
  commitCs();
  $("#mobile-cs-dialog")?.close();
}
function markAbilityDirty() {
  abilityDirty = true;
  const button = $("#mobile-save");
  if (button) {
    button.dataset.state = "dirty";
    button.textContent = "変更を保存";
  }
  const status = $("#mobile-save-status");
  if (status) {
    status.dataset.state = "dirty";
    status.textContent = "未保存の変更があります";
  }
}
function collectAbilityPayload() {
  const payload = {};
  for (const [key] of ABILITIES)
    [
      "base",
      "growth",
      "gear",
      "manual",
      "value",
      "control_base",
      "control_growth",
      "control_gear",
      "control_manual",
      "control"
    ].forEach(suffix => (payload[`${key}_${suffix}`] = num(character[`${key}_${suffix}`])));
  payload.cs_base = num(character.cs_base);
  payload.cs_gear = num(character.cs_gear);
  payload.cs_manual = num(character.cs_manual);
  payload.cs = num(character.cs);
  for (let i = 1; i <= 3; i++) {
    payload[`style_${i}`] = character[`style_${i}`] || "";
    payload[`style_${i}_mark`] = character[`style_${i}_mark`] || "";
    payload[`style_${i}_attribute`] = character[`style_${i}_attribute`] || "";
    payload[`divine_${i}`] = character[`divine_${i}`] || "";
    payload[`divine_${i}_yomi`] = character[`divine_${i}_yomi`] || "";
  }
  return payload;
}
function collectCsPayload() {
  return { cs_base: num(character.cs_base), cs_gear: num(character.cs_gear), cs_manual: 0, cs: num(character.cs) };
}
async function flushAbility() {
  if ((!abilityDirty && !csNeedsPersist) || !character) return;
  const { error } = await supabase
    .from("characters")
    .update(abilityDirty ? collectAbilityPayload() : collectCsPayload())
    .eq("id", character.id)
    .eq("owner_id", user.id);
  if (error) throw error;
  abilityDirty = false;
  csNeedsPersist = false;
}
function bind() {
  $("#mobile-ability-summary")?.addEventListener("click", event => {
    const ability = event.target.closest("[data-mobile-ability]");
    if (ability) {
      openAbilityDialog(ability.dataset.mobileAbility);
      return;
    }
    if (event.target.closest("[data-mobile-cs]")) openCsDialog();
  });
  $("#mobile-ability-dialog-cancel")?.addEventListener("click", closeAbility);
  $("#mobile-ability-dialog")?.addEventListener("cancel", event => {
    event.preventDefault();
    closeAbility();
  });
  ["ability-growth", "ability-mod", "control-growth", "control-mod"].forEach(name =>
    $(`[data-mobile-ability-input="${name}"]`)?.addEventListener("change", refreshAbilityPreview)
  );
  $("#mobile-cs-dialog-cancel")?.addEventListener("click", closeCs);
  $("#mobile-cs-dialog")?.addEventListener("cancel", event => {
    event.preventDefault();
    closeCs();
  });
  $('[data-mobile-cs-input="mod"]')?.addEventListener("input", refreshCsPreview);
  window.addEventListener("tnx:mobile-style-patch", event => {
    if (!character || !event.detail) return;
    Object.assign(character, event.detail);
    normalizeAbilityState();
    applyCombatSpeed();
    markAbilityDirty();
    renderSummary();
    if ($("#mobile-ability-dialog")?.open && activeAbility) openAbilityDialog(activeAbility, true);
  });
  document.addEventListener("tnx:mobile-before-save", event => {
    if (abilityDirty || csNeedsPersist) event.detail.add(flushAbility());
  });
  window.addEventListener("beforeunload", event => {
    if (!abilityDirty) return;
    event.preventDefault();
    event.returnValue = "";
  });
}
async function init() {
  rebuildAbilityDialog();
  bind();
  const context = await getMobileEditorContext();
  user = context.user;
  character = context.character;
  if (!user || !character) return;
  normalizeAbilityState();
  // Like PC, opening shows the derived CS without marking the editor dirty; a stored CS
  // that disagrees is corrected the next time the user saves.
  csNeedsPersist = applyCombatSpeed();
  renderSummary();
  observeSummaryOwner();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
else init();
