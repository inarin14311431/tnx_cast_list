import { supabase } from "./supabase-client.js";

const PREFIX="@@TNX_STYLE_DETAIL_V1@@";
const FIELDS=[
  ["skill","技能"],["limit","上限"],["timing","タイミング"],["target","対象"],
  ["range","射程"],["difficulty","目標値"],["confrontation","対決"],
  ["description","解説"],["page","参照P"]
];
const SUITS=[
  ["reason","理性","♠"],["passion","感情","♣"],["life","生命","♥"],["mundane","外界","♦"]
];
const esc=value=>String(value??"").replace(/[&<>\"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]));

function parseDetail(value){
  const text=String(value||"");
  const empty=Object.fromEntries(FIELDS.map(([key])=>[key,""]));
  if(text.startsWith(PREFIX)){
    try{return {...empty,...JSON.parse(text.slice(PREFIX.length).trim())};}catch{}
  }
  const labels={"技能":"skill","上限":"limit","タイミング":"timing","対象":"target","射程":"range","目標値":"difficulty","対決":"confrontation","解説":"description","参照":"page","参照P":"page"};
  const data={...empty};
  const remain=[];
  for(const line of text.split(/\r?\n/)){
    const match=line.match(/^([^：:]+)[：:]\s*(.*)$/);
    const key=match&&labels[match[1].trim()];
    if(key)data[key]=match[2];else if(line.trim())remain.push(line);
  }
  if(!data.description)data.description=remain.join("\n");
  return data;
}

function findSection(){
  const container=document.querySelector("#skills-container");
  if(!container)return null;
  return [...container.querySelectorAll("section")].find(section=>{
    const title=section.querySelector("h3")?.textContent||"";
    return /STYLE\s*SKILLS|スタイル技能/i.test(title);
  })||null;
}

function valueCell(value,key){
  const text=String(value??"");
  if(key==="description"){
    return `<td class="style-view-cell style-view-cell--description"><textarea class="style-field-scroll style-description-expandable" rows="1" wrap="off" readonly aria-label="解説" title="${esc(text)}">${esc(text)}</textarea></td>`;
  }
  const oneLine=text.replace(/\r?\n/g," ");
  return `<td class="style-view-cell style-view-cell--${key}"><input class="style-field-scroll" type="text" readonly value="${esc(oneLine)}" title="${esc(text)}" aria-label="${esc(key)}"></td>`;
}

function renderTable(section,skills){
  section.classList.add("style-skill-section-v47","style-skill-view-editorlike");
  section.innerHTML=`
    <h3>スタイル技能 <small>STYLE SKILLS</small></h3>
    <div class="data-table-wrapper style-skill-view-wrapper">
      <table class="data-table style-skill-detail-table style-skill-view-table">
        <thead><tr>
          <th>名称</th><th>種別</th><th>LV</th>
          ${SUITS.map(([,label])=>`<th>${label}</th>`).join("")}
          ${FIELDS.map(([,label])=>`<th>${label}</th>`).join("")}
        </tr></thead>
        <tbody>${skills.map(skill=>{
          const detail=parseDetail(skill.description);
          const kind={normal:"通常",secret:"秘技",ultimate:"奥義"}[skill.skill_kind]||skill.skill_kind||"";
          return `<tr>
            ${valueCell(skill.name,"name")}${valueCell(kind,"kind")}${valueCell(skill.level,"level")}
            ${SUITS.map(([key,,mark])=>`<td class="style-suit-cell"><span class="style-suit-mark ${skill[key]?"is-active":""}">${mark}</span></td>`).join("")}
            ${FIELDS.map(([key])=>valueCell(detail[key],key)).join("")}
          </tr>`;
        }).join("")}</tbody>
      </table>
    </div>`;
}

async function loadSkills(){
  const publicId=new URLSearchParams(location.search).get("id")?.trim();
  if(!publicId)return [];
  const {data:character,error:characterError}=await supabase.from("characters").select("id").eq("public_id",publicId).maybeSingle();
  if(characterError||!character)return [];
  const {data,error}=await supabase.from("character_skills").select("*").eq("character_id",character.id).eq("category","style").order("sort_order");
  return error?[]:(data||[]);
}

let running=false;
let completed=false;
async function attempt(){
  if(running||completed)return;
  const section=findSection();
  if(!section)return;
  running=true;
  try{
    const skills=await loadSkills();
    if(!skills.length)return;
    renderTable(section,skills);
    completed=true;
  }finally{running=false;}
}

const root=document.querySelector("#cast-content")||document.body;
const observer=new MutationObserver(()=>attempt());
observer.observe(root,{attributes:true,childList:true,subtree:true});
let tries=0;
const timer=setInterval(async()=>{
  await attempt();
  if(completed||++tries>=40){clearInterval(timer);if(completed)observer.disconnect();}
},150);
attempt();