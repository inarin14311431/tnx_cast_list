import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js";
import { STYLE_DATA, UTSUWA_ATTRIBUTES } from "./style-data.js";
import { SITE_BASE_PATH } from "./config.js";

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const SUITS = ["reason", "passion", "life", "mundane"];
const SUIT_MARKS = ["♠", "♣", "♥", "♦"];
const ABILITIES = [
  ["reason", "理性", "REASON"],
  ["passion", "感情", "PASSION"],
  ["life", "生命", "LIFE"],
  ["mundane", "外界", "MUNDANE"]
];
const FIXED_GENERAL = [
  ["医療", "reason"], ["射撃", "reason"], ["知覚", "reason"], ["電脳", "reason"],
  ["心理", "passion"], ["自我", "passion"], ["交渉", "passion"],
  ["運動", "life"], ["回避", "life"], ["白兵", "life"],
  ["信用", "mundane"], ["圧力", "mundane"], ["隠密", "mundane"]
];

let user;
let character = null;
let skills = [];
let outfits = [];
let showAllGeneral = true;
let saveTimer;
let saving = false;
let pendingSave = false;
let loading = false;
let dirty = false;
let importMode = "";
const styleBaseline = {};

init();

async function init() {
  user = await requireAuth();
  if (!user) return;
  renderStyles();
  renderAbilities();
  bindEvents();
  const publicId = new URLSearchParams(location.search).get("id");
  if (publicId) await loadCharacter(publicId);
  else createNewState();
}

function bindEvents() {
  document.addEventListener("input", handleEdit);
  document.addEventListener("change", handleEdit);
  document.addEventListener("click", event => {
    const toggle = event.target.closest(".section-toggle");
    if (toggle) {
      toggle.closest(".sheet-section")?.classList.toggle("is-open");
      return;
    }
    const deleteSkill = event.target.closest("[data-delete-skill]");
    if (deleteSkill) {
      skills = skills.filter(skill => skill._key !== deleteSkill.dataset.deleteSkill);
      renderSkills();
      recalc();
      markDirty();
      return;
    }
    const deleteOutfit = event.target.closest("[data-delete-outfit]");
    if (deleteOutfit) {
      outfits = outfits.filter(outfit => outfit._key !== deleteOutfit.dataset.deleteOutfit);
      renderOutfits();
      recalc();
      markDirty();
    }
  });

  $("#save-button").addEventListener("click", () => saveAll(true));
  $("#toggle-general").addEventListener("click", () => {
    showAllGeneral = !showAllGeneral;
    updateGeneralToggleLabel();
    renderSkills();
  });
  $("#add-general").addEventListener("click", () => {
    skills.push(blankSkill("general"));
    renderSkills();
    markDirty();
  });
  $("#add-style-skill").addEventListener("click", () => {
    skills.push(blankSkill("style"));
    renderSkills();
    markDirty();
  });
  $("#add-outfit").addEventListener("click", () => {
    outfits.push(blankOutfit());
    renderOutfits();
    markDirty();
  });
  $("#import-skd").addEventListener("click", () => openImport("skd"));
  $("#import-ofc").addEventListener("click", () => openImport("ofc"));
  $("#tsv-apply").addEventListener("click", event => {
    event.preventDefault();
    applyImport();
    $("#tsv-dialog").close();
  });
}

function handleEdit(event) {
  if (loading || !event.target.matches("input,select,textarea")) return;
  recalc();
  markDirty();
}

function createNewState() {
  loading = true;
  character = { visibility: "draft" };
  $("#visibility").value = "draft";
  skills = FIXED_GENERAL.map(([name, suit]) => ({
    ...blankSkill("general"), name, level: 1, free_level: 1, [suit]: true, skill_kind: "general"
  }));
  skills.push({...blankSkill("social"), name: "社会：N◎VA", level: 1, free_level: 1, skill_kind: "proper"});
  skills.push({...blankSkill("social"), name: "社会：初期取得", level: 1, free_level: 1, skill_kind: "proper"});
  skills.push({...blankSkill("connection"), name: "コネ：初期取得", level: 1, free_level: 1, skill_kind: "proper"});
  skills.push({...blankSkill("connection"), name: "コネ：初期取得", level: 1, free_level: 1, skill_kind: "proper"});
  updateGeneralToggleLabel();
  renderSkills();
  renderOutfits();
  recalc();
  loading = false;
  dirty = true;
  setStatus("未保存", "unsaved");
}

