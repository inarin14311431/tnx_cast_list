/* Sheet editor helper features.
 * Consolidated from style-skill-details-v32,
 * outfit-description-fix-v34, sheet-runtime-fix-v40,
 * initial-skill-slots-v44 and legacy-style-detail-fix-v32.
 */

const INITIAL_SOCIAL=20;
const INITIAL_CONNECTION=15;
const INITIAL_CREATION=170;
const FIXED_GENERAL=new Set(["医療","射撃","知覚","電脳","心理","自我","交渉","運動","回避","白兵","信用","圧力","隠密"]);

initialize();

function initialize(){
  initializeSkillDetails();
  initializeOutfitDescriptions();
  initializeExperienceAdjustments();
  initializeDraftClear();
}

function initializeSkillDetails(){
  const area=document.querySelector("#style-skills");
  if(!area)return;
  let queued=false;
  const refresh=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;fixStyleDetails();});};
  new MutationObserver(refresh).observe(area,{childList:true,subtree:true});
  refresh();
}

function fixStyleDetails(){
  document.querySelectorAll('#style-skills tr[data-skill-key]').forEach(row=>{
    const textarea=row.querySelector('textarea[data-f="description"]');
    if(!textarea)return;
    textarea.placeholder="タイミング、対象、射程、目標値、対決、解説など";
  });
}

function initializeOutfitDescriptions(){
  const list=document.querySelector("#outfit-list");
  if(!list)return;
  let queued=false;
  const refresh=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;fixOutfitDescriptions();});};
  new MutationObserver(refresh).observe(list,{childList:true,subtree:true});
  refresh();
}

function fixOutfitDescriptions(){
  document.querySelectorAll('#outfit-list .outfit-form').forEach(card=>{
    const fields=card.querySelector('.outfit-fields');
    if(!fields)return;
    const descriptions=[...fields.querySelectorAll('[data-o="description"]')];
    if(!descriptions.length)return;
    const first=descriptions[0];
    for(const duplicate of descriptions.slice(1))duplicate.closest('label')?.remove();
    if(first.tagName==='TEXTAREA'){
      first.rows=3;
      first.closest('label')?.classList.add('outfit-wide');
      return;
    }
    const textarea=document.createElement('textarea');
    textarea.dataset.o='description';
    textarea.rows=3;
    textarea.value=first.value;
    textarea.addEventListener('input',()=>{
      first.value=textarea.value;
      first.dispatchEvent(new Event('input',{bubbles:true}));
    });
    first.hidden=true;
    first.removeAttribute('data-o');
    first.after(textarea);
    first.closest('label')?.classList.add('outfit-wide');
  });
}

function initializeExperienceAdjustments(){
  const breakdown=document.querySelector("#exp-breakdown");
  const total=document.querySelector("#exp-total");
  if(!breakdown||!total)return;
  let applying=false,queued=false,observer;

  function groupType(group){
    const title=group.querySelector(".skill-group-title")?.textContent||"";
    if(title.includes("社会"))return "social";
    if(title.includes("コネクション"))return "connection";
    return "general";
  }
  function generalCost(){
    let value=0;
    document.querySelectorAll("#general-skills .skill-group").forEach(group=>{
      const type=groupType(group);
      group.querySelectorAll("tbody>tr[data-skill-key]").forEach(row=>{
        const name=row.querySelector('[data-f="name"]')?.value.trim()||"";
        const level=Math.max(0,Number(row.querySelector('[data-f="level"]')?.value||0));
        if(!name||level===0)return;
        const kind=row.querySelector('[data-f="skill_kind"]')?.value||"proper";
        let free=0;
        if(type==="general"&&FIXED_GENERAL.has(name))free=1;
        value+=Math.max(0,level-free)*(kind==="proper"?5:10);
      });
    });
    return value;
  }
  function baseEntries(){return [...breakdown.querySelectorAll(":scope>div")].filter(row=>!row.dataset.fixedDeduction);}
  function applyExperience(){
    queued=false;
    if(applying||!total||!breakdown)return;
    const entries=baseEntries();
    if(!entries.length)return;
    applying=true;
    observer?.disconnect();
    try{
      const general=entries.find(row=>row.querySelector("dt")?.textContent.trim()==="一般技能");
      if(general){const dd=general.querySelector("dd");if(dd)dd.textContent=String(generalCost());}
      breakdown.querySelectorAll('[data-fixed-deduction="1"]').forEach(row=>row.remove());
      const subtotal=entries.reduce((sum,row)=>sum+Number(row.querySelector("dd")?.textContent||0),0);
      total.textContent=String(Math.max(0,subtotal-INITIAL_SOCIAL-INITIAL_CONNECTION-INITIAL_CREATION));
    }finally{
      applying=false;
      observer?.observe(breakdown,{childList:true,subtree:true,characterData:true});
    }
  }
  function queueExperience(){if(queued)return;queued=true;requestAnimationFrame(applyExperience);}
  observer=new MutationObserver(queueExperience);
  observer.observe(breakdown,{childList:true,subtree:true,characterData:true});
  document.addEventListener("input",event=>{if(event.target.closest("#general-skills"))queueExperience();});
  document.addEventListener("change",event=>{if(event.target.closest("#general-skills"))queueExperience();});
  queueExperience();
}

function initializeDraftClear(){
  addClearButton();
}

function clearDraft(){
  if(!confirm("新規作成画面の一時保存を削除し、初期状態へ戻します。よろしいですか？"))return;
  for(let index=localStorage.length-1;index>=0;index--){
    const key=localStorage.key(index)||"";
    if(key.startsWith("tnx-sheet-browser-draft:v28:new")||key.startsWith("tnx-skill-order:new:"))localStorage.removeItem(key);
  }
  location.reload();
}
function addClearButton(){
  if(new URLSearchParams(location.search).get("id")||document.querySelector("#clear-browser-draft"))return;
  const anchor=document.querySelector("#legacy-import-open")||document.querySelector("#save-button");
  if(!anchor)return;
  const button=document.createElement("button");
  button.id="clear-browser-draft";
  button.type="button";
  button.innerHTML="一時保存をクリア <small>CLEAR TEMP DATA</small>";
  button.addEventListener("click",clearDraft);
  anchor.after(button);
}
