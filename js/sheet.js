import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js";
import { STYLE_DATA, UTSUWA_ATTRIBUTES } from "./style-data.js";
import { SITE_BASE_PATH } from "./config.js";

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const SUITS = ["reason","passion","life","mundane"];
const SUIT_MARKS = ["♠","♣","♥","♦"];
const ABILITIES = [["reason","理性","REASON"],["passion","感情","PASSION"],["life","生命","LIFE"],["mundane","外界","MUNDANE"]];
const FIXED_GENERAL = [["医療","reason"],["射撃","reason"],["知覚","reason"],["電脳","reason"],["心理","passion"],["自我","passion"],["交渉","passion"],["運動","life"],["回避","life"],["白兵","life"],["信用","mundane"],["圧力","mundane"],["隠密","mundane"]];

let user, character = null, skills = [], outfits = [], showAllGeneral = true;
let saveTimer, saving = false, pending = false, importMode = "", loading = false, dirty = false;
const paidGrowth = {};
const styleBaseline = {};

init();

async function init(){
  user = await requireAuth();
  if(!user) return;
  renderStyles();
  renderAbilities();
  bind();
  const id = new URLSearchParams(location.search).get("id");
  if(id) await loadCharacter(id); else createNewState();
}

function bind(){
  document.addEventListener("input", onEdit);
  document.addEventListener("change", onEdit);
  document.addEventListener("click", event => {
    const toggle = event.target.closest(".section-toggle");
    if(toggle){ toggle.closest(".sheet-section")?.classList.toggle("is-open"); return; }
    const sd = event.target.closest("[data-delete-skill]");
    if(sd){ skills = skills.filter(x => x._key !== sd.dataset.deleteSkill); renderSkills(); recalc(); markDirty(); return; }
    const od = event.target.closest("[data-delete-outfit]");
    if(od){ outfits = outfits.filter(x => x._key !== od.dataset.deleteOutfit); renderOutfits(); recalc(); markDirty(); }
  });
  $("#save-button").addEventListener("click", () => saveAll(true));
  $("#toggle-general").addEventListener("click", () => { showAllGeneral = !showAllGeneral; $("#toggle-general").textContent = showAllGeneral ? "取得済みのみ表示" : "全技能表示"; renderSkills(); });
  $("#add-general").addEventListener("click", () => { skills.push(blankSkill("general")); renderSkills(); markDirty(); });
  $("#add-style-skill").addEventListener("click", () => { skills.push(blankSkill("style")); renderSkills(); markDirty(); });
  $("#add-outfit").addEventListener("click", () => { outfits.push(blankOutfit()); renderOutfits(); markDirty(); });
  $("#import-skd").addEventListener("click", () => openImport("skd"));
  $("#import-ofc").addEventListener("click", () => openImport("ofc"));
  $("#tsv-apply").addEventListener("click", event => { event.preventDefault(); applyImport(); $("#tsv-dialog").close(); });
}

function onEdit(event){
  if(!event.target.matches("input,select,textarea") || loading) return;
  if(event.target.matches("[data-current-value]")) updatePaidGrowth(event.target);
  recalc();
  markDirty();
}

function createNewState(){
  loading = true;
  character = { visibility:"draft" };
  $("#visibility").value = "draft";
  skills = FIXED_GENERAL.map(([name,suit]) => ({...blankSkill("general"),name,level:1,free_level:1,[suit]:true,skill_kind:"general"}));
  skills.push({...blankSkill("social"),name:"社会：N◎VA",level:1,free_level:1,skill_kind:"proper"});
  skills.push({...blankSkill("social"),name:"社会：初期取得",level:1,free_level:1,skill_kind:"proper"});
  skills.push({...blankSkill("connection"),name:"コネ：初期取得",level:1,free_level:1,skill_kind:"proper"});
  skills.push({...blankSkill("connection"),name:"コネ：初期取得",level:1,free_level:1,skill_kind:"proper"});
  renderSkills(); renderOutfits(); recalc();
  loading = false; dirty = true; setStatus("未保存","unsaved");
}

