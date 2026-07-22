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

    document.querySelectorAll("#general-skills .general-skill-heading-row,#general-skills .general-skill-heading-toolbar").forEach(element=>element.remove());

    let heading=group.querySelector(":scope > .skill-group-heading");
    let title=heading?.querySelector(":scope > .skill-group-title")||group.querySelector(":scope > .skill-group-title");
    if(!title)return;

    if(!heading){
      heading=document.createElement("div");
      heading.className="skill-group-heading";
      title.before(heading);
      heading.append(title);
    }

    if(heading.querySelector(":scope > .skill-group-actions[data-general-add-actions]"))return;
    heading.querySelector(":scope > .skill-group-actions")?.remove();

    const actions=document.createElement("div");
    actions.className="skill-group-actions";
    actions.dataset.v27="1";
    actions.dataset.generalAddActions="1";

    const button=document.createElement("button");
    button.type="button";
    button.className="skill-inline-add";
    button.dataset.skillUiAction="#add-general";
    button.setAttribute("aria-label","一般技能を追加");
    button.innerHTML='一般技能を追加<small>ADD GENERAL</small>';

    actions.append(button);
    heading.append(actions);
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