import { supabase } from "./supabase-client.js";

const styleRoot=document.querySelector("#style-skills");
const outfitRoot=document.querySelector("#outfit-list");
const publicId=new URLSearchParams(location.search).get("id")?.trim()||"";
const styleValues=new Map();
const outfitValues=new Map();
const appliedStyles=new Set();
const appliedOutfits=new Set();
let queued=false;

const normalize=value=>String(value??"")
  .replace(/\r\n?/g,"\n")
  .replace(/\\r\\n|\\n|\\r/g,"\n");
const compare=value=>normalize(value).replace(/\s+/g," ").trim();

function normalizeTextarea(field){
  if(!(field instanceof HTMLTextAreaElement))return false;
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
  field.style.height="36px";
  field.dataset.manualResizeReady="1";
}

function fieldRestoreKey(field){
  const styleKey=field.closest("tr[data-skill-key]")?.dataset.skillKey;
  if(field.matches('textarea[data-f="name"]'))return styleKey?{type:"style",key:styleKey}:null;
  const outfitKey=field.closest("[data-outfit-key]")?.dataset.outfitKey;
  const outfitField=field.dataset.o;
  if(outfitKey&&outfitField)return {type:"outfit",key:`${outfitKey}:${outfitField}`};
  return null;
}

function markEdited(field){
  const restoreKey=fieldRestoreKey(field);
  if(!restoreKey)return;
  if(restoreKey.type==="style")appliedStyles.add(restoreKey.key);
  else appliedOutfits.add(restoreKey.key);
}

function bridgeOriginalValue(input,field){
  try{
    Object.defineProperty(input,"value",{
      configurable:true,
      get:()=>field.value,
      set:value=>{field.value=normalize(value);}
    });
  }catch{
    input.addEventListener("input",()=>{field.value=normalize(input.getAttribute("value")||input.value);});
  }
}

function convert(input,kind){
  if(!(input instanceof HTMLInputElement)||["number","hidden","checkbox","radio","file"].includes(input.type))return input;
  const field=document.createElement("textarea");
  for(const attribute of [...input.attributes])if(!["type","value"].includes(attribute.name))field.setAttribute(attribute.name,attribute.value);
  field.rows=1;
  field.value=normalize(input.value);
  bridgeOriginalValue(input,field);
  field.oninput=input.oninput;
  field.onchange=input.onchange;
  field.addEventListener("input",()=>markEdited(field),true);
  field.addEventListener("change",()=>markEdited(field),true);
  input.replaceWith(field);
  if(kind==="style")fitStyle(field);else prepareOutfit(field);
  return field;
}

function restoreStyle(field){
  const key=field.closest("tr[data-skill-key]")?.dataset.skillKey;
  if(!key||appliedStyles.has(key)||!styleValues.has(key))return;
  field.value=styleValues.get(key);
  appliedStyles.add(key);
  fitStyle(field);
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
  styleRoot?.querySelectorAll('tr[data-skill-key] td:first-child input[data-f="name"]').forEach(input=>restoreStyle(convert(input,"style")));
  styleRoot?.querySelectorAll('textarea[data-f="name"]').forEach(field=>{restoreStyle(field);normalizeTextarea(field);fitStyle(field);});
  outfitRoot?.querySelectorAll('input[data-o]').forEach(input=>convert(input,"outfit"));
  outfitRoot?.querySelectorAll('[data-outfit-key]').forEach(restoreOutfit);
  outfitRoot?.querySelectorAll('textarea[data-o]').forEach(field=>{normalizeTextarea(field);prepareOutfit(field);});
  document.querySelectorAll("textarea").forEach(normalizeTextarea);
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
    if(mode==="skd"){
      const fields=[...(styleRoot?.querySelectorAll('tr[data-skill-key] textarea[data-f="name"]')||[])].slice(-rows.length);
      fields.forEach((field,index)=>{
        field.value=normalize(rows[index]?.["名称"]||field.value);
        markEdited(field);
        field.dispatchEvent(new Event("input",{bubbles:true}));
        fitStyle(field);
      });
      return;
    }
    const used=new Set();
    for(const row of rows){
      const target=[...(outfitRoot?.querySelectorAll('[data-outfit-key]')||[])].reverse().find(item=>!used.has(item)&&compare(item.querySelector('[data-o="name"]')?.value)===compare(row.name));
      if(!target)continue;
      used.add(target);
      const values={name:row.name,purchase_value:row.purchase,concealment:[row.concealA,row.concealB].filter(Boolean).join("/"),attack:row.attack,defense:row.defense,range:row.range,slot:row.part||row.slot,description:row.notes};
      for(const [name,value] of Object.entries(values)){
        const field=target.querySelector(`textarea[data-o="${name}"]`);
        if(!field||value===undefined)continue;
        field.value=normalize(value);
        markEdited(field);
        field.dispatchEvent(new Event("input",{bubbles:true}));
        prepareOutfit(field);
      }
    }
  }));
}

async function loadOriginal(){
  if(!publicId)return;
  const {data:character,error}=await supabase.from("characters").select("id").eq("public_id",publicId).maybeSingle();
  if(error||!character)return;
  const [skills,outfits]=await Promise.all([
    supabase.from("character_skills").select("id,name").eq("character_id",character.id).eq("category","style").order("sort_order"),
    supabase.from("character_outfits").select("*").eq("character_id",character.id).order("sort_order")
  ]);
  for(const skill of skills.data||[])styleValues.set(String(skill.id),normalize(skill.name));
  for(const outfit of outfits.data||[])outfitValues.set(String(outfit.id),outfit);
  queue();
}

styleRoot&&new MutationObserver(queue).observe(styleRoot,{childList:true,subtree:true});
outfitRoot&&new MutationObserver(queue).observe(outfitRoot,{childList:true,subtree:true});
document.addEventListener("input",event=>{
  const field=event.target;
  if(!(field instanceof HTMLTextAreaElement))return;
  normalizeTextarea(field);
  if(field.matches('#style-skills textarea[data-f="name"]'))fitStyle(field);
},true);
document.addEventListener("change",event=>{
  const field=event.target;
  if(field instanceof HTMLTextAreaElement)normalizeTextarea(field);
},true);
document.addEventListener("click",event=>{
  if(event.target.closest?.("#legacy-import-apply"))enhance();
  if(!event.target.closest?.("#tsv-apply"))return;
  const mode=document.querySelector("#tsv-title")?.textContent.includes("SKD")?"skd":"ofc";
  restoreImport(mode,parseTsv(document.querySelector("#tsv-text")?.value));
},true);
window.TNXMultilineFields={enhance,queue,normalize};
queue();
loadOriginal();