async function loadCharacter(publicId){
  loading = true; setStatus("読込中…","saving");
  const {data,error} = await supabase.from("characters").select("*").eq("public_id",publicId).eq("owner_id",user.id).maybeSingle();
  if(error || !data){ setStatus(error?.message || "読込失敗","error"); loading = false; return; }
  character = data; fillCharacter(data);
  const [s,o] = await Promise.all([
    supabase.from("character_skills").select("*").eq("character_id",data.id).order("sort_order"),
    supabase.from("character_outfits").select("*").eq("character_id",data.id).order("sort_order")
  ]);
  if(s.error) console.error(s.error); if(o.error) console.error(o.error);
  skills = (s.data || []).map(normalizeSkill); outfits = (o.data || []).map(normalizeOutfit);
  renderSkills(); renderOutfits(); recalc();
  loading = false; dirty = false; setStatus("保存済み","saved");
}

function fillCharacter(d){
  ["character_name","character_kana","handle","player_name","affiliation","citizen_rank","summary","profile","visibility"].forEach(n => { const el = $("#" + n.replaceAll("_","-")); if(el) el.value = d[n] ?? ""; });
  for(let i=1;i<=3;i++){
    $(`#style-${i}`).value = d[`style_${i}`] || "";
    $(`#style-${i}-mark`).value = d[`style_${i}_mark`] || "";
    const attr = $(`#style-${i}-attribute`); if(attr) attr.value = d[`style_${i}_attribute`] || "";
    toggleAttribute(i);
  }
  calculateStyleBaselines();
  for(const [key] of ABILITIES){
    const current = Number(d[`${key}_base`] ?? d[`${key}_value`] ?? styleBaseline[key] ?? 0);
    setCurrentField(key,current,Math.max(0,Number(d[`${key}_growth`] || 0)));
    const ck = `${key}-control`;
    const cc = Number(d[`${key}_control_base`] ?? d[`${key}_control`] ?? styleBaseline[ck] ?? 0);
    setCurrentField(ck,cc,Math.max(0,Number(d[`${key}_control_growth`] || 0)));
    $(`#${key}-mod`).value = Number(d[`${key}_gear`] || 0) + Number(d[`${key}_manual`] || 0);
    $(`#${key}-control-mod`).value = Number(d[`${key}_control_gear`] || 0) + Number(d[`${key}_control_manual`] || 0);
  }
  $("#cs-base").value = d.cs_base ?? d.cs ?? 0;
  $("#cs-mod").value = Number(d.cs_gear || 0) + Number(d.cs_manual || 0);
  updateDivines(false);
}

function setCurrentField(id,value,paid){ const el = $(`#${id}-base`); el.value = value; el.dataset.currentValue = "true"; paidGrowth[id] = paid; }

function renderStyles(){
  const options = '<option value="">選択</option>' + STYLE_DATA.map(x => `<option>${esc(x.name)}</option>`).join("");
  const attrs = '<option value="">属性を選択</option>' + UTSUWA_ATTRIBUTES.map(x => `<option>${esc(x.name)}</option>`).join("");
  $("#style-grid").innerHTML = [1,2,3].map(i => `<article class="style-card"><div class="style-fields"><label>スタイル<select id="style-${i}">${options}</select></label><label>指定<select id="style-${i}-mark"><option value="">無印</option><option>◎</option><option>●</option><option>◎●</option></select></label><label id="style-${i}-attribute-wrap" hidden>ウツワ属性<select id="style-${i}-attribute">${attrs}</select></label></div><section class="divine-field"><span>神業 <small>DIVINE WORK</small></span><ruby><strong id="divine-${i}">未選択</strong><rt id="divine-${i}-yomi"></rt></ruby></section></article>`).join("");
  $("#style-grid").addEventListener("change", event => { if(!event.target.matches('[id^="style-"]')) return; for(let i=1;i<=3;i++) toggleAttribute(i); updateDivines(true); });
}

