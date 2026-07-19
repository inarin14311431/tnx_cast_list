/* Sheet editor helper features.
 * Consolidated from style-skill-details-v32,
 * outfit-description-fix-v34, sheet-runtime-fix-v40,
 * initial-skill-slots-v44 and legacy-style-detail-fix-v32.
 */

const STYLE_DETAIL_PREFIX="@@TNX_STYLE_DETAIL_V1@@";
const STYLE_DETAIL_FIELDS=[
  ["skill","技能"],["limit","上限"],["timing","タイミング"],["target","対象"],["range","射程"],
  ["difficulty","目標値"],["confrontation","対決"],["description","解説"],["page","参照P"]
];

(function enhanceStyleSkillDetails(){
  const root=document.querySelector("#style-skills");
  if(!root)return;
  const parse=value=>{
    const text=String(value||"");
    if(text.startsWith(STYLE_DETAIL_PREFIX)){
      try{return {...Object.fromEntries(STYLE_DETAIL_FIELDS.map(([key])=>[key,""])),...JSON.parse(text.slice(STYLE_DETAIL_PREFIX.length).trim())};}catch{}
    }
    const data=Object.fromEntries(STYLE_DETAIL_FIELDS.map(([key])=>[key,""]));
    const labels={"技能":"skill","上限":"limit","タイミング":"timing","対象":"target","射程":"range","目標値":"difficulty","対決":"confrontation","参照P":"page"};
    const remain=[];
    for(const line of text.split(/\r?\n/)){
      const match=line.match(/^([^：:]+)[：:]\s*(.*)$/);
      const key=match&&labels[match[1].trim()];
      if(key)data[key]=match[2];else remain.push(line);
    }
    data.description=remain.join("\n").trim();
    return data;
  };
  const encode=data=>STYLE_DETAIL_PREFIX+"\n"+JSON.stringify(data);
  function enhance(){
    const table=root.querySelector("table.skill-table.has-detail");
    if(!table)return;
    table.classList.add("style-skill-unified-table");
    const header=table.querySelector("thead tr");
    if(header&&!header.dataset.detailV32){
      const cells=[...header.children];
      if(cells[1])cells[1].textContent="種別";
      const detail=cells[cells.length-2];
      if(detail){
        detail.remove();
        const end=header.lastElementChild;
        for(const [,label] of STYLE_DETAIL_FIELDS){
          const th=document.createElement("th");
          th.textContent=label;
          th.className="style-detail-col style-detail-col--"+label;
          header.insertBefore(th,end);
        }
      }
      header.dataset.detailV32="1";
    }
    table.querySelectorAll("tbody tr[data-skill-key]").forEach(row=>{
      const typeSelect=row.querySelector('select[data-f="skill_kind"]');
      if(typeSelect){typeSelect.setAttribute("aria-label","種別");typeSelect.hidden=false;}
      if(row.dataset.detailV32)return;
      const original=row.querySelector('textarea[data-f="description"]');
      if(!original)return;
      const sourceCell=original.closest("td");
      const deleteCell=row.lastElementChild;
      const data=parse(original.value);
      sourceCell.remove();
      STYLE_DETAIL_FIELDS.forEach(([key,label])=>{
        const td=document.createElement("td");
        td.className="style-detail-cell style-detail-cell--"+key;
        const control=key==="description"?document.createElement("textarea"):document.createElement("input");
        control.dataset.styleDetail=key;
        control.setAttribute("aria-label",label);
        control.value=data[key]||"";
        if(control.tagName==="TEXTAREA")control.rows=1;
        control.addEventListener("input",()=>{
          const values={};
          row.querySelectorAll("[data-style-detail]").forEach(el=>values[el.dataset.styleDetail]=el.value);
          original.value=encode(values);
          original.dispatchEvent(new Event("input",{bubbles:true}));
        });
        td.append(control);
        if(key==="description"){
          original.hidden=true;
          original.style.display="none";
          original.tabIndex=-1;
          td.append(original);
        }
        row.insertBefore(td,deleteCell);
      });
      row.dataset.detailV32="1";
    });
  }
  let queued=false;
  const queue=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhance();});};
  new MutationObserver(queue).observe(root,{childList:true,subtree:true});
  queue();
})();

(function normalizeOutfitDescriptions(){
  const root=document.querySelector('#outfit-list');
  if(!root)return;
  function enhance(){
    root.querySelectorAll('[data-outfit-key]').forEach(card=>{
      const fields=[...card.querySelectorAll('[data-o="description"]')];
      if(!fields.length)return;
      const primary=fields[0];
      fields.slice(1).forEach(extra=>{
        const label=extra.closest('label');
        if(label&&label!==primary.closest('label'))label.remove();else extra.remove();
      });
      if(primary.tagName==='TEXTAREA'){
        primary.rows=3;
        primary.classList.add('outfit-description-textarea');
        return;
      }
      const textarea=document.createElement('textarea');
      textarea.dataset.o='description';
      textarea.value=primary.value||'';
      textarea.rows=3;
      textarea.className='outfit-description-textarea';
      textarea.setAttribute('aria-label','解説');
      textarea.oninput=primary.oninput;
      textarea.onchange=primary.onchange;
      primary.replaceWith(textarea);
    });
  }
  let queued=false;
  const queue=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhance();});};
  new MutationObserver(queue).observe(root,{childList:true,subtree:true});
  queue();
})();

