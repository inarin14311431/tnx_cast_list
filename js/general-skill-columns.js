/* Split General skills into two fixed columns without repeated subtree cloning. */
(function(){
  const FIRST_COLUMN_END="交渉";

  function isGeneralGroup(group){
    const title=group?.querySelector(".skill-group-title")?.textContent||"";
    return title.includes("一般技能");
  }

  function ensureGeneralAddButton(group){
    const source=document.querySelector("#add-general");
    if(!group||!source)return;

    document.querySelectorAll("#general-skills .general-skill-heading-toolbar").forEach(toolbar=>{
      if(!group.contains(toolbar))toolbar.remove();
    });
    if(group.querySelector(":scope > .general-skill-heading-toolbar"))return;

    const toolbar=document.createElement("span");
    toolbar.className="toolbar skill-toolbar general-skill-heading-toolbar";

    const button=source.cloneNode(true);
    button.removeAttribute("id");
    button.classList.add("general-skill-add-inline");
    button.setAttribute("aria-label","一般技能を追加");
    button.addEventListener("click",event=>{
      event.preventDefault();
      event.stopPropagation();
      source.click();
    });

    toolbar.append(button);
    group.append(toolbar);
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

  function splitGeneralSkills(){
    const root=document.querySelector("#general-skills");
    if(!root)return;
    removeGeneralOrderControls(root);

    const general=[...root.children].find(group=>isGeneralGroup(group)&&!group.classList.contains("general-skill-column--second"));
    if(!general)return;

    if(general.classList.contains("general-skill-column--first")){
      const second=root.querySelector(".general-skill-column--second");
      ensureGeneralAddButton(second);
      return;
    }

    const table=general.querySelector(".skill-table");
    const tbody=table?.tBodies?.[0];
    if(!table||!tbody)return;

    const rows=[...tbody.rows];
    const splitIndex=rows.findIndex(row=>row.querySelector('[data-f="name"]')?.value===FIRST_COLUMN_END);
    if(splitIndex<0||splitIndex>=rows.length-1)return;

    general.classList.add("general-skill-column","general-skill-column--first");
    general.querySelectorAll(".general-skill-heading-toolbar").forEach(toolbar=>toolbar.remove());

    const second=document.createElement("section");
    second.className="skill-group general-skill-column general-skill-column--second";

    const heading=general.querySelector(".skill-group-title")?.cloneNode(true);
    heading?.querySelector(".general-skill-heading-toolbar")?.remove();
    const secondTable=table.cloneNode(false);
    const thead=table.tHead?.cloneNode(true);
    const secondBody=document.createElement("tbody");
    if(heading)second.append(heading);
    if(thead)secondTable.append(thead);
    secondTable.append(secondBody);
    second.append(secondTable);

    rows.slice(splitIndex+1).forEach(row=>secondBody.append(row));
    general.after(second);
    ensureGeneralAddButton(second);
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
