/* Materialize the fixed proper-name General skill rows once, so their controls
 * update the editor's internal skill data instead of transient display rows. */
(function(){
  const MASTER_NAMES=["製作：","芸術：","操縦："];
  let running=false;
  let finished=false;

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

  function materialize(name){
    const visible=rows().find(row=>rowName(row)===name);
    if(!visible)return false;

    const level=Number(visible.querySelector('[data-f="level"]')?.value||0);
    const acquired=[...visible.querySelectorAll('[data-f="reason"],[data-f="passion"],[data-f="life"],[data-f="mundane"]')]
      .some(control=>control.checked);
    if(level>0||acquired)return false;

    const addButton=document.querySelector("#add-general");
    if(!addButton)return false;
    addButton.click();

    const blank=[...rows()].reverse().find(row=>rowName(row)==="");
    if(!blank)return false;

    setControl(blank.querySelector('[data-f="name"]'),name);
    setControl(blank.querySelector('[data-f="skill_kind"]'),"proper");
    setControl(blank.querySelector('[data-f="level"]'),0);
    return true;
  }

  function run(attempt=0){
    if(running||finished)return;
    const root=document.querySelector("#general-skills");
    if(!root||!root.querySelector("tr[data-skill-key]")){
      if(attempt<120)setTimeout(()=>run(attempt+1),50);
      return;
    }

    running=true;
    const missing=MASTER_NAMES.find(name=>{
      const row=rows().find(item=>rowName(item)===name);
      if(!row)return false;
      const level=Number(row.querySelector('[data-f="level"]')?.value||0);
      return level===0;
    });

    const changed=missing?materialize(missing):false;
    running=false;

    if(changed){
      requestAnimationFrame(()=>run(attempt+1));
      return;
    }

    finished=true;
    window.TNXExperience?.queue?.();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>run(),{once:true});
  else run();
})();