async function loadCharacter(publicId) {
  loading = true;
  setStatus("読込中…", "saving");
  const { data, error } = await supabase
    .from("characters")
    .select("*")
    .eq("public_id", publicId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error || !data) {
    setStatus(toJapaneseError(error?.message || "キャストを読み込めませんでした。"), "error");
    loading = false;
    return;
  }

  character = data;
  fillCharacter(data);
  const [skillResult, outfitResult] = await Promise.all([
    supabase.from("character_skills").select("*").eq("character_id", data.id).order("sort_order"),
    supabase.from("character_outfits").select("*").eq("character_id", data.id).order("sort_order")
  ]);
  skills = (skillResult.data || []).map(normalizeSkill);
  outfits = (outfitResult.data || []).map(normalizeOutfit);
  updateGeneralToggleLabel();
  renderSkills();
  renderOutfits();
  recalc();
  loading = false;
  dirty = false;
  setStatus("保存済み", "saved");
}

function fillCharacter(data) {
  ["character_name","character_kana","handle","player_name","affiliation","citizen_rank","summary","profile","visibility"].forEach(name => {
    const element = $("#" + name.replaceAll("_", "-"));
    if (element) element.value = data[name] ?? "";
  });
  for (let i = 1; i <= 3; i++) {
    $(`#style-${i}`).value = data[`style_${i}`] || "";
    $(`#style-${i}-mark`).value = data[`style_${i}_mark`] || "";
    const attribute = $(`#style-${i}-attribute`);
    if (attribute) attribute.value = data[`style_${i}_attribute`] || "";
    toggleAttribute(i);
  }
  calculateStyleBaselines();
  for (const [key] of ABILITIES) {
    $(`#${key}-base`).value = Number(data[`${key}_base`] ?? data[`${key}_value`] ?? styleBaseline[key] ?? 0);
    $(`#${key}-mod`).value = Number(data[`${key}_gear`] || 0) + Number(data[`${key}_manual`] || 0);
    $(`#${key}-control-base`).value = Number(data[`${key}_control_base`] ?? data[`${key}_control`] ?? styleBaseline[`${key}-control`] ?? 0);
    $(`#${key}-control-mod`).value = Number(data[`${key}_control_gear`] || 0) + Number(data[`${key}_control_manual`] || 0);
  }
  $("#cs-base").value = data.cs_base ?? data.cs ?? 0;
  $("#cs-mod").value = Number(data.cs_gear || 0) + Number(data.cs_manual || 0);
  updateDivines(false);
}

function renderStyles() {
  const options = '<option value="">選択</option>' + STYLE_DATA.map(item => `<option>${escapeHtml(item.name)}</option>`).join("");
  const attributes = '<option value="">属性を選択</option>' + UTSUWA_ATTRIBUTES.map(item => `<option>${escapeHtml(item.name)}</option>`).join("");
  $("#style-grid").innerHTML = [1,2,3].map(i => `
    <article class="style-card">
      <div class="style-fields">
        <label>スタイル<select id="style-${i}">${options}</select></label>
        <label>指定<select id="style-${i}-mark"><option value="">無印</option><option>◎</option><option>●</option><option>◎●</option></select></label>
        <label id="style-${i}-attribute-wrap" hidden>ウツワ属性<select id="style-${i}-attribute">${attributes}</select></label>
      </div>
      <section class="divine-field">
        <ruby><strong id="divine-${i}">未選択</strong><rt id="divine-${i}-yomi"></rt></ruby>
        <span>神業</span>
      </section>
    </article>
  `).join("");
  $("#style-grid").addEventListener("change", event => {
    if (!event.target.matches('[id^="style-"]')) return;
    for (let i = 1; i <= 3; i++) toggleAttribute(i);
    updateDivines(true);
  });
}

function toggleAttribute(i) {
  const wrap = $(`#style-${i}-attribute-wrap`);
  const select = $(`#style-${i}-attribute`);
  if (!wrap || !select) return;
  const enabled = $(`#style-${i}`).value === "ウツワ";
  wrap.hidden = !enabled;
  if (!enabled) select.value = "";
}

