import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js";
import { STYLE_DATA, UTSUWA_ATTRIBUTES } from "./style-data.js";
import { SITE_BASE_PATH } from "./config.js";

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const SUITS = ["reason","passion","life","mundane"];
const MARKS = ["♠","♣","♥","♦"];
const ABILITIES = [["reason","理性","REASON"],["passion","感情","PASSION"],["life","生命","LIFE"],["mundane","外界","MUNDANE"]];
const GENERAL_MASTER = [
  ["医療","reason","general"],["射撃","reason","general"],["知覚","reason","general"],["電脳","reason","general"],["製作：","reason","proper"],
  ["心理","passion","general"],["自我","passion","general"],["交渉","passion","general"],["芸術：","passion","proper"],
  ["運動","life","general"],["回避","life","general"],["白兵","life","general"],["操縦：","life","proper"],
  ["信用","mundane","general"],["圧力","mundane","general"],["隠密","mundane","general"]
];
const OUTFIT_LABELS = {weapon:"武器",armor:"防具",cyberware:"サイバーウェア",tron:"トロン",vehicle:"ヴィークル",residence:"住居",other:"その他"};
let user, character = null, skills = [], outfits = [], loading = false, dirty = false, saving = false, pending = false, saveTimer, importMode = "";
const styleBaseline = {};
const generalMasterPlaceholders = new Map();

init();

async function init(){
  user = await requireAuth();
  if(!user) return;
  renderStyles();
  renderAbilities();
  bind();
  const id = new URLSearchParams(location.search).get("id");
  if(id) await loadCharacter(id); else createNew();
}

function bind(){
  document.addEventListener("input", onEdit);
  document.addEventListener("change", onEdit);
  document.addEventListener("click", event => {
    const toggle = event.target.closest(".section-toggle");
    if(toggle){ toggle.closest(".sheet-section")?.classList.toggle("is-open"); return; }
    const deleteSkill = event.target.closest("[data-delete-skill]");
    if(deleteSkill){ skills = skills.filter(item => item._key !== deleteSkill.dataset.deleteSkill); renderSkills(); recalc(); markDirty(); return; }
    const deleteOutfit = event.target.closest("[data-delete-outfit]");
    if(deleteOutfit){ outfits = outfits.filter(item => item._key !== deleteOutfit.dataset.deleteOutfit); renderOutfits(); recalc(); markDirty(); }
  });
  $("#save-button").onclick = () => saveAll(true);
  $("#add-general").onclick = () => addSkill("general", "proper", "");
  $("#add-social").onclick = () => addSkill("social", "proper", "社会：");
  $("#add-connection").onclick = () => addSkill("connection", "proper", "コネ：");
  $("#add-style-skill").onclick = () => addSkill("style", "normal", "");
  $("#add-outfit").onclick = () => { outfits.push(blankOutfit()); renderOutfits(); markDirty(); };
  $("#import-skd").onclick = () => openImport("skd");
  $("#import-ofc").onclick = () => openImport("ofc");
  $("#tsv-apply").onclick = event => { event.preventDefault(); applyImport(); $("#tsv-dialog").close(); };
}

function onEdit(event){ if(loading || !event.target.matches("input,select,textarea")) return; recalc(); markDirty(); }
function addSkill(category, kind, name){ skills.push({...blankSkill(category), skill_kind:kind, name}); renderSkills(); recalc(); markDirty(); }

function createNew(){
  loading = true;
  character = {visibility:"private"};
  $("#visibility").value = "private";
  skills = GENERAL_MASTER.filter(item => item[2] === "general").map(([name,suit]) => ({...blankSkill("general"),name,level:1,free_level:0,[suit]:true,skill_kind:"general"}));
  skills.push(
    {...blankSkill("social"),name:"社会：N◎VA",level:1,free_level:0,skill_kind:"proper"},
    {...blankSkill("social"),name:"社会：",level:1,free_level:0,skill_kind:"proper"},
    {...blankSkill("social"),name:"社会：",level:1,free_level:0,skill_kind:"proper"},
    {...blankSkill("social"),name:"社会：",level:1,free_level:0,skill_kind:"proper"},
    {...blankSkill("connection"),name:"コネ：",level:1,free_level:0,skill_kind:"proper"},
    {...blankSkill("connection"),name:"コネ：",level:1,free_level:0,skill_kind:"proper"},
    {...blankSkill("connection"),name:"コネ：",level:1,free_level:0,skill_kind:"proper"}
  );
  renderSkills(); renderOutfits(); recalc();
  loading = false; dirty = true; setStatus("未保存","unsaved");
}

