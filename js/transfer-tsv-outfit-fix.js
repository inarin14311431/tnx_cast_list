import { supabase } from "./supabase-client.js";

const FORMAT="TNX_CAST_TRANSFER_TSV";
let bound=false;

bindWhenReady();

function bindWhenReady(){
  const button=document.querySelector("#transfer-tsv-copy-button");
  if(button&&!bound){
    bound=true;
    button.addEventListener("click",()=>void enrichClipboardAfterExport(button),false);
    return;
  }
  const observer=new MutationObserver(()=>{
    const current=document.querySelector("#transfer-tsv-copy-button");
    if(!current||bound)return;
    bound=true;
    current.addEventListener("click",()=>void enrichClipboardAfterExport(current),false);
    observer.disconnect();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
}

async function enrichClipboardAfterExport(button){
  try{
    const original=await waitForTransferTsv(button);
    if(!original)return;
    const outfits=document.querySelector("#outfit-list")?collectEditorOutfits():await fetchOutfits();
    if(!outfits.length)return;
    const enriched=enrichTransferTsv(original,outfits);
    if(enriched!==original)await navigator.clipboard.writeText(enriched);
  }catch(error){
    console.error("Outfit transfer TSV enrichment failed",error);
  }
}

async function waitForTransferTsv(button){
  for(let attempt=0;attempt<50;attempt++){
    await new Promise(resolve=>setTimeout(resolve,100));
    if(button?.dataset.copyState!=="success")continue;
    try{
      const text=await navigator.clipboard.readText();
      if(text.startsWith(`${FORMAT}\t`))return text;
    }catch{}
  }
  return "";
}

function collectEditorOutfits(){
  return [...document.querySelectorAll("#outfit-list [data-outfit-key]")].map((row,sort_order)=>{
    const base=key=>row.querySelector(`[data-o="${key}"]`)?.value??"";
    const ofc=key=>row.querySelector(`[data-ofc="${key}"]`)?.value??"";
    return normalizeOutfit({
      category:base("category")||"other",name:base("name"),purchase_value:base("purchase_value"),experience_cost:base("experience_cost"),
      concealment:base("concealment"),attack:base("attack"),defense:base("defense"),range:base("range"),slot:base("slot"),
      control_modifier:base("control_modifier"),description:base("description")||row.querySelector("textarea[data-description-proxy]")?.value||"",sort_order,
      ofc_details:{
        parry:ofc("parry"),speed:ofc("speed"),electronic_control:ofc("electronic_control"),control_value:ofc("control_value"),
        defense_s:ofc("defense_s"),defense_p:ofc("defense_p"),defense_i:ofc("defense_i"),crew:ofc("crew"),sf:ofc("sf"),
        tron_software:ofc("tron_software"),tron_support:ofc("tron_support"),tron_hardware:ofc("tron_hardware"),cs_value:ofc("cs_value"),
        residence_entry:ofc("residence_entry"),residence_electric:ofc("residence_electric"),residence_area:ofc("residence_area"),page_number:ofc("page_number")
      }
    });
  }).filter(item=>item.name.trim());
}

async function fetchOutfits(){
  const publicId=new URLSearchParams(location.search).get("id")?.trim()||"";
  if(!publicId)return [];
  const {data:character,error:characterError}=await supabase.from("characters").select("id").eq("public_id",publicId).maybeSingle();
  if(characterError||!character)return [];
  const {data,error}=await supabase.from("character_outfits").select("*").eq("character_id",character.id).order("category").order("sort_order").order("name");
  if(error)throw error;
  return (data||[]).map(normalizeOutfit);
}

function normalizeOutfit(item){
  const details=item?.ofc_details&&typeof item.ofc_details==="object"&&!Array.isArray(item.ofc_details)?item.ofc_details:{};
  return {...item,ofc_details:Object.fromEntries(Object.entries(details).map(([key,value])=>[key,String(value??"")]))};
}

function enrichTransferTsv(text,outfits){
  const rows=String(text).replace(/\r/g,"").split("\n").map(line=>line.split("\t"));
  const records=new Map();
  for(const columns of rows){
    if(columns[0]!==FORMAT||columns[2]!=="outfit")continue;
    const index=columns[3]||"0";
    if(!records.has(index))records.set(index,{});
    records.get(index)[columns[4]||""]=unescapeCell(columns.slice(5).join("\t"));
  }
  const queues=new Map();
  for(const outfit of outfits){
    const key=signature(outfit.category,outfit.name);
    if(!queues.has(key))queues.set(key,[]);
    queues.get(key).push(outfit);
  }
  const additions=[];
  for(const [index,record] of records){
    const outfit=queues.get(signature(record.category,record.name))?.shift()||outfits[Number(index)];
    if(!outfit)continue;
    for(const [field,value] of Object.entries(transferFields(outfit))){
      let replaced=false;
      for(const columns of rows){
        if(columns[0]===FORMAT&&columns[2]==="outfit"&&(columns[3]||"0")===index&&columns[4]===field){
          columns.splice(5,columns.length-5,escapeCell(value));replaced=true;
        }
      }
      if(!replaced)additions.push([FORMAT,"1","outfit",index,field,escapeCell(value)]);
    }
  }
  return [...rows,...additions].map(columns=>columns.join("\t")).join("\n");
}

function transferFields(outfit){
  const d=outfit.ofc_details||{};
  const [concealA="",concealB=""]=String(outfit.concealment||"").split(/[\/／]/);
  const defense=parseDefense(outfit.defense||"");
  const category=String(outfit.category||"other");
  const fields={
    category,name:outfit.name||"",purchase:outfit.purchase_value??"",permanent:outfit.experience_cost??"",concealA,concealB,
    attack:outfit.attack||"",defense:d.parry||outfit.defense||"",range:outfit.range||"",
    control:category==="armor"?(d.control_value||""):(outfit.control_modifier??""),electrical_control:d.electronic_control||"",
    protecS:d.defense_s||defense.s,protecP:d.defense_p||defense.p,protecI:d.defense_i||defense.i,
    crew:d.crew||"",sf:d.sf||"",entry:d.residence_entry||"",part:outfit.slot||"",notes:outfit.description||"",page:d.page_number||"",
    slot:d.speed||"",mundane:"",tron_software:d.tron_software||"",tron_support:d.tron_support||"",tron_hardware:d.tron_hardware||"",
    cs_value:d.cs_value||"",residence_electric:d.residence_electric||"",residence_area:d.residence_area||""
  };
  if(category==="weapon")fields.defense=d.parry||"";
  if(category==="other")fields.slot="";
  return fields;
}

function parseDefense(value){
  const result={s:"",p:"",i:""};
  const text=String(value||"").trim();
  for(const match of text.matchAll(/(?:^|[\s,，/／])([SPI])\s*[:：]?\s*([^/／,，\s]+)/gi))result[match[1].toLowerCase()]=match[2];
  if(Object.values(result).some(Boolean))return result;
  const parts=text.split(/[\/／,，\s]+/).filter(Boolean);
  result.s=parts[0]||"";result.i=parts[1]||"";result.p=parts[2]||"";
  return result;
}
function signature(category,name){return `${String(category||"other").trim()}\u0000${String(name||"").trim()}`}
function escapeCell(value){return String(value??"").replace(/\\/g,"\\\\").replace(/\t/g,"\\t").replace(/\r?\n/g,"\\n")}
function unescapeCell(value){return String(value??"").replace(/\\n/g,"\n").replace(/\\t/g,"\t").replace(/\\\\/g,"\\")}
