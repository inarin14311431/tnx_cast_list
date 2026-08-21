import { supabase } from "./supabase-client.js";
import { getMobileEditorContext } from "./sheet-mobile-runtime.js?v=1";

const PROPER_GENERAL_PREFIXES=["製作：","芸術：","操縦："];
let character=null;
let running=false;

function expectedGeneralKind(name=""){
  const text=String(name||"");
  return PROPER_GENERAL_PREFIXES.some(prefix=>text.startsWith(prefix))?"proper":"general";
}

async function normalizeGeneralKinds(){
  if(!character||running)return false;
  running=true;
  try{
    const rows=await supabase.from("character_skills").select("id,name,skill_kind").eq("character_id",character.id).eq("category","general");
    if(rows.error)throw rows.error;
    let changed=false;
    for(const row of rows.data||[]){
      const expected=expectedGeneralKind(row.name);
      if((row.skill_kind||"")===expected)continue;
      const result=await supabase.from("character_skills").update({skill_kind:expected}).eq("id",row.id).eq("character_id",character.id);
      if(result.error)throw result.error;
      changed=true;
    }
    if(changed)document.dispatchEvent(new CustomEvent("tnx:mobile-skill-kind-normalized"));
    return changed;
  }catch(error){
    console.error("mobile general skill kind normalization failed",error);
    return false;
  }finally{
    running=false;
  }
}

async function init(){
  const context=await getMobileEditorContext();
  character=context?.character||null;
  if(!character)return;
  await normalizeGeneralKinds();
  document.addEventListener("tnx:mobile-skills-saved",normalizeGeneralKinds);
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
else init();

export { expectedGeneralKind, normalizeGeneralKinds };