async function loadCharacter(publicId){
  loading = true; setStatus("読込中…","saving");
  const {data,error} = await supabase.from("characters").select("*").eq("public_id",publicId).eq("owner_id",user.id).maybeSingle();
  if(error || !data){ setStatus(jpError(error?.message || "キャストを読み込めませんでした。"),"error"); loading = false; return; }
  character = data; fillCharacter(data);
  const [skillResult,outfitResult] = await Promise.all([
    supabase.from("character_skills").select("*").eq("character_id",data.id).order("sort_order"),
    supabase.from("character_outfits").select("*").eq("character_id",data.id).order("sort_order")
  ]);
  skills = (skillResult.data || []).map(normalizeSkill);
  outfits = (outfitResult.data || []).map(normalizeOutfit);
  renderSkills(); renderOutfits(); recalc();
  loading = false; dirty = false; setStatus("保存済み","saved");
}

function fillCharacter(data){
  ["character_name","character_kana","handle","player_name","affiliation","citizen_rank","summary","profile"].forEach(name => { const element = $("#" + name.replaceAll("_","-")); if(element) element.value = data[name] ?? ""; });
  $("#visibility").value = data.visibility === "public" ? "public" : "private";
  for(let i=1;i<=3;i++){
    $(`#style-${i}`).value = data[`style_${i}`] || "";
    $(`#style-${i}-mark`).value = data[`style_${i}_mark`] || "";
    const attribute = $(`#style-${i}-attribute`); if(attribute) attribute.value = data[`style_${i}_attribute`] || "";
    toggleAttribute(i);
  }
  calculateBaselines();
  for(const [key] of ABILITIES){
    $(`#${key}-base`).value = Number(data[`${key}_base`] ?? data[`${key}_value`] ?? styleBaseline[key] ?? 0);
    $(`#${key}-mod`).value = Number(data[`${key}_gear`] || 0) + Number(data[`${key}_manual`] || 0);
    const controlKey = `${key}-control`;
    $(`#${controlKey}-base`).value = Number(data[`${key}_control_base`] ?? data[`${key}_control`] ?? styleBaseline[controlKey] ?? 0);
    $(`#${controlKey}-mod`).value = Number(data[`${key}_control_gear`] || 0) + Number(data[`${key}_control_manual`] || 0);
  }
  $("#cs-base").value = data.cs_base ?? data.cs ?? 0;
  $("#cs-mod").value = Number(data.cs_gear || 0) + Number(data.cs_manual || 0);
  updateDivines(false);
}

