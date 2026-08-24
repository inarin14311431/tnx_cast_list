import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js?v=4";
import { STYLE_DATA, UTSUWA_ATTRIBUTES } from "./style-data.js";
import { registerTroopSave } from "./troop-save.js";
import { initializeTroopEditorUi, refreshTroopEditorUi } from "./troop-editor-ui.js";
import { initializeTroopLayout, refreshTroopAbilityPairs } from "./troop-layout-refine.js";
import { refreshTroopComboRules } from "./troop-combo-rule-v2.js";
import { unpackTroopComboRule } from "./troop-combo-codec.js";
import { initialGeneralSkillSuit } from "./general-skill-catalog.js";

const params = new URLSearchParams(location.search);
const publicId = params.get("id")?.trim() || "";
const editRequested = params.get("edit") === "1";
const requestedCharacter = params.get("character")?.trim() || "";
const view = document.querySelector("#troop-view");
const editor = document.querySelector("#troop-editor");
const errorBox = document.querySelector("#troop-error");
const status = document.querySelector("#troop-editor-status");
const ABILITIES = ["reason", "passion", "life", "mundane"];
const ABILITY_LABELS = { reason:"理性", passion:"感情", life:"生命", mundane:"外界" };
const SUIT_LABELS = { reason:"♠", passion:"♣", life:"♥", mundane:"♦" };
const STYLE_COST = { none:0, normal:10, secret:20, ultimate:50, direction:2 };
const STYLE_KIND_LABEL = { none:"なし", normal:"通常", secret:"秘技", ultimate:"奥義", direction:"演出" };
const GENERAL_KIND_COST = { general:10, proper:5, social:5, connection:5 };
const GENERAL_KIND_LABEL = { general:"一般", proper:"固有名詞" };
let user = null;
let troop = null;
let ownedCharacters = [];

initialize();

async function initialize() {
  const auth = await supabase.auth.getUser();
  user = auth.data?.user ?? null;
  if (editRequested && !user) { user = await requireAuth(); if (!user) return; }
  if (publicId) {
    const result = await supabase.from("troops").select("*").eq("public_id", publicId).maybeSingle();
    if (result.error || !result.data) return showError("トループデータが見つからないか、閲覧権限がありません。");
    troop = result.data;
  }
  if (editRequested) {
    if (troop && troop.owner_id !== user.id) return showError("このトループを編集する権限がありません。");
    await loadOwnedCharacters(); renderEditor();
  } else if (troop) await renderView();
  else showError("トループIDが指定されていません。");
}

async function loadOwnedCharacters() {
  const result = await supabase.from("characters").select("id, public_id, character_name, handle").eq("owner_id", user.id).order("character_name");
  if (result.error) throw result.error;
  ownedCharacters = result.data ?? [];
}

function renderEditor() {
  editor.hidden = false; view.hidden = true;
  const characterSelect = document.querySelector("#troop-character");
  characterSelect.innerHTML = `<option value="">未設定</option>${ownedCharacters.map(c => `<option value="${c.id}">${escapeHtml(c.character_name)}</option>`).join("")}`;
  characterSelect.value = troop?.character_id || ownedCharacters.find(c => c.public_id === requestedCharacter)?.id || "";
  setValue("#troop-name", troop?.name || ""); setValue("#troop-visibility", troop?.visibility || "private");
  setValue("#troop-level", troop?.level ?? 0); setValue("#troop-member-max", troop?.member_max ?? 1); setValue("#troop-notes", troop?.notes || "");
  setupStyleSelect();
  setValue("#troop-style", troop?.style_1 || ""); setValue("#troop-utsuwa-attribute", troop?.utsuwa_attribute || ""); updateStyleUI();
  const legacySkills = Array.isArray(troop?.skills) ? troop.skills : [];
  const generalSkills = legacySkills.filter(s => (s.category === "general" || ["general","proper"].includes(s.kind)) && !String(s.name || "").startsWith("社会：") && !String(s.name || "").startsWith("コネ："));
  const styleSkills = legacySkills.filter(s => s.category === "style" || (!s.category && ["normal","secret","ultimate","direction","none"].includes(s.type)));
  generalSkills.forEach(addGeneralSkillRow); styleSkills.forEach(addStyleSkillRow);
  (troop?.combos ?? []).forEach(addComboRow); (troop?.outfits ?? []).forEach(addOutfitRow);
  initializeTroopLayout(editor);
  initializeTroopEditorUi();
  bindEditorEvents();
  refreshTroopEditorUi();
  recalculateEditor();
  const deleteButton = document.querySelector("#troop-delete"); deleteButton.hidden = !troop; deleteButton.addEventListener("click", deleteTroop);
  if (troop) document.querySelector("#troop-cancel").href = `./troop.html?id=${encodeURIComponent(troop.public_id)}`;
}

