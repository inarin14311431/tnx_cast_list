import { supabase } from "./supabase-client.js";

const styleRoot=document.querySelector("#style-skills");
const outfitRoot=document.querySelector("#outfit-list");
const publicId=new URLSearchParams(location.search).get("id")?.trim()||"";
const OUTFIT_RENDER_EVENT="tnx:outfit-tables-rendered";
const outfitValues=new Map();
const appliedOutfits=new Set();
let queued=false;

const normalize=value=>String(value??"")
  .replace(/\r\n?/g,"\n")
  .replace(/\\r\\n|\\n|\\r/g,"\n");
const compare=value=>normalize(value).replace(/\s+/g," ").trim();

function isImportSource(field){
  return field?.matches?.("#legacy-import-json,#tsv-text");
}

function isStyleDetailStorage(field){
  return field?.matches?.('#style-skills textarea[data-f="description"]');
}

function normalizeTextarea(field){
  if(!(field instanceof HTMLTextAreaElement)||isImportSource(field)||isStyleDetailStorage(field))return false;
  const value=normalize(field.value);
  if(value===field.value)return false;
  field.value=value;
  return true;
}

function fitStyle(field){
  if(!(field instanceof HTMLTextAreaElement))return;
  field.style.height="auto";
  field.style.height=`${Math.max(36,field.scrollHeight+2)}px`;
}

function prepareOutfit(field){
  if(!(field instanceof HTMLTextAreaElement)||field.dataset.manualResizeReady==="1")return;
  field.rows=1;
  field.style.height="34px";
  field.dataset.manualResizeReady="1";
}

function outfitRestoreKey(field){
  const key=field.closest("[data-outfit-key]")?.dataset.outfitKey;
  const name=field.dataset.o;
  return key&&name?`${key}:${name}`:null;
}

function markOutfitEdited(field){
  const key=outfitRestoreKey(field);
  if(key)appliedOutfits.add(key);
}

function convertOutfit(input){
  if(!(input instanceof HTMLInputElement)||["number","hidden","checkbox","radio","file"].includes(input.type))return input;
  const field=document.createElement("textarea");
  for(const attribute of [...input.attributes])if(!["type","value"].includes(attribute.name))field.setAttribute(attribute.name,attribute.value);
  field.rows=1;
  field.value=normalize(input.value);
  field.oninput=input.oninput;
  field.onchange=input.onchange;
  field.addEventListener("input",()=>markOutfitEdited(field),true);
  field.addEventListener("change",()=>markOutfitEdited(field),true);
  input.replaceWith(field);
  prepareOutfit(field);
  return field;
}

function setStyleNameExact(rowOrKey,value){
  const key=typeof rowOrKey==="string"?rowOrKey:rowOrKey?.dataset?.skillKey;
  if(!key)return null;
  const row=styleRoot?.querySelector(`tr[data-skill-key="${CSS.escape(String(key))}"]`);
  const field=row?.querySelector('textarea[data-f="name"]');
  if(!(field instanceof HTMLTextAreaElement))return null;
  field.value=normalize(value);
  field.dispatchEvent(new Event("input",{bubbles:true}));
  field.dispatchEvent(new Event("change",{bubbles:true}));
  fitStyle(field);
  return field;
}

function restoreOutfit(owner){
  const key=owner?.dataset.outfitKey;
  const data=key?outfitValues.get(key):null;
  if(!key||!data)return;
  owner.querySelectorAll("textarea[data-o]").forEach(field=>{
    const name=field.dataset.o;
    const restoreKey=`${key}:${name}`;
    if(!name||appliedOutfits.has(restoreKey)||data[name]===undefined||data[name]===null)return;
    field.value=normalize(data[name]);
    appliedOutfits.add(restoreKey);
    prepareOutfit(field);
  });
}