function toggleAttribute(i){ const wrap = $(`#style-${i}-attribute-wrap`), select = $(`#style-${i}-attribute`); if(!wrap || !select) return; const yes = $(`#style-${i}`).value === "ウツワ"; wrap.hidden = !yes; if(!yes) select.value = ""; }
function styleRecord(i){ const name = $(`#style-${i}`).value; if(name === "ウツワ") return UTSUWA_ATTRIBUTES.find(x => x.name === $(`#style-${i}-attribute`).value) || null; return STYLE_DATA.find(x => x.name === name) || null; }
function updateDivines(apply=false){
  for(let i=1;i<=3;i++){ const x = STYLE_DATA.find(s => s.name === $(`#style-${i}`).value); $(`#divine-${i}`).textContent = x?.divine || "未選択"; $(`#divine-${i}-yomi`).textContent = x?.divineYomi || x?.divine || ""; }
  const count = [1,2,3].filter(i => $(`#style-${i}`).value).length; $("#style-warning").textContent = count === 3 ? "" : "3枠すべてのスタイルを選択してください。";
  if(apply && !loading){ const old = {...styleBaseline}; calculateStyleBaselines(); for(const [key] of ABILITIES){ adjustForNewBaseline(key,old[key] || 0,styleBaseline[key] || 0); const ck = `${key}-control`; adjustForNewBaseline(ck,old[ck] || 0,styleBaseline[ck] || 0); } recalc(); }
}
function calculateStyleBaselines(){ for(const [key] of ABILITIES){ styleBaseline[key]=0; styleBaseline[`${key}-control`]=0; } for(let i=1;i<=3;i++){ const r = styleRecord(i); if(!r) continue; for(const [key] of ABILITIES){ styleBaseline[key] += Number(r[key]?.[0] || 0); styleBaseline[`${key}-control`] += Number(r[key]?.[1] || 0); } } }
function adjustForNewBaseline(id,oldBase,newBase){ const el = $(`#${id}-base`); if(!el) return; const current = Number(el.value || 0), paid = Number(paidGrowth[id] || 0); if(current === oldBase + paid || current === 0) el.value = newBase + paid; }

function renderAbilities(){ $("#ability-grid").innerHTML = ABILITIES.map(([k,jp,en]) => abilityCard(k,jp,en)).join("") + csCard(); }
function abilityCard(k,jp,en){ return `<article class="ability-card"><h3>${jp} <small>${en}</small></h3><div class="ability-line"><span class="ability-kind">能力値</span><label>現在値<input id="${k}-base" data-current-value="true" type="number" min="0" value="0"></label><label>修正<input id="${k}-mod" type="number" value="0"></label><strong id="${k}-final">0</strong></div><div class="ability-line"><span class="ability-kind">制御値</span><label>現在値<input id="${k}-control-base" data-current-value="true" type="number" min="0" value="0"></label><label>修正<input id="${k}-control-mod" type="number" value="0"></label><strong id="${k}-control-final">0</strong></div></article>`; }
function csCard(){ return `<article class="ability-card ability-card--cs"><h3>CS</h3><div class="ability-line"><span class="ability-kind">CS</span><label>現在値<input id="cs-base" type="number" value="0"></label><label>修正<input id="cs-mod" type="number" value="0"></label><strong id="cs-final">0</strong></div></article>`; }
function updatePaidGrowth(el){ const id = el.id.replace(/-base$/,""); const baseline = Number(styleBaseline[id] || 0), current = Number(el.value || 0); paidGrowth[id] = Math.max(Number(paidGrowth[id] || 0),current-baseline,0); }