function setupStyleSelect() {
  const style = document.querySelector("#troop-style");
  style.innerHTML = `<option value="">選択してください</option>${STYLE_DATA.map(item => `<option value="${escapeAttr(item.name)}">${escapeHtml(item.name)}</option>`).join("")}`;
  const attr = document.querySelector("#troop-utsuwa-attribute");
  attr.innerHTML = `<option value="">選択してください</option>${UTSUWA_ATTRIBUTES.map(item => `<option value="${escapeAttr(item.name)}">${escapeHtml(item.name)}</option>`).join("")}`;
}

function bindEditorEvents() {
  document.querySelector("#troop-style").addEventListener("change", () => { updateStyleUI(); recalculateEditor(); });
  document.querySelector("#troop-utsuwa-attribute").addEventListener("change", recalculateEditor);
  document.querySelector("#troop-level").addEventListener("input", recalculateEditor);
  document.querySelector("#troop-general-skill-add")?.addEventListener("click", () => { addGeneralSkillRow(); recalculateEditor(); });
  document.querySelector("#troop-style-skill-add").addEventListener("click", () => { addStyleSkillRow(); recalculateEditor(); });
  document.querySelector("#troop-outfit-add").addEventListener("click", () => addOutfitRow());
  editor.addEventListener("input", event => { if (event.target.closest(".troop-skill-row")) syncSkillRow(event.target); recalculateEditor(); });
  editor.addEventListener("change", event => { if (event.target.closest(".troop-skill-row")) syncSkillRow(event.target); recalculateEditor(); });
  registerTroopSave(editor);
}

function updateStyleUI() {
  const isUtsuwa = value("#troop-style") === "ウツワ";
  document.querySelector("#troop-utsuwa-wrap").hidden = !isUtsuwa;
  if (!isUtsuwa) setValue("#troop-utsuwa-attribute", "");
}

function calculateAbilities(styleName = value("#troop-style"), utsuwaAttribute = value("#troop-utsuwa-attribute"), level = intValue("#troop-level")) {
  const record = styleName === "ウツワ" ? UTSUWA_ATTRIBUTES.find(item => item.name === utsuwaAttribute) : STYLE_DATA.find(item => item.name === styleName);
  return Object.fromEntries(ABILITIES.map(key => [key, { value:(Number(record?.[key]?.[0]) || 0) + level, control:(Number(record?.[key]?.[1]) || 0) + level }]));
}

function recalculateEditor() {
  const abilities = calculateAbilities();
  document.querySelector("#troop-ability-preview").innerHTML = abilityMarkup(abilities);
  refreshTroopAbilityPairs("#troop-ability-preview", "#troop-level");
  setValue("#troop-exp", calculateExperience());
}

function calculateExperience() {
  let total = 0;
  document.querySelectorAll("#troop-general-skills-editor .troop-skill-row").forEach(row => {
    const level = rowInt(row, "level"); const kind = rowValue(row, "kind") || "general";
    const freeLevel = kind === "general" && initialGeneralSkillSuit(rowValue(row, "name")) ? 1 : 0;
    total += Math.max(0, level - freeLevel) * (GENERAL_KIND_COST[kind] ?? 10);
  });
  document.querySelectorAll("#troop-style-skills-editor .troop-skill-row").forEach(row => {
    const level = rowInt(row, "level"); const kind = rowValue(row, "kind") || "normal";
    total += level * (STYLE_COST[kind] ?? 10);
  });
  return total;
}

function syncSkillRow(control) {
  const row = control.closest(".troop-skill-row"); if (!row) return;
  const levelInput = row.querySelector('[data-field="level"]'); const boxes = [...row.querySelectorAll('[data-suit]')];
  if (control.matches('[data-field="level"]')) {
    let level = Math.max(0, Number.parseInt(levelInput.value || "0", 10) || 0); levelInput.value = level;
    if (level >= 4) boxes.forEach(box => box.checked = true);
  } else if (control.matches("[data-suit]")) {
    const count = boxes.filter(box => box.checked).length; const current = Math.max(0, Number.parseInt(levelInput.value || "0", 10) || 0);
    if (control.checked && count > current) levelInput.value = count;
    if (!control.checked && count < current && current <= 4) levelInput.value = count;
    if (Number(levelInput.value) >= 4) boxes.forEach(box => box.checked = true);
  }
}

