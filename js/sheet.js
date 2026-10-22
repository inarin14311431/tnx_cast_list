import { applyStylePresentation, applyAbilityFinals } from "./sheet-presentation-dom.js?v=dd2a9d37";
import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js?v=a766246e";
import { STYLE_DATA, UTSUWA_ATTRIBUTES } from "./style-data.js";
import { SITE_BASE_PATH } from "./config.js?v=9cb58cc9";
import { createSheetSaveCoordinator } from "./sheet-save-coordinator.js?v=d196481a";
import { persistSheetBundle } from "./sheet-save-persistence.js?v=b336ffda";
import { loadSheetBundle } from "./sheet-load-persistence.js?v=dfe1a8b3";
import { dismissSheetLoadOverlay } from "./sheet-load-overlay.js?v=3b2758d8";
import { publishSheetCharacterLoaded, publishSheetCharacterLoadFailed } from "./sheet-loaded-character.js?v=e3884194";
import { buildCharacterSavePayload, buildSkillSavePayloads, buildOutfitSavePayloads } from "./sheet-save-payload.js?v=4bbb2abe";
import {
  STYLE_SEPARATOR_MARKER,
  isStyleSeparatorRecord as isStyleSeparator,
  normalizeLoadedSkill,
  normalizeLoadedOutfit
} from "./sheet-load-normalization.js?v=a11003e0";
import { formatSheetPersistenceError } from "./sheet-error-message.js?v=0cf121ec";
import { initSheetRowInteractions } from "./sheet-row-interactions.js?v=c9d3e90a";
import { initSheetEditorInteractions } from "./sheet-editor-interactions.js?v=c2b3408c";
import { renderSkillEditorSections } from "./sheet-skill-renderer.js?v=3900d60f";
import { renderOutfitEditor } from "./sheet-outfit-renderer.js?v=250bb06e";
import {
  createBlankSkill,
  createBlankOutfit,
  createGeneralBlankSlotRow,
  createStyleSeparatorRow
} from "./sheet-row-factory.js?v=5663e6ff";
import {
  reconcileGeneralMasterRows,
  appendGeneralBlankSlots,
  orderGeneralRows
} from "./sheet-general-skill-state.js?v=dc0affd0";
import { renderStyleCards, renderAbilityCards } from "./sheet-character-renderer.js?v=ebf8c9a8";
import { calculateStyleBaselines } from "./sheet-style-baseline.js?v=3ea20d4f";
import { buildStylePresentation } from "./sheet-style-presentation.js?v=c3fa8b27";
import { calculateAbilityFinals } from "./sheet-ability-calculation.js?v=6b9385e5";
import { resolveStyleBaselineValue } from "./sheet-baseline-adjustment.js?v=83b0971e";
import { buildNewCharacterSkills, appendStarterSocialConnectionRowsIfBothMissing } from "./sheet-new-character-state.js?v=1f5165b0";
import { countGeneralSkillColumns, chooseGeneralSkillColumn } from "./sheet-general-column.js?v=ba9a0007";
import { resolveSkillInputState } from "./sheet-skill-level-suit-state.js?v=745b6aed";
import { buildStyleSaveRows } from "./sheet-style-save-projection.js?v=cb92a5f9";
import { buildAbilitySaveSnapshot, buildCsSaveSnapshot } from "./sheet-ability-save-projection.js?v=2da78f08";
import { collectCharacterInputSnapshot, applyCharacterInputSnapshot } from "./sheet-character-input-snapshot.js?v=7489973c";
import { collectAbilityInputSnapshot, applyAbilityInputSnapshot } from "./sheet-ability-input-snapshot.js?v=ec9569a3";
import { collectStyleInputSnapshot, applyStyleInputSnapshot } from "./sheet-style-input-snapshot.js?v=b34e8fae";
import { initSheetStyleInteractions } from "./sheet-style-interactions.js?v=6672e372";
import { applyCharacterToEditor, applyStyleAttributeVisibility } from "./sheet-character-application.js?v=984d9881";
import { initSheetActionBindings } from "./sheet-action-bindings.js?v=b12e30fe";
import { appendRow, clearRows, moveRowWithinCategory, normalizeOutfitCategory, removeRowByKey } from "./sheet-row-collection-state.js?v=d2cacff3";
import { normalizeImportedOutfitDetails } from "./outfit-ofc-adapter.js?v=0fabe54f";
import { GENERAL_MASTER_ROWS as GENERAL_MASTER, GENERAL_BLANK_SLOT_COLUMNS } from "./general-skill-catalog.js?v=4bae7101";

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const SUITS = ["reason", "passion", "life", "mundane"];
const ABILITIES = [
  ["reason", "理性", "REASON"],
  ["passion", "感情", "PASSION"],
  ["life", "生命", "LIFE"],
  ["mundane", "外界", "MUNDANE"]
];
const STRUCTURED_FIELDS = [
  ["handle_kana", "#handle-kana"], ["age", "#age"], ["gender", "#gender"],
  ["height", "#height"], ["weight", "#weight"], ["eyes", "#eyes"], ["hair", "#hair"],
  ["skin", "#skin"], ["life_path_origin", "#life-path-origin"],
  ["life_path_experience", "#life-path-experience"], ["life_path_encounter", "#life-path-encounter"]
];
const OUTFIT_CATEGORIES = new Set(["weapon", "armor", "cyberware", "tron", "vehicle", "residence", "other"]);