function renderStyles(){
  const options = '<option value="">選択</option>' + STYLE_DATA.map(item => `<option>${esc(item.name)}</option>`).join("");
  const attributes = '<option value="">属性を選択</option>' + UTSUWA_ATTRIBUTES.map(item => `<option>${esc(item.name)}</option>`).join("");
  $("#style-grid").innerHTML = [1,2,3].map(i => `<article class="style-card"><div class="style-fields"><label>スタイル<select id="style-${i}">${options}</select></label><label>指定<select id="style-${i}-mark"><option value="">無印</option><option>◎</option><option>●</option><option>◎●</option></select></label><label id="style-${i}-attribute-wrap" hidden>ウツワ属性<select id="style-${i}-attribute">${attributes}</select></label></div><section class="divine-field"><ruby><strong id="divine-${i}">未選択</strong><rt id="divine-${i}-yomi"></rt></ruby><span>神業</span></section></article>`).join("");
  $("#style-grid").addEventListener("change", event => { if(!event.target.matches('[id^="style-"]')) return; for(let i=1;i<=3;i++) toggleAttribute(i); updateDivines(true); });
}
function toggleAttribute(i){ const wrap=$(`#style-${i}-attribute-wrap`), select=$(`#style-${i}-attribute`); if(!wrap||!select)return; const enabled=$(`#style-${i}`).value==="ウツワ"; wrap.hidden=!enabled; if(!enabled)select.value=""; }
function styleRecord(i){ const name=$(`#style-${i}`).value; return name==="ウツワ" ? UTSUWA_ATTRIBUTES.find(item=>item.name===$(`#style-${i}-attribute`).value)||null : STYLE_DATA.find(item=>item.name===name)||null; }
function calculateBaselines(){ for(const [key] of ABILITIES){ styleBaseline[key]=0; styleBaseline[`${key}-control`]=0; } for(let i=1;i<=3;i++){ const record=styleRecord(i); if(!record)continue; for(const [key] of ABILITIES){ styleBaseline[key]+=Number(record[key]?.[0]||0); styleBaseline[`${key}-control`]+=Number(record[key]?.[1]||0); } } }
function updateDivines(apply){ for(let i=1;i<=3;i++){ const style=STYLE_DATA.find(item=>item.name===$(`#style-${i}`).value); $(`#divine-${i}`).textContent=style?.divine||"未選択"; $(`#divine-${i}-yomi`).textContent=style?.divineYomi||style?.divine||""; } $("#style-warning").textContent=[1,2,3].filter(i=>$(`#style-${i}`).value).length===3?"":"3枠すべてのスタイルを選択してください。"; if(!apply||loading)return; const old={...styleBaseline}; calculateBaselines(); for(const [key] of ABILITIES){ adjustBaseline(key,old[key]||0,styleBaseline[key]||0); adjustBaseline(`${key}-control`,old[`${key}-control`]||0,styleBaseline[`${key}-control`]||0); } recalc(); }
function adjustBaseline(id,oldBase,newBase){ const element=$(`#${id}-base`); if(element&&(Number(element.value||0)===oldBase||Number(element.value||0)===0))element.value=newBase; }
function renderAbilities(){ $("#ability-grid").innerHTML=ABILITIES.map(([key,jp,en])=>`<article class="ability-card ability-matrix"><h3>${jp} <small>${en}</small></h3><div class="ability-matrix__header"><span></span><strong>能力値</strong><strong>制御値</strong></div><div class="ability-matrix__row"><span>現在値</span><input id="${key}-base" type="number" min="0" value="0"><input id="${key}-control-base" type="number" min="0" value="0"></div><div class="ability-matrix__row"><span>補正値</span><input id="${key}-mod" type="number" value="0"><input id="${key}-control-mod" type="number" value="0"></div><div class="ability-matrix__row ability-matrix__result"><span>最終値</span><strong id="${key}-final">0</strong><strong id="${key}-control-final">0</strong></div></article>`).join("")+`<article class="ability-card ability-card--cs"><h3>CS</h3><div class="cs-row"><label>現在値<input id="cs-base" type="number" value="0"></label><label>補正値<input id="cs-mod" type="number" value="0"></label><strong id="cs-final">0</strong></div></article>`; }

