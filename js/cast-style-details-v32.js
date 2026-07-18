import { supabase } from "./supabase-client.js";
const PREFIX="@@TNX_STYLE_DETAIL_V1@@";
const FIELDS=[["skill","技能"],["limit","上限"],["timing","タイミング"],["target","対象"],["range","射程"],["difficulty","目標値"],["confrontation","対決"],["description","解説"],["page","参照P"]];
const esc=value=>String(value??"").replace(/[&<>\"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]));
function parse(value){const text=String(value||"");if(text.startsWith(PREFIX)){try{return {...Object.fromEntries(FIELDS.map(([k])=>[k,""])),...JSON.parse(text.slice(PREFIX.length).trim())};}catch{}}
const data=Object.fromEntries(FIELDS.map(([k])=>[k,""]));data.description=text;return data;}
async function render(){
  const publicId=new URLSearchParams(location.search).get("id")?.trim();if(!publicId)return;
  const {data:character}=await supabase.from("characters").select("id").eq("public_id",publicId).maybeSingle();if(!character)return;
  const {data:skills}=await supabase.from("character_skills").select("*").eq("character_id",character.id).eq("category","style").order("sort_order");
  if(!skills?.length)return;
  const container=document.querySelector("#skills-container");if(!container)return;
  const findSection=()=>[...container.querySelectorAll(".skill-section")].find(section=>/STYLE SKILLS|スタイル技能/i.test(section.querySelector("h3")?.textContent||""));
  const section=findSection();if(!section)return;
  section.classList.add("style-skill-section-v32");
  section.innerHTML=`<h3>STYLE SKILLS</h3><div class="data-table-wrapper"><table class="data-table style-skill-detail-table"><thead><tr><th>名称</th><th>種別</th><th>レベル</th><th>♠</th><th>♣</th><th>♥</th><th>♦</th>${FIELDS.map(([,label])=>`<th>${label}</th>`).join("")}</tr></thead><tbody>${skills.map(skill=>{const d=parse(skill.description);const kind={normal:"通常",secret:"秘技",ultimate:"奥義"}[skill.skill_kind]||skill.skill_kind||"";return `<tr><td>${esc(skill.name)}</td><td>${esc(kind)}</td><td>${esc(skill.level)}</td><td>${skill.reason?"●":""}</td><td>${skill.passion?"●":""}</td><td>${skill.life?"●":""}</td><td>${skill.mundane?"●":""}</td>${FIELDS.map(([key])=>`<td>${esc(d[key]).replaceAll("\n","<br>")}</td>`).join("")}</tr>`;}).join("")}</tbody></table></div>`;
}
const root=document.querySelector("#cast-content");if(root){const observer=new MutationObserver(()=>{if(!root.hidden){observer.disconnect();render();}});observer.observe(root,{attributes:true,childList:true,subtree:true});if(!root.hidden)render();}