function enhance(){
  queued=false;
  styleRoot?.querySelectorAll('textarea[data-f="name"]').forEach(field=>{normalizeTextarea(field);fitStyle(field);});
  outfitRoot?.querySelectorAll('input[data-o]').forEach(input=>convertOutfit(input));
  outfitRoot?.querySelectorAll('[data-outfit-key]').forEach(restoreOutfit);
  outfitRoot?.querySelectorAll('textarea[data-o]').forEach(field=>{normalizeTextarea(field);prepareOutfit(field);});
  document.querySelectorAll("textarea:not(#legacy-import-json):not(#tsv-text)").forEach(normalizeTextarea);
}

function queue(){
  if(queued)return;
  queued=true;
  requestAnimationFrame(enhance);
}

function parseTsv(text){
  const lines=String(text??"").replace(/\r/g,"").trim().split("\n").filter(Boolean).map(line=>line.split("\t"));
  if(!lines.length)return[];
  const header=lines.shift().map(value=>value.trim());
  return lines.map(row=>Object.fromEntries(header.map((name,index)=>[name,normalize(row[index]||"")])));
}

function restoreImport(mode,rows){
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    enhance();
    if(mode==="skd")return;
    const used=new Set();
    for(const row of rows){
      const target=[...(outfitRoot?.querySelectorAll('[data-outfit-key]')||[])].reverse().find(item=>!used.has(item)&&compare(item.querySelector('[data-o="name"]')?.value)===compare(row.name));
      if(!target)continue;
      used.add(target);
      const values={name:row.name,purchase_value:row.purchase,concealment:row.concealA,attack:row.attack,defense:row.defense,range:row.range,slot:row.part||row.slot,description:row.notes};
      for(const [name,value] of Object.entries(values)){
        const field=target.querySelector(`textarea[data-o="${name}"]`);
        if(!field||value===undefined)continue;
        field.value=normalize(value);
        markOutfitEdited(field);
        field.dispatchEvent(new Event("input",{bubbles:true}));
        prepareOutfit(field);
      }
      const concealmentPenalty=target.querySelector('[data-ofc="concealment_penalty"]');
      if(concealmentPenalty&&row.concealB!==undefined){
        concealmentPenalty.value=normalize(row.concealB);
        concealmentPenalty.dispatchEvent(new Event("input",{bubbles:true}));
        concealmentPenalty.dispatchEvent(new Event("change",{bubbles:true}));
      }
    }
  }));
}

async function loadOriginalOutfits(){
  if(!publicId)return;
  const {data:character,error}=await supabase.from("characters").select("id").eq("public_id",publicId).maybeSingle();
  if(error||!character)return;
  const result=await supabase.from("character_outfits").select("*").eq("character_id",character.id).order("sort_order");
  for(const outfit of result.data||[])outfitValues.set(String(outfit.id),outfit);
  queue();
}

styleRoot&&new MutationObserver(queue).observe(styleRoot,{childList:true,subtree:true});
outfitRoot?.addEventListener(OUTFIT_RENDER_EVENT,queue);
document.addEventListener("input",event=>{
  const field=event.target;
  if(field instanceof HTMLInputElement&&field.matches('input[data-o="description"]')){
    const proxy=field.closest("label")?.querySelector("textarea[data-description-proxy]");
    if(proxy&&proxy.value!==field.value)proxy.value=field.value;
  }
  if(!(field instanceof HTMLTextAreaElement)||isImportSource(field))return;
  normalizeTextarea(field);
  if(field.matches('#style-skills textarea[data-f="name"]'))fitStyle(field);
},true);
document.addEventListener("change",event=>{
  const field=event.target;
  if(field instanceof HTMLTextAreaElement&&!isImportSource(field))normalizeTextarea(field);
},true);
document.addEventListener("click",event=>{
  if(event.target.closest?.("#legacy-import-apply"))enhance();
  if(!event.target.closest?.("#tsv-apply"))return;
  const mode=document.querySelector("#tsv-title")?.textContent.includes("SKD")?"skd":"ofc";
  restoreImport(mode,parseTsv(document.querySelector("#tsv-text")?.value));
},true);
window.TNXMultilineFields={enhance,queue,normalize,setStyleNameExact};
queue();
loadOriginalOutfits();