function addGeneralSkillRow(data={}) { addSkillRow("#troop-general-skills-editor", data, "general"); }
function addStyleSkillRow(data={}) { addSkillRow("#troop-style-skills-editor", data, "style"); }
function addSkillRow(selector, data={}, category) {
  const row = document.createElement("div"); row.className = "troop-editor-row troop-skill-row"; row.dataset.category = category;
  if (category === "style") row.classList.add("troop-style-row-v6");
  const kindOptions = category === "style"
    ? Object.entries(STYLE_KIND_LABEL).map(([v,l]) => `<option value="${v}">${l}</option>`).join("")
    : Object.entries(GENERAL_KIND_LABEL).map(([v,l]) => `<option value="${v}">${l}</option>`).join("");
  const styleMeta = category === "style" ? `<input data-field="timing" class="troop-style-meta-input" placeholder="タイミング" value="${escapeAttr(data.timing || "")}" aria-label="タイミング"><input data-field="confrontation" class="troop-style-meta-input" placeholder="対決" value="${escapeAttr(data.confrontation || "")}" aria-label="対決">` : "";
  row.innerHTML = `<input data-field="name" placeholder="技能名" value="${escapeAttr(data.name || "")}"><select data-field="kind">${kindOptions}</select><input data-field="level" type="number" min="0" value="${Number(data.level ?? 1)}" aria-label="技能レベル"><div class="troop-suits">${ABILITIES.map(key => `<label><input type="checkbox" data-suit="${key}" ${data[key] ? "checked" : ""}><span>${SUIT_LABELS[key]}</span></label>`).join("")}</div>${styleMeta}<input data-field="notes" placeholder="解説／メモ" value="${escapeAttr(data.notes || "")}"><button type="button" data-remove>×</button>`;
  row.querySelector('[data-field="kind"]').value = data.kind || data.type || (category === "style" ? "normal" : "general");
  if (Number(data.level) >= 4) row.querySelectorAll("[data-suit]").forEach(box => box.checked = true);
  row.querySelector("[data-remove]").addEventListener("click", () => { row.remove(); recalculateEditor(); });
  document.querySelector(selector).append(row);
  refreshTroopEditorUi();
}

function addComboRow(data={}) {
  const row = document.createElement("div"); row.className = "troop-editor-row troop-editor-row--combo";
  const abilityValue = Array.isArray(data.abilities) ? data.abilities.join(",") : (data.ability || "");
  row.innerHTML = `<input data-field="name" value="${escapeAttr(data.name || "")}"><input data-field="skills" value="${escapeAttr(data.skills || "")}"><input data-field="ability" value="${escapeAttr(abilityValue)}"><input data-field="modifier" value="${escapeAttr(data.modifier || "")}"><input data-field="target_value" value="${escapeAttr(data.target_value || "")}"><input data-field="timing" value="${escapeAttr(data.timing || "")}"><input data-field="target" value="${escapeAttr(data.target || "")}"><input data-field="range" value="${escapeAttr(data.range || "")}"><input data-field="act_use_limit" type="number" min="1" value="${escapeAttr(data.act_use_limit || "")}"><input data-field="description" value="${escapeAttr(data.description || "")}"><button type="button" data-remove>×</button>`;
  row.querySelector("[data-remove]").addEventListener("click", () => { row.remove(); refreshTroopComboRules(); });
  document.querySelector("#troop-combos-editor").append(row);
  refreshTroopComboRules();
}

function addOutfitRow(data={}) {
  const row = document.createElement("div"); row.className = "troop-editor-row troop-editor-row--outfit";
  row.innerHTML = `<input data-field="name" placeholder="アウトフィット名" value="${escapeAttr(data.name || "")}"><input data-field="attack" placeholder="攻撃" value="${escapeAttr(data.attack || "")}"><input data-field="defense_s" placeholder="S" value="${escapeAttr(data.defense_s ?? data.s ?? "")}"><input data-field="defense_p" placeholder="P" value="${escapeAttr(data.defense_p ?? data.p ?? "")}"><input data-field="defense_i" placeholder="I" value="${escapeAttr(data.defense_i ?? data.i ?? "")}"><input data-field="notes" placeholder="性能／メモ" value="${escapeAttr(data.notes || "")}"><button type="button" data-remove>×</button>`;
  row.querySelector("[data-remove]").addEventListener("click", () => row.remove()); document.querySelector("#troop-outfits-editor").append(row);
}