function blankSkill(category){ return {_key:crypto.randomUUID(),category,name:"",level:1,free_level:0,skill_kind:category==="style"?"normal":"general",reason:false,passion:false,life:false,mundane:false,timing:"",target:"",range:"",difficulty:"",confrontation:"",description:"",sort_order:skills.length}; }
function normalizeSkill(x){ const n = {...blankSkill(x.category),...x,_key:x.id || crypto.randomUUID(),free_level:Number(x.free_level || 0),skill_kind:x.skill_kind || inferSkillKind(x)}; if(n.name === "初期取得") n.name = n.category === "connection" ? "コネ：初期取得" : "社会：初期取得"; return n; }
function inferSkillKind(x){ if(x.category === "style") return /奥義/.test(x.type || "") ? "ultimate" : /秘技/.test(x.type || "") ? "secret" : "normal"; return String(x.name || "").includes("：") ? "proper" : "general"; }
function renderSkills(){ const all = showAllGeneral ? mergeGeneralMaster(skills) : skills.filter(x => x.category !== "general" || Number(x.level)>0); $("#general-skills").innerHTML = [skillTable("一般技能","GENERAL SKILLS",all.filter(x=>x.category==="general"),false),skillTable("社会","SOCIAL",all.filter(x=>x.category==="social"),false),skillTable("コネクション","CONNECTIONS",all.filter(x=>x.category==="connection"),false)].join(""); $("#style-skills").innerHTML = skillTable("スタイル技能","STYLE SKILLS",skills.filter(x=>x.category==="style"),true); bindSkillRows(); }
function mergeGeneralMaster(list){ const out=[...list]; for(const [name] of FIXED_GENERAL) if(!out.some(x=>x.category==="general"&&x.name===name)) out.push({...blankSkill("general"),name,level:0}); return out; }
function skillTable(jp,en,rows,detail){ if(!rows.length) return ""; return `<section class="skill-group"><h3 class="skill-group-title">${jp} <small>${en}</small></h3><table class="skill-table ${detail?"has-detail":"no-detail"}"><thead><tr><th class="name-col">名称</th><th class="type-col">種別</th><th class="lv-col">LV</th>${SUIT_MARKS.map(x=>`<th class="suit-col">${x}</th>`).join("")}${detail?"<th>詳細</th>":""}<th></th></tr></thead><tbody>${rows.map(x=>skillRow(x,detail)).join("")}</tbody></table></section>`; }
function skillRow(x,detail){ const kinds=["general","proper","normal","secret","ultimate"], labels={general:"一般",proper:"固有名詞",normal:"通常",secret:"秘技",ultimate:"奥義"}; return `<tr data-skill-key="${x._key}"><td><input data-f="name" value="${esc(x.name)}"></td><td><select data-f="skill_kind">${kinds.map(v=>`<option value="${v}" ${x.skill_kind===v?"selected":""}>${labels[v]}</option>`).join("")}</select></td><td><input data-f="level" type="number" min="0" value="${x.level || 0}"></td>${SUITS.map((s,i)=>`<td class="suit-cell"><label class="suit-check"><input data-f="${s}" type="checkbox" ${x[s]?"checked":""}><span>${SUIT_MARKS[i]}</span></label></td>`).join("")}${detail?`<td><input data-f="description" value="${esc(x.description || x.timing || "")}"></td>`:""}<td><button class="row-delete" data-delete-skill="${x._key}" type="button">×</button></td></tr>`; }
function bindSkillRows(){ $$('[data-skill-key]').forEach(tr => tr.querySelectorAll('[data-f]').forEach(el => { el.oninput = () => { let x = skills.find(s=>s._key===tr.dataset.skillKey); if(!x){ x = mergeGeneralMaster(skills).find(s=>s._key===tr.dataset.skillKey); if(x) skills.push(x); } if(!x) return; const f=el.dataset.f; x[f]=el.type==="checkbox"?el.checked:el.type==="number"?Number(el.value):el.value; if(SUITS.includes(f)){ x.level=SUITS.filter(s=>x[s]).length; renderSkills(); } else if(f==="level"){ const lv=Math.max(0,Number(el.value || 0)); x.level=lv; SUITS.forEach((s,i)=>x[s]=i<Math.min(lv,4)); renderSkills(); } recalc(); markDirty(); }; })); }

function blankOutfit(){ return {_key:crypto.randomUUID(),category:"other",name:"",purchase_value:"",experience_cost:0,concealment:"",attack:"",defense:"",range:"",slot:"",control_modifier:0,cs_modifier:0,mundane_modifier:0,description:"",sort_order:outfits.length}; }
function normalizeOutfit(x){ return {...blankOutfit(),...x,_key:x.id || crypto.randomUUID(),experience_cost:Number(x.experience_cost || 0)}; }
function renderOutfits(){ $("#outfit-list").innerHTML = outfits.map(x=>`<article class="outfit-card" data-outfit-key="${x._key}"><label>分類<select data-o="category">${["weapon","armor","cyberware","tron","vehicle","residence","other"].map(v=>`<option value="${v}" ${x.category===v?"selected":""}>${{weapon:"武器",armor:"防具",cyberware:"サイバーウェア",tron:"トロン",vehicle:"ヴィークル",residence:"住居",other:"その他"}[v]}</option>`).join("")}</select></label><label>名称<input data-o="name" value="${esc(x.name)}"></label><label>購入<input data-o="purchase_value" value="${esc(x.purchase_value)}"></label><label>常備化<input data-o="experience_cost" type="number" value="${x.experience_cost}"></label><label>部位<input data-o="slot" value="${esc(x.slot)}"></label><label>解説<input data-o="description" value="${esc(x.description)}"></label><button class="row-delete" data-delete-outfit="${x._key}" type="button">×</button></article>`).join("") || "<p>アウトフィット未登録</p>"; $$('[data-outfit-key]').forEach(card=>card.querySelectorAll('[data-o]').forEach(el=>el.oninput=()=>{ const x=outfits.find(o=>o._key===card.dataset.outfitKey); x[el.dataset.o]=el.type==="number"?Number(el.value):el.value; recalc(); markDirty(); })); }

