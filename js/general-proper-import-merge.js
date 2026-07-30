/*
 * Bind the first saved 製作：／芸術：／操縦： specialization to the built-in
 * 0Lv master slot once after the editor has finished its initial render.
 *
 * This script deliberately does not observe ordinary input changes. Re-running
 * the merge while the user types would replace table rows and steal focus.
 * Additional specializations with the same prefix remain independent rows.
 */
(()=>{
  const PREFIXES=["製作：","芸術：","操縦："];
  const root=document.querySelector("#general-skills");
  const applyButton=document.querySelector("#legacy-import-apply");
  const importMessage=document.querySelector("#legacy-import-message");
  if(!root)return;

  const suits=["reason","passion","life","mundane"];
  let running=false;
  let initialDone=false;

  const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
  const rows=()=>[...root.querySelectorAll('tr[data-skill-key]')];
  const nameOf=row=>String(row?.querySelector('[data-f="name"]')?.value||"").trim();
  const levelOf=row=>Math.max(0,Number(row?.querySelector('[data-f="level"]')?.value||0));
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
    }

    const currentSource=locateSource();
    const deleteButton=currentSource?.querySelector("[data-delete-skill]");
    if(!deleteButton)return false;
    deleteButton.click();
    await nextFrame();
    return true;
  }

  async function normalizeOnce(){
    if(running)return;
    running=true;
    try{
      for(const prefix of PREFIXES){
        const family=rows().filter(row=>nameOf(row).startsWith(prefix));
        const target=family.find(row=>nameOf(row)===prefix&&isBlankMaster(row));
        if(!target)continue;

        /* DOM order follows saved sort_order. Only the first saved
         * specialization is assigned to the built-in slot. */
        const source=family.find(row=>{
          if(row===target)return false;
          const name=nameOf(row);
          return name!==prefix&&name.startsWith(prefix)&&levelOf(row)>0;
        });
        if(source)await mergeRow(source,target);
      }
    }finally{
      running=false;
    }
  }

  async function runAfterStableRender(){
    await nextFrame();
    await nextFrame();
    await normalizeOnce();
  }

  function initialize(){
    if(initialDone)return;
    if(!root.querySelector('tr[data-skill-key]')){
      setTimeout(initialize,80);
      return;
    }
    initialDone=true;
    runAfterStableRender();
  }

  window.addEventListener("tnx:general-master-ready",initialize,{once:true});
  setTimeout(initialize,500);

  applyButton?.addEventListener("click",()=>{
    /* Import itself rebuilds the rows. Wait for its completion message, then
     * perform one explicit normalization pass. */
  },true);

  if(importMessage){
    new MutationObserver(()=>{
      const message=importMessage.textContent||"";
      if(message.startsWith("反映しました。"))runAfterStableRender();
    }).observe(importMessage,{childList:true,subtree:true,characterData:true});
  }
})();