import { GENERAL_MASTER_ROWS, initialGeneralSkillSuit } from "./general-skill-catalog.js";
import { initializeTroopComboRules, prepareTroopComboDialog, refreshTroopComboRules } from "./troop-combo-rule-v2.js";

const ABILITIES = ["reason", "passion", "life", "mundane"];
const SUITS = {
  reason: { off:"♤", on:"♠", label:"理性" },
  passion:{ off:"♧", on:"♣", label:"感情" },
  life:   { off:"♡", on:"♥", label:"生命" },
  mundane:{ off:"♢", on:"♦", label:"外界" }
};
const GENERAL_NAMES = GENERAL_MASTER_ROWS.map(([name]) => name).filter(name => !name.startsWith("社会：") && !name.startsWith("コネ："));
const OPEN_PREFIXES = ["製作：", "芸術：", "操縦："];
const COMBO_FIELDS = ["name","skills","ability","modifier","target_value","timing","target","range","act_use_limit","description"];

const editor = document.querySelector("#troop-editor");
const comboStorage = document.querySelector("#troop-combos-editor");
const comboDialog = document.querySelector("#troop-combo-dialog");
const comboForm = document.querySelector("#troop-combo-form");
const comboSkillOptions = document.querySelector("#troop-combo-skill-options");

let initialized = false;

export function initializeTroopEditorUi() {
  if (initialized) return;
  initialized = true;
  installHandlers();
  initializeComboDialog();
  initializeTroopComboRules();
  refreshTroopEditorUi();
}

export function refreshTroopEditorUi() {
  document.querySelectorAll(".troop-skill-row").forEach(enhanceSkillRow);
  refreshTroopComboRules();
}

function installHandlers() {
  document.addEventListener("click", event => {
    const add = event.target.closest?.("#troop-combo-add");
    if (add) {
      event.preventDefault();
      openComboDialog();
      return;
    }
    const card = event.target.closest?.("[data-troop-combo-index]");
    if (card) {
      event.preventDefault();
      openComboDialog(Number(card.dataset.troopComboIndex));
    }
  });
}

function enhanceSkillRow(row) {
  if (row.dataset.troopUiEnhanced === "1") return;
  row.dataset.troopUiEnhanced = "1";
  enhanceSuitToggles(row);
  if (row.closest("#troop-general-skills-editor")) enhanceGeneralSkillName(row);
}

function enhanceSuitToggles(row) {
  row.querySelectorAll("[data-suit]").forEach(input => {
    const suit = SUITS[input.dataset.suit];
    const span = input.nextElementSibling;
    if (!suit || !span) return;
    span.textContent = "";
    span.dataset.off = suit.off;
    span.dataset.on = suit.on;
    span.title = suit.label;
    input.setAttribute("aria-label", `${suit.label}スート`);
    input.closest("label")?.classList.add("troop-suit-toggle");
  });
}

function enhanceGeneralSkillName(row) {
  const original = row.querySelector('input[data-field="name"]');
  if (!original || row.querySelector("[data-general-skill-select]")) return;

  const current = original.value.trim();
  const wrapper = document.createElement("div");
  wrapper.className = "troop-general-skill-picker";
  const select = document.createElement("select");
  select.dataset.generalSkillSelect = "1";
  select.setAttribute("aria-label", "一般技能名");
  select.innerHTML = `<option value="">技能を選択</option>${GENERAL_NAMES.map(name => `<option value="${escapeAttr(name)}">${escapeHtml(name)}</option>`).join("")}`;
  const detail = document.createElement("input");
  detail.type = "text";
  detail.className = "troop-general-skill-detail";
  detail.placeholder = "名称を入力";
  detail.setAttribute("aria-label", "技能の固有名称");
  detail.hidden = true;

  const matchedPrefix = OPEN_PREFIXES.find(prefix => current.startsWith(prefix));
  if (matchedPrefix) {
    select.value = matchedPrefix;
    detail.value = current.slice(matchedPrefix.length);
  } else if (GENERAL_NAMES.includes(current)) {
    select.value = current;
  } else if (current && !current.startsWith("社会：") && !current.startsWith("コネ：")) {
    const option = document.createElement("option");
    option.value = current;
    option.textContent = current;
    select.append(option);
    select.value = current;
  }

  original.type = "hidden";
  original.before(wrapper);
  wrapper.append(select, detail);

  const sync = () => {
    const base = select.value;
    const open = OPEN_PREFIXES.includes(base);
    detail.hidden = !open;
    original.value = open ? `${base}${detail.value.trim()}` : base;
    syncGeneralKind(row, base);
    syncGeneralAutoSuit(row, base);
    original.dispatchEvent(new Event("input", { bubbles:true }));
  };
  select.addEventListener("change", sync);
  detail.addEventListener("input", sync);
  sync();
}

function syncGeneralKind(row, name) {
  const kind = row.querySelector('select[data-field="kind"]');
  if (!kind) return;
  kind.value = ["製作：","芸術：","操縦："].includes(name) ? "proper" : "general";
  kind.classList.add("troop-skill-kind-auto");
  kind.tabIndex = -1;
  kind.setAttribute("aria-hidden", "true");
}