function finalValue(k){ return Number($(`#${k}-base`)?.value || 0) + Number($(`#${k}-mod`)?.value || 0); }
function recalc(){ for(const [k] of ABILITIES){ $(`#${k}-final`).textContent=finalValue(k); $(`#${k}-control-final`).textContent=finalValue(`${k}-control`); } $("#cs-final").textContent=Number($("#cs-base").value || 0)+Number($("#cs-mod").value || 0); const exp=calculateExp(), total=$("#exp-total"), old=Number(total.textContent || 0); total.textContent=exp.total; if(old!==exp.total){ total.classList.remove("flash"); void total.offsetWidth; total.classList.add("flash"); } $("#exp-breakdown").innerHTML=Object.entries(exp.parts).map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join(""); }
function calculateExp(){ let ability=0,control=0,general=0,style=0,outfit=0; for(const [k] of ABILITIES){ const base=Number(styleBaseline[k] || 0), paid=Number(paidGrowth[k] || 0); for(let i=1;i<=paid;i++) ability+=(base+i)<=10?20:40; const ck=`${k}-control`, cb=Number(styleBaseline[ck] || 0), cp=Number(paidGrowth[ck] || 0); for(let i=1;i<=cp;i++) control+=(cb+i)<=16?20:40; } for(const s of skills){ const paid=Math.max(0,Number(s.level || 0)-Number(s.free_level || 0)); if(s.category==="style") style+=paid*({normal:10,secret:20,ultimate:50}[s.skill_kind] || 10); else general+=paid*(s.skill_kind==="proper"?5:10); } const mundane=finalValue("mundane"); for(const o of outfits){ const p=Number(o.experience_cost || 0); if(p>mundane) outfit+=p; } return {total:ability+control+general+style+outfit,parts:{能力値:ability,制御値:control,一般技能:general,スタイル技能:style,アウトフィット:outfit}}; }
function openImport(mode){ importMode=mode; $("#tsv-title").textContent=`${mode.toUpperCase()} TSV取込`; $("#tsv-text").value=""; $("#tsv-dialog").showModal(); }
function parseTSV(t){ const lines=String(t).replace(/\r/g,"").trim().split("\n").filter(Boolean).map(x=>x.split("\t")); if(!lines.length)return[]; const h=lines.shift().map(x=>x.trim()); return lines.map(r=>Object.fromEntries(h.map((x,i)=>[x,(r[i] || "").replace(/\\n/g,"\n")]))); }
function applyImport(){ const rows=parseTSV($("#tsv-text").value); if(importMode==="skd"){ for(const r of rows) skills.push({...blankSkill("style"),name:r["名称"] || "",skill_kind:/奥義/.test(r["種別"] || "")?"ultimate":/秘技/.test(r["種別"] || "")?"secret":"normal",level:Number(r["レベル"] || 1),timing:r["タイミング"] || "",target:r["対象"] || "",range:r["射程"] || "",difficulty:r["目標値"] || "",confrontation:r["対決"] || "",description:r["解説"] || ""}); renderSkills(); } else { const map={weapons:"weapon",armours:"armor",vehicles:"vehicle",residences:"residence",outfits:"other",武器:"weapon",防具:"armor",ヴィークル:"vehicle",住居:"residence",住宅:"residence",装備:"other"}; for(const r of rows) outfits.push({...blankOutfit(),category:map[r.target] || "other",name:r.name || "",purchase_value:r.purchase || "",experience_cost:Number(r.permanent || 0),concealment:[r.concealA,r.concealB].filter(Boolean).join("/"),attack:r.attack || "",defense:r.defense || "",range:r.range || "",slot:r.part || r.slot || "",description:r.notes || ""}); renderOutfits(); } recalc(); markDirty(); }

