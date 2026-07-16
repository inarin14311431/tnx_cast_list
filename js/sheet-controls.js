import { supabase } from './supabase-client.js';
import { requireAuth } from './auth-state.js';

const KEYS=[['reason','♠ 理性'],['passion','♣ 感情'],['life','♥ 生命'],['mundane','♦ 外界']];
let user,characterId='',timer;
init();

async function init(){
  user=await requireAuth(); if(!user)return;
  await waitForAbilityGrid();
  injectControlFields();
  await loadValues();
  document.querySelector('#ability-grid').addEventListener('input',e=>{
    if(!e.target.matches('[data-control-field]'))return;
    updateFinal(e.target.closest('.ability-card'));
    clearTimeout(timer);timer=setTimeout(saveValues,700);
    document.dispatchEvent(new Event('input',{bubbles:true}));
  });
}
function waitForAbilityGrid(){return new Promise(resolve=>{const tick=()=>document.querySelectorAll('#ability-grid .ability-card').length>=5?resolve():setTimeout(tick,50);tick();});}
function injectControlFields(){
  const cards=[...document.querySelectorAll('#ability-grid .ability-card')];
  KEYS.forEach(([key],i)=>{
    const card=cards[i];
    card.insertAdjacentHTML('beforeend',`<div class="control-editor"><h4>制御値 / CONTROL</h4>${['base','growth','gear','manual'].map(f=>`<label>${{base:'基礎値',growth:'成長',gear:'装備修正',manual:'任意修正'}[f]}<input id="${key}-control-${f}" data-control-field type="number" value="0"></label>`).join('')}<p>最終制御値 <strong id="${key}-control-final">0</strong></p></div>`);
  });
}
async function currentCharacter(){
  const publicId=new URLSearchParams(location.search).get('id');
  if(!publicId)return null;
  const {data}=await supabase.from('characters').select('*').eq('public_id',publicId).eq('owner_id',user.id).maybeSingle();
  return data;
}
async function loadValues(){
  const data=await currentCharacter();if(!data)return;characterId=data.id;
  for(const [key] of KEYS){
    for(const f of ['base','growth','gear','manual']){
      const el=document.querySelector(`#${key}-control-${f}`);
      el.value=data[`${key}_control_${f}`]??(f==='base'?data[`${key}_control`]??0:0);
    }
    updateFinal(document.querySelector(`#${key}-control-base`).closest('.ability-card'));
  }
}
function updateFinal(card){
  const first=card.querySelector('[id$="-control-base"]');if(!first)return;
  const key=first.id.split('-')[0];
  const total=['base','growth','gear','manual'].reduce((n,f)=>n+Number(document.querySelector(`#${key}-control-${f}`).value||0),0);
  document.querySelector(`#${key}-control-final`).textContent=total;
}
async function saveValues(){
  if(!characterId){const data=await currentCharacter();if(!data)return;characterId=data.id;}
  const payload={};
  for(const [key] of KEYS){
    for(const f of ['base','growth','gear','manual'])payload[`${key}_control_${f}`]=Number(document.querySelector(`#${key}-control-${f}`).value||0);
    payload[`${key}_control`]=['base','growth','gear','manual'].reduce((n,f)=>n+payload[`${key}_control_${f}`],0);
  }
  const {error}=await supabase.from('characters').update(payload).eq('id',characterId).eq('owner_id',user.id);
  if(error)console.error(error);
}