async function renderView() {
  view.hidden = false; editor.hidden = true;
  document.querySelector("#troop-public-id").textContent = `${troop.public_id} / ${troop.visibility === "public" ? "PUBLIC" : "PRIVATE"}`;
  const name = troop.name || "名称未設定";
  document.querySelector("#troop-name-view").textContent = name;
  document.querySelector("#troop-name-field-view").textContent = name;
  document.querySelector("#troop-visibility-view").textContent = troop.visibility === "public" ? "公開" : "非公開";
  document.querySelector("#troop-level-view").textContent = Number(troop.level || 0);
  document.querySelector("#troop-member-max-view").textContent = Math.max(1, Number(troop.member_max || 1));
  document.querySelector("#troop-exp-view").textContent = troop.experience_spent ?? calculateStoredExperience(troop.skills);
  const styleText = troop.style_1 === "ウツワ" && troop.utsuwa_attribute ? `ウツワ（${troop.utsuwa_attribute}）` : (troop.style_1 || "未設定");
  document.querySelector("#troop-style-view").textContent = styleText;
  const calculatedAbilities = calculateAbilities(troop.style_1, troop.utsuwa_attribute, Number(troop.level || 0));
  const abilities = Object.fromEntries(ABILITIES.map(key => [key, {
    value: storedNumber(`${key}_value`, calculatedAbilities[key].value),
    control: storedNumber(`${key}_control`, calculatedAbilities[key].control)
  }]));
  document.querySelector("#troop-abilities-view").innerHTML = abilityMarkup(abilities);
  refreshTroopAbilityPairs("#troop-abilities-view", "#troop-level-view");
  const skills = Array.isArray(troop.skills) ? troop.skills : [];
  renderSkillList("#troop-general-skills-view", skills.filter(s => (s.category === "general" || ["general","proper"].includes(s.kind)) && !String(s.name || "").startsWith("社会：") && !String(s.name || "").startsWith("コネ：")), "general");
  renderSkillList("#troop-style-skills-view", skills.filter(s => s.category === "style" || (!s.category && ["normal","secret","ultimate","direction","none"].includes(s.type))), "style");
  renderComboList(Array.isArray(troop.combos) ? troop.combos : []);
  renderOutfitList(Array.isArray(troop.outfits) ? troop.outfits : []);
  document.querySelector("#troop-notes-view").textContent = troop.notes || "—";
  const owner = user && troop.owner_id === user.id; const editLink = document.querySelector("#troop-edit-link"); editLink.hidden = !owner;
  if (owner) editLink.href = `./troop.html?id=${encodeURIComponent(troop.public_id)}&edit=1`;
  document.querySelector("#troop-share-button").addEventListener("click", shareTroop);
  await renderLinkedCharacter();
}

function abilityMarkup(abilities) { return ABILITIES.map(key => `<article><span>${ABILITY_LABELS[key]}</span><strong>${abilities[key].value}</strong><small>制御 ${abilities[key].control}</small></article>`).join(""); }
function renderSkillList(selector, items, category) {
  const root = document.querySelector(selector);
  if (!items.length) {
    root.innerHTML = `<p class="empty-data">登録なし</p>`;
    return;
  }
  root.innerHTML = items.map(item => {
    const suits = ABILITIES.filter(k => item[k]).map(k => SUIT_LABELS[k]).join("") || "—";
    if (category === "general") {
      return `<article class="troop-view-general-row"><strong>${escapeHtml(item.name || "名称未設定")}</strong><span>Lv.${Number(item.level || 0)}</span><span class="troop-view-suits">${escapeHtml(suits)}</span></article>`;
    }
    const kind = item.kind || item.type || "normal";
    return `<article class="troop-view-style-skill-row"><strong>${escapeHtml(item.name || "名称未設定")}</strong><span>${escapeHtml(STYLE_KIND_LABEL[kind] || kind)}</span><span>Lv.${Number(item.level || 0)}</span><span class="troop-view-suits">${escapeHtml(suits)}</span><span>${escapeHtml(item.timing || "—")}</span><span>${escapeHtml(item.confrontation || "—")}</span><p>${escapeHtml(item.notes || "—")}</p></article>`;
  }).join("");
}

