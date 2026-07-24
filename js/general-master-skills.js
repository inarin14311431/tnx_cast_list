/* Materialize the fixed proper-name General skill rows and keep suit/level values synchronized. */
(function(){
  const MASTER_NAMES=["製作：","芸術：","操縦："];
  const SUITS=["reason","passion","life","mundane"];
  const completed=new Set();
  const materializing=new Set();

  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

  function generalGroups(){
    return [...document.querySelectorAll("#general-skills>.skill-group")].filter(group=>{
      const title=group.querySelector(".skill-group-title")?.textContent||"";
      return title.includes("一般技能");
    });
  }

  function rows(){
    return generalGroups().flatMap(group=>[...group.querySelectorAll("tbody tr[data-skill-key]")]);
  }

  function rowName(row){
    return (row?.querySelector('[data-f="name"]')?.value||"").trim();
  }

  function isProperName(name){
    return MASTER_NAMES.some(master=>String(name||"").startsWith(master));
  }

  function suitBoxes(row){
    return SUITS.map(suit=>row.querySelector(`[data-f="${suit}"]`)).filter(Boolean);
  }

  function selectedCount(row){
    return suitBoxes(row).filter(box=>box.checked).length;
  }

  function setControl(control,value){
    if(!control)return;
    if(control.type==="checkbox")control.checked=Boolean(value);
    else control.value=String(value);
    control.dispatchEvent(new Event("input",{bubbles:true}));
    control.dispatchEvent(new Event("change",{bubbles:true}));
  }

  async function waitFor(getter,attempts=80){
    for(let attempt=0;attempt<attempts;attempt++){
      const value=getter();
      if(value)return value;
      await wait(40);
    }
    return null;
  }

  async function materialize(name){
    if(completed.has(name)||materializing.has(name))return;
    materializing.add(name);

    try{
      const visible=await waitFor(()=>rows().find(row=>rowName(row)===name));
      if(!visible)return;

      const level=Number(visible.querySelector('[data-f="level"]')?.value||0);
      const acquired=suitBoxes(visible).some(control=>control.checked);
      if(level>0||acquired){
        completed.add(name);
        return;
      }

      const originalKey=visible.dataset.skillKey;
      const addButton=document.querySelector("#add-general");
      if(!addButton)return;
      addButton.click();

      const blank=await waitFor(()=>[...rows()].reverse().find(row=>{
        return rowName(row)===""&&row.dataset.skillKey!==originalKey;
      }));
      if(!blank)return;

      const realKey=blank.dataset.skillKey;
      setControl(blank.querySelector('[data-f="level"]'),0);
      setControl(blank.querySelector('[data-f="skill_kind"]'),"proper");
      setControl(blank.querySelector('[data-f="name"]'),name);

      /* Row handlers resolve the skill from data-skill-key at event time.
       * Reusing the visible master row keeps the fixed layout while binding it
       * to the real skill object that was just added to the editor state. */
      visible.dataset.skillKey=realKey;
      blank.remove();
      completed.add(name);
    }finally{
      materializing.delete(name);
    }
  }

  async function materializeAll(){
    const root=document.querySelector("#general-skills");
    if(!root||!root.querySelector("tr[data-skill-key]")){
      setTimeout(materializeAll,80);
      return;
    }
    for(const name of MASTER_NAMES)await materialize(name);
  }

  function synchronizeSuitLevel(box){
    const row=box.closest('tr[data-skill-key]');
    if(!row||!isProperName(rowName(row)))return;

    requestAnimationFrame(()=>{
      const level=row.querySelector('[data-f="level"]');
      if(!level)return;
      const count=selectedCount(row);
      const current=Math.max(0,Number(level.value||0));
      const next=box.checked?Math.max(current,count):count;
      if(next===current)return;
      level.value=String(next);
      level.dispatchEvent(new Event("input",{bubbles:true}));
      level.dispatchEvent(new Event("change",{bubbles:true}));
    });
  }

  document.addEventListener("input",event=>{
    const box=event.target.closest?.('[data-f="reason"],[data-f="passion"],[data-f="life"],[data-f="mundane"]');
    if(box?.type==="checkbox")synchronizeSuitLevel(box);
  });

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",materializeAll,{once:true});
  else materializeAll();
})();