function styleRecord(i) {
  const name = $(`#style-${i}`).value;
  if (name === "ウツワ") return UTSUWA_ATTRIBUTES.find(item => item.name === $(`#style-${i}-attribute`).value) || null;
  return STYLE_DATA.find(item => item.name === name) || null;
}

function calculateStyleBaselines() {
  for (const [key] of ABILITIES) {
    styleBaseline[key] = 0;
    styleBaseline[`${key}-control`] = 0;
  }
  for (let i = 1; i <= 3; i++) {
    const record = styleRecord(i);
    if (!record) continue;
    for (const [key] of ABILITIES) {
      styleBaseline[key] += Number(record[key]?.[0] || 0);
      styleBaseline[`${key}-control`] += Number(record[key]?.[1] || 0);
    }
  }
}

function updateDivines(applyBaseline = false) {
  for (let i = 1; i <= 3; i++) {
    const style = STYLE_DATA.find(item => item.name === $(`#style-${i}`).value);
    $(`#divine-${i}`).textContent = style?.divine || "未選択";
    $(`#divine-${i}-yomi`).textContent = style?.divineYomi || style?.divine || "";
  }
  const selected = [1,2,3].filter(i => $(`#style-${i}`).value).length;
  $("#style-warning").textContent = selected === 3 ? "" : "3枠すべてのスタイルを選択してください。";
  if (!applyBaseline || loading) return;

  const previous = {...styleBaseline};
  calculateStyleBaselines();
  for (const [key] of ABILITIES) {
    adjustCurrentForBaseline(key, previous[key] || 0, styleBaseline[key] || 0);
    adjustCurrentForBaseline(`${key}-control`, previous[`${key}-control`] || 0, styleBaseline[`${key}-control`] || 0);
  }
  recalc();
}

function adjustCurrentForBaseline(id, oldBaseline, newBaseline) {
  const input = $(`#${id}-base`);
  if (!input) return;
  const current = Number(input.value || 0);
  if (current === oldBaseline || current === 0) input.value = newBaseline;
}

function renderAbilities() {
  $("#ability-grid").innerHTML = ABILITIES.map(([key, japanese, english]) => abilityCard(key, japanese, english)).join("") + csCard();
}

function abilityCard(key, japanese, english) {
  return `
    <article class="ability-card ability-matrix">
      <h3>${japanese} <small>${english}</small></h3>
      <div class="ability-matrix__header"><span></span><strong>能力値</strong><strong>制御値</strong></div>
      <div class="ability-matrix__row"><span>現在値</span><input id="${key}-base" type="number" min="0" value="0"><input id="${key}-control-base" type="number" min="0" value="0"></div>
      <div class="ability-matrix__row"><span>補正値</span><input id="${key}-mod" type="number" value="0"><input id="${key}-control-mod" type="number" value="0"></div>
      <div class="ability-matrix__row ability-matrix__result"><span>最終値</span><strong id="${key}-final">0</strong><strong id="${key}-control-final">0</strong></div>
    </article>
  `;
}

function csCard() {
  return `
    <article class="ability-card ability-card--cs">
      <h3>CS</h3>
      <div class="cs-row"><label>現在値<input id="cs-base" type="number" value="0"></label><label>補正値<input id="cs-mod" type="number" value="0"></label><strong id="cs-final">0</strong></div>
    </article>
  `;
}

function blankSkill(category) {
  return {_key:crypto.randomUUID(),category,name:"",level:1,free_level:0,skill_kind:category === "style" ? "normal" : "general",reason:false,passion:false,life:false,mundane:false,timing:"",target:"",range:"",difficulty:"",confrontation:"",description:"",sort_order:skills.length};
}
function normalizeSkill(skill) {
  const result = {...blankSkill(skill.category),...skill,_key:skill.id || crypto.randomUUID(),free_level:Number(skill.free_level || 0),skill_kind:skill.skill_kind || inferSkillKind(skill)};
  if (result.name === "初期取得") result.name = result.category === "connection" ? "コネ：初期取得" : "社会：初期取得";
  return result;
}
function inferSkillKind(skill) {
  if (skill.category === "style") return /奥義/.test(skill.type || "") ? "ultimate" : /秘技/.test(skill.type || "") ? "secret" : "normal";
  return String(skill.name || "").includes("：") ? "proper" : "general";
}

