/* Normalize initial Social/Connection slots and remove stale blank General rows. */
(function(){
  const isNewCast=!new URLSearchParams(location.search).has("id");
  const TARGETS={social:4,connection:3};
  const LABELS={social:"社会：",connection:"コネ："};
  const BUTTONS={social:"#add-social",connection:"#add-connection"};
  let generalCleanupFinished=false;

  function categoryGroup(category){
    return [...document.querySelectorAll("#general-skills>.skill-group")].find(group=>{
      const title=group.querySelector(".skill-group-title")?.textContent||"";
      return category==="social"?title.includes("社会"):title.includes("コネクション");
    });
  }

  function rows(category){
    return [...(categoryGroup(category)?.querySelectorAll('tbody tr[data-skill-key]')||[])];
  }

  function normalizeLegacyLabel(){
    const legacy={"社会：初期取得":"社会：","コネ：初期取得":"コネ：","初期取得":""};
    for(const row of document.querySelectorAll('#general-skills tbody tr[data-skill-key]')){
      const input=row.querySelector('[data-f="name"]');
      if(!input||!(input.value in legacy))continue;
      const group=row.closest(".skill-group");
      const title=group?.querySelector(".skill-group-title")?.textContent||"";
      const replacement=input.value==="初期取得"?(title.includes("コネ")?"コネ：":"社会："):legacy[input.value];
      input.value=replacement;
      input.dispatchEvent(new Event("input",{bubbles:true}));
      return false;
    }
    return true;
  }

  function slotCount(category){
    const label=LABELS[category];
    return rows(category).filter(row=>(row.querySelector('[data-f="name"]')?.value||"").trim()===label).length;
  }

  function ensureSlots(category){
    if(!isNewCast)return true;
    if(slotCount(category)>=TARGETS[category])return true;
    const button=document.querySelector(BUTTONS[category]);
    if(!button)return false;
    button.click();
    return false;
  }

  function cleanupOneBlankGeneral(){
    if(generalCleanupFinished)return true;
    const generalGroups=[...document.querySelectorAll("#general-skills>.skill-group")].filter(group=>{
      const title=group.querySelector(".skill-group-title")?.textContent||"";
      return title.includes("一般技能");
    });
    for(const row of generalGroups.flatMap(group=>[...group.querySelectorAll('tbody tr[data-skill-key]')])){
      const name=(row.querySelector('[data-f="name"]')?.value||"").trim();
      if(name)continue;
      const deleteButton=row.querySelector('[data-delete-skill]');
      if(deleteButton){deleteButton.click();return false;}
    }
    generalCleanupFinished=true;
    return true;
  }

  function run(attempt=0){
    const root=document.querySelector("#general-skills");
    if(!root||!root.querySelector("tr[data-skill-key]")){
      if(attempt<100)setTimeout(()=>run(attempt+1),80);
      return;
    }

    const labelsDone=normalizeLegacyLabel();
    const socialDone=ensureSlots("social");
    const connectionDone=ensureSlots("connection");
    const cleanupDone=cleanupOneBlankGeneral();

    if(!labelsDone||!socialDone||!connectionDone||!cleanupDone){
      setTimeout(()=>run(attempt+1),90);
      return;
    }
    window.TNXExperience?.queue?.();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>run(),{once:true});
  else run();
})();