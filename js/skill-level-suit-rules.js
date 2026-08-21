/* Skill level / suit synchronization DOM adapter.
 * Pure level/suit/free-level decisions live in sheet-skill-level-suit-state.js.
 */
(async function(){
  const SUITS=["reason","passion","life","mundane"];
  const ROOT_SELECTOR="#general-skills,#style-skills";
  const stateUrl=new URL("./sheet-skill-level-suit-state.js?v=1",document.currentScript?.src||document.baseURI);
  const {
    normalizeSkillLevel,
    shouldSelectAllSuits,
    resolveSkillInputState
  }=await import(stateUrl.href);

  function suitBoxes(row){
    return SUITS.map(suit=>row.querySelector(`[data-f="${suit}"]`)).filter(Boolean);
  }

  function selectedCount(row){
    return suitBoxes(row).filter(box=>box.checked).length;
  }

  function dispatchInput(control){
    control.dispatchEvent(new Event("input",{bubbles:true}));
  }

  function syncFreeLevel(row, levelValue){
    const freeLevel=row.querySelector('[data-f="free_level"]');
    if(!freeLevel)return;
    const state=resolveSkillInputState({
      action:"free_level",
      value:freeLevel.value,
      currentLevel:levelValue,
      currentFreeLevel:freeLevel.value
    });
    if(String(state.freeLevel)===String(freeLevel.value))return;
    freeLevel.value=String(state.freeLevel);
    dispatchInput(freeLevel);
  }

  function handleInput(event){
    const control=event.target;
    if(!control?.matches)return;
    const row=control.closest?.('tr[data-skill-key]');
    if(!row)return;

    if(control.matches('[data-f="level"]')){
      const state=resolveSkillInputState({
        action:"level",
        value:control.value,
        currentLevel:control.value,
        currentFreeLevel:row.querySelector('[data-f="free_level"]')?.value||0
      });
      control.value=String(state.level);
      syncFreeLevel(row,state.level);
      if(!shouldSelectAllSuits(state.level))return;

      for(const box of suitBoxes(row)){
        if(box.checked)continue;
        box.checked=true;
        dispatchInput(box);
      }
      return;
    }

    if(control.matches('[data-f="free_level"]')){
      const level=row.querySelector('[data-f="level"]');
      const state=resolveSkillInputState({
        action:"free_level",
        value:control.value,
        currentLevel:level?.value||0,
        currentFreeLevel:control.value
      });
      control.value=String(state.freeLevel);
      return;
    }

    if(!SUITS.some(suit=>control.matches(`[data-f="${suit}"]`)))return;
    const level=row.querySelector('[data-f="level"]');
    if(!level)return;
    const currentLevel=normalizeSkillLevel(level.value);
    const state=resolveSkillInputState({
      action:"suit",
      currentLevel,
      currentFreeLevel:row.querySelector('[data-f="free_level"]')?.value||0,
      selectedSuitCount:selectedCount(row),
      checked:control.checked
    });
    if(state.level===currentLevel){
      syncFreeLevel(row,state.level);
      return;
    }
    level.value=String(state.level);
    dispatchInput(level);
  }

  function initializeSkillLevelSuitRules(){
    const roots=[...document.querySelectorAll(ROOT_SELECTOR)];
    if(!roots.length){
      setTimeout(initializeSkillLevelSuitRules,100);
      return;
    }
    roots.forEach(root=>{
      if(root.dataset.levelSuitRulesObserver==="1")return;
      root.dataset.levelSuitRulesObserver="1";
      root.addEventListener("input",handleInput);
    });
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initializeSkillLevelSuitRules,{once:true});
  else initializeSkillLevelSuitRules();
})().catch(error=>console.error("Skill level/suit rules failed to initialize",error));
