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
    return `<td class="style-view-cell style-view-cell--description"><textarea class="style-field-scroll style-description-expandable" rows="1" wrap="soft" readonly role="button" tabindex="0" aria-expanded="false" aria-label="解説。クリックで全文を表示" title="クリックで全文を表示">${esc(text)}</textarea></td>`;
  }
  const oneLine=text.replace(/\r?\n/g," ");
  return `<td class="style-view-cell style-view-cell--${key}"><input class="style-field-scroll" type="text" readonly value="${esc(oneLine)}" title="${esc(text)}" aria-label="${esc(key)}"></td>`;
}

function measureDescriptionWidth(field){
  const style=getComputedStyle(field);
  const probe=document.createElement("span");
  probe.style.position="fixed";
  probe.style.left="-10000px";
  probe.style.top="-10000px";
  probe.style.visibility="hidden";
  probe.style.pointerEvents="none";
  probe.style.whiteSpace="pre";
  probe.style.fontFamily=style.fontFamily;
  probe.style.fontSize=style.fontSize;
  probe.style.fontStyle=style.fontStyle;
  probe.style.fontWeight=style.fontWeight;
  probe.style.letterSpacing=style.letterSpacing;
  probe.textContent=String(field.value||"").split(/\r?\n/).sort((a,b)=>b.length-a.length)[0]||" ";
  document.body.append(probe);
  const padding=(parseFloat(style.paddingLeft)||0)+(parseFloat(style.paddingRight)||0)+28;
  const width=Math.ceil(probe.getBoundingClientRect().width+padding);
  probe.remove();
  return width;
}

function collapseDescription(field){
  if(!field?.classList.contains("is-expanded"))return;
  const table=field.closest("table");
  const descriptionColumn=table?.querySelector("col.style-col-description");

  field.classList.remove("is-expanded");
  field.setAttribute("aria-expanded","false");
  field.setAttribute("aria-label","解説。クリックで全文を表示");
  field.title="クリックで全文を表示";
  field.style.removeProperty("height");
  field.scrollTop=0;
  field.scrollLeft=0;
  field.closest("tr")?.classList.remove("is-description-expanded");
  descriptionColumn?.style.removeProperty("width");
  table?.style.removeProperty("min-width");
}

function expandDescription(field){
  const table=field.closest("table");
  const descriptionColumn=table?.querySelector("col.style-col-description");
  if(!table||!descriptionColumn)return;

  table.querySelectorAll(".style-description-expandable.is-expanded").forEach(openField=>{
    if(openField!==field)collapseDescription(openField);
  });

  const currentWidth=Math.max(1,parseFloat(getComputedStyle(descriptionColumn).width)||field.getBoundingClientRect().width||320);
  const measuredWidth=measureDescriptionWidth(field);
  const viewportLimit=Math.max(currentWidth,Math.min(960,window.innerWidth*.85));
  const targetWidth=Math.max(currentWidth,Math.min(measuredWidth,viewportLimit));
  const tableWidth=table.getBoundingClientRect().width;

  descriptionColumn.style.setProperty("width",`${targetWidth}px`,"important");
  table.style.setProperty("min-width",`${Math.ceil(tableWidth+(targetWidth-currentWidth))}px`,"important");

  field.classList.add("is-expanded");
  field.setAttribute("aria-expanded","true");
  field.setAttribute("aria-label","解説。クリックで閉じる");
  field.title="クリックで閉じる";
  field.style.setProperty("height","auto","important");
  const height=Math.max(35,field.scrollHeight+2);
  field.style.setProperty("height",`${height}px`,"important");
  field.closest("tr")?.classList.add("is-description-expanded");
}

function toggleDescription(field){
  if(field.classList.contains("is-expanded"))collapseDescription(field);
  else expandDescription(field);
}

function initializeDescriptionToggles(section){
  section.querySelectorAll(".style-description-expandable").forEach(field=>{
    field.addEventListener("click",event=>{
      event.preventDefault();
      toggleDescription(field);
    });
    field.addEventListener("keydown",event=>{
      if(event.key!=="Enter"&&event.key!==" ")return;
      event.preventDefault();
      toggleDescription(field);
    });
  });
}

function renderTable(section,skills){
  section.classList.add("style-skill-section-v47","style-skill-view-editorlike");
  const heading=section.querySelector("h3");
  section.innerHTML=`
    <div class="data-table-wrapper style-skill-view-wrapper">
      <table class="data-table style-skill-detail-table style-skill-view-table">
        <colgroup>
          <col class="style-col-name">
          <col class="style-col-kind">
          <col class="style-col-level">
          ${SUITS.map(()=>'<col class="style-col-suit">').join("")}
          <col class="style-col-skill">
          <col class="style-col-limit">
          <col class="style-col-timing">
          <col class="style-col-target">
          <col class="style-col-range">
          <col class="style-col-difficulty">
          <col class="style-col-confrontation">
          <col class="style-col-description">
          <col class="style-col-page">
        </colgroup>
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
  if(heading)section.prepend(heading);
  initializeDescriptionToggles(section);
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