let user;
let character = null;
let skills = [];
let outfits = [];
let loading = false;
const styleBaseline = {};

const saveCoordinator = createSheetSaveCoordinator({
  validate() {
    if (!$("#character-name")?.value.trim() || !$("#player-name")?.value.trim()) return "キャスト名とプレイヤー名を入力してください。";
    return "";
  },
  async persist() {
    const data = await persistSheetBundle({
      characterId: character?.id ?? null,
      character: collectCharacter(),
      skills: collectSkills(),
      outfits: collectOutfits()
    });
    character = data;
    history.replaceState(null, "", `${SITE_BASE_PATH}sheet.html?id=${encodeURIComponent(character.public_id)}`);
    window.dispatchEvent(new CustomEvent("tnx:character-saved", { detail: { id: character.id, publicId: character.public_id } }));
    return data;
  },
  onError(error) {
    return formatSheetPersistenceError(error?.message, { operation: "save" });
  }
});

init();

async function init() {
  try {
    user = await requireAuth();
    if (!user) { publishSheetCharacterLoadFailed(); return; }
    renderStyles();
    renderAbilities();
    bind();
    const id = new URLSearchParams(location.search).get("id");
    if (id) await loadCharacter(id); else createNew();
  } catch (error) {
    // loadCharacter / createNew handle their own errors; this covers failures before they are reached.
    publishSheetCharacterLoadFailed();
    dismissSheetLoadOverlay();
    throw error;
  }
}

function bind() {
  initSheetEditorInteractions({
    root: document,
    windowRef: window,
    isLoading: () => loading,
    hasUnsavedChanges: () => saveCoordinator.hasUnsavedChanges(),
    onEdit() { recalc(); markDirty(); }
  });

  initSheetRowInteractions({
    root: document,
    onSkillInput: handleSkillRowInput,
    onOutfitInput: handleOutfitRowInput,
    onDeleteSkill: deleteSkillByKey,
    onMoveSkill: moveSkillByKey,
    onDeleteOutfit: deleteOutfitByKey
  });

  initSheetActionBindings({
    root: document,
    onSave: () => saveCoordinator.save(true),
    onAddGeneral: addGeneralSkill,
    onAddSocial: () => addSkill("social", "proper", "社会："),
    onAddConnection: () => addSkill("connection", "proper", "コネ："),
    onAddStyleSkill: () => addSkill("style", "normal", ""),
    onAddOutfit: () => addOutfitForImport("other")
  });
}

function handleSkillRowInput({ key, field, value, row }) {
  const skill = skills.find(item => item._key === key); if (!skill) return;
  const currentLevel = skill.level;
  const currentFreeLevel = skill.free_level;
  skill[field] = value;

  let state = null;
  if (SUITS.includes(field)) {
    state = resolveSkillInputState({
      action: "suit",
      currentLevel,
      currentFreeLevel,
      selectedSuitCount: SUITS.filter(suit => skill[suit]).length,
      checked: Boolean(value)
    });
  } else if (field === "level" || field === "free_level") {
    state = resolveSkillInputState({
      action: field,
      value,
      currentLevel,
      currentFreeLevel
    });
  }

  if (state) {
    skill.level = state.level;
    skill.free_level = state.freeLevel;
    const levelInput = row.querySelector('[data-f="level"]');
    const freeLevelInput = row.querySelector('[data-f="free_level"]');
    if (levelInput) levelInput.value = String(state.level);
    if (freeLevelInput) freeLevelInput.value = String(state.freeLevel);
  }
  recalc(); markDirty();
}

function handleOutfitRowInput({ key, field, value }) {
  const outfit = outfits.find(item => item._key === key); if (!outfit) return;
  outfit[field] = value;
  if (field === "category") renderOutfits();
  recalc(); markDirty();
}

function deleteSkillByKey(key) {
  skills = removeRowByKey(skills, key);
  renderSkills(); recalc(); markDirty();
}

function moveSkillByKey(key, direction) {
  const result = moveRowWithinCategory(skills, key, direction);
  if (!result.moved) return;
  skills = result.rows;
  renderSkills(); recalc(); markDirty();
}

