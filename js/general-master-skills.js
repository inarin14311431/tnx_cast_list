/* Materialize fixed proper-name General skill rows once and keep suit/level values synchronized. */
(function(){
  const MASTER_NAMES=["製作：","芸術：","操縦："];
  const SUITS=["reason","passion","life","mundane"];
  const completed=new Set();
  const materializing=new Set();
  let readyNotified=false;

  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));

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

  function rowScore(row){
    const level=Math.max(0,Number(row?.querySelector('[data-f="level"]')?.value||0));
    return level*10+selectedCount(row);
  }

  function setControl(control,value){
    if(!control)return;
    if(control.type==="checkbox")control.checked=Boolean(value);
    else control.value=String(value);
    control.dispatchEvent(new Event("input",{bubbles:true}));
    control.dispatchEvent(new Event("change",{bubbles:true}));
  }

  function restoreScroll(position){
    window.scrollTo(position.x,position.y);
    requestAnimationFrame(()=>window.scrollTo(position.x,position.y));
  }

  async function waitFor(getter,attempts=100){
    for(let attempt=0;attempt<attempts;attempt++){
      const value=getter();
      if(value)return value;
      await wait(40);
    }
    return null;
  }

  async function settle(){
    await nextFrame();
    await wait(40);
  }

  async function removeDuplicateExactRows(name,preferredKey=""){
    for(let attempt=0;attempt<12;attempt++){
      const matches=rows().filter(row=>rowName(row)===name);
      if(matches.length<=1)return matches[0]||null;

      const keep=matches.find(row=>row.dataset.skillKey===preferredKey)
        || [...matches].sort((a,b)=>rowScore(b)-rowScore(a))[0];
      const victim=matches.find(row=>row!==keep);
      const button=victim?.querySelector("[data-delete-skill]");
      if(!button)return keep;

      button.click();
      await settle();
    }
    return rows().find(row=>rowName(row)===name)||null;
  }

  async function materialize(name){
    if(completed.has(name)||materializing.has(name))return;
    materializing.add(name);

    const scrollPosition={x:window.scrollX,y:window.scrollY};

    try{
      let visible=await waitFor(()=>rows().find(row=>rowName(row)===name));
      if(!visible)return;

      visible=await removeDuplicateExactRows(name)||visible;
      const level=Number(visible.querySelector('[data-f="level"]')?.value||0);
      const acquired=suitBoxes(visible).some(control=>control.checked);
      if(level>0||acquired){
        completed.add(name);
        return;
      }

      const beforeKeys=new Set(rows().map(row=>row.dataset.skillKey));
      const addButton=document.querySelector("#add-general");
      if(!addButton)return;

      addButton.click();
      restoreScroll(scrollPosition);

      const blank=await waitFor(()=>[...rows()].reverse().find(row=>{
        return rowName(row)===""&&!beforeKeys.has(row.dataset.skillKey);
      }));
      if(!blank)return;

      const realKey=blank.dataset.skillKey;
      setControl(blank.querySelector('[data-f="level"]'),0);
      setControl(blank.querySelector('[data-f="skill_kind"]'),"proper");
      setControl(blank.querySelector('[data-f="name"]'),name);
      await settle();

      /* The core editor now owns the newly created row. Deleting the old
         generated master row only forces a clean rerender; it does not remove
         the real skill because its key is different. */
      await removeDuplicateExactRows(name,realKey);
      completed.add(name);
    }finally{
      restoreScroll(scrollPosition);
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

    if(!readyNotified){
      readyNotified=true;
      window.dispatchEvent(new CustomEvent("tnx:general-master-ready"));
    }
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
