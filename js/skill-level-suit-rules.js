/* Skill level / suit synchronization rules.
 *
 * - Level 4 or higher selects all four suits.
 * - Level 0-3 does not automatically add suits.
 * - Adding a suit raises the level only when the suit count exceeds it.
 * - Removing a suit lowers the level to the remaining suit count.
 *
 * This wraps the editor's own row handlers so the internal skill data,
 * displayed values, experience calculation and saved data stay in sync.
 */
(function(){
  const SUITS=["reason","passion","life","mundane"];
  const ROOT_SELECTOR="#general-skills,#style-skills";
  let queued=false;

  function suitBoxes(row){
    return SUITS.map(suit=>row.querySelector(`[data-f="${suit}"]`)).filter(Boolean);
  }

  function selectedCount(row){
    return suitBoxes(row).filter(box=>box.checked).length;
  }

  function remember(boxes){
    boxes.forEach(box=>box.dataset.previousChecked=box.checked?"1":"0");
  }

  function wrapRow(row){
    if(row.dataset.levelSuitRules==="1")return true;

    const level=row.querySelector('[data-f="level"]');
    const boxes=suitBoxes(row);
    if(!level||boxes.length!==4)return false;
    if(typeof level.oninput!=="function"||boxes.some(box=>typeof box.oninput!=="function"))return false;

    const originalLevel=level.oninput;
    const originalSuitHandlers=new Map(boxes.map(box=>[box,box.oninput]));
    remember(boxes);

    level.oninput=function(event){
      const value=Math.max(0,Number(level.value||0));
      level.value=String(value);
      originalLevel.call(level,event);

      if(value>=4){
        for(const box of boxes){
          if(box.checked)continue;
          box.checked=true;
          originalSuitHandlers.get(box)?.call(box,new Event("input",{bubbles:true}));
        }
        /* Suit handlers must not reduce a level above four. */
        level.value=String(value);
        originalLevel.call(level,new Event("input",{bubbles:true}));
      }

      remember(boxes);
    };

    for(const box of boxes){
      box.oninput=function(event){
        const wasChecked=box.dataset.previousChecked==="1";
        const isChecked=box.checked;
        originalSuitHandlers.get(box)?.call(box,event);

        if(wasChecked&&!isChecked){
          const remaining=selectedCount(row);
          level.value=String(remaining);
          originalLevel.call(level,new Event("input",{bubbles:true}));
        }

        remember(boxes);
      };
    }

    row.dataset.levelSuitRules="1";
    return true;
  }

  function enhance(){
    document.querySelectorAll(`${ROOT_SELECTOR} tr[data-skill-key]`).forEach(wrapRow);
  }

  function queue(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{
      queued=false;
      enhance();
    });
  }

  function initialize(){
    const roots=[...document.querySelectorAll(ROOT_SELECTOR)];
    if(!roots.length){
      setTimeout(initialize,100);
      return;
    }
    roots.forEach(root=>new MutationObserver(queue).observe(root,{childList:true,subtree:true}));
    queue();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});
  else initialize();
})();
