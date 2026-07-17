const PROPER_SKILLS={"製作：":"reason","芸術：":"passion","操縦：":"life"};
const SUITS=["reason","passion","life","mundane"];
const generalArea=document.querySelector("#general-skills");
const styleArea=document.querySelector("#style-skills");
let refreshQueued=false;

initialize();

function initialize(){
  bindTopButtons();
  bindStyleSortControls();
  initializeSkillUi();
  initializeOutfitEnhancer();
  updateViewLink();
  const status=document.querySelector("#save-status");
  if(status)new MutationObserver(updateViewLink).observe(status,{childList:true,subtree:true});
}

function bindTopButtons(){
  document.querySelectorAll("[data-add-proper]").forEach(button=>{
    button.addEventListener("click",event=>{
      event.preventDefault();
      addProperSkill(button.dataset.addProper);
    });
  });
}

function addProperSkill(prefix){
  const add=document.querySelector("#add-general");
  if(!add)return;
  const before=new Set([...document.querySelectorAll("#general-skills tr[data-skill-key]")].map(row=>row.dataset.skillKey));
  add.click();
  const row=[...document.querySelectorAll("#general-skills tr[data-skill-key]")].find(item=>!before.has(item.dataset.skillKey));
  if(!row)return;
  const key=row.dataset.skillKey;
  const name=row.querySelector('[data-f="name"]');
  const kind=row.querySelector('[data-f="skill_kind"]');
  const suit=row.querySelector(`[data-f="${PROPER_SKILLS[prefix]}"]`);
  if(name){name.value=prefix;name.dispatchEvent(new Event("input",{bubbles:true}));}
  if(kind){kind.value="proper";kind.dispatchEvent(new Event("input",{bubbles:true}));}
  const current=document.querySelector(`#general-skills tr[data-skill-key="${CSS.escape(key)}"]`);
  const currentSuit=current?.querySelector(`[data-f="${PROPER_SKILLS[prefix]}"]`)||suit;
  if(currentSuit&&!currentSuit.checked){currentSuit.checked=true;currentSuit.dispatchEvent(new Event("input",{bubbles:true}));}
  requestAnimationFrame(()=>{
    arrangeSkillUi();
    const input=document.querySelector(`#general-skills tr[data-skill-key="${CSS.escape(key)}"] [data-f="name"]`);
    input?.focus();
    input?.setSelectionRange(prefix.length,prefix.length);
  });
}

function initializeSkillUi(){
  [generalArea,styleArea].filter(Boolean).forEach(container=>new MutationObserver(queueRefresh).observe(container,{childList:true,subtree:true}));
  arrangeSkillUi();
}
function queueRefresh(){if(refreshQueued)return;refreshQueued=true;requestAnimationFrame(()=>{refreshQueued=false;arrangeSkillUi();});}
function arrangeSkillUi(){replaceSuitHeaders();placeProperRows();ensureGroupActions();markGeneralRows();ensureStyleSortButtons();}
function replaceSuitHeaders(){const labels={"♠":"理性","♣":"感情","♥":"生命","♦":"外界"};document.querySelectorAll("#general-skills th.suit-col,#style-skills th.suit-col").forEach(cell=>{const label=labels[cell.textContent.trim()];if(label)cell.textContent=label;});}
function placeProperRows(){
  const tbody=document.querySelector("#general-skills .skill-group tbody");if(!tbody)return;
  Object.keys(PROPER_SKILLS).forEach(prefix=>{
    const rows=[...tbody.querySelectorAll(":scope > tr[data-skill-key]")];
    const template=rows.find(row=>row.querySelector('[data-f="name"]')?.value===prefix&&Number(row.querySelector('[data-f="level"]')?.value||0)===0);
    const actual=rows.filter(row=>row!==template&&row.querySelector('[data-f="name"]')?.value===prefix);
    let cursor=template||actual.shift();if(!cursor)return;
    actual.forEach(row=>{if(cursor.nextElementSibling!==row)cursor.after(row);cursor=row;});
  });
}
function markGeneralRows(){document.querySelectorAll("#general-skills .skill-group:first-child tr[data-skill-key]").forEach(row=>{const kind=row.querySelector('[data-f="skill_kind"]')?.value;row.classList.toggle("is-fixed-general",kind==="general");});}
function ensureGroupActions(){
  document.querySelectorAll(".skill-group").forEach(group=>{
    const title=group.querySelector(":scope > .skill-group-title")||group.querySelector(":scope > .skill-group-heading > .skill-group-title");if(!title)return;
    let heading=group.querySelector(":scope > .skill-group-heading");if(!heading){heading=document.createElement("div");heading.className="skill-group-heading";title.before(heading);heading.append(title);}
    let actions=heading.querySelector(":scope > .skill-group-actions");if(!actions){actions=document.createElement("div");actions.className="skill-group-actions";heading.append(actions);}actions.replaceChildren();
    const text=title.textContent;
    if(text.includes("一般技能")){addProxy(actions,"製作を追加","ADD CRAFT",()=>addProperSkill("製作："));addProxy(actions,"芸術を追加","ADD ART",()=>addProperSkill("芸術："));addProxy(actions,"操縦を追加","ADD PILOTING",()=>addProperSkill("操縦："));}
    else if(text.includes("社会"))addProxy(actions,"社会を追加","ADD SOCIAL",()=>document.querySelector("#add-social")?.click());
    else if(text.includes("コネクション"))addProxy(actions,"コネを追加","ADD CONNECTION",()=>document.querySelector("#add-connection")?.click());
    else if(text.includes("スタイル技能"))addProxy(actions,"スタイル技能を追加","ADD STYLE SKILL",()=>document.querySelector("#add-style-skill")?.click());
  });
}
function addProxy(container,jp,en,handler){const button=document.createElement("button");button.type="button";button.className="skill-inline-add";button.innerHTML=`${jp}<small>${en}</small>`;button.addEventListener("click",handler);container.append(button);}