function updateGeneralToggleLabel() {
  const button = $("#toggle-general");
  if (!button) return;
  button.innerHTML = showAllGeneral ? "取得済みのみ表示 <small>OWNED ONLY</small>" : "全技能表示 <small>SHOW ALL</small>";
}

function renderSkills() {
  const merged = mergeGeneralMaster(skills);
  const generalRows = showAllGeneral ? merged.filter(skill => skill.category === "general") : merged.filter(skill => skill.category === "general" && Number(skill.level) > 0);
  const socialRows = skills.filter(skill => skill.category === "social");
  const connectionRows = skills.filter(skill => skill.category === "connection");
  $("#general-skills").innerHTML = [
    skillTable("一般技能", "GENERAL SKILLS", generalRows, false),
    skillTable("社会", "SOCIAL", socialRows, false),
    skillTable("コネクション", "CONNECTIONS", connectionRows, false)
  ].join("");
  $("#style-skills").innerHTML = skillTable("スタイル技能", "STYLE SKILLS", skills.filter(skill => skill.category === "style"), true);
  bindSkillRows();
}

function mergeGeneralMaster(list) {
  const output = [...list];
  for (const [name] of FIXED_GENERAL) {
    if (!output.some(skill => skill.category === "general" && skill.name === name)) output.push({...blankSkill("general"), name, level: 0});
  }
  return output;
}

function skillTable(japanese, english, rows, detail) {
  if (!rows.length) return "";
  return `<section class="skill-group"><h3 class="skill-group-title">${japanese} <small>${english}</small></h3><table class="skill-table ${detail ? "has-detail" : "no-detail"}"><thead><tr><th class="name-col">名称</th><th class="type-col">種別</th><th class="lv-col">LV</th>${SUIT_MARKS.map(mark => `<th class="suit-col">${mark}</th>`).join("")}${detail ? "<th>詳細</th>" : ""}<th></th></tr></thead><tbody>${rows.map(row => skillRow(row, detail)).join("")}</tbody></table></section>`;
}

function skillRow(skill, detail) {
  const kinds = ["general","proper","normal","secret","ultimate"];
  const labels = {general:"一般",proper:"固有名詞",normal:"通常",secret:"秘技",ultimate:"奥義"};
  return `<tr data-skill-key="${skill._key}"><td><input data-f="name" value="${escapeHtml(skill.name)}"></td><td><select data-f="skill_kind">${kinds.map(value => `<option value="${value}" ${skill.skill_kind === value ? "selected" : ""}>${labels[value]}</option>`).join("")}</select></td><td><input data-f="level" type="number" min="0" value="${skill.level || 0}"></td>${SUITS.map((suit,index) => `<td class="suit-cell"><label class="suit-check"><input data-f="${suit}" type="checkbox" ${skill[suit] ? "checked" : ""}><span>${SUIT_MARKS[index]}</span></label></td>`).join("")}${detail ? `<td><input data-f="description" value="${escapeHtml(skill.description || skill.timing || "")}"></td>` : ""}<td><button class="row-delete" data-delete-skill="${skill._key}" type="button">×</button></td></tr>`;
}

function bindSkillRows() {
  $$('[data-skill-key]').forEach(row => row.querySelectorAll('[data-f]').forEach(element => {
    element.oninput = () => {
      let skill = skills.find(item => item._key === row.dataset.skillKey);
      if (!skill) {
        skill = mergeGeneralMaster(skills).find(item => item._key === row.dataset.skillKey);
        if (skill) skills.push(skill);
      }
      if (!skill) return;
      const field = element.dataset.f;
      skill[field] = element.type === "checkbox" ? element.checked : element.type === "number" ? Number(element.value) : element.value;
      if (SUITS.includes(field)) {
        skill.level = SUITS.filter(suit => skill[suit]).length;
        renderSkills();
      } else if (field === "level") {
        const level = Math.max(0, Number(element.value || 0));
        skill.level = level;
        SUITS.forEach((suit,index) => skill[suit] = index < Math.min(level,4));
        renderSkills();
      }
      recalc();
      markDirty();
    };
  }));
}