function blankSkill(category){ return {_key:crypto.randomUUID(),category,name:"",level:1,free_level:0,skill_kind:category==="style"?"normal":category==="general"?"general":"proper",reason:false,passion:false,life:false,mundane:false,timing:"",target:"",range:"",difficulty:"",confrontation:"",description:"",sort_order:skills.length}; }
function normalizeSkill(skill){ const result={...blankSkill(skill.category),...skill,_key:skill.id||crypto.randomUUID(),free_level:0,skill_kind:skill.skill_kind||inferKind(skill)}; if(result.name==="初期取得")result.name=result.category==="connection"?"コネ：":"社会："; if(result.name==="社会：初期取得")result.name="社会："; if(result.name==="コネ：初期取得")result.name="コネ："; return result; }
function inferKind(skill){ if(skill.category==="style")return /奥義/.test(skill.type||"")?"ultimate":/秘技/.test(skill.type||"")?"secret":"normal"; return String(skill.name||"").includes("：")?"proper":"general"; }
function generalMasterPlaceholder(name,suit,kind){
  let skill=generalMasterPlaceholders.get(name);
  const reusable=skill&&!skills.includes(skill)&&skill.name===name&&Number(skill.level||0)===0&&!SUITS.some(key=>skill[key]);
  if(!reusable){
    skill={...blankSkill("general"),name,level:0,skill_kind:kind,[suit]:false,_master:true};
    generalMasterPlaceholders.set(name,skill);
  }
  return skill;
}
function mergedGeneral(){ const output=[...skills.filter(item=>item.category==="general")]; for(const [name,suit,kind] of GENERAL_MASTER)if(!output.some(item=>item.name===name))output.push(generalMasterPlaceholder(name,suit,kind)); return output.sort((a,b)=>{ const ai=GENERAL_MASTER.findIndex(item=>item[0]===a.name),bi=GENERAL_MASTER.findIndex(item=>item[0]===b.name); if(ai<0&&bi<0)return 0; if(ai<0)return 1; if(bi<0)return-1; return ai-bi; }); }
function renderSkills(){ $("#general-skills").innerHTML=[skillTable("一般技能","GENERAL SKILLS",mergedGeneral(),false),skillTable("社会","SOCIAL",skills.filter(item=>item.category==="social"),false),skillTable("コネクション","CONNECTIONS",skills.filter(item=>item.category==="connection"),false)].join(""); $("#style-skills").innerHTML=skillTable("スタイル技能","STYLE SKILLS",skills.filter(item=>item.category==="style"),true); bindSkillRows(); }
function skillTable(jp,en,rows,detail){ if(!rows.length)return""; return `<section class="skill-group"><h3 class="skill-group-title">${jp} <small>${en}</small></h3><table class="skill-table ${detail?"has-detail":"no-detail"}"><thead><tr><th class="name-col">名称</th><th class="type-col">種別</th><th class="lv-col">LV</th>${MARKS.map(mark=>`<th class="suit-col">${mark}</th>`).join("")}${detail?"<th>詳細</th>":""}<th></th></tr></thead><tbody>${rows.map(item=>skillRow(item,detail)).join("")}</tbody></table></section>`; }
function skillRow(skill,detail){
  let kinds;
  if(skill.category==="style") kinds=["normal","secret","ultimate"];
  else if(skill.category==="general") kinds=["general","proper"];
  else kinds=["proper"];
  const labels={general:"一般",proper:"固有名詞",normal:"通常",secret:"秘技",ultimate:"奥義"};
  return `<tr data-skill-key="${skill._key}"><td><input data-f="name" value="${esc(skill.name)}"></td><td><select data-f="skill_kind">${kinds.map(value=>`<option value="${value}" ${skill.skill_kind===value?"selected":""}>${labels[value]}</option>`).join("")}</select></td><td><input data-f="level" type="number" min="0" value="${Number(skill.level)||0}"></td>${SUITS.map((suit,index)=>`<td class="suit-cell"><label class="suit-check"><input data-f="${suit}" type="checkbox" ${skill[suit]?"checked":""}><span>${MARKS[index]}</span></label></td>`).join("")}${detail?`<td><textarea data-f="description" rows="2">${esc(skill.description||skill.timing||"")}</textarea></td>`:""}<td><button class="row-delete" data-delete-skill="${skill._key}" type="button">×</button></td></tr>`;
}
function bindSkillRows(){
  $$('[data-skill-key]').forEach(row=>row.querySelectorAll('[data-f]').forEach(element=>element.oninput=()=>{
    let skill=skills.find(item=>item._key===row.dataset.skillKey);
    if(!skill){
      skill=mergedGeneral().find(item=>item._key===row.dataset.skillKey);
      if(skill)skills.push(skill);
    }
    if(!skill)return;
    const field=element.dataset.f;
    skill[field]=element.type==="checkbox"?element.checked:element.type==="number"?Number(element.value):element.value;
    if(SUITS.includes(field)){
      const suitCount=SUITS.filter(suit=>skill[suit]).length;
      skill.level=Math.max(Number(skill.level||0),suitCount);
      const levelInput=row.querySelector('[data-f="level"]');
      if(levelInput)levelInput.value=String(skill.level);
    }else if(field==="level"){
      const level=Math.max(0,Number(element.value||0));
      skill.level=level;
      element.value=String(level);
    }
    recalc();
    markDirty();
  }));
}