function deleteOutfitByKey(key) {
  outfits = removeRowByKey(outfits, key);
  renderOutfits(); recalc(); markDirty();
}

function addSkill(category, kind, name) {
  skills = appendRow(skills, { ...blankSkill(category), skill_kind: kind, name });
  renderSkills(); recalc(); markDirty();
}

function addOutfitForImport(category = "other") {
  const outfit = {
    ...blankOutfit(),
    category: normalizeOutfitCategory(category, OUTFIT_CATEGORIES)
  };
  outfits = appendRow(outfits, outfit);
  renderOutfits(); recalc(); markDirty();
  return outfit._key;
}

function clearOutfitsForImport() {
  outfits = clearRows();
  renderOutfits(); recalc(); markDirty();
}

function applyOutfitDetailsForImport(key, details = {}) {
  const outfit = outfits.find(item => item._key === key);
  if (!outfit) return false;

  const category = normalizeOutfitCategory(details.site_category || details.category || outfit.category, OUTFIT_CATEGORIES);
  const normalized = normalizeImportedOutfitDetails(category, details);
  const aliases = {
    site_category: "category",
    purchase_target: "purchase_value",
    permanent_cost: "experience_cost",
    range_text: "range"
  };

  outfit.category = category;
  for (const [sourceField, value] of Object.entries(normalized)) {
    const field = aliases[sourceField] || sourceField;
    if (field === "category") continue;
    if (field in outfit) outfit[field] = value;
  }
  outfit._ofc_details = {
    ...(outfit._ofc_details || {}),
    ...normalized,
    site_category: category
  };

  renderOutfits(); recalc(); markDirty();
  return true;
}

function addStyleSeparator() {
  const skill = createStyleSeparatorRow(STYLE_SEPARATOR_MARKER, { sortOrder: skills.length });
  skills = appendRow(skills, skill);
  renderSkills(); recalc(); markDirty();
  requestAnimationFrame(() => document.querySelector(`#style-skills tr[data-skill-key="${skill._key}"] [data-f="name"]`)?.focus());
}

window.TNXSheetEditor = {
  ...(window.TNXSheetEditor || {}),
  addStyleSeparator,
  addOutfitForImport,
  clearOutfitsForImport,
  applyOutfitDetailsForImport
};

function generalColumnCounts() {
  return countGeneralSkillColumns(mergedGeneral());
}

function addGeneralSkill() {
  const counts = generalColumnCounts();
  const column = chooseGeneralSkillColumn(counts);
  const skill = createGeneralBlankSlotRow(column, { sortOrder: skills.length });
  skills = appendRow(skills, skill); renderSkills(); recalc(); markDirty();
  requestAnimationFrame(() => document.querySelector(`#general-skills tr[data-skill-key="${skill._key}"] [data-f="name"]`)?.focus());
}

function createNew() {
  loading = true;
  character = { visibility: "private" };
  $("#visibility").value = "private";
  skills = buildNewCharacterSkills({
    masterRows: GENERAL_MASTER,
    suits: SUITS,
    blankColumns: GENERAL_BLANK_SLOT_COLUMNS,
    createBlankSkill
  });
  renderSkills(); renderOutfits(); recalc();
  loading = false;
  saveCoordinator.markDirty();
  dismissSheetLoadOverlay();
}

async function loadCharacter(publicId) {
  loading = true;
  saveCoordinator.markLoading("読込中…");
  try {
    const bundle = await loadSheetBundle({ publicId, ownerId: user.id });
    publishSheetCharacterLoaded(bundle);
    character = bundle.character; fillCharacter(character);
    skills = bundle.skills.map(skill => normalizeLoadedSkill(skill, {
      styleKindFromLabel: label => window.TNXStyleSkillKinds?.fromLabel(label)
    }));
    ensureGeneralMasterRows(); addInitialGeneralBlankSlots();
    skills = appendStarterSocialConnectionRowsIfBothMissing(skills);
    outfits = bundle.outfits.map(normalizeLoadedOutfit);
    renderSkills(); renderOutfits(); recalc();
    saveCoordinator.markSaved();
  } catch (error) {
    publishSheetCharacterLoadFailed();
    console.error(error); character = null; skills = []; outfits = [];
    renderSkills(); renderOutfits();
    const detail = formatSheetPersistenceError(error?.message, { operation: "load" });
    saveCoordinator.markLoadError(`${detail} 保存は行われません。`);
  } finally { loading = false; dismissSheetLoadOverlay(); }
}

function fillCharacter(data) {
  applyCharacterToEditor({
    root: document,
    data,
    structuredFields: STRUCTURED_FIELDS,
    abilities: ABILITIES,
    styleBaseline,
    applyCharacterInputSnapshot,
    applyStyleInputSnapshot,
    applyAbilityInputSnapshot,
    calculateBaselines,
    updateDivines
  });
}