function blankOutfit() {
  return {_key:crypto.randomUUID(),category:"other",name:"",purchase_value:"",experience_cost:0,concealment:"",attack:"",defense:"",range:"",slot:"",control_modifier:0,cs_modifier:0,mundane_modifier:0,description:"",sort_order:outfits.length};
}
function normalizeOutfit(outfit) { return {...blankOutfit(),...outfit,_key:outfit.id || crypto.randomUUID(),experience_cost:Number(outfit.experience_cost || 0)}; }
function renderOutfits() {
  $("#outfit-list").innerHTML = outfits.map(outfit => `<article class="outfit-card" data-outfit-key="${outfit._key}"><label>分類<select data-o="category">${["weapon","armor","cyberware","tron","vehicle","residence","other"].map(value => `<option value="${value}" ${outfit.category === value ? "selected" : ""}>${{weapon:"武器",armor:"防具",cyberware:"サイバーウェア",tron:"トロン",vehicle:"ヴィークル",residence:"住居",other:"その他"}[value]}</option>`).join("")}</select></label><label>名称<input data-o="name" value="${escapeHtml(outfit.name)}"></label><label>購入<input data-o="purchase_value" value="${escapeHtml(outfit.purchase_value)}"></label><label>常備化<input data-o="experience_cost" type="number" value="${outfit.experience_cost}"></label><label>部位<input data-o="slot" value="${escapeHtml(outfit.slot)}"></label><label>解説<input data-o="description" value="${escapeHtml(outfit.description)}"></label><button class="row-delete" data-delete-outfit="${outfit._key}" type="button">×</button></article>`).join("") || "<p>アウトフィット未登録</p>";
  $$('[data-outfit-key]').forEach(card => card.querySelectorAll('[data-o]').forEach(element => {
    element.oninput = () => {
      const outfit = outfits.find(item => item._key === card.dataset.outfitKey);
      outfit[element.dataset.o] = element.type === "number" ? Number(element.value) : element.value;
      recalc();
      markDirty();
    };
  }));
}