function blankOutfit(){ return {_key:crypto.randomUUID(),category:"other",name:"",purchase_value:"",experience_cost:0,concealment:"",attack:"",defense:"",range:"",slot:"",control_modifier:0,cs_modifier:0,mundane_modifier:0,description:"",sort_order:outfits.length}; }
function normalizeOutfit(outfit){ return {...blankOutfit(),...outfit,_key:outfit.id||crypto.randomUUID(),experience_cost:Number(outfit.experience_cost||0)}; }
function outfitFields(outfit){
  const common=`<label>名称<input data-o="name" value="${esc(outfit.name)}"></label><label>購入<input data-o="purchase_value" value="${esc(outfit.purchase_value)}"></label><label>常備化<input data-o="experience_cost" type="number" value="${outfit.experience_cost}"></label>`;
  const description=`<label class="outfit-description">解説<input data-o="description" value="${esc(outfit.description)}"></label>`;
  if(outfit.category==="weapon")return common+`<label>隠匿<input data-o="concealment" value="${esc(outfit.concealment)}"></label><label>攻撃<input data-o="attack" value="${esc(outfit.attack)}"></label><label>射程<input data-o="range" value="${esc(outfit.range)}"></label><label>部位<input data-o="slot" value="${esc(outfit.slot)}"></label>`+description;
  if(outfit.category==="armor")return common+`<label>隠匿<input data-o="concealment" value="${esc(outfit.concealment)}"></label><label>防御<input data-o="defense" value="${esc(outfit.defense)}"></label><label>部位<input data-o="slot" value="${esc(outfit.slot)}"></label>`+description;
  if(outfit.category==="vehicle")return common+`<label>攻撃<input data-o="attack" value="${esc(outfit.attack)}"></label><label>防御<input data-o="defense" value="${esc(outfit.defense)}"></label><label>制御<input data-o="control_modifier" type="number" value="${outfit.control_modifier}"></label><label>CS<input data-o="cs_modifier" type="number" value="${outfit.cs_modifier}"></label>`+description;
  if(outfit.category==="residence")return common+`<label>外界<input data-o="mundane_modifier" type="number" value="${outfit.mundane_modifier}"></label><label>部位／エリア<input data-o="slot" value="${esc(outfit.slot)}"></label>`+description;
  return common+`<label>隠匿<input data-o="concealment" value="${esc(outfit.concealment)}"></label><label>部位<input data-o="slot" value="${esc(outfit.slot)}"></label><label>制御<input data-o="control_modifier" type="number" value="${outfit.control_modifier}"></label><label>CS<input data-o="cs_modifier" type="number" value="${outfit.cs_modifier}"></label><label>外界<input data-o="mundane_modifier" type="number" value="${outfit.mundane_modifier}"></label>`+description;
}
function renderOutfits(){ $("#outfit-list").innerHTML=outfits.map(outfit=>`<article class="outfit-card outfit-form" data-outfit-key="${outfit._key}"><header><label>分類<select data-o="category">${Object.entries(OUTFIT_LABELS).map(([value,label])=>`<option value="${value}" ${outfit.category===value?"selected":""}>${label}</option>`).join("")}</select></label><button class="row-delete" data-delete-outfit="${outfit._key}" type="button">×</button></header><div class="outfit-fields">${outfitFields(outfit)}</div></article>`).join("")||"<p>アウトフィット未登録</p>"; $$('[data-outfit-key]').forEach(card=>card.querySelectorAll('[data-o]').forEach(element=>element.oninput=()=>{ const outfit=outfits.find(item=>item._key===card.dataset.outfitKey); outfit[element.dataset.o]=element.type==="number"?Number(element.value):element.value; if(element.dataset.o==="category")renderOutfits(); recalc(); markDirty(); })); }

