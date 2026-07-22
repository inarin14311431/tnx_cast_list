/* Reorder controls for Social and Connection skills, including persisted sort order. */
(function(){
  const CATEGORY_BY_TITLE={"社会":"social","コネクション":"connection"};

  function groupCategory(group){
    const title=group?.querySelector(".skill-group-title")?.textContent||"";
    return Object.entries(CATEGORY_BY_TITLE).find(([label])=>title.includes(label))?.[1]||"";
  }

  function styleDeleteButton(button){
    if(!button)return;
    button.classList.add("skill-action-button","skill-action-delete");
    button.setAttribute("aria-label","削除");
    button.title="削除";
  }

  function enhanceGroup(group){
    const category=groupCategory(group);
    group.classList.toggle("skill-group--ordered",!!category);
    group.classList.toggle("skill-group--general",!category&&(group.querySelector(".skill-group-title")?.textContent||"").includes("一般技能"));

    const rows=[...group.querySelectorAll("tbody tr[data-skill-key]")];
    rows.forEach(row=>{
      const cell=row.lastElementChild;
      if(!cell)return;
      const deleteButton=cell.querySelector(".row-delete");
      styleDeleteButton(deleteButton);

      if(!category){
        row.querySelectorAll("[data-skill-move],.skill-order-button").forEach(button=>button.remove());
        const actions=cell.querySelector(".skill-row-actions");
        if(actions){
          if(deleteButton)cell.insertBefore(deleteButton,actions);
          actions.remove();
        }
        delete row.dataset.orderCategory;
        return;
      }

      row.dataset.orderCategory=category;
      let actions=cell.querySelector(".skill-row-actions");
      if(!actions){
        actions=document.createElement("span");
        actions.className="skill-row-actions";
        cell.append(actions);
        actions.innerHTML=`<button type="button" class="skill-action-button skill-order-button" data-skill-move="up" aria-label="上へ移動" title="上へ移動">▲</button><button type="button" class="skill-action-button skill-order-button" data-skill-move="down" aria-label="下へ移動" title="下へ移動">▼</button>`;
        if(deleteButton)actions.append(deleteButton);
      }
    });
    if(category)updateDisabled(group);
  }

  function updateDisabled(group){
    const rows=[...group.querySelectorAll("tbody tr[data-skill-key]")];
    rows.forEach((row,index)=>{
      const up=row.querySelector('[data-skill-move="up"]');
      const down=row.querySelector('[data-skill-move="down"]');
      if(up)up.disabled=index===0;
      if(down)down.disabled=index===rows.length-1;
    });
  }

  function enhance(){
    document.querySelectorAll("#general-skills .skill-group").forEach(enhanceGroup);
    document.querySelectorAll("#style-skills .row-delete,#outfit-list .row-delete").forEach(styleDeleteButton);
  }

  document.addEventListener("click",event=>{
    const button=event.target.closest("[data-skill-move]");
    if(!button)return;
    event.preventDefault();
    const row=button.closest("tr[data-skill-key]");
    const group=row?.closest(".skill-group");
    if(!row||!group||!groupCategory(group))return;
    if(button.dataset.skillMove==="up"){
      const previous=row.previousElementSibling;
      if(previous)row.parentElement.insertBefore(row,previous);
    }else{
      const next=row.nextElementSibling;
      if(next)row.parentElement.insertBefore(next,row);
    }
    updateDisabled(group);
    const input=row.querySelector("input,select,textarea");
    if(input)input.dispatchEvent(new Event("input",{bubbles:true}));
  },true);

  const originalFetch=window.fetch.bind(window);
  window.fetch=async function(input,init={}){
    try{
      const url=typeof input==="string"?input:input?.url||"";
      const method=String(init?.method||input?.method||"GET").toUpperCase();
      if(method==="POST"&&url.includes("/rest/v1/character_skills")&&typeof init.body==="string"){
        const body=JSON.parse(init.body);
        if(Array.isArray(body)){
          for(const category of ["social","connection"]){
            const group=[...document.querySelectorAll("#general-skills .skill-group")].find(item=>groupCategory(item)===category);
            if(!group)continue;
            const names=[...group.querySelectorAll("tbody tr[data-skill-key]")].map(row=>row.querySelector('[data-f="name"]')?.value||"");
            const categoryRows=body.filter(item=>item.category===category);
            const used=new Set();
            const ordered=[];
            for(const name of names){
              const index=categoryRows.findIndex((item,i)=>!used.has(i)&&String(item.name||"")===name);
              if(index>=0){used.add(index);ordered.push(categoryRows[index]);}
            }
            categoryRows.forEach((item,index)=>{if(!used.has(index))ordered.push(item);});
            let cursor=0;
            for(let index=0;index<body.length;index++)if(body[index].category===category)body[index]=ordered[cursor++];
          }
          body.forEach((item,index)=>item.sort_order=index);
          init={...init,body:JSON.stringify(body)};
        }
      }
    }catch(error){
      console.warn("skill order persistence skipped",error);
    }
    return originalFetch(input,init);
  };

  function initialize(){
    const root=document.querySelector("#general-skills");
    if(!root){setTimeout(initialize,100);return;}
    let queued=false;
    const queue=()=>{
      if(queued)return;
      queued=true;
      requestAnimationFrame(()=>{queued=false;enhance();});
    };
    new MutationObserver(queue).observe(document.body,{childList:true,subtree:true});
    queue();
  }

  const style=document.createElement("style");
  style.textContent=`
    .skill-row-actions{display:inline-flex;flex-direction:row;align-items:center;justify-content:flex-end;gap:3px;white-space:nowrap}
    .skill-action-button,#general-skills .skill-action-button,#style-skills .skill-action-button,#outfit-list .skill-action-button{box-sizing:border-box;width:26px!important;min-width:26px!important;height:26px!important;min-height:26px!important;margin:0!important;padding:0!important;border:1px solid rgba(90,220,255,.45)!important;border-radius:3px!important;background:rgba(4,18,30,.82)!important;color:#8de9ff!important;font-size:11px!important;font-weight:700!important;line-height:24px!important;text-align:center!important;cursor:pointer;vertical-align:middle}
    .skill-action-button:hover:not(:disabled){border-color:rgba(140,238,255,.9)!important;background:rgba(20,90,118,.8)!important;color:#fff!important}
    .skill-action-delete:hover:not(:disabled){border-color:rgba(255,120,135,.85)!important;background:rgba(112,28,42,.82)!important;color:#fff!important}
    .skill-action-button:disabled{opacity:.22!important;cursor:default!important}
    #general-skills .skill-table td:last-child{padding-left:3px;padding-right:3px;text-align:right;white-space:nowrap}
    #general-skills .skill-group--ordered .skill-table td:last-child{width:92px!important}
    #general-skills .skill-group--general .skill-table td:last-child{width:32px!important}
    #style-skills .skill-table td:last-child{text-align:center}
    #outfit-list .outfit-form>header .skill-action-button{flex:0 0 26px}
  `;
  document.head.append(style);

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});
  else initialize();
})();