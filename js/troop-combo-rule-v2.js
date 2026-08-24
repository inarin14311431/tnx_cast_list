import { supabase } from "./supabase-client.js";
import { packTroopComboRule, unpackTroopComboRule } from "./troop-combo-codec.js";

const comboForm = document.querySelector("#troop-combo-form");
const comboDialog = document.querySelector("#troop-combo-dialog");
const comboStorage = document.querySelector("#troop-combos-editor");
const comboCards = document.querySelector("#troop-combo-cards");
const comboSkillOptions = document.querySelector("#troop-combo-skill-options");
const masterCache = new Map();
let masterAccess = null;
let initialized = false;

export function initializeTroopComboRules() {
  if (!comboForm || initialized) return;
  initialized = true;
  ensureAllStorageRows();
  insertAutofillNote();

  comboForm.addEventListener("submit", () => {
    packRuleFields();
    queueMicrotask(() => {
      ensureAllStorageRows();
      refreshTroopComboRules();
    });
  }, true);

  comboSkillOptions?.addEventListener("change", event => {
    const input = event.target.closest?.('input[name="skill_choice"]');
    if (!input?.checked) return;
    autofillFromSkill(input.value);
  });

  refreshTroopComboRules();
}

export function refreshTroopComboRules() {
  ensureAllStorageRows();
  renderComboCardsV2();
}

function insertAutofillNote() {
  const skills = comboDialog?.querySelector(".troop-combo-skills");
  if (!skills || comboDialog.querySelector(".combo-autofill-note")) return;
  const note = document.createElement("p");
  note.className = "combo-autofill-note";
  note.textContent = "登録済みの技能情報からタイミング・対象・射程・対決を空欄へ自動補完します。達成値目安はアクト運用用の任意入力です。";
  skills.after(note);
}

function ensureAllStorageRows() {
  comboRows().forEach(ensureStorageRow);
}

function ensureStorageRow(row) {
  const legacy = row.querySelector('[data-field="target_value"]');
  if (legacy && !legacy.dataset.comboV2Packed) {
    const parsed = unpackTroopComboRule(legacy.value);
    legacy.value = packTroopComboRule(parsed);
    legacy.dataset.comboV2Packed = "1";
  }
  const oldLimit = row.querySelector('[data-field="act_use_limit"]');
  if (oldLimit) oldLimit.value = "";
}

function packRuleFields() {
  const legacy = comboForm.elements.namedItem("target_value");
  if (!legacy) return;
  legacy.value = packTroopComboRule({
    expected_value: fieldValue("expected_value"),
    confrontation: fieldValue("confrontation")
  });
}

export function prepareTroopComboDialog() {
  if (!comboDialog?.open || !comboForm) return;
  const legacy = comboForm.elements.namedItem("target_value");
  const parsed = unpackTroopComboRule(legacy?.value || "");
  setFormField("expected_value", parsed.expected_value);
  setFormField("confrontation", parsed.confrontation);
}

async function autofillFromSkill(skillName) {
  const source = await findMasterSkill(skillName);
  if (!source) return;
  fillBlank("timing", source.timing);
  fillBlank("target", source.target);
  fillBlank("range", source.range_text);
  fillBlank("confrontation", source.confrontation);
}

async function findMasterSkill(skillName) {
  const key = normalizeSkillName(skillName);
  if (!key) return null;
  if (masterCache.has(key)) return masterCache.get(key);
  if (!(await canUseMaster())) return null;

  const raw = String(skillName || "").trim();
  const stripped = raw.replace(/[@†※]/g, "").trim();
  const candidates = [...new Set([raw, stripped].filter(Boolean))];
  const { data, error } = await supabase
    .from("skd_master")
    .select("name,timing,target,range_text,confrontation")
    .in("name", candidates)
    .limit(20);
  if (error) {
    masterCache.set(key, null);
    return null;
  }
  const match = (data || []).find(row => normalizeSkillName(row.name) === key) || (data || [])[0] || null;
  masterCache.set(key, match);
  return match;
}

async function canUseMaster() {
  if (masterAccess !== null) return masterAccess;
  try {
    const { data, error } = await supabase.rpc("can_use_master_search");
    masterAccess = !error && data === true;
  } catch {
    masterAccess = false;
  }
  return masterAccess;
}

function fillBlank(name, value) {
  const control = comboForm.elements.namedItem(name);
  const next = String(value || "").trim();
  if (!control || control.value.trim() || !next || ["-","－","—","―"].includes(next)) return;
  control.value = next;
  control.classList.add("master-autofill-updated");
  window.setTimeout(() => control.classList.remove("master-autofill-updated"), 1800);
}

function renderComboCardsV2() {
  if (!comboCards || !comboStorage) return;
  const rows = comboRows();
  if (!rows.length) {
    comboCards.innerHTML = `<p class="empty-data">コンボは登録されていません。<small>NO COMBO DATA</small></p>`;
    return;
  }
  comboCards.innerHTML = rows.map((row,index) => {
    const name = rowValue(row,"name") || "名称未設定";
    const ability = abilityText(rowValue(row,"ability"));
    const skills = rowValue(row,"skills") || "組み合わせ技能なし";
    const rule = unpackTroopComboRule(rowValue(row,"target_value"));
    const detail = [
      rowValue(row,"timing") && `タイミング：${rowValue(row,"timing")}`,
      rowValue(row,"target") && `対象：${rowValue(row,"target")}`,
      rowValue(row,"range") && `射程：${rowValue(row,"range")}`
    ].filter(Boolean).join(" / ");
    return `<button class="combo-card" type="button" data-troop-combo-index="${index}"><div class="combo-card__head"><strong>${escapeHtml(name)}</strong><span class="combo-card__ability">${escapeHtml(ability)}</span></div><p class="combo-card__skills">${escapeHtml(skills)}</p><dl><div><dt>判定修正 <small>MODIFIER</small></dt><dd>${escapeHtml(rowValue(row,"modifier") || "—")}</dd></div><div><dt>達成値目安 <small>EXPECTED VALUE</small></dt><dd>${escapeHtml(rule.expected_value || "—")}</dd></div><div><dt>対決 <small>CONFRONTATION</small></dt><dd>${escapeHtml(rule.confrontation || "—")}</dd></div></dl><p class="combo-card__detail">${escapeHtml(detail || "詳細未登録")}</p><p class="combo-card__description">${escapeHtml(rowValue(row,"description"))}</p></button>`;
  }).join("");
}

function comboRows() {
  return comboStorage ? [...comboStorage.children].filter(row => row.matches(".troop-editor-row--combo")) : [];
}
function rowValue(row,field) { return String(row.querySelector(`[data-field="${field}"]`)?.value || "").trim(); }
function fieldValue(name) { return String(comboForm?.elements.namedItem(name)?.value || "").trim(); }
function setFormField(name,value) { const node=comboForm?.elements.namedItem(name); if(node) node.value=value || ""; }
function abilityText(value) {
  const labels={reason:"♠ 理性",passion:"♣ 感情",life:"♥ 生命",mundane:"♦ 外界"};
  const keys=String(value||"").split(",").map(v=>v.trim()).filter(Boolean);
  return keys.length ? keys.map(key=>labels[key]||key).join(" / ") : "能力未指定";
}
function normalizeSkillName(value) { return String(value||"").normalize("NFKC").replace(/[@†※]/g,"").replace(/\s+/g,"").trim().toLowerCase(); }
function escapeHtml(value) { return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
