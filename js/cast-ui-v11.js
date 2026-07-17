const content = document.querySelector("#cast-content");
const observer = new MutationObserver(() => refreshCastUi());
if(content) observer.observe(content,{childList:true,subtree:true});
refreshCastUi();

function refreshCastUi(){
  const skillsContainer=document.querySelector("#skills-container");
  if(skillsContainer) skillsContainer.classList.add("cast-view-skills");
  document.querySelectorAll("#skills-container .skill-section").forEach(section=>{
    const title=section.querySelector("h3");
    if(title){
      const text=title.textContent.trim();
      const map={"GENERAL SKILLS":"一般技能","SOCIAL":"社会","CONNECTIONS":"コネクション","STYLE SKILLS":"スタイル技能"};
      if(map[text]) title.innerHTML=`${map[text]} <small>${text}</small>`;
    }
    const isStyle=title?.textContent.includes("スタイル技能");
    const headers=section.querySelectorAll("thead th");
    const labels=["名称","LV","♠","♣","♥","♦",isStyle?"詳細":""];
    headers.forEach((th,index)=>{ if(labels[index]!==undefined) th.textContent=labels[index]; });
    if(!isStyle){
      section.querySelectorAll("tr").forEach(row=>{
        const cells=row.children;
        if(cells.length>=7) cells[6].remove();
      });
    }else{
      section.querySelectorAll("tbody tr").forEach(row=>row.lastElementChild?.classList.add("skill-detail-cell"));
    }
  });
  const cs=document.querySelector(".ability-card--cs");
  if(cs){
    cs.classList.add("cast-cs-compact");
    const label=cs.querySelector(".ability-card__label");
    if(label) label.textContent="現在値";
  }
  document.querySelectorAll(".ability-card header span:nth-child(2)").forEach(label=>{
    const map={REASON:"理性",PASSION:"感情",LIFE:"生命",MUNDANE:"外界"};
    if(map[label.textContent.trim()]) label.innerHTML=`${map[label.textContent.trim()]} <small>${label.textContent.trim()}</small>`;
  });
}
