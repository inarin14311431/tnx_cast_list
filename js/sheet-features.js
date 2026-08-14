import "./help-ui.js?v=4";

/* Sheet editor helper features.
 * Keeps only presentation helpers. DB persistence is handled by sheet.js,
 * and experience calculation is handled by experience.js.
 */

initialize();

function initialize(){
  initializeSaveButtonState();
  initializeArmorOutfitColumns();
  ensureGlobalHelpAvailable();
}

function ensureGlobalHelpAvailable(){
  if(document.body?.dataset.page!=="sheet.html")return;
  window.setTimeout(()=>{
    if(document.querySelector("#sheet-global-help"))return;
    import("./help-ui.js?v=4&retry=1").catch(error=>console.error("Help UI bootstrap failed",error));
  },250);
}

function initializeSaveButtonState(){
  const status=document.querySelector("#save-status");
  const button=document.querySelector("#save-button");
  if(!status||!button)return;

  const labels={
    unsaved:["未保存","NOT SAVED"],
    saving:["保存中…","SAVING"],
    saved:["保存済み","SAVED"],
    error:["保存失敗","SAVE ERROR"]
  };

  const sync=()=>{
    const text=status.textContent||"";
    let state="unsaved";
    if(status.classList.contains("error")||/エラー|失敗/.test(text))state="error";
    else if(status.classList.contains("saving")||/保存中|読込中|初期化中/.test(text))state="saving";
    else if(status.classList.contains("saved")||/保存済み/.test(text))state="saved";

    button.classList.remove("is-unsaved","is-saving","is-saved","is-error");
    button.classList.add(`is-${state}`);
    button.dataset.saveState=state;

    const [jp,en]=labels[state];
    button.replaceChildren(document.createTextNode(jp+" "));
    const small=document.createElement("small");
    small.textContent=en;
    button.append(small);
    button.setAttribute("aria-label",jp);
  };

  new MutationObserver(sync).observe(status,{
    attributes:true,
    attributeFilter:["class"],
    childList:true,
    subtree:true,
    characterData:true
  });
  sync();
}

function initializeArmorOutfitColumns(){
  const root=document.querySelector("#outfit-list");
  if(!root)return;

  const order=[
    "category","name","purchase_value","experience_cost","concealment",
    "defense_s","defense_i","defense_p","control_modifier",
    "electronic_control","slot","description","page_number","actions"
  ];
  const allowedOFC=new Set(["electronic_control","page_number"]);
  let queued=false;

  const selectorFor=(kind,key)=>{
    if(key==="electronic_control"||key==="page_number"){
      return kind==="head"?`[data-ofc-head="${key}"]`:`[data-ofc-cell="${key}"]`;
    }
    return kind==="head"?`.outfit-table-head--${key}`:`.outfit-table-cell--${key}`;
  };

  const arrange=()=>{
    queued=false;
    root.querySelectorAll('table[data-outfit-schema="armor"]').forEach(table=>{
      const head=table.querySelector("thead tr");
      if(head){
        head.querySelectorAll("[data-ofc-head]").forEach(cell=>{
          cell.hidden=!allowedOFC.has(cell.dataset.ofcHead||"");
        });
        const slotHead=head.querySelector(".outfit-table-head--slot");
        if(slotHead)slotHead.textContent="部位";
        const desired=order.map(key=>head.querySelector(selectorFor("head",key))).filter(Boolean);
        const current=[...head.children].filter(cell=>!cell.hidden);
        if(desired.some((cell,index)=>current[index]!==cell))desired.forEach(cell=>head.append(cell));
      }

      table.querySelectorAll("tbody .outfit-table-row").forEach(row=>{
        row.querySelectorAll("[data-ofc-cell]").forEach(cell=>{
          cell.hidden=!allowedOFC.has(cell.dataset.ofcCell||"");
        });
        const desired=order.map(key=>row.querySelector(selectorFor("cell",key))).filter(Boolean);
        const current=[...row.children].filter(cell=>!cell.hidden);
        if(desired.some((cell,index)=>current[index]!==cell))desired.forEach(cell=>row.append(cell));
      });
    });
  };

  const queue=()=>{
    if(queued)return;
    queued=true;
    requestAnimationFrame(arrange);
  };

  new MutationObserver(queue).observe(root,{childList:true,subtree:true});
  queue();
}
