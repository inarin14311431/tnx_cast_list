/* Materialize the fixed proper-name General skill rows exactly once per page.
 * This prevents the transient master rows from failing to update internal data. */
(function(){
  const MASTER_NAMES=["製作：","芸術：","操縦："];
  const pending=new Set(MASTER_NAMES);
  let busy=false;

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
    return (row.querySelector('[data-f="name"]')?.value||"").trim();
  }

  function setControl(control,value){
    if(!control)return;
    if(control.type==="checkbox")control.checked=Boolean(value);
    else control.value=String(value);
    control.dispatchEvent(new Event("input",{bubbles:true}));
  }

  function continueLater(attempt){
    requestAnimationFrame(()=>run(attempt+1));
  }

  function run(attempt=0){
    if(busy||pending.size===0)return;

    const root=document.querySelector("#general-skills");
    if(!root||!root.querySelector("tr[data-skill-key]")){
      if(attempt<120)setTimeout(()=>run(attempt+1),50);
      return;
    }

    const name=pending.values().next().value;
    const visible=rows().find(row=>rowName(row)===name);
    if(!visible){
      pending.delete(name);
      continueLater(attempt);
      return;
    }

    const level=Number(visible.querySelector('[data-f="level"]')?.value||0);
    const acquired=[...visible.querySelectorAll('[data-f="reason"],[data-f="passion"],[data-f="life"],[data-f="mundane"]')]
      .some(control=>control.checked);

    /* Already an acquired real row: do not create another one. */
    if(level>0||acquired){
      pending.delete(name);
      continueLater(attempt);
      return;
    }

    const addButton=document.querySelector("#add-general");
    if(!addButton){
      pending.delete(name);
      continueLater(attempt);
      return;
    }

    busy=true;
    addButton.click();

    requestAnimationFrame(()=>{
      const blank=[...rows()].reverse().find(row=>rowName(row)==="");
      if(blank){
        setControl(blank.querySelector('[data-f="name"]'),name);
        setControl(blank.querySelector('[data-f="skill_kind"]'),"proper");
        setControl(blank.querySelector('[data-f="level"]'),0);
      }

      /* Mark processed regardless of render timing, so it can never loop. */
      pending.delete(name);
      busy=false;
      continueLater(attempt);
    });
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>run(),{once:true});
  else run();
})();
