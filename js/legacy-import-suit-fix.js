/* Preserve the legacy s/c/h/d suit selection during JSON import.
 * The importer writes the level once before applying suits and once afterward.
 * The editor normally converts every level write into the leftmost N suits,
 * so the second write used to overwrite the imported suit combination. */
(function(){
  const applyButton=document.querySelector("#legacy-import-apply");
  const message=document.querySelector("#legacy-import-message");
  if(!applyButton||!message)return;

  let active=false;
  const levelWrites=new Set();

  applyButton.addEventListener("click",()=>{
    active=true;
    levelWrites.clear();
  },true);

  document.addEventListener("input",event=>{
    if(!active||event.isTrusted)return;
    const level=event.target;
    if(!(level instanceof HTMLInputElement))return;
    if(!level.matches('#general-skills [data-f="level"],#style-skills [data-f="level"]'))return;

    const row=level.closest("tr[data-skill-key]");
    const key=row?.dataset.skillKey;
    if(!row||!key)return;

    /* The first level write prepares the row. Let the editor process it.
     * Every later level write must not regenerate suits from left to right. */
    if(!levelWrites.has(key)){
      levelWrites.add(key);
      return;
    }

    const suitCount=["reason","passion","life","mundane"]
      .filter(suit=>row.querySelector(`[data-f="${suit}"]`)?.checked)
      .length;
    level.value=String(suitCount);
    event.stopImmediatePropagation();
    event.stopPropagation();
  },true);

  new MutationObserver(()=>{
    const value=message.textContent||"";
    if(value.startsWith("反映しました")||value.startsWith("取込エラー")){
      active=false;
      levelWrites.clear();
    }
  }).observe(message,{childList:true,subtree:true,characterData:true});
})();
