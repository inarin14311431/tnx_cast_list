const SUITS=["reason","passion","life","mundane"];
const FIXED_GENERAL=new Set(["医療","射撃","知覚","電脳","製作：","心理","自我","交渉","芸術：","運動","回避","白兵","操縦：","信用","圧力","隠密"]);
const generalArea=document.querySelector("#general-skills");
const styleArea=document.querySelector("#style-skills");
let refreshQueued=false;

initialize();

function initialize(){
  if(generalArea||styleArea) initializeSheetUi();
  if(document.querySelector(".cast-content")) initializeCastPanels();
}

function initializeSheetUi(){
  bindSheetActions();
  [generalArea,styleArea].filter(Boolean).forEach(container=>new MutationObserver(queueRefresh).observe(container,{childList:true,subtree:true}));
  arrangeSkillUi();
  updateViewLink();
  const status=document.querySelector("#save-status");
  if(status)new MutationObserver(updateViewLink).observe(status,{childList:true,subtree:true});
}

function bindSheetActions(){
  document.addEventListener("click",event=>{
    const actionButton=event.target.closest("[data-skill-ui-action]");
    if(actionButton){
      event.preventDefault();
      event.stopPropagation();
      const action=actionButton.dataset.skillUiAction;
      document.querySelector(action)?.click();
      return;
    }
  },true);
}

function queueRefresh(){
  if(refreshQueued)return;
  refreshQueued=true;
  queueMicrotask(()=>{
    refreshQueued=false;
    arrangeSkillUi();
  });
}
function arrangeSkillUi(){replaceSuitHeaders();ensureGroupActions();markGeneralRows();}
function replaceSuitHeaders(){const labels={"♠":"理性","♣":"感情","♥":"生命","♦":"外界"};document.querySelectorAll("#general-skills th.suit-col,#style-skills th.suit-col").forEach(cell=>{const label=labels[cell.textContent.trim()];if(label)cell.textContent=label;});}

function ensureGroupActions(){
  document.querySelectorAll(".skill-group").forEach(group=>{
    const title=group.querySelector(":scope>.skill-group-title")||group.querySelector(":scope>.skill-group-heading>.skill-group-title");if(!title)return;
    let heading=group.querySelector(":scope>.skill-group-heading");if(!heading){heading=document.createElement("div");heading.className="skill-group-heading";title.before(heading);heading.append(title);}
    if(heading.querySelector(":scope>.skill-group-actions[data-v28]"))return;
    heading.querySelector(":scope>.skill-group-actions")?.remove();
    const text=title.textContent;
    const actions=document.createElement("div");actions.className="skill-group-actions";actions.dataset.v28="1";
    if(text.includes("一般技能")){
      if(!group.classList.contains("general-skill-column--second"))return;
      heading.append(actions);
      addAction(actions,"一般技能を追加","ADD GENERAL","#add-general");
    }else if(text.includes("社会")){
      heading.append(actions);
      addAction(actions,"社会を追加","ADD SOCIAL","#add-social");
    }else if(text.includes("コネクション")){
      heading.append(actions);
      addAction(actions,"コネを追加","ADD CONNECTION","#add-connection");
    }else if(text.includes("スタイル技能")){
      return;
    }
  });
}
function addAction(container,jp,en,action){const button=document.createElement("button");button.type="button";button.className="skill-inline-add";button.dataset.skillUiAction=action;button.innerHTML=`${jp}<small>${en}</small>`;container.append(button);}
function markGeneralRows(){document.querySelector("#general-skills .skill-group:first-child")?.querySelectorAll("tr[data-skill-key]").forEach(row=>{const name=row.querySelector('input[data-f="name"]')?.value||"";row.classList.toggle("is-fixed-general",FIXED_GENERAL.has(name));row.classList.toggle("is-custom-general",!FIXED_GENERAL.has(name));});}

function updateViewLink(){
  const link=document.querySelector("#cast-view-button");
  if(!link)return;
  const id=new URLSearchParams(location.search).get("id")?.trim();
  if(!id){
    link.classList.remove("is-visible");
    link.classList.add("is-disabled");
    link.removeAttribute("href");
    link.setAttribute("aria-disabled","true");
    link.tabIndex=-1;
    return;
  }
  link.href=`./cast.html?id=${encodeURIComponent(id)}`;
  link.classList.add("is-visible");
  link.classList.remove("is-disabled");
  link.removeAttribute("aria-disabled");
  link.removeAttribute("tabindex");
}

function initializeCastPanels(){const root=document.querySelector("#cast-content");const setup=()=>{document.querySelectorAll("#tab-session .data-panel,#tab-outfits .data-panel,#tab-profile .data-panel").forEach(panel=>{if(panel.dataset.collapseReady)return;const header=panel.querySelector(":scope>.data-panel__header");if(!header)return;header.setAttribute("role","button");header.tabIndex=0;header.setAttribute("aria-expanded","true");const toggle=()=>{const collapsed=panel.classList.toggle("is-collapsed");header.setAttribute("aria-expanded",String(!collapsed));};header.addEventListener("click",toggle);header.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();toggle();}});panel.dataset.collapseReady="1";});};new MutationObserver(setup).observe(root,{childList:true,subtree:true});setup();}