function syncGeneralAutoSuit(row, name) {
  const previous = row.dataset.autoSuit || "";
  if (previous) {
    const previousInput = row.querySelector(`[data-suit="${previous}"]`);
    const previousLabel = previousInput?.closest("label");
    if (previousInput) {
      previousInput.disabled = false;
      previousInput.removeAttribute("data-auto-suit");
      previousInput.checked = false;
    }
    previousLabel?.classList.remove("troop-suit-toggle--fixed");
    previousLabel?.removeAttribute("title");
  }

  const fixedSuit = initialGeneralSkillSuit(name);
  row.dataset.autoSuit = fixedSuit;
  if (!fixedSuit) return;

  const input = row.querySelector(`[data-suit="${fixedSuit}"]`);
  const label = input?.closest("label");
  if (!input) return;
  input.checked = true;
  input.disabled = true;
  input.dataset.autoSuit = "1";
  label?.classList.add("troop-suit-toggle--fixed");
  label?.setAttribute("title", `${SUITS[fixedSuit]?.label || fixedSuit}：自動取得スート`);

  const level = row.querySelector('[data-field="level"]');
  if (level && Number(level.value || 0) < 1) level.value = "1";
}

function initializeComboDialog() {
  if (!comboDialog || !comboForm) return;
  document.querySelector("#troop-combo-close")?.addEventListener("click", () => comboDialog.close());
  document.querySelector("#troop-combo-cancel")?.addEventListener("click", () => comboDialog.close());
  document.querySelector("#troop-combo-delete")?.addEventListener("click", deleteComboFromDialog);
  comboForm.addEventListener("submit", saveComboFromDialog);
}

function ownedSkillNames() {
  const names = [...document.querySelectorAll("#troop-general-skills-editor .troop-skill-row, #troop-style-skills-editor .troop-skill-row")]
    .map(row => rowValue(row, "name"))
    .filter(Boolean);
  return [...new Set(names)];
}

function renderComboSkillChoices(selected = []) {
  if (!comboSkillOptions) return;
  const selectedSet = new Set(selected);
  const names = ownedSkillNames();
  comboSkillOptions.innerHTML = names.length
    ? names.map(name => `<label><input type="checkbox" name="skill_choice" value="${escapeAttr(name)}" ${selectedSet.has(name) ? "checked" : ""}><span>${escapeHtml(name)}</span></label>`).join("")
    : `<p class="empty-data">先に技能を登録してください。</p>`;
}

function openComboDialog(index = null) {
  if (!comboDialog || !comboForm) return;
  comboForm.reset();
  comboForm.elements.namedItem("row_index").value = index === null ? "" : String(index);
  const row = index === null ? null : comboRows()[index];
  ["name","modifier","target_value","timing","target","range","act_use_limit","description"].forEach(field => {
    const control = comboForm.elements.namedItem(field);
    if (control) control.value = row ? rowValue(row, field) : "";
  });
  const abilities = row ? rowValue(row, "ability").split(",").filter(Boolean) : [];
  comboForm.querySelectorAll('input[name="ability_choice"]').forEach(input => { input.checked = abilities.includes(input.value); });
  const skills = row ? rowValue(row, "skills").split("＋").map(value => value.trim()).filter(Boolean) : [];
  renderComboSkillChoices(skills);
  const editing = Boolean(row);
  document.querySelector("#troop-combo-dialog-title").innerHTML = editing ? "コンボを編集 <small>EDIT COMBO</small>" : "コンボを追加 <small>ADD COMBO</small>";
  document.querySelector("#troop-combo-delete").hidden = !editing;
  comboDialog.showModal();
  prepareTroopComboDialog();
}

function saveComboFromDialog(event) {
  event.preventDefault();
  if (!comboForm.reportValidity()) return;
  const raw = comboForm.elements.namedItem("row_index").value;
  const index = raw === "" ? null : Number(raw);
  let row = index === null ? null : comboRows()[index];
  if (!row) {
    row = createComboStorageRow();
    comboStorage.append(row);
  }
  const directFields = ["name","modifier","target_value","timing","target","range","act_use_limit","description"];
  directFields.forEach(field => {
    const target = row.querySelector(`[data-field="${field}"]`);
    const source = comboForm.elements.namedItem(field);
    if (target && source) target.value = source.value;
  });
  row.querySelector('[data-field="ability"]').value = [...comboForm.querySelectorAll('input[name="ability_choice"]:checked')].map(input => input.value).join(",");
  row.querySelector('[data-field="skills"]').value = [...comboForm.querySelectorAll('input[name="skill_choice"]:checked')].map(input => input.value).join("＋");
  comboDialog.close();
  refreshTroopComboRules();
  editor?.dispatchEvent(new Event("input", { bubbles:true }));
}

function deleteComboFromDialog() {
  const raw = comboForm.elements.namedItem("row_index").value;
  if (raw === "") return;
  comboRows()[Number(raw)]?.remove();
  comboDialog.close();
  refreshTroopComboRules();
}

function createComboStorageRow() {
  const row = document.createElement("div");
  row.className = "troop-editor-row troop-editor-row--combo";
  COMBO_FIELDS.forEach(field => {
    const input = document.createElement("input");
    input.dataset.field = field;
    input.type = field === "act_use_limit" ? "number" : "text";
    row.append(input);
  });
  return row;
}

function comboRows() {
  return comboStorage ? [...comboStorage.children].filter(row => row.matches(".troop-editor-row--combo")) : [];
}
function rowValue(row, field) { return String(row.querySelector(`[data-field="${field}"]`)?.value || "").trim(); }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function escapeAttr(value) { return escapeHtml(value); }