function currentValue(id) { return Number($(`#${id}-base`)?.value || 0); }
function finalValue(id) { return currentValue(id) + Number($(`#${id}-mod`)?.value || 0); }
function recalc() {
  for (const [key] of ABILITIES) {
    $(`#${key}-final`).textContent = finalValue(key);
    $(`#${key}-control-final`).textContent = finalValue(`${key}-control`);
  }
  $("#cs-final").textContent = Number($("#cs-base").value || 0) + Number($("#cs-mod").value || 0);
  const exp = calculateExp();
  const total = $("#exp-total");
  const previous = Number(total.textContent || 0);
  total.textContent = exp.total;
  if (previous !== exp.total) {
    total.classList.remove("flash");
    void total.offsetWidth;
    total.classList.add("flash");
  }
  $("#exp-breakdown").innerHTML = Object.entries(exp.parts).map(([label,value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("");
}

function calculateExp() {
  let ability = 0, control = 0, general = 0, style = 0, outfit = 0;
  for (const [key] of ABILITIES) {
    const base = Number(styleBaseline[key] || 0);
    const growth = Math.max(0, currentValue(key) - base);
    for (let i = 1; i <= growth; i++) ability += base + i <= 10 ? 20 : 40;
    const controlKey = `${key}-control`;
    const controlBase = Number(styleBaseline[controlKey] || 0);
    const controlGrowth = Math.max(0, currentValue(controlKey) - controlBase);
    for (let i = 1; i <= controlGrowth; i++) control += controlBase + i <= 16 ? 20 : 40;
  }
  for (const skill of skills) {
    const paidLevel = Math.max(0, Number(skill.level || 0) - Number(skill.free_level || 0));
    if (skill.category === "style") style += paidLevel * ({normal:10,secret:20,ultimate:50}[skill.skill_kind] || 10);
    else general += paidLevel * (skill.skill_kind === "proper" ? 5 : 10);
  }
  const mundane = finalValue("mundane");
  for (const item of outfits) {
    const permanent = Number(item.experience_cost || 0);
    if (permanent > mundane) outfit += permanent;
  }
  return { total: ability + control + general + style + outfit, parts: {能力値:ability,制御値:control,一般技能:general,スタイル技能:style,アウトフィット:outfit} };
}

function openImport(mode) { importMode = mode; $("#tsv-title").textContent = `${mode.toUpperCase()} TSV取込`; $("#tsv-text").value = ""; $("#tsv-dialog").showModal(); }
function parseTSV(text) { const lines = String(text).replace(/\r/g, "").trim().split("\n").filter(Boolean).map(line => line.split("\t")); if (!lines.length) return []; const header = lines.shift().map(value => value.trim()); return lines.map(row => Object.fromEntries(header.map((name,index) => [name,(row[index] || "").replace(/\\n/g,"\n")]))); }
function applyImport() {
  const rows = parseTSV($("#tsv-text").value);
  if (importMode === "skd") {
    for (const row of rows) skills.push({...blankSkill("style"),name:row["名称"] || "",skill_kind:/奥義/.test(row["種別"] || "") ? "ultimate" : /秘技/.test(row["種別"] || "") ? "secret" : "normal",level:Number(row["レベル"] || 1),timing:row["タイミング"] || "",target:row["対象"] || "",range:row["射程"] || "",difficulty:row["目標値"] || "",confrontation:row["対決"] || "",description:row["解説"] || ""});
    renderSkills();
  } else {
    const categoryMap = {weapons:"weapon",armours:"armor",vehicles:"vehicle",residences:"residence",outfits:"other",武器:"weapon",防具:"armor",ヴィークル:"vehicle",住居:"residence",住宅:"residence",装備:"other"};
    for (const row of rows) outfits.push({...blankOutfit(),category:categoryMap[row.target] || "other",name:row.name || "",purchase_value:row.purchase || "",experience_cost:Number(row.permanent || 0),concealment:[row.concealA,row.concealB].filter(Boolean).join("/"),attack:row.attack || "",defense:row.defense || "",range:row.range || "",slot:row.part || row.slot || "",description:row.notes || ""});
    renderOutfits();
  }
  recalc();
  markDirty();
}

function markDirty() {
  if (loading) return;
  dirty = true;
  setStatus("未保存", "unsaved");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveAll(false), 1200);
}

function collectCharacter(includeAttributes = true) {
  const payload = {owner_id:user.id,character_name:$("#character-name").value.trim(),character_kana:$("#character-kana").value.trim(),handle:$("#handle").value.trim(),player_name:$("#player-name").value.trim(),affiliation:$("#affiliation").value.trim(),citizen_rank:$("#citizen-rank").value.trim(),summary:$("#summary").value,profile:$("#profile").value,visibility:$("#visibility").value,experience_points:Number($("#exp-total").textContent || 0)};
  for (let i = 1; i <= 3; i++) {
    const style = STYLE_DATA.find(item => item.name === $(`#style-${i}`).value);
    payload[`style_${i}`] = $(`#style-${i}`).value;
    payload[`style_${i}_mark`] = $(`#style-${i}-mark`].value;
    if (includeAttributes) payload[`style_${i}_attribute`] = $(`#style-${i}-attribute`)?.value || "";
    payload[`divine_${i}`] = style?.divine || "";
    payload[`divine_${i}_yomi`] = style?.divineYomi || style?.divine || "";
  }
  for (const [key] of ABILITIES) {
    payload[`${key}_base`] = currentValue(key);
    payload[`${key}_growth`] = Math.max(0, currentValue(key) - Number(styleBaseline[key] || 0));
    payload[`${key}_gear`] = Number($(`#${key}-mod`).value || 0);
    payload[`${key}_manual`] = 0;
    payload[`${key}_value`] = finalValue(key);
    const controlKey = `${key}-control`;
    payload[`${key}_control_base`] = currentValue(controlKey);
    payload[`${key}_control_growth`] = Math.max(0, currentValue(controlKey) - Number(styleBaseline[controlKey] || 0));
    payload[`${key}_control_gear`] = Number($(`#${controlKey}-mod`).value || 0);
    payload[`${key}_control_manual`] = 0;
    payload[`${key}_control`] = finalValue(controlKey);
  }
  payload.cs_base = Number($("#cs-base").value || 0);
  payload.cs_gear = Number($("#cs-mod").value || 0);
  payload.cs_manual = 0;
  payload.cs = payload.cs_base + payload.cs_gear;
  return payload;
}

async function saveCharacter(payload) {
  return character?.id
    ? supabase.from("characters").update(payload).eq("id", character.id).eq("owner_id", user.id).select("*").single()
    : supabase.from("characters").insert(payload).select("*").single();
}

async function saveAll(force) {
  if (saving) { pendingSave = true; return; }
  if (!dirty && force) { setStatus("保存済み", "saved"); pulseSaveButton("saved"); return; }
  if (!$("#character-name").value.trim() || !$("#player-name").value.trim()) {
    if (force) setStatus("キャスト名とプレイヤー名を入力してください。", "error");
    return;
  }

  saving = true;
  setStatus("保存中…", "saving");
  pulseSaveButton("saving");
  try {
    let result = await saveCharacter(collectCharacter(true));
    if (result.error && /style_[123]_attribute|schema cache/i.test(result.error.message || "")) result = await saveCharacter(collectCharacter(false));
    if (result.error) throw result.error;
    character = result.data;

    let operation = await supabase.from("character_skills").delete().eq("character_id", character.id);
    if (operation.error) throw operation.error;
    operation = await supabase.from("character_outfits").delete().eq("character_id", character.id);
    if (operation.error) throw operation.error;

    const skillRows = skills.filter(skill => Number(skill.level) > 0 && skill.name.trim()).map((skill,index) => ({character_id:character.id,category:skill.category,name:skill.name,level:Number(skill.level || 0),free_level:Number(skill.free_level || 0),skill_kind:skill.skill_kind,reason:!!skill.reason,passion:!!skill.passion,life:!!skill.life,mundane:!!skill.mundane,timing:skill.timing || "",target:skill.target || "",range:skill.range || "",difficulty:skill.difficulty || "",confrontation:skill.confrontation || "",description:skill.description || "",sort_order:index}));
    if (skillRows.length) { operation = await supabase.from("character_skills").insert(skillRows); if (operation.error) throw operation.error; }

    const outfitRows = outfits.filter(outfit => outfit.name.trim()).map((outfit,index) => ({character_id:character.id,category:outfit.category,name:outfit.name,purchase_value:outfit.purchase_value || "",experience_cost:Number(outfit.experience_cost || 0),concealment:outfit.concealment || "",attack:outfit.attack || "",defense:outfit.defense || "",range:outfit.range || "",slot:outfit.slot || "",description:outfit.description || "",control_modifier:Number(outfit.control_modifier || 0),cs_modifier:Number(outfit.cs_modifier || 0),mundane_modifier:Number(outfit.mundane_modifier || 0),sort_order:index}));
    if (outfitRows.length) { operation = await supabase.from("character_outfits").insert(outfitRows); if (operation.error) throw operation.error; }

    history.replaceState(null, "", `${SITE_BASE_PATH}sheet.html?id=${encodeURIComponent(character.public_id)}`);
    dirty = false;
    setStatus("保存済み", "saved");
    pulseSaveButton("saved");
  } catch (error) {
    console.error(error);
    dirty = true;
    setStatus(toJapaneseError(error.message), "error");
    pulseSaveButton("error");
  } finally {
    saving = false;
    if (pendingSave) { pendingSave = false; saveAll(false); }
  }
}

function toJapaneseError(message = "") {
  if (/characters_visibility_check/i.test(message)) return "公開状態を保存できません。Supabaseの公開状態制約を更新してください。";
  if (/duplicate key/i.test(message)) return "同じデータが既に登録されています。";
  if (/row-level security|RLS/i.test(message)) return "保存権限がありません。ログイン状態とSupabaseのRLS設定を確認してください。";
  if (/schema cache/i.test(message)) return "データベース項目を確認できません。Supabaseのスキーマを再読み込みしてください。";
  if (/network|fetch/i.test(message)) return "通信に失敗しました。ネットワーク接続を確認してください。";
  return message ? `保存に失敗しました：${message}` : "保存に失敗しました。";
}

function pulseSaveButton(state) {
  const button = $("#save-button");
  button.classList.remove("is-saving", "is-saved", "is-error");
  void button.offsetWidth;
  button.classList.add(state === "saving" ? "is-saving" : state === "saved" ? "is-saved" : "is-error");
}
function setStatus(text, state = "") { const status = $("#save-status"); status.textContent = text; status.className = state; }