function markDirty(){ if(loading)return; dirty=true; setStatus("未保存","unsaved"); clearTimeout(saveTimer); saveTimer=setTimeout(()=>saveAll(false),1200); }
function collectCharacter(includeAttributes=true){ const p={owner_id:user.id,character_name:$("#character-name").value.trim(),character_kana:$("#character-kana").value.trim(),handle:$("#handle").value.trim(),player_name:$("#player-name").value.trim(),affiliation:$("#affiliation").value.trim(),citizen_rank:$("#citizen-rank").value.trim(),summary:$("#summary").value,profile:$("#profile").value,visibility:$("#visibility").value,experience_points:Number($("#exp-total").textContent || 0)}; for(let i=1;i<=3;i++){ const x=STYLE_DATA.find(s=>s.name===$(`#style-${i}`).value); p[`style_${i}`]=$(`#style-${i}`).value; p[`style_${i}_mark`]=$(`#style-${i}-mark`).value; if(includeAttributes)p[`style_${i}_attribute`]=$(`#style-${i}-attribute`)?.value || ""; p[`divine_${i}`]=x?.divine || ""; p[`divine_${i}_yomi`]=x?.divineYomi || x?.divine || ""; } for(const [k] of ABILITIES){ p[`${k}_base`]=Number($(`#${k}-base`).value || 0); p[`${k}_growth`]=Number(paidGrowth[k] || 0); p[`${k}_gear`]=Number($(`#${k}-mod`).value || 0); p[`${k}_manual`]=0; p[`${k}_value`]=finalValue(k); const ck=`${k}-control`; p[`${k}_control_base`]=Number($(`#${ck}-base`).value || 0); p[`${k}_control_growth`]=Number(paidGrowth[ck] || 0); p[`${k}_control_gear`]=Number($(`#${ck}-mod`).value || 0); p[`${k}_control_manual`]=0; p[`${k}_control`]=finalValue(ck); } p.cs_base=Number($("#cs-base").value || 0); p.cs_gear=Number($("#cs-mod").value || 0); p.cs_manual=0; p.cs=p.cs_base+p.cs_gear; return p; }
async function savePayload(p){ return character?.id ? supabase.from("characters").update(p).eq("id",character.id).eq("owner_id",user.id).select("*").single() : supabase.from("characters").insert(p).select("*").single(); }
async function saveAll(force){ if(saving){pending=true;return;} if(!dirty&&force){setStatus("保存済み","saved");pulseSaveButton("saved");return;} if(!$("#character-name").value.trim()||!$("#player-name").value.trim()){if(force)setStatus("キャスト名とプレイヤー名は必須です","error");return;} saving=true;setStatus("保存中…","saving");pulseSaveButton("saving"); try{ let result=await savePayload(collectCharacter(true)); if(result.error&&/style_[123]_attribute|schema cache/i.test(result.error.message || ""))result=await savePayload(collectCharacter(false)); if(result.error)throw result.error; character=result.data; let r=await supabase.from("character_skills").delete().eq("character_id",character.id);if(r.error)throw r.error;r=await supabase.from("character_outfits").delete().eq("character_id",character.id);if(r.error)throw r.error; const sr=skills.filter(x=>Number(x.level)>0&&x.name.trim()).map((x,i)=>({character_id:character.id,category:x.category,name:x.name,level:Number(x.level || 0),free_level:Number(x.free_level || 0),skill_kind:x.skill_kind,reason:!!x.reason,passion:!!x.passion,life:!!x.life,mundane:!!x.mundane,timing:x.timing || "",target:x.target || "",range:x.range || "",difficulty:x.difficulty || "",confrontation:x.confrontation || "",description:x.description || "",sort_order:i}));if(sr.length){r=await supabase.from("character_skills").insert(sr);if(r.error)throw r.error;} const or=outfits.filter(x=>x.name.trim()).map((x,i)=>({character_id:character.id,category:x.category,name:x.name,purchase_value:x.purchase_value || "",experience_cost:Number(x.experience_cost || 0),concealment:x.concealment || "",attack:x.attack || "",defense:x.defense || "",range:x.range || "",slot:x.slot || "",description:x.description || "",control_modifier:Number(x.control_modifier || 0),cs_modifier:Number(x.cs_modifier || 0),mundane_modifier:Number(x.mundane_modifier || 0),sort_order:i}));if(or.length){r=await supabase.from("character_outfits").insert(or);if(r.error)throw r.error;} history.replaceState(null,"",`${SITE_BASE_PATH}sheet.html?id=${encodeURIComponent(character.public_id)}`);dirty=false;setStatus("保存済み","saved");pulseSaveButton("saved"); }catch(e){console.error(e);dirty=true;setStatus(e.message || "保存失敗","error");pulseSaveButton("error");}finally{saving=false;if(pending){pending=false;saveAll(false);}} }
function pulseSaveButton(state){ const b=$("#save-button");b.classList.remove("is-saving","is-saved","is-error");void b.offsetWidth;b.classList.add(state==="saving"?"is-saving":state==="saved"?"is-saved":"is-error"); }
function setStatus(text,state=""){ const s=$("#save-status");s.textContent=text;s.className=state; }
