import { canonicalGeneralSkillName, generalSkillKindForName } from "./general-skill-catalog.js?v=2";
import { supabase } from "./supabase-client.js";
import { getMobileEditorContext } from "./sheet-mobile-runtime.js?v=2";

let character=null;
let running=false;

function expectedGeneralKind(name=""){
  return generalSkillKindForName(name);
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
      const canonicalName=canonicalGeneralSkillName(row.name);
      const patch={};
      if((row.skill_kind||"")!==expected)patch.skill_kind=expected;
      // Display markers are not part of the persisted skill identity.
      if(expected==="proper" && row.name!==canonicalName)patch.name=canonicalName;
      if(!Object.keys(patch).length)continue;
      const result=await supabase.from("character_skills").update(patch).eq("id",row.id).eq("character_id",character.id);
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
