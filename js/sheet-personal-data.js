import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js";

const PERSONAL_FIELDS=["age","gender","height","weight","eyes","hair","skin"];
const LIFE_PATH_FIELDS=["life_path_origin","life_path_experience","life_path_encounter"];
const FIELDS=[...PERSONAL_FIELDS,...LIFE_PATH_FIELDS];
const LEGACY_KEYS={
  age:["base.age","age"],
  gender:["base.sex","base.gender","sex","gender"],
  height:["base.height","height"],
  weight:["base.weight","weight"],
  eyes:["base.eyes","eyes"],
  hair:["base.hair","hair"],
  skin:["base.skin","skin"],
  /* Legacy character-sheets stores the three life-path values as
   * experience / environment / encounter. base.birth is birthplace,
   * not the life-path origin. */
  life_path_origin:["base.lifepath.experience","base.lifepath.origin","life_path_origin"],
  life_path_experience:["base.lifepath.environment","life_path_experience"],
  life_path_encounter:["base.lifepath.encounter","base.lifepath.encouter","life_path_encounter"]
};
const inputs=Object.fromEntries(FIELDS.map(name=>[name,document.querySelector(`#${name.replaceAll("_","-")}`)]));
const statuses=[document.querySelector("#personal-data-status"),document.querySelector("#life-path-status")].filter(Boolean);
let user=null;
let pending=false;
let loading=false;
let saving=false;
let timer=0;

if(FIELDS.every(name=>inputs[name])&&statuses.length)initialize();

async function initialize(){
  user=await requireAuth();
  if(!user)return;

  for(const input of Object.values(inputs)){
    input.addEventListener("input",()=>{
      if(loading)return;
      pending=true;
      setStatus("未保存","");
      queueSave();
    });
  }

  bindLegacyImportSeparation();

  const saveStatus=document.querySelector("#save-status");
  if(saveStatus){
    new MutationObserver(()=>{
      const text=saveStatus.textContent||"";
      if(saveStatus.classList.contains("saved")||/保存済み/.test(text)){
        if(pending)queueSave(0);
      }
    }).observe(saveStatus,{attributes:true,attributeFilter:["class"],childList:true,subtree:true,characterData:true});
  }

  const publicId=getPublicId();
  if(publicId)await loadStructuredProfile(publicId);
  else setStatus("キャスト本体の初回保存後に登録されます。","");
}

function getPublicId(){
  return new URLSearchParams(location.search).get("id")?.trim()||"";
}

async function loadStructuredProfile(publicId){
  loading=true;
  try{
    const {data,error}=await supabase
      .from("characters")
      .select(`id,public_id,${FIELDS.join(",")}`)
      .eq("public_id",publicId)
      .eq("owner_id",user.id)
      .maybeSingle();
    if(error)throw error;
    if(!data)throw new Error("プロフィールデータを読み込めませんでした。");

    for(const name of FIELDS)inputs[name].value=data[name]??"";
    pending=false;
    setStatus("読込済み","saved");
  }catch(error){
    console.error(error);
    setStatus(error.message||"プロフィールデータの読込に失敗しました。","error");
  }finally{
    loading=false;
  }
}

function queueSave(delay=900){
  clearTimeout(timer);
  timer=setTimeout(saveStructuredProfile,delay);
}

async function saveStructuredProfile(){
  if(!pending||saving||loading||!user)return;
  const publicId=getPublicId();
  if(!publicId){
    setStatus("キャスト本体の初回保存後に登録されます。","");
    return;
  }

  saving=true;
  setStatus("保存中…","saving");
  try{
    const payload=Object.fromEntries(FIELDS.map(name=>[name,inputs[name].value.trim()]));
    const {error}=await supabase
      .from("characters")
      .update(payload)
      .eq("public_id",publicId)
      .eq("owner_id",user.id);
    if(error)throw error;
    pending=false;
    setStatus("保存済み","saved");
  }catch(error){
    console.error(error);
    pending=true;
    setStatus(error.message||"プロフィールデータの保存に失敗しました。","error");
  }finally{
    saving=false;
  }
}

function setStatus(text,state){
  for(const status of statuses){
    status.textContent=text;
    status.className=state?`is-${state}`:"";
  }
}

function canonicalKey(value){
  return String(value||"").trim()
    .replace(/\[\s*["']?([^\]"']+)["']?\s*\]/g,".$1")
    .replace(/^[.#]+|[.]$/g,"")
    .replace(/\.{2,}/g,".");
}

function readPath(object,path){
  if(!object||typeof object!=="object")return "";
  if(Object.prototype.hasOwnProperty.call(object,path))return object[path];
  return path.split(".").reduce((value,key)=>value&&typeof value==="object"?value[key]:undefined,object)??"";
}

function extractLegacyValues(data){
  const values={};
  const fieldMap=new Map();
  for(const field of Array.isArray(data?.fields)?data.fields:[]){
    const type=String(field.type||"").toLowerCase();
    const value=(type==="checkbox"||type==="radio")?(field.checked?(field.value||true):false):(field.value??"");
    for(const key of [field.path,field.id,field.name]){
      const normalized=canonicalKey(key);
      if(normalized&&!fieldMap.has(normalized))fieldMap.set(normalized,value);
    }
  }

  for(const [name,keys] of Object.entries(LEGACY_KEYS)){
    for(const key of keys){
      const normalized=canonicalKey(key);
      const value=fieldMap.has(normalized)?fieldMap.get(normalized):readPath(data,key);
      if(value!==undefined&&value!==null&&String(value).trim()!==""){
        values[name]=String(value);
        break;
      }
    }
  }
  return values;
}

function sanitizeLegacyData(data){
  const clone=structuredClone(data);
  const blocked=new Set(Object.values(LEGACY_KEYS).flat().map(canonicalKey));

  if(Array.isArray(clone.fields)){
    clone.fields=clone.fields.filter(field=>![field.path,field.id,field.name].some(key=>blocked.has(canonicalKey(key))));
  }

  for(const keys of Object.values(LEGACY_KEYS)){
    for(const key of keys){
      if(Object.prototype.hasOwnProperty.call(clone,key))delete clone[key];
      const parts=key.split(".");
      if(parts.length===2&&clone[parts[0]]&&typeof clone[parts[0]]==="object")delete clone[parts[0]][parts[1]];
      if(parts.length===3&&clone[parts[0]]?.[parts[1]]&&typeof clone[parts[0]][parts[1]]==="object")delete clone[parts[0]][parts[1]][parts[2]];
    }
  }
  return clone;
}

function bindLegacyImportSeparation(){
  document.addEventListener("click",event=>{
    if(!event.target.closest("#legacy-import-apply"))return;
    const textarea=document.querySelector("#legacy-import-json");
    if(!textarea?.value.trim())return;

    try{
      const data=JSON.parse(textarea.value);
      const values=extractLegacyValues(data);
      textarea.value=JSON.stringify(sanitizeLegacyData(data),null,2);

      for(const [name,value] of Object.entries(values)){
        inputs[name].value=value;
        inputs[name].dispatchEvent(new Event("input",{bubbles:true}));
        inputs[name].dispatchEvent(new Event("change",{bubbles:true}));
      }
    }catch{
      /* The main importer reports malformed JSON. */
    }
  },true);
}
