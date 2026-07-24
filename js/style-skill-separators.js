import { supabase } from "./supabase-client.js";

/* Style-skill separator rows, stored as zero-cost style skills with an internal marker. */
(()=>{
  const MARKER="[[STYLE_SEPARATOR]]";
  const DETAIL_PREFIX="@@TNX_STYLE_DETAIL_V1@@";
  const container=document.querySelector("#style-skills");
  if(!container)return;

  let persistTimer=0;
  let persistRetries=0;
  let addButton=null;

  const wait=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const rows=()=>[...container.querySelectorAll('tr[data-skill-key]')];
  const emit=element=>{
    element?.dispatchEvent(new Event("input",{bubbles:true}));
    element?.dispatchEvent(new Event("change",{bubbles:true}));
  };

  function isMarker(value){
    const text=String(value||"");
    if(text.startsWith(MARKER))return true;
    if(!text.startsWith(DETAIL_PREFIX))return false;
    try{
      const detail=JSON.parse(text.slice(DETAIL_PREFIX.length).trim());
      return String(detail?.description||"").startsWith(MARKER);
    }catch{return false;}
  }

  function descriptionValue(row){
    const original=row.querySelector('[data-f="description"]');
    if(original&&isMarker(original.value))return original.value;
    const expanded=row.querySelector('[data-style-field="description"]');
    return expanded?.value||original?.value||"";
  }

  function isSeparator(row){
    return row?.dataset.styleSeparator==="1"||isMarker(descriptionValue(row));
  }

  function ensureAddButton(){
    const headingActions=container.querySelector('.skill-group-actions[data-v28],.skill-group-actions');
    const toolbar=document.querySelector("#add-style-skill")?.closest(".toolbar");
    const target=headingActions||toolbar;
    if(!target)return;

    if(!addButton){
      addButton=document.createElement("button");
      addButton.id="add-style-separator";
      addButton.type="button";
      addButton.className="skill-inline-add style-separator-add";
      addButton.innerHTML="区切りを追加<small>ADD DIVIDER</small>";
      addButton.addEventListener("click",createSeparator);
    }
    if(addButton.parentElement!==target)target.append(addButton);
    if(target===toolbar)toolbar.style.gridTemplateColumns="repeat(3,minmax(0,1fr))";
  }

  function decorate(row){
    if(!isSeparator(row))return;
    row.classList.add("style-skill-separator-row");
    row.dataset.styleSeparator="1";
    const name=row.querySelector('[data-f="name"]');
    if(name){
      name.placeholder="スタイル名を入力（例：アヤカシ）";
      name.setAttribute("aria-label","スタイル技能の区切り名");
    }
  }

  function decorateAll(){
    ensureAddButton();
    rows().forEach(decorate);
  }

  async function createSeparator(){
    if(!addButton)return;
    addButton.disabled=true;
    try{
      const before=new Set(rows().map(row=>row.dataset.skillKey));
      document.querySelector("#add-style-skill")?.click();
      let row=null;
      for(let attempt=0;attempt<20&&!row;attempt++){
        await wait();
        row=rows().find(candidate=>!before.has(candidate.dataset.skillKey));
      }
      if(!row)return;

      const name=row.querySelector('[data-f="name"]');
      const kind=row.querySelector('[data-f="skill_kind"]');
      const level=row.querySelector('[data-f="level"]');
      const detail=row.querySelector('[data-f="description"]');

      if(name){name.value="スタイル名";emit(name);}
      if(kind){
        if(!kind.querySelector('option[value="none"]')){
          const option=document.createElement("option");
          option.value="none";
          option.textContent="なし";
          kind.prepend(option);
        }
        kind.value="none";
        emit(kind);
      }

      /* Level 1 keeps the row in the existing save pipeline; kind=none keeps EXP at zero. */
      if(level){level.value="1";emit(level);}
      row.querySelectorAll('input[type="checkbox"][data-f]').forEach(box=>{
        box.checked=false;
        emit(box);
      });
      if(detail){detail.value=MARKER;emit(detail);}

      row.dataset.styleSeparator="1";
      decorate(row);
      name?.focus();
      name?.select();
      schedulePersist(2400);
    }finally{
      addButton.disabled=false;
    }
  }

  function domRecord(row){
    const name=row.querySelector('[data-f="name"]')?.value?.trim()||"";
    if(!name)return null;
    return {
      name,
      skill_kind:row.querySelector('[data-f="skill_kind"]')?.value||"normal",
      level:Number(row.querySelector('[data-f="level"]')?.value||0),
      reason:!!row.querySelector('[data-f="reason"]')?.checked,
      passion:!!row.querySelector('[data-f="passion"]')?.checked,
      life:!!row.querySelector('[data-f="life"]')?.checked,
      mundane:!!row.querySelector('[data-f="mundane"]')?.checked,
      description:row.querySelector('[data-f="description"]')?.value||""
    };
  }

  function fingerprint(item){
    return JSON.stringify([
      String(item.name||"").trim(),
      String(item.skill_kind||""),
      Number(item.level||0),
      !!item.reason,!!item.passion,!!item.life,!!item.mundane,
      String(item.description||"")
    ]);
  }

  async function persistStyleOrder(){
    const publicId=new URLSearchParams(location.search).get("id")?.trim();
    if(!publicId)return false;

    const domItems=rows().map(domRecord).filter(Boolean);
    if(!domItems.length)return true;

    const {data:character,error:characterError}=await supabase
      .from("characters")
      .select("id")
      .eq("public_id",publicId)
      .maybeSingle();
    if(characterError||!character)return false;

    const {data:stored,error}=await supabase
      .from("character_skills")
      .select("id,name,skill_kind,level,reason,passion,life,mundane,description,sort_order")
      .eq("character_id",character.id)
      .eq("category","style")
      .order("sort_order");
    if(error)return false;

    const queues=new Map();
    for(const item of stored||[]){
      const key=fingerprint(item);
      if(!queues.has(key))queues.set(key,[]);
      queues.get(key).push(item);
    }

    const desired=[];
    for(const item of domItems){
      const queue=queues.get(fingerprint(item));
      const storedItem=queue?.shift();
      if(!storedItem)return false;
      desired.push(storedItem);
    }
    if(desired.length!==(stored||[]).length)return false;
    if(desired.every((item,index)=>item.id===stored[index]?.id&&Number(stored[index]?.sort_order)===index))return true;

    const temporary=await Promise.all(desired.map((item,index)=>supabase
      .from("character_skills")
      .update({sort_order:10000+index})
      .eq("id",item.id)));
    if(temporary.some(result=>result.error))return false;

    const finalized=await Promise.all(desired.map((item,index)=>supabase
      .from("character_skills")
      .update({sort_order:index})
      .eq("id",item.id)));
    return !finalized.some(result=>result.error);
  }

  function schedulePersist(delay=700){
    clearTimeout(persistTimer);
    persistTimer=window.setTimeout(async()=>{
      const saved=await persistStyleOrder();
      if(saved){persistRetries=0;return;}
      if(persistRetries++<8)schedulePersist(900);
    },delay);
  }

  const observer=new MutationObserver(mutations=>{
    decorateAll();
    if(mutations.some(mutation=>mutation.type==="childList"))schedulePersist(900);
  });
  observer.observe(container,{childList:true,subtree:true});

  container.addEventListener("input",event=>{
    const row=event.target.closest?.('tr[data-skill-key]');
    if(row)decorate(row);
  });

  const saveStatus=document.querySelector("#save-status");
  if(saveStatus){
    new MutationObserver(()=>{
      if(saveStatus.classList.contains("saved")||/保存済み/.test(saveStatus.textContent||""))schedulePersist(250);
    }).observe(saveStatus,{attributes:true,attributeFilter:["class"],childList:true,subtree:true,characterData:true});
  }

  decorateAll();
})();
