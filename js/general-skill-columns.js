/* Split General skills into two fixed columns without repeated subtree cloning. */
(function(){
  const FIRST_COLUMN_END="交渉";

  function isGeneralGroup(group){
    const title=group?.querySelector(".skill-group-title")?.textContent||"";
    return title.includes("一般技能");
  }

  function removeGeneralOrderControls(root){
    [...root.children].filter(isGeneralGroup).forEach(group=>{
      group.querySelectorAll("[data-skill-move],.skill-order-button").forEach(button=>button.remove());
      group.querySelectorAll(".skill-row-actions").forEach(actions=>{
        const deleteButton=actions.querySelector(".row-delete");
        const cell=actions.parentElement;
        if(deleteButton&&cell)cell.insertBefore(deleteButton,actions);
        actions.remove();
      });
      group.querySelectorAll("tr[data-skill-key]").forEach(row=>delete row.dataset.orderCategory);
    });
  }

  function placeBlankSlots(firstBody,secondBody){
    if(!firstBody||!secondBody)return;
    const root=document.querySelector("#general-skills");
    if(!root)return;
    root.querySelectorAll('tr[data-general-slot-column="left"]').forEach(row=>firstBody.append(row));
    root.querySelectorAll('tr[data-general-slot-column="right"]').forEach(row=>secondBody.append(row));
  }

  function splitGeneralSkills(){
    const root=document.querySelector("#general-skills");
    if(!root)return;
    removeGeneralOrderControls(root);

    const general=[...root.children].find(group=>isGeneralGroup(group)&&!group.classList.contains("general-skill-column--second"));
    if(!general)return;

    if(general.classList.contains("general-skill-column--first")){
      const second=root.querySelector(".general-skill-column--second");
      placeBlankSlots(general.querySelector("tbody"),second?.querySelector("tbody"));
      return;
    }

    const table=general.querySelector(".skill-table");
    const tbody=table?.tBodies?.[0];
    if(!table||!tbody)return;

    const rows=[...tbody.rows];
    const splitIndex=rows.findIndex(row=>row.querySelector('[data-f="name"]')?.value===FIRST_COLUMN_END);
    if(splitIndex<0||splitIndex>=rows.length-1)return;

    general.classList.add("general-skill-column","general-skill-column--first");
    general.querySelectorAll(".general-skill-heading-row,.general-skill-heading-toolbar").forEach(element=>element.remove());

    const second=document.createElement("section");
    second.className="skill-group general-skill-column general-skill-column--second";

    const title=general.querySelector(".skill-group-title")?.cloneNode(true);
    const secondTable=table.cloneNode(false);
    const thead=table.tHead?.cloneNode(true);
    const secondBody=document.createElement("tbody");
    if(title)second.append(title);
    if(thead)secondTable.append(thead);
    secondTable.append(secondBody);
    second.append(secondTable);

    rows.slice(splitIndex+1).forEach(row=>secondBody.append(row));
    general.after(second);
    placeBlankSlots(tbody,secondBody);
    removeGeneralOrderControls(root);
  }

  function initialize(){
    const root=document.querySelector("#general-skills");
    if(!root){setTimeout(initialize,100);return;}
    let queued=false;
    const queue=()=>{
      if(queued)return;
      queued=true;
      queueMicrotask(()=>{
        queued=false;
        splitGeneralSkills();
      });
    };
    new MutationObserver(queue).observe(root,{childList:true});
    queue();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});
  else initialize();
})();
