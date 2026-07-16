import { supabase } from './supabase-client.js';
import { requireAuth } from './auth-state.js';
import { STYLE_DATA, UTSUWA_ATTRIBUTES } from './style-data.js';
import { SITE_BASE_PATH } from './config.js';

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const FIXED_GENERAL=[['医療','reason'],['射撃','reason'],['知覚','reason'],['電脳','reason'],['心理','passion'],['自我','passion'],['交渉','passion'],['運動','life'],['回避','life'],['白兵','life'],['信用','mundane'],['圧力','mundane'],['隠密','mundane']];
const ABILITIES=[['reason','♠ 理性'],['passion','♣ 感情'],['life','♥ 生命'],['mundane','♦ 外界']];
let user,character=null,skills=[],outfits=[],showAllGeneral=true,saveTimer,saving=false,pending=false,importMode='',loadingCharacter=false;

init();
async function init(){
  user=await requireAuth(); if(!user)return;
  renderStyles(); renderAbilities(); bind();
  const id=new URLSearchParams(location.search).get('id');
  if(id)await loadCharacter(id);else createNewState();
}
function bind(){
  document.addEventListener('input',e=>{if(e.target.matches('input,select,textarea')){recalc();queueSave();}});
  document.addEventListener('change',e=>{if(e.target.matches('input,select,textarea')){recalc();queueSave();}});
  document.addEventListener('click',e=>{
    const t=e.target.closest('.section-toggle');if(t)t.parentElement.classList.toggle('is-open');
    const d=e.target.closest('[data-delete-skill]');if(d){skills=skills.filter(x=>x._key!==d.dataset.deleteSkill);renderSkills();recalc();queueSave();}
    const o=e.target.closest('[data-delete-outfit]');if(o){outfits=outfits.filter(x=>x._key!==o.dataset.deleteOutfit);renderOutfits();recalc();queueSave();}
  });
  $('#save-button').onclick=()=>saveAll(true);
  $('#toggle-general').onclick=()=>{showAllGeneral=!showAllGeneral;$('#toggle-general').textContent=showAllGeneral?'取得済みのみ表示':'全技能表示';renderSkills();};
  $('#add-general').onclick=()=>{skills.push(blankSkill('general'));renderSkills();queueSave();};
  $('#add-style-skill').onclick=()=>{skills.push(blankSkill('style'));renderSkills();queueSave();};
  $('#add-outfit').onclick=()=>{outfits.push(blankOutfit());renderOutfits();queueSave();};
  $('#import-skd').onclick=()=>openImport('skd');$('#import-ofc').onclick=()=>openImport('ofc');
  $('#tsv-apply').onclick=e=>{e.preventDefault();applyImport();$('#tsv-dialog').close();};
}
function createNewState(){
  character={visibility:'draft'};$('#visibility').value='draft';
  skills=FIXED_GENERAL.map(([name,suit])=>({...blankSkill('general'),name,level:1,free_level:1,[suit]:true,skill_kind:'general'}));
  skills.push({...blankSkill('connection'),name:'初期取得',level:1,free_level:1,skill_kind:'proper'});
  skills.push({...blankSkill('social'),name:'社会：N◎VA',level:1,free_level:1,skill_kind:'proper'});
  skills.push({...blankSkill('social'),name:'初期取得',level:2,free_level:2,skill_kind:'proper'});
  renderSkills();renderOutfits();recalc();setStatus('NEW CAST / UNSAVED','saved');
}
async function loadCharacter(publicId){
  setStatus('LOADING...','saving');loadingCharacter=true;
  const {data,error}=await supabase.from('characters').select('*').eq('public_id',publicId).eq('owner_id',user.id).maybeSingle();
  if(error||!data){setStatus(error?.message||'LOAD FAILED','error');loadingCharacter=false;return;}
  character=data;fillCharacter(data);
  const [s,o]=await Promise.all([
    supabase.from('character_skills').select('*').eq('character_id',data.id).order('sort_order'),
    supabase.from('character_outfits').select('*').eq('character_id',data.id).order('sort_order')
  ]);
  skills=(s.data||[]).map(normalizeSkill);outfits=(o.data||[]).map(normalizeOutfit);
  loadingCharacter=false;renderSkills();renderOutfits();recalc();setStatus(`EDITING ${data.public_id}`,'saved');
}
function fillCharacter(d){
  ['character_name','character_kana','handle','player_name','affiliation','citizen_rank','summary','profile','visibility'].forEach(n=>{const el=$('#'+n.replaceAll('_','-'));if(el)el.value=d[n]??'';});
  for(let i=1;i<=3;i++){$(`#style-${i}`).value=d[`style_${i}`]||'';$(`#style-${i}-mark`).value=d[`style_${i}_mark`]||'';$(`#style-${i}-attribute`).value=d[`style_${i}_attribute`]||'';toggleAttribute(i);}
  for(const [k] of ABILITIES){for(const f of ['base','growth','gear','manual'])$(`#${k}-${f}`).value=d[`${k}_${f}`]??(f==='base'?d[`${k}_value`]??0:0);for(const f of ['base','growth','gear','manual'])$(`#${k}-control-${f}`).value=d[`${k}_control_${f}`]??(f==='base'?d[`${k}_control`]??0:0);}
  for(const f of ['base','gear','manual'])$(`#cs-${f}`).value=d[`cs_${f}`]??(f==='base'?d.cs??0:0);
  updateDivines(false);
}
function renderStyles(){
  const options='<option value="">選択</option>'+STYLE_DATA.map(x=>`<option>${esc(x.name)}</option>`).join('');
  const attrs='<option value="">属性を選択</option>'+UTSUWA_ATTRIBUTES.map(x=>`<option>${esc(x.name)}</option>`).join('');
  $('#style-grid').innerHTML=[1,2,3].map(i=>`<article class="style-card"><h3>STYLE 0${i}</h3><label>スタイル<select id="style-${i}">${options}</select></label><label>指定<select id="style-${i}-mark"><option value="">無印</option><option>◎</option><option>●</option><option>◎●</option></select></label><label id="style-${i}-attribute-wrap" class="utsuwa-attribute" hidden>ウツワ属性<select id="style-${i}-attribute">${attrs}</select></label><label>神業<input id="divine-${i}" readonly></label><p id="divine-${i}-yomi" class="divine-read"></p></article>`).join('');
  $('#style-grid').addEventListener('change',e=>{if(e.target.matches('[id^="style-"]')){for(let i=1;i<=3;i++)toggleAttribute(i);updateDivines(true);}});
}
function toggleAttribute(i){const is=$(`#style-${i}`).value==='ウツワ';$(`#style-${i}-attribute-wrap`).hidden=!is;if(!is)$(`#style-${i}-attribute`).value='';}
function styleRecord(i){const name=$(`#style-${i}`).value;if(name==='ウツワ')return UTSUWA_ATTRIBUTES.find(x=>x.name===$(`#style-${i}-attribute`).value)||null;return STYLE_DATA.find(x=>x.name===name)||null;}
function updateDivines(applyBase=false){
  for(let i=1;i<=3;i++){const x=STYLE_DATA.find(s=>s.name===$(`#style-${i}`).value);$(`#divine-${i}`).value=x?.divine||'';$(`#divine-${i}-yomi`).textContent=x?`《${x.divineYomi||x.divine}》`:'';}
  const count=[1,2,3].filter(i=>$(`#style-${i}`).value).length;$('#style-warning').textContent=count===3?'':'3枠すべてのスタイルを選択してください。';
  if(applyBase&&!loadingCharacter)applyStyleBaseValues();
}
function applyStyleBaseValues(){
  const totals={reason:[0,0],passion:[0,0],life:[0,0],mundane:[0,0]};let complete=true;
  for(let i=1;i<=3;i++){const r=styleRecord(i);if(!r){complete=false;continue;}for(const [k] of ABILITIES){totals[k][0]+=Number(r[k]?.[0]||0);totals[k][1]+=Number(r[k]?.[1]||0);}}
  if(!complete){$('#style-warning').textContent='ウツワを選択した場合は属性も選択してください。';return;}
  for(const [k] of ABILITIES){$(`#${k}-base`).value=totals[k][0];$(`#${k}-control-base`).value=totals[k][1];}
  recalc();
}
function renderAbilities(){$('#ability-grid').innerHTML=ABILITIES.map(([k,l])=>abilityCard(k,l)).join('')+csCard();}
function abilityCard(k,l){return `<article class="ability-card"><h3>${l}</h3><div class="ability-sub"><h4>能力値</h4>${fieldSet(k)}</div><div class="ability-sub"><h4>制御値</h4>${fieldSet(`${k}-control`)}</div><p>最終値 <strong id="${k}-final">0</strong> / 制御 <strong id="${k}-control-final">0</strong></p></article>`;}
function csCard(){return `<article class="ability-card"><h3>CS</h3>${['base','gear','manual'].map(f=>numField('cs',f)).join('')}<p>最終値 <strong id="cs-final">0</strong></p></article>`;}
function fieldSet(k){return ['base','growth','gear','manual'].map(f=>numField(k,f)).join('');}
function numField(k,f){return `<label>${{base:'基礎値',growth:'成長',gear:'装備修正',manual:'任意修正'}[f]}<input id="${k}-${f}" type="number" value="0"></label>`;}
function blankSkill(category){return {_key:crypto.randomUUID(),category,name:'',level:1,free_level:0,skill_kind:category==='style'?'normal':'general',reason:false,passion:false,life:false,mundane:false,timing:'',target:'',range:'',difficulty:'',confrontation:'',description:'',sort_order:skills.length};}
function normalizeSkill(x){return {...blankSkill(x.category),...x,_key:x.id||crypto.randomUUID(),free_level:Number(x.free_level||0),skill_kind:x.skill_kind||inferSkillKind(x)};}
function inferSkillKind(x){if(x.category==='style')return /奥義/.test(x.type||'')?'ultimate':/秘技/.test(x.type||'')?'secret':'normal';return String(x.name||'').includes('：')?'proper':'general';}
function renderSkills(){const all=showAllGeneral?mergeGeneralMaster(skills):skills.filter(x=>x.category!=='general'||Number(x.level)>0);$('#general-skills').innerHTML=skillTable('GENERAL SKILL / 一般技能',all.filter(x=>x.category!=='style'));$('#style-skills').innerHTML=skillTable('STYLE SKILL / スタイル技能',skills.filter(x=>x.category==='style'));bindSkillRows();}
function mergeGeneralMaster(list){const out=[...list];for(const [name] of FIXED_GENERAL)if(!out.some(x=>x.category==='general'&&x.name===name))out.push({...blankSkill('general'),name,level:0});return out;}
function skillTable(title,rows){return `<section class="skill-group"><h3 class="skill-group-title">${title}</h3><table class="skill-table"><thead><tr><th class="name-col">名称</th><th class="type-col">種別</th><th class="lv-col">LV</th><th class="suit-col">♠</th><th class="suit-col">♣</th><th class="suit-col">♥</th><th class="suit-col">♦</th><th>詳細</th><th></th></tr></thead><tbody>${rows.map(skillRow).join('')}</tbody></table></section>`;}
function skillRow(x){return `<tr data-skill-key="${x._key}"><td><input data-f="name" value="${esc(x.name)}"></td><td><select data-f="skill_kind">${['general','proper','normal','secret','ultimate'].map(v=>`<option value="${v}" ${x.skill_kind===v?'selected':''}>${{general:'一般',proper:'固有名詞',normal:'通常',secret:'秘技',ultimate:'奥義'}[v]}</option>`).join('')}</select></td><td><input data-f="level" type="number" min="0" value="${x.level||0}"></td>${['reason','passion','life','mundane'].map((s,idx)=>`<td class="suit-cell"><label class="suit-check"><input data-f="${s}" type="checkbox" ${x[s]?'checked':''}><span>${['♠','♣','♥','♦'][idx]}</span></label></td>`).join('')}<td><input data-f="description" value="${esc(x.description||x.timing||'')}"></td><td><button class="row-delete" data-delete-skill="${x._key}" type="button">×</button></td></tr>`;}
function bindSkillRows(){$$('[data-skill-key]').forEach(tr=>tr.querySelectorAll('[data-f]').forEach(el=>el.oninput=()=>{let x=skills.find(s=>s._key===tr.dataset.skillKey);if(!x){x=mergeGeneralMaster(skills).find(s=>s._key===tr.dataset.skillKey);if(x&&Number(el.dataset.f==='level'?el.value:x.level)>0)skills.push(x);}if(!x)return;x[el.dataset.f]=el.type==='checkbox'?el.checked:el.type==='number'?Number(el.value):el.value;recalc();queueSave();}));}
function blankOutfit(){return {_key:crypto.randomUUID(),category:'other',name:'',purchase_value:'',experience_cost:0,concealment:'',attack:'',defense:'',range:'',slot:'',control_modifier:0,cs_modifier:0,mundane_modifier:0,description:'',sort_order:outfits.length};}
function normalizeOutfit(x){return {...blankOutfit(),...x,_key:x.id||crypto.randomUUID(),experience_cost:Number(x.experience_cost||0)};}
function renderOutfits(){$('#outfit-list').innerHTML=outfits.map(x=>`<article class="outfit-card" data-outfit-key="${x._key}"><label>分類<select data-o="category">${['weapon','armor','cyberware','tron','vehicle','residence','other'].map(v=>`<option value="${v}" ${x.category===v?'selected':''}>${{weapon:'武器',armor:'防具',cyberware:'サイバーウェア',tron:'トロン',vehicle:'ヴィークル',residence:'住居',other:'その他'}[v]}</option>`).join('')}</select></label><label>名称<input data-o="name" value="${esc(x.name)}"></label><label>購入<input data-o="purchase_value" value="${esc(x.purchase_value)}"></label><label>常備化<input data-o="experience_cost" type="number" value="${x.experience_cost}"></label><label>部位<input data-o="slot" value="${esc(x.slot)}"></label><label>解説<input data-o="description" value="${esc(x.description)}"></label><button class="row-delete" data-delete-outfit="${x._key}" type="button">×</button></article>`).join('')||'<p>NO OUTFIT DATA</p>';$$('[data-outfit-key]').forEach(card=>card.querySelectorAll('[data-o]').forEach(el=>el.oninput=()=>{const x=outfits.find(o=>o._key===card.dataset.outfitKey);x[el.dataset.o]=el.type==='number'?Number(el.value):el.value;recalc();queueSave();}));}
function finalValue(k){return num(`#${k}-base`)+num(`#${k}-growth`)+num(`#${k}-gear`)+num(`#${k}-manual`);}
function finalControl(k){return num(`#${k}-control-base`)+num(`#${k}-control-growth`)+num(`#${k}-control-gear`)+num(`#${k}-control-manual`);}
function recalc(){for(const [k] of ABILITIES){$(`#${k}-final`).textContent=finalValue(k);$(`#${k}-control-final`).textContent=finalControl(k);}$('#cs-final').textContent=num('#cs-base')+num('#cs-gear')+num('#cs-manual');const exp=calculateExp();$('#exp-total').textContent=exp.total;$('#exp-total').classList.remove('flash');void $('#exp-total').offsetWidth;$('#exp-total').classList.add('flash');$('#exp-breakdown').innerHTML=Object.entries(exp.parts).map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');}
function calculateExp(){let ability=0,control=0,general=0,style=0,outfit=0;for(const [k] of ABILITIES){const b=num(`#${k}-base`),g=num(`#${k}-growth`);for(let i=1;i<=g;i++)ability+=(b+i)<=10?20:40;const cb=num(`#${k}-control-base`),cg=num(`#${k}-control-growth`);for(let i=1;i<=cg;i++)control+=(cb+i)<=16?20:40;}for(const s of skills){const paid=Math.max(0,Number(s.level||0)-Number(s.free_level||0));if(s.category==='style')style+=paid*({normal:10,secret:20,ultimate:50}[s.skill_kind]||10);else general+=paid*(s.skill_kind==='proper'?5:10);}const mundane=finalValue('mundane');for(const o of outfits){const p=Number(o.experience_cost||0);if(p>mundane)outfit+=p;}return {total:ability+control+general+style+outfit,parts:{能力値:ability,制御値:control,一般技能:general,スタイル技能:style,アウトフィット:outfit}};}
function num(s){return Number($(s)?.value||0);}
function openImport(mode){importMode=mode;$('#tsv-title').textContent=`${mode.toUpperCase()} TSV IMPORT`;$('#tsv-text').value='';$('#tsv-dialog').showModal();}
function parseTSV(t){const lines=String(t).replace(/\r/g,'').trim().split('\n').filter(Boolean).map(x=>x.split('\t'));if(!lines.length)return[];const h=lines.shift().map(x=>x.trim());return lines.map(r=>Object.fromEntries(h.map((x,i)=>[x,(r[i]||'').replace(/\\n/g,'\n')])));}
function applyImport(){const rows=parseTSV($('#tsv-text').value);if(importMode==='skd'){for(const r of rows)skills.push({...blankSkill('style'),name:r['名称']||'',skill_kind:/奥義/.test(r['種別']||'')?'ultimate':/秘技/.test(r['種別']||'')?'secret':'normal',level:Number(r['レベル']||1),timing:r['タイミング']||'',target:r['対象']||'',range:r['射程']||'',difficulty:r['目標値']||'',confrontation:r['対決']||'',description:r['解説']||''});renderSkills();}else{for(const r of rows){const map={weapons:'weapon',armours:'armor',vehicles:'vehicle',residences:'residence',outfits:'other',武器:'weapon',防具:'armor',ヴィークル:'vehicle',住居:'residence',住宅:'residence',装備:'other'};outfits.push({...blankOutfit(),category:map[r.target]||'other',name:r.name||'',purchase_value:r.purchase||'',experience_cost:Number(r.permanent||0),concealment:[r.concealA,r.concealB].filter(Boolean).join('/'),attack:r.attack||'',defense:r.defense||'',range:r.range||'',slot:r.part||r.slot||'',description:r.notes||''});}renderOutfits();}recalc();queueSave();}
function queueSave(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>saveAll(false),700);}
function collectCharacter(){const p={owner_id:user.id,character_name:$('#character-name').value.trim(),character_kana:$('#character-kana').value.trim(),handle:$('#handle').value.trim(),player_name:$('#player-name').value.trim(),affiliation:$('#affiliation').value.trim(),citizen_rank:$('#citizen-rank').value.trim(),summary:$('#summary').value,profile:$('#profile').value,visibility:$('#visibility').value,experience_points:Number($('#exp-total').textContent||0)};for(let i=1;i<=3;i++){const x=STYLE_DATA.find(s=>s.name===$(`#style-${i}`).value);p[`style_${i}`]=$(`#style-${i}`).value;p[`style_${i}_mark`]=$(`#style-${i}-mark`).value;p[`style_${i}_attribute`]=$(`#style-${i}-attribute`).value;p[`divine_${i}`]=x?.divine||'';p[`divine_${i}_yomi`]=x?.divineYomi||x?.divine||'';}for(const [k] of ABILITIES){for(const f of ['base','growth','gear','manual'])p[`${k}_${f}`]=num(`#${k}-${f}`);for(const f of ['base','growth','gear','manual'])p[`${k}_control_${f}`]=num(`#${k}-control-${f}`);p[`${k}_value`]=finalValue(k);p[`${k}_control`]=finalControl(k);}p.cs_base=num('#cs-base');p.cs_gear=num('#cs-gear');p.cs_manual=num('#cs-manual');p.cs=p.cs_base+p.cs_gear+p.cs_manual;return p;}
async function saveAll(force){if(saving){pending=true;return;}if(!$('#character-name').value.trim()||!$('#player-name').value.trim()){if(force)setStatus('キャスト名とプレイヤー名は必須です','error');return;}saving=true;setStatus('SAVING...','saving');try{const payload=collectCharacter();let result;if(character?.id)result=await supabase.from('characters').update(payload).eq('id',character.id).eq('owner_id',user.id).select('*').single();else result=await supabase.from('characters').insert(payload).select('*').single();if(result.error)throw result.error;character=result.data;await supabase.from('character_skills').delete().eq('character_id',character.id);await supabase.from('character_outfits').delete().eq('character_id',character.id);const skillRows=skills.filter(x=>Number(x.level)>0&&x.name.trim()).map((x,i)=>({character_id:character.id,category:x.category,name:x.name,level:Number(x.level||0),free_level:Number(x.free_level||0),skill_kind:x.skill_kind,reason:!!x.reason,passion:!!x.passion,life:!!x.life,mundane:!!x.mundane,timing:x.timing||'',target:x.target||'',range:x.range||'',difficulty:x.difficulty||'',confrontation:x.confrontation||'',description:x.description||'',sort_order:i}));if(skillRows.length){const r=await supabase.from('character_skills').insert(skillRows);if(r.error)throw r.error;}const outfitRows=outfits.filter(x=>x.name.trim()).map((x,i)=>({character_id:character.id,category:x.category,name:x.name,purchase_value:x.purchase_value||'',experience_cost:Number(x.experience_cost||0),concealment:x.concealment||'',attack:x.attack||'',defense:x.defense||'',range:x.range||'',slot:x.slot||'',description:x.description||'',control_modifier:Number(x.control_modifier||0),cs_modifier:Number(x.cs_modifier||0),mundane_modifier:Number(x.mundane_modifier||0),sort_order:i}));if(outfitRows.length){const r=await supabase.from('character_outfits').insert(outfitRows);if(r.error)throw r.error;}history.replaceState(null,'',`${SITE_BASE_PATH}sheet.html?id=${encodeURIComponent(character.public_id)}`);setStatus('DATA SYNCHRONIZED','saved');}catch(e){console.error(e);setStatus(e.message||'SAVE FAILED','error');}finally{saving=false;if(pending){pending=false;saveAll(false);}}}
function setStatus(text,cls=''){$('#save-status').textContent=text;$('#save-status').className=cls;}