function bindStyleSortControls(){document.addEventListener("click",event=>{const button=event.target.closest("[data-style-move]");if(!button)return;const row=button.closest("tr[data-skill-key]");const rows=[...row.parentElement.querySelectorAll(":scope > tr[data-skill-key]")];const index=rows.indexOf(row);const target=button.dataset.styleMove==="up"?index-1:index+1;if(target<0||target>=rows.length)return;swapRows(row,rows[target]);});}
function ensureStyleSortButtons(){const rows=[...document.querySelectorAll("#style-skills tr[data-skill-key]")];rows.forEach((row,index)=>{const cell=row.lastElementChild;if(!cell)return;let controls=cell.querySelector(".style-sort-controls");if(!controls){controls=document.createElement("span");controls.className="style-sort-controls";controls.innerHTML='<button type="button" data-style-move="up">↑</button><button type="button" data-style-move="down">↓</button>';cell.prepend(controls);}controls.children[0].disabled=index===0;controls.children[1].disabled=index===rows.length-1;});}
function snapshot(row){const data={};row.querySelectorAll("[data-f]").forEach(el=>data[el.dataset.f]=el.type==="checkbox"?el.checked:el.value);return data;}
function applyData(row,data){row.querySelectorAll("[data-f]").forEach(el=>{const value=data[el.dataset.f];if(value===undefined)return;if(el.type==="checkbox")el.checked=!!value;else el.value=value;el.dispatchEvent(new Event("input",{bubbles:true}));});}
function swapRows(a,b){const ad=snapshot(a),bd=snapshot(b);applyData(a,bd);requestAnimationFrame(()=>{const currentB=document.querySelector(`#style-skills tr[data-skill-key="${CSS.escape(b.dataset.skillKey)}"]`);if(currentB)applyData(currentB,ad);});}

function initializeOutfitEnhancer(){const list=document.querySelector("#outfit-list");if(!list)return;let queued=false;const refresh=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhanceOutfits();});};new MutationObserver(refresh).observe(list,{childList:true,subtree:true});refresh();}
function enhanceOutfits(){document.querySelectorAll("#outfit-list .outfit-form").forEach(card=>{if(card.dataset.v22Enhanced==="1")return;const fields=card.querySelector(".outfit-fields");const header=card.querySelector(":scope > header");if(!fields||!header)return;const category=header.querySelector("label");const remove=header.querySelector("[data-delete-outfit]");if(category)fields.prepend(category);[...fields.querySelectorAll("label")].forEach(label=>{const caption=[...label.childNodes].find(node=>node.nodeType===Node.TEXT_NODE)?.textContent.trim()||"";if(caption.startsWith("外界"))label.remove();});fields.querySelectorAll('input[data-o="purchase_value"],input[data-o="experience_cost"]').forEach(input=>{input.type="number";input.min="0";input.max="999";input.step="1";});const original=fields.querySelector('input[data-o="description"]');if(original&&!fields.querySelector("textarea[data-description-proxy]")){const textarea=document.createElement("textarea");textarea.rows=3;textarea.value=original.value;textarea.dataset.descriptionProxy="1";textarea.setAttribute("aria-label","解説");textarea.addEventListener("input",()=>{original.value=textarea.value;original.dispatchEvent(new Event("input",{bubbles:true}));});original.hidden=true;original.after(textarea);original.closest("label")?.classList.add("outfit-description");}if(remove){const wrap=document.createElement("div");wrap.className="outfit-delete-cell";wrap.append(remove);fields.append(wrap);}card.dataset.v22Enhanced="1";});}
function updateViewLink(){const link=document.querySelector("#cast-view-button");if(!link)return;const id=new URLSearchParams(location.search).get("id")?.trim();if(!id){link.classList.remove("is-visible");link.removeAttribute("href");return;}link.href=`./cast.html?id=${encodeURIComponent(id)}`;link.classList.add("is-visible");}
