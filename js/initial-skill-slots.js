/* Ensure new casts start with four Social and three Connection initial-acquisition slots. */
(function(){
  if(new URLSearchParams(location.search).has("id"))return;

  const TARGETS={social:4,connection:3};
  const LABELS={social:"社会：初期取得",connection:"コネ：初期取得"};
  const BUTTONS={social:"#add-social",connection:"#add-connection"};

  function categoryGroup(category){
    return [...document.querySelectorAll("#general-skills>.skill-group")].find(group=>{
      const title=group.querySelector(".skill-group-title")?.textContent||"";
      return category==="social"?title.includes("社会"):title.includes("コネクション");
    });
  }

  function rows(category){
    return [...(categoryGroup(category)?.querySelectorAll('tbody tr[data-skill-key]')||[])];
  }

  function initialRows(category){
    return rows(category).filter(row=>(row.querySelector('[data-f="name"]')?.value||"").includes("初期取得"));
  }

  function renameBlank(category){
    for(const row of rows(category)){
      const input=row.querySelector('[data-f="name"]');
      if(!input)continue;
      const value=input.value.trim();
      if(value==="社会："||value==="コネ："||value===""){
        input.value=LABELS[category];
        input.dispatchEvent(new Event("input",{bubbles:true}));
        return true;
      }
    }
    return false;
  }

  function ensure(category){
    const target=TARGETS[category];
    let current=initialRows(category).length;
    if(current>=target)return true;
    const button=document.querySelector(BUTTONS[category]);
    if(!button)return false;
    button.click();
    requestAnimationFrame(()=>renameBlank(category));
    return false;
  }

  function run(attempt=0){
    const root=document.querySelector("#general-skills");
    if(!root){if(attempt<80)setTimeout(()=>run(attempt+1),100);return;}
    const socialDone=ensure("social");
    const connectionDone=ensure("connection");
    if(!socialDone||!connectionDone){setTimeout(()=>run(attempt+1),120);return;}
    window.TNXExperience?.queue?.();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>run(),{once:true});
  else run();
})();