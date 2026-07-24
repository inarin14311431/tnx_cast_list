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
  initializeOutfitEnhancer();
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

    const moveButton=event.target.closest("[data-skill-move]");
    if(moveButton){
      event.preventDefault();
      event.stopImmediatePropagation();
      moveSkill(moveButton);
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
function arrangeSkillUi(){replaceSuitHeaders();ensureGroupActions();markGeneralRows();applyStoredOrder("style");ensureSortButtons();}
function replaceSuitHeaders(){const labels={"♠":"理性","♣":"感情","♥":"生命","♦":"外界"};document.querySelectorAll("#general-skills th.suit-col,#style-skills th.suit-col").forEach(cell=>{const label=labels[cell.textContent.trim()];if(label)cell.textContent=label;});}

function ensureGroupActions(){
  document.querySelectorAll(".skill-group").forEach(group=>{
    const title=group.querySelector(":scope>.skill-group-title")||group.querySelector(":scope>.skill-group-heading>.skill-group-title");if(!title)return;
    let heading=group.querySelector(":scope>.skill-group-heading");if(!heading){heading=document.createElement("div");heading.className="skill-group-heading";title.before(heading);heading.append(title);}
    if(heading.querySelector(":scope>.skill-group-actions[data-v27]"))return;
    heading.querySelector(":scope>.skill-group-actions")?.remove();
    const text=title.textContent;
    if(text.includes("一般技能"))return;
    const actions=document.createElement("div");actions.className="skill-group-actions";actions.dataset.v27="1";heading.append(actions);
    if(text.includes("社会"))addAction(actions,"社会を追加","ADD SOCIAL","#add-social");
    else if(text.includes("コネクション"))addAction(actions,"コネを追加","ADD CONNECTION","#add-connection");
    else if(text.includes("スタイル技能"))addAction(actions,"スタイル技能を追加","ADD STYLE SKILL","#add-style-skill");
  });
}
function addAction(container,jp,en,action){const button=document.createElement("button");button.type="button";button.className="skill-inline-add";button.dataset.skillUiAction=action;button.innerHTML=`${jp}<small>${en}</small>`;container.append(button);}
function markGeneralRows(){document.querySelector("#general-skills .skill-group:first-child")?.querySelectorAll("tr[data-skill-key]").forEach(row=>{const name=row.querySelector('input[data-f="name"]')?.value||"";row.classList.toggle("is-fixed-general",FIXED_GENERAL.has(name));row.classList.toggle("is-custom-general",!FIXED_GENERAL.has(name));});}
function allGeneralRows(){return [...document.querySelectorAll("#general-skills .skill-group:first-child tr[data-skill-key]")];}
function rowsFor(kind){return kind==="general"?allGeneralRows():[...document.querySelectorAll("#style-skills tr[data-skill-key]")];}
function storageKey(kind){const id=new URLSearchParams(location.search).get("id")||"new";return `tnx-skill-order:${id}:${kind}:v27`;}
function rowToken(row,kind){
  if(kind==="style")return `key:${row.dataset.skillKey}`;
  const name=row.querySelector('input[data-f="name"]')?.value||"";
  return FIXED_GENERAL.has(name)?`fixed:${name}`:`key:${row.dataset.skillKey}`;
}
function applyStoredOrder(kind){
  const rows=rowsFor(kind);if(rows.length<2)return;
  let order;try{order=JSON.parse(localStorage.getItem(storageKey(kind))||"[]");}catch{return;}
  if(!Array.isArray(order)||!order.length)return;
  const byToken=new Map(rows.map(row=>[rowToken(row,kind),row]));
  const desired=order.map(token=>byToken.get(token)).filter(Boolean);
  const desiredSet=new Set(desired);
  for(const row of rows)if(!desiredSet.has(row))desired.push(row);
  if(desired.length!==rows.length||desired.every((row,index)=>row===rows[index]))return;
  const parent=rows[0].parentElement;
  const fragment=document.createDocumentFragment();
  desired.forEach(row=>fragment.append(row));
  parent.append(fragment);
}
function ensureSortButtons(){addSortControls(rowsFor("style"),"style");}
function addSortControls(rows,kind){
  rows.forEach((row,index)=>{
    const cell=row.lastElementChild;if(!cell)return;
    let controls=cell.querySelector(`.skill-sort-controls[data-kind="${kind}"]`);
    if(!controls){controls=document.createElement("span");controls.className="skill-sort-controls";controls.dataset.kind=kind;controls.innerHTML=`<button type="button" data-skill-move="up" data-kind="${kind}" title="上へ移動">↑</button><button type="button" data-skill-move="down" data-kind="${kind}" title="下へ移動">↓</button>`;cell.prepend(controls);}
    controls.querySelector('[data-skill-move="up"]').disabled=index===0;
    controls.querySelector('[data-skill-move="down"]').disabled=index===rows.length-1;
  });
}
function moveSkill(button){
  const kind=button.dataset.kind;
  const rows=rowsFor(kind);
  const row=button.closest("tr[data-skill-key]");
  const index=rows.indexOf(row);
  const targetIndex=button.dataset.skillMove==="up"?index-1:index+1;
  if(index<0||targetIndex<0||targetIndex>=rows.length)return;
  const target=rows[targetIndex];
  if(button.dataset.skillMove==="up")target.before(row);else target.after(row);
  const ordered=rowsFor(kind).map(item=>rowToken(item,kind));
  localStorage.setItem(storageKey(kind),JSON.stringify(ordered));
  requestAnimationFrame(()=>ensureSortButtons());
  document.querySelector("#save-status")?.classList.add("unsaved");
}

function initializeOutfitEnhancer(){const list=document.querySelector("#outfit-list");if(!list)return;let queued=false;const refresh=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhanceOutfits();});};new MutationObserver(refresh).observe(list,{childList:true,subtree:true});refresh();}
function enhanceOutfits(){document.querySelectorAll("#outfit-list .outfit-form").forEach(card=>{if(card.dataset.v25Enhanced==="1")return;const fields=card.querySelector(".outfit-fields"),header=card.querySelector(":scope>header");if(!fields||!header)return;const category=header.querySelector("label"),remove=header.querySelector("[data-delete-outfit]");if(category)fields.prepend(category);[...fields.querySelectorAll("label")].forEach(label=>{const caption=[...label.childNodes].find(node=>node.nodeType===Node.TEXT_NODE)?.textContent.trim()||"";if(caption.startsWith("外界"))label.remove();});fields.querySelectorAll('input[data-o="purchase_value"],input[data-o="experience_cost"]').forEach(input=>{input.type="number";input.min="0";input.max="999";input.step="1";input.inputMode="numeric";});const original=fields.querySelector('input[data-o="description"]');if(original&&!fields.querySelector("textarea[data-description-proxy]")){const textarea=document.createElement("textarea");textarea.rows=3;textarea.value=original.value;textarea.dataset.descriptionProxy="1";textarea.setAttribute("aria-label","解説");textarea.addEventListener("input",()=>{original.value=textarea.value;original.dispatchEvent(new Event("input",{bubbles:true}));});original.hidden=true;original.after(textarea);original.closest("label")?.classList.add("outfit-description");}if(remove){const wrap=document.createElement("div");wrap.className="outfit-delete-cell";wrap.append(remove);fields.append(wrap);}card.dataset.v25Enhanced="1";});}

function updateViewLink(){const link=document.querySelector("#cast-view-button");if(!link)return;const id=new URLSearchParams(location.search).get("id")?.trim();if(!id){link.classList.remove("is-visible");link.removeAttribute("href");return;}link.href=`./cast.html?id=${encodeURIComponent(id)}`;link.classList.add("is-visible");}

function initializeCastPanels(){const root=document.querySelector("#cast-content");const setup=()=>{document.querySelectorAll("#tab-session .data-panel,#tab-outfits .data-panel,#tab-profile .data-panel").forEach(panel=>{if(panel.dataset.collapseReady)return;const header=panel.querySelector(":scope>.data-panel__header");if(!header)return;header.setAttribute("role","button");header.tabIndex=0;header.setAttribute("aria-expanded","true");const toggle=()=>{const collapsed=panel.classList.toggle("is-collapsed");header.setAttribute("aria-expanded",String(!collapsed));};header.addEventListener("click",toggle);header.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();toggle();}});panel.dataset.collapseReady="1";});};new MutationObserver(setup).observe(root,{childList:true,subtree:true});setup();}