function current(id){ return Number($(`#${id}-base`)?.value||0); }
function final(id){ return current(id)+Number($(`#${id}-mod`)?.value||0); }
function recalc(){
  for(const [key] of ABILITIES){
    $(`#${key}-final`).textContent=final(key);
    $(`#${key}-control-final`).textContent=final(`${key}-control`);
  }
  $("#cs-final").textContent=Number($("#cs-base").value||0)+Number($("#cs-mod").value||0);
  window.TNXExperience?.queue?.();
}
function markDirty(){ if(loading)return; dirty=true; setStatus("未保存","unsaved"); clearTimeout(saveTimer); saveTimer=setTimeout(()=>saveAll(false),1200); }
function collect(includeAttribute=true){
  const experience=window.TNXExperience?.calculate?.();
  const payload={owner_id:user.id,character_name:$("#character-name").value.trim(),character_kana:$("#character-kana").value.trim(),handle:$("#handle").value.trim(),player_name:$("#player-name").value.trim(),affiliation:$("#affiliation").value.trim(),citizen_rank:$("#citizen-rank").value.trim(),summary:$("#summary").value,profile:$("#profile").value,visibility:$("#visibility").value,experience_points:Number(experience?.total ?? $("#exp-total").textContent ?? 0)};
  for(let i=1;i<=3;i++){ const style=STYLE_DATA.find(item=>item.name===$(`#style-${i}`).value); payload[`style_${i}`]=$(`#style-${i}`).value; payload[`style_${i}_mark`]=$(`#style-${i}-mark`).value; if(includeAttribute)payload[`style_${i}_attribute`]=$(`#style-${i}-attribute`)?.value||""; payload[`divine_${i}`]=style?.divine||""; payload[`divine_${i}_yomi`]=style?.divineYomi||style?.divine||""; }
  for(const [key] of ABILITIES){ payload[`${key}_base`]=current(key); payload[`${key}_growth`]=Math.max(0,current(key)-Number(styleBaseline[key]||0)); payload[`${key}_gear`]=Number($(`#${key}-mod`).value||0); payload[`${key}_manual`]=0; payload[`${key}_value`]=final(key); const controlKey=`${key}-control`; payload[`${key}_control_base`]=current(controlKey); payload[`${key}_control_growth`]=Math.max(0,current(controlKey)-Number(styleBaseline[controlKey]||0)); payload[`${key}_control_gear`]=Number($(`#${controlKey}-mod`).value||0); payload[`${key}_control_manual`]=0; payload[`${key}_control`]=final(controlKey); }
  payload.cs_base=Number($("#cs-base").value||0); payload.cs_gear=Number($("#cs-mod").value||0); payload.cs_manual=0; payload.cs=payload.cs_base+payload.cs_gear; return payload;
}
async function saveCharacter(payload){ return character?.id?supabase.from("characters").update(payload).eq("id",character.id).eq("owner_id",user.id).select("*").single():supabase.from("characters").insert(payload).select("*").single(); }
async function saveAll(force){ if(saving){pending=true;return;} if(!dirty&&force){setStatus("保存済み","saved");pulse("saved");return;} if(!$("#character-name").value.trim()||!$("#player-name").value.trim()){if(force)setStatus("キャスト名とプレイヤー名を入力してください。","error");return;} saving=true;setStatus("保存中…","saving");pulse("saving"); try{ let result=await saveCharacter(collect(true)); if(result.error&&/style_[123]_attribute|schema cache/i.test(result.error.message||""))result=await saveCharacter(collect(false)); if(result.error)throw result.error; character=result.data; let operation=await supabase.from("character_skills").delete().eq("character_id",character.id); if(operation.error)throw operation.error; operation=await supabase.from("character_outfits").delete().eq("character_id",character.id); if(operation.error)throw operation.error; const skillRows=skills.filter(item=>Number(item.level)>0&&item.name.trim()).map((item,index)=>({character_id:character.id,category:item.category,name:item.name,level:Number(item.level||0),free_level:0,skill_kind:item.skill_kind,reason:!!item.reason,passion:!!item.passion,life:!!item.life,mundane:!!item.mundane,timing:item.timing||"",target:item.target||"",range:item.range||"",difficulty:item.difficulty||"",confrontation:item.confrontation||"",description:item.description||"",sort_order:index})); if(skillRows.length){operation=await supabase.from("character_skills").insert(skillRows);if(operation.error)throw operation.error;} const outfitRows=outfits.filter(item=>item.name.trim()).map((item,index)=>({character_id:character.id,category:item.category,name:item.name,purchase_value:item.purchase_value||"",experience_cost:Number(item.experience_cost||0),concealment:item.concealment||"",attack:item.attack||"",defense:item.defense||"",range:item.range||"",slot:item.slot||"",description:item.description||"",control_modifier:Number(item.control_modifier||0),cs_modifier:Number(item.cs_modifier||0),mundane_modifier:Number(item.mundane_modifier||0),sort_order:index})); if(outfitRows.length){operation=await supabase.from("character_outfits").insert(outfitRows);if(operation.error)throw operation.error;} history.replaceState(null,"",`${SITE_BASE_PATH}sheet.html?id=${encodeURIComponent(character.public_id)}`); dirty=false;setStatus("保存済み","saved");pulse("saved"); }catch(error){console.error(error);dirty=true;setStatus(jpError(error.message),"error");pulse("error");}finally{saving=false;if(pending){pending=false;saveAll(false);}} }
function openImport(mode){ importMode=mode; $("#tsv-title").textContent=`${mode.toUpperCase()} TSV取込`; $("#tsv-text").value=""; $("#tsv-dialog").showModal(); }
function parseTSV(text){ const lines=String(text).replace(/\r/g,"").trim().split("\n").filter(Boolean).map(line=>line.split("\t")); if(!lines.length)return[]; const header=lines.shift().map(value=>value.trim()); return lines.map(row=>Object.fromEntries(header.map((name,index)=>[name,(row[index]||"").replace(/\\n/g,"\n")]))); }
function applyImport(){ const rows=parseTSV($("#tsv-text").value); if(importMode==="skd"){ for(const row of rows)skills.push({...blankSkill("style"),name:row["名称"]||"",skill_kind:/奥義/.test(row["種別"]||"")?"ultimate":/秘技/.test(row["種別"]||"")?"secret":"normal",level:Number(row["レベル"]||1),description:row["解説"]||""}); renderSkills(); }else{ const map={weapons:"weapon",armours:"armor",vehicles:"vehicle",residences:"residence",outfits:"other",武器:"weapon",防具:"armor",ヴィークル:"vehicle",住居:"residence",住宅:"residence",装備:"other"}; for(const row of rows)outfits.push({...blankOutfit(),category:map[row.target]||"other",name:row.name||"",purchase_value:row.purchase||"",experience_cost:Number(row.permanent||0),concealment:[row.concealA,row.concealB].filter(Boolean).join("/"),attack:row.attack||"",defense:row.defense||"",range:row.range||"",slot:row.part||row.slot||"",description:row.notes||""}); renderOutfits(); } recalc();markDirty(); }
function jpError(message=""){ if(/characters_visibility_check/i.test(message))return"公開状態を保存できません。Supabaseの公開状態制約を更新してください。"; if(/row-level security|RLS/i.test(message))return"保存権限がありません。ログイン状態を確認してください。"; if(/schema cache/i.test(message))return"データベース項目を確認できません。Supabaseのスキーマを再読み込みしてください。"; if(/network|fetch/i.test(message))return"通信に失敗しました。ネットワーク接続を確認してください。"; return message?`保存に失敗しました：${message}`:"保存に失敗しました。"; }
function pulse(state){ const button=$("#save-button");button.classList.remove("is-saving","is-saved","is-error");void button.offsetWidth;button.classList.add(state==="saving"?"is-saving":state==="saved"?"is-saved":"is-error"); }
function setStatus(text,state=""){ const element=$("#save-status");element.textContent=text;element.className=state; }