function renderStyles() {
  const root = $("#style-grid");
  root.innerHTML = renderStyleCards({ styleData: STYLE_DATA, utsuwaAttributes: UTSUWA_ATTRIBUTES });
  initSheetStyleInteractions({
    root,
    onStyleChange() {
      for (let i = 1; i <= 3; i++) applyStyleAttributeVisibility({ root: document, index: i });
      updateDivines(true);
    }
  });
}

function currentStyleSlots() {
  return collectStyleInputSnapshot({ root: document });
}

function calculateBaselines() {
  const calculated = calculateStyleBaselines({
    slots: currentStyleSlots(),
    abilities: ABILITIES,
    styleData: STYLE_DATA,
    utsuwaAttributes: UTSUWA_ATTRIBUTES
  });
  for (const [key] of ABILITIES) {
    styleBaseline[key] = Number(calculated[key] || 0);
    styleBaseline[`${key}-control`] = Number(calculated[`${key}-control`] || 0);
  }
}

function updateDivines(apply) {
  const presentation = buildStylePresentation({
    slots: currentStyleSlots(),
    styleData: STYLE_DATA
  });
  applyStylePresentation(document, presentation);
  if (!apply || loading) return;
  const old = { ...styleBaseline }; calculateBaselines();
  for (const [key] of ABILITIES) {
    adjustBaseline(key, old[key] || 0, styleBaseline[key] || 0);
    adjustBaseline(`${key}-control`, old[`${key}-control`] || 0, styleBaseline[`${key}-control`] || 0);
  }
  recalc();
}

function adjustBaseline(id, oldBase, newBase) {
  const element = $(`#${id}-base`);
  if (!element) return;
  element.value = String(resolveStyleBaselineValue(element.value, oldBase, newBase));
}

function renderAbilities() {
  $("#ability-grid").innerHTML = renderAbilityCards(ABILITIES);
}

function blankSkill(category) {
  return createBlankSkill(category, { sortOrder: skills.length });
}

function ensureGeneralMasterRows() {
  skills = reconcileGeneralMasterRows(skills, {
    masterRows: GENERAL_MASTER,
    suits: SUITS,
    createBlankSkill
  });
}

function addInitialGeneralBlankSlots() {
  skills = appendGeneralBlankSlots(skills, {
    columns: GENERAL_BLANK_SLOT_COLUMNS,
    createBlankSkill
  });
}

function mergedGeneral() {
  return orderGeneralRows(skills, GENERAL_MASTER);
}

function renderSkills() {
  const rendered = renderSkillEditorSections({
    generalRows: mergedGeneral(),
    socialRows: skills.filter(item => item.category === "social"),
    connectionRows: skills.filter(item => item.category === "connection"),
    styleRows: skills.filter(item => item.category === "style"),
    isStyleSeparator,
    styleKindLabels: window.TNXStyleSkillKinds?.labels || {}
  });
  $("#general-skills").innerHTML = rendered.generalHtml;
  $("#style-skills").innerHTML = rendered.styleHtml;
}

function blankOutfit() {
  return createBlankOutfit({ sortOrder: outfits.length });
}

function renderOutfits() {
  $("#outfit-list").innerHTML = renderOutfitEditor(outfits);
}

function currentAbilityInput() {
  return collectAbilityInputSnapshot({ root: document, abilities: ABILITIES });
}

function recalc() {
  const input = currentAbilityInput();
  const finals = calculateAbilityFinals({
    abilities: ABILITIES,
    values: input.values,
    cs: input.cs
  });
  applyAbilityFinals(document, ABILITIES, finals);
  window.TNXExperience?.queue?.();
}
function markDirty() { if (loading) return; saveCoordinator.markDirty(); }

function collectCharacter() {
  const experience = window.TNXExperience?.calculate?.();
  const input = collectCharacterInputSnapshot({
    root: document,
    structuredFields: STRUCTURED_FIELDS,
    experienceTotal: experience?.total ?? $("#exp-total")?.textContent ?? 0
  });
  const styles = buildStyleSaveRows({ slots: currentStyleSlots(), styleData: STYLE_DATA });
  const abilityInput = currentAbilityInput();
  const abilities = buildAbilitySaveSnapshot({
    abilities: ABILITIES,
    values: abilityInput.values,
    baselines: styleBaseline
  });
  const cs = buildCsSaveSnapshot(abilityInput.cs);
  return buildCharacterSavePayload({
    base: input.base,
    structured: input.structured,
    styles,
    abilities,
    cs
  });
}

function collectSkills() {
  return buildSkillSavePayloads(skills, { isStyleSeparator, styleSeparatorMarker: STYLE_SEPARATOR_MARKER });
}

function collectOutfits() {
  return buildOutfitSavePayloads(outfits);
}