function renderComboList(items) {
  const root = document.querySelector("#troop-combos-view");
  if (!items.length) {
    root.innerHTML = `<p class="empty-data">登録なし</p>`;
    return;
  }
  root.innerHTML = items.map(comboMarkup).join("");
}

function comboMarkup(item) {
  const raw = Array.isArray(item.abilities) ? item.abilities : String(item.ability || "").split(",").filter(Boolean);
  const ability = raw.length ? raw.map(key => `${SUIT_LABELS[key]||""} ${ABILITY_LABELS[key]||key}`).join(" / ") : "能力未指定";
  const detail = [item.timing&&`タイミング：${item.timing}`,item.target&&`対象：${item.target}`,item.range&&`射程：${item.range}`,item.act_use_limit&&`1アクト：${item.act_use_limit}回`].filter(Boolean).join(" / ");
  const rule = unpackTroopComboRule(item.target_value);
  return `<article class="troop-view-combo"><div class="troop-view-combo__identity"><strong>${escapeHtml(item.name || "名称未設定")}</strong><span>${escapeHtml(ability)} / ${escapeHtml(item.skills || "技能未設定")}</span></div><dl><div><dt>判定修正</dt><dd>${escapeHtml(item.modifier || "—")}</dd></div><div><dt>達成値目安</dt><dd>${escapeHtml(rule.expected_value || "—")}</dd></div><div><dt>対決</dt><dd>${escapeHtml(rule.confrontation || "—")}</dd></div></dl><p class="troop-view-combo__detail">${escapeHtml(detail || "詳細未登録")}</p><p class="troop-view-combo__description">${escapeHtml(item.description || "—")}</p></article>`;
}

function renderOutfitList(items) {
  const root = document.querySelector("#troop-outfits-view");
  if (!items.length) {
    root.innerHTML = `<p class="empty-data">登録なし</p>`;
    return;
  }
  root.innerHTML = items.map(item => `<article class="troop-view-outfit-row"><strong>${escapeHtml(item.name || "名称未設定")}</strong><span>${escapeHtml(item.attack || "—")}</span><span>${escapeHtml(item.defense_s ?? item.s ?? "—")}</span><span>${escapeHtml(item.defense_p ?? item.p ?? "—")}</span><span>${escapeHtml(item.defense_i ?? item.i ?? "—")}</span><p>${escapeHtml(item.notes || "—")}</p></article>`).join("");
}
function calculateStoredExperience(skills=[]) { return (skills||[]).reduce((sum,item)=>sum+Number(item.exp_cost||0),0); }

function storedNumber(field, fallback) {
  const parsed = Number(troop?.[field]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function renderLinkedCharacter() {
  const node = document.querySelector("#troop-linked-character-view");
  if (!troop.character_id) {
    node.textContent = "未設定";
    return;
  }
  const result = await supabase.from("characters").select("public_id, character_name").eq("id", troop.character_id).maybeSingle();
  if (result.data) node.innerHTML = `<a href="./cast.html?id=${encodeURIComponent(result.data.public_id)}">${escapeHtml(result.data.character_name)}</a>`;
  else node.textContent = "非公開キャスト";
}


async function deleteTroop(){if(!troop||!confirm(`「${troop.name}」を削除します。`))return;const result=await supabase.from("troops").delete().eq("id",troop.id).eq("owner_id",user.id);if(result.error)return setStatus(result.error.message,true);location.href="./troops.html";}
async function shareTroop(){if(troop.visibility!=="public")return alert("共有URLでRLに確認してもらうには、公開状態を「公開」にしてください。");const url=new URL("./troop.html",location.href);url.searchParams.set("id",troop.public_id);try{await navigator.clipboard.writeText(url.href);alert("共有URLをコピーしました。");}catch{prompt("共有URL",url.href);}}
function rowValue(row,f){return String(row.querySelector(`[data-field="${f}"]`)?.value||"").trim();} function rowInt(row,f){return Math.max(0,Number.parseInt(rowValue(row,f)||"0",10)||0);} function value(selector){return String(document.querySelector(selector)?.value??"").trim();} function intValue(selector){return Math.max(0,Number.parseInt(value(selector)||"0",10)||0);} function setValue(selector,v){const n=document.querySelector(selector);if(n)n.value=v??"";}
function setStatus(message,error=false){status.textContent=message;status.dataset.state=error?"error":"working";} function showError(message){errorBox.hidden=false;errorBox.textContent=message;view.hidden=true;editor.hidden=true;}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));} function escapeAttr(v){return escapeHtml(v);}
