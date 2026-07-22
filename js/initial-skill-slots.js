/* Create the initial Social/Connection slots once for a new cast. */
(function(){
  if(new URLSearchParams(location.search).has("id"))return;

  const TARGETS={social:3,connection:3};
  const LABELS={social:"社会：",connection:"コネ："};
  const BUTTONS={social:"#add-social",connection:"#add-connection"};

  function categoryGroup(category){
    return [...document.querySelectorAll("#general-skills>.skill-group")].find(group=>{
      const title=group.querySelector(".skill-group-title")?.textContent||"";
      return category==="social"?title.includes("社会"):title.includes("コネクション");
    });
  }

  function countSlots(category){
    const group=categoryGroup(category);
    if(!group)return 0;
    return [...group.querySelectorAll('tbody tr[data-skill-key]')].filter(row=>{
      const name=(row.querySelector('[data-f="name"]')?.value||"").trim();
      return name===LABELS[category];
    }).length;
  }

  function normalizeLegacyLabels(){
    document.querySelectorAll('#general-skills tbody tr[data-skill-key] [data-f="name"]').forEach(input=>{
      const value=input.value.trim();
      if(value==="社会：初期取得")input.value="社会：";
      if(value==="コネ：初期取得")input.value="コネ：";
    });
  }

  function initialize(attempt=0){
    const root=document.querySelector("#general-skills");
    if(!root||!root.querySelector('tr[data-skill-key]')){
      if(attempt<100)setTimeout(()=>initialize(attempt+1),80);
      return;
    }

    normalizeLegacyLabels();

    for(const category of ["social","connection"]){
      const button=document.querySelector(BUTTONS[category]);
      if(!button)continue;
      const missing=Math.max(0,TARGETS[category]-countSlots(category));
      for(let index=0;index<missing;index++)button.click();
    }

    window.TNXExperience?.queue?.();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>initialize(),{once:true});
  else initialize();
})();