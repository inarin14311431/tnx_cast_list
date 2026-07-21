/* Reorder controls for Social and Connection skills, including persisted sort order. */
(function(){
  const CATEGORY_BY_TITLE={"社会":"social","コネクション":"connection"};

  function groupCategory(group){
    const title=group?.querySelector(".skill-group-title")?.textContent||"";
    return Object.entries(CATEGORY_BY_TITLE).find(([label])=>title.includes(label))?.[1]||"";
  }

  function enhanceGroup(group){
    const category=groupCategory(group);
    if(!category)return;
    const rows=[...group.querySelectorAll("tbody tr[data-skill-key]")];
    rows.forEach((row,index)=>{
      row.dataset.orderCategory=category;
      const cell=row.lastElementChild;
      if(!cell||cell.querySelector(".skill-order-controls"))return;
      const controls=document.createElement("span");
      controls.className="skill-order-controls";
      controls.innerHTML=`<button type="button" class="skill-order-button" data-skill-move="up" aria-label="上へ移動" title="上へ移動">▲</button><button type="button" class="skill-order-button" data-skill-move="down" aria-label="下へ移動" title="下へ移動">▼</button>`;
      cell.prepend(controls);
    });
    updateDisabled(group);
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
    new MutationObserver(queue).observe(root,{childList:true,subtree:true});
    queue();
  }

  const style=document.createElement("style");
  style.textContent=`
    #general-skills .skill-order-controls{display:inline-flex;flex-direction:column;gap:2px;vertical-align:middle;margin-right:4px}
    #general-skills .skill-order-button{width:24px;min-width:24px;height:18px;min-height:18px;padding:0;border:1px solid rgba(90,220,255,.45);background:rgba(4,18,30,.82);color:#8de9ff;font-size:10px;line-height:16px;cursor:pointer}
    #general-skills .skill-order-button:hover:not(:disabled){background:rgba(20,90,118,.8);color:#fff}
    #general-skills .skill-order-button:disabled{opacity:.22;cursor:default}
    #general-skills .skill-table td:last-child{white-space:nowrap;width:68px}
    #general-skills .row-delete{vertical-align:middle}
  `;
  document.head.append(style);

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});
  else initialize();
})();
