/*
 * Move the first imported 芸術：／製作：／操縦： specialization into the
 * corresponding built-in master row. Additional specializations remain as
 * user-added rows.
 */
(()=>{
  const PREFIXES=["製作：","芸術：","操縦："];
  const root=document.querySelector("#general-skills");
  const applyButton=document.querySelector("#legacy-import-apply");
  const importMessage=document.querySelector("#legacy-import-message");
  if(!root)return;

  let importing=false;
  let queued=false;
  let merging=false;

  const rows=()=>[...root.querySelectorAll('tr[data-skill-key]')];
  const nameOf=row=>String(row?.querySelector('[data-f="name"]')?.value||"").trim();
  const levelOf=row=>Math.max(0,Number(row?.querySelector('[data-f="level"]')?.value||0));
  const suits=["reason","passion","life","mundane"];
  const hasSuit=row=>suits.some(suit=>row?.querySelector(`[data-f="${suit}"]`)?.checked);
  const isBlankMaster=row=>levelOf(row)===0&&!hasSuit(row);

  function emit(control){
    control?.dispatchEvent(new Event("input",{bubbles:true}));
    control?.dispatchEvent(new Event("change",{bubbles:true}));
  }

  function copyControl(source,target){
    if(!source||!target)return;
    if(target.type==="checkbox")target.checked=source.checked;
    else target.value=source.value;
    emit(target);
  }

  async function mergeRow(source,target){
    if(!source||!target||source===target)return false;
    const sourceKey=source.dataset.skillKey;
    const targetKey=target.dataset.skillKey;
    const locateSource=()=>root.querySelector(`tr[data-skill-key="${CSS.escape(sourceKey)}"]`);
    const locateTarget=()=>root.querySelector(`tr[data-skill-key="${CSS.escape(targetKey)}"]`);

    for(const field of ["name","skill_kind","level",...suits]){
      const currentSource=locateSource();
      const currentTarget=locateTarget();
      if(!currentSource||!currentTarget)return false;
      copyControl(
        currentSource.querySelector(`[data-f="${field}"]`),
        currentTarget.querySelector(`[data-f="${field}"]`)
      );
      await new Promise(resolve=>requestAnimationFrame(resolve));
    }

    const currentSource=locateSource();
    const deleteButton=currentSource?.querySelector("[data-delete-skill]");
    if(!deleteButton)return false;
    deleteButton.click();
    return true;
  }

  async function normalize(){
    queued=false;
    if(importing||merging)return;
    merging=true;
    try{
      for(const prefix of PREFIXES){
        const family=rows().filter(row=>nameOf(row).startsWith(prefix));
        const target=family.find(row=>nameOf(row)===prefix&&isBlankMaster(row));
        if(!target)continue;

        const source=family.find(row=>{
          if(row===target)return false;
          const name=nameOf(row);
          return name!==prefix&&name.startsWith(prefix)&&levelOf(row)>0;
        });
        if(!source)continue;

        await mergeRow(source,target);
        await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      }
    }finally{
      merging=false;
    }
  }

  function queueNormalize(delay=0){
    if(queued)return;
    queued=true;
    window.setTimeout(()=>requestAnimationFrame(normalize),delay);
  }

  applyButton?.addEventListener("click",()=>{
    importing=true;
  },true);

  if(importMessage){
    new MutationObserver(()=>{
      const message=importMessage.textContent||"";
      if(message.startsWith("反映しました。")){
        importing=false;
        queueNormalize();
      }else if(message.startsWith("取込エラー：")){
        importing=false;
      }
    }).observe(importMessage,{childList:true,subtree:true,characterData:true});
  }

  new MutationObserver(()=>{
    if(!importing)queueNormalize(80);
  }).observe(root,{childList:true,subtree:true});

  window.addEventListener("tnx:general-master-ready",()=>queueNormalize(80));
  queueNormalize(500);
})();