(function applySheetRuntimeRules(){
  const INITIAL_CREATION=170;
  const INITIAL_SOCIAL=20;
  const INITIAL_CONNECTION=15;
  const FIXED_GENERAL=new Set(["医療","射撃","知覚","電脳","心理","自我","交渉","運動","回避","白兵","信用","圧力","隠密"]);
  const total=document.querySelector("#exp-total");
  const breakdown=document.querySelector("#exp-breakdown");
  let observer=null;
  let queued=false;
  let applying=false;

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
  function deductionRow(label,value){
    const row=document.createElement("div");
    row.dataset.fixedDeduction="1";
    row.innerHTML=`<dt>${label}</dt><dd>-${value}</dd>`;
    return row;
  }
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
      breakdown.append(
        deductionRow("社会初期分",INITIAL_SOCIAL),
        deductionRow("コネ初期分",INITIAL_CONNECTION),
        deductionRow("初期作成分",INITIAL_CREATION)
      );
      const subtotal=entries.reduce((sum,row)=>sum+Number(row.querySelector("dd")?.textContent||0),0);
      total.textContent=String(Math.max(0,subtotal-INITIAL_SOCIAL-INITIAL_CONNECTION-INITIAL_CREATION));
    }finally{
      applying=false;
      observer?.observe(breakdown,{childList:true,subtree:true,characterData:true});
    }
  }
  function queueExperience(){if(queued)return;queued=true;requestAnimationFrame(applyExperience);}
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
  function initialize(){
    if(!total||!breakdown||!document.querySelector("#general-skills .skill-group")){setTimeout(initialize,80);return;}
    addClearButton();
    observer=new MutationObserver(queueExperience);
    observer.observe(breakdown,{childList:true,subtree:true,characterData:true});
    document.addEventListener("input",queueExperience,true);
    document.addEventListener("change",queueExperience,true);
    document.addEventListener("click",event=>{
      if(event.target.closest("[data-delete-skill],[data-skill-move],#add-general,#add-social,#add-connection,#add-style-skill"))setTimeout(queueExperience,0);
    },true);
    queueExperience();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});else initialize();
})();

(function configureInitialSkillSlots(){
  const DRAFT_KEY="tnx-sheet-browser-draft:v28:new";
  const isNewSheet=()=>!(new URLSearchParams(location.search).get("id")||"").trim();
  function groupByTitle(text){
    return [...document.querySelectorAll("#general-skills .skill-group")].find(group=>(group.querySelector(".skill-group-title")?.textContent||"").includes(text));
  }
  function removeAllRows(title){
    let guard=0;
    while(guard++<20){
      const group=groupByTitle(title);
      const remove=group?.querySelector("tbody>tr[data-skill-key] [data-delete-skill]");
      if(!remove)break;
      remove.click();
    }
  }
  function clickAdd(selector,count){const button=document.querySelector(selector);if(!button)return;for(let i=0;i<count;i++)button.click();}
  function setFirstSocialName(){
    const input=groupByTitle("社会")?.querySelector('tbody>tr[data-skill-key] input[data-f="name"]');
    if(!input)return;
    input.value="社会：Ｎ◎ＶＡ";
    input.dispatchEvent(new Event("input",{bubbles:true}));
  }
  function configureInitialSlots(){
    if(!isNewSheet()||localStorage.getItem(DRAFT_KEY))return;
    removeAllRows("社会");
    removeAllRows("コネクション");
    clickAdd("#add-social",4);
    clickAdd("#add-connection",3);
    setFirstSocialName();
  }
  function ready(){
    const status=document.querySelector("#save-status")?.textContent||"";
    return groupByTitle("社会")&&groupByTitle("コネクション")&&!/初期化中|読込中/.test(status);
  }
  function initialize(){
    if(!isNewSheet()||localStorage.getItem(DRAFT_KEY))return;
    if(!ready()){setTimeout(initialize,80);return;}
    configureInitialSlots();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});else initialize();
})();

(function restoreImportedStyleDetails(){
  const apply=document.querySelector('#legacy-import-apply');
  const source=document.querySelector('#legacy-import-json');
  if(!apply||!source)return;
  const clean=value=>String(value||'').trim().replace(/^[★†※■┗]+\s*/,'');
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const groups=fields=>{
    const map=new Map();
    for(const field of fields){
      const match=String(field.id||'').match(/^superhumanskills\.([^.]+)\.(.+)$/);
      if(!match)continue;
      if(!map.has(match[1]))map.set(match[1],{});
      map.get(match[1])[match[2]]=String(field.value??'');
    }
    return [...map.values()];
  };
  apply.addEventListener('click',async()=>{
    let data;try{data=JSON.parse(source.value);}catch{return;}
    await wait(1200);
    for(const item of groups(data.fields||[])){
      const name=clean(item.name);
      if(!name||!item.level||String(item.name||'').trim().startsWith('■'))continue;
      const row=[...document.querySelectorAll('#style-skills tr[data-skill-key]')].find(candidate=>clean(candidate.querySelector('[data-f="name"]')?.value)===name);
      if(!row)continue;
      const values={skill:item.skill||'',limit:item.limit||'',timing:item.timing||'',target:item.target||'',range:item.range||'',difficulty:item.aim||'',confrontation:item.confront||'',description:item.notes||'',page:item.page||''};
      for(const [key,value] of Object.entries(values)){
        const control=row.querySelector(`[data-style-detail="${key}"]`);
        if(!control)continue;
        control.value=value;
        control.dispatchEvent(new Event('input',{bubbles:true}));
      }
      await wait(20);
    }
  },false);
})();

export {STYLE_DETAIL_PREFIX,STYLE_DETAIL_FIELDS};
