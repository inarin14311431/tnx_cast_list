/* Click-cycle controls for ◎ / ● style assignments.
 * The original select elements remain the source of truth for save/load compatibility.
 */
function initializeStyleMarkCycle(){
  const MARKS=["","◎","●","◎●"];
  const root=document.querySelector("#style-grid");
  if(!root)return;
  if(root.dataset.tnxStyleMarkCycleInitialized==="true")return;
  root.dataset.tnxStyleMarkCycleInitialized="true";

  let enhanced=false;
  let syncQueued=false;

  function source(index){return document.querySelector(`#style-${index}-mark`);}
  function button(index){return document.querySelector(`[data-style-mark-cycle="${index}"]`);}
  function labelFor(value){return value||"なし";}

  function renderMark(control,value){
    const label=labelFor(value);
    if(control.dataset.renderedMark===value&&control.textContent===label)return;

    if(!value){
      control.textContent=label;
      control.dataset.renderedMark=value;
      return;
    }

    const fragment=document.createDocumentFragment();
    [...value].forEach(mark=>{
      const symbol=document.createElement("span");
      symbol.className=`style-mark-symbol ${mark==="◎"?"style-mark-symbol--persona":"style-mark-symbol--key"}`;
      symbol.textContent=mark;
      symbol.setAttribute("aria-hidden","true");
      fragment.append(symbol);
    });
    control.replaceChildren(fragment);
    control.dataset.renderedMark=value;
  }

  function syncButton(index){
    const select=source(index);
    const control=button(index);
    if(!select||!control)return;

    const value=MARKS.includes(select.value)?select.value:"";
    const label=labelFor(value);
    const aria=`スタイル${index}の指定：${label}。クリックで切り替え`;
    const title="クリックで ◎ → ● → ◎● → なし の順に切り替え";

    if(select.value!==value)select.value=value;
    renderMark(control,value);
    if(control.dataset.mark!==value)control.dataset.mark=value;
    if(control.getAttribute("aria-label")!==aria)control.setAttribute("aria-label",aria);
    if(control.title!==title)control.title=title;
  }

  function syncAll(){
    for(let index=1;index<=3;index++)syncButton(index);
  }

  function setRaw(index,value){
    const select=source(index);
    if(!select||select.value===value)return false;
    select.value=value;
    syncButton(index);
    return true;
  }

  function applyExclusive(index,next){
    let changed=false;

    for(let other=1;other<=3;other++){
      if(other===index)continue;
      const current=source(other)?.value||"";
      let replacement=current;

      if(next==="◎●")replacement="";
      else if(next==="◎"){
        if(current==="◎")replacement="";
        else if(current==="◎●")replacement="●";
      }else if(next==="●"){
        if(current==="●")replacement="";
        else if(current==="◎●")replacement="◎";
      }

      changed=setRaw(other,replacement)||changed;
    }

    changed=setRaw(index,next)||changed;
    syncAll();

    if(changed){
      source(index)?.dispatchEvent(new Event("change",{bubbles:true}));
    }
  }

  function cycle(index){
    const current=source(index)?.value||"";
    const position=MARKS.indexOf(current);
    const next=MARKS[(position<0?0:position+1)%MARKS.length];
    applyExclusive(index,next);
  }

  function normalizeLoadedMarks(){
    if(!enhanced)return;

    let personaOwner=0;
    let keyOwner=0;

    for(let index=1;index<=3;index++){
      const select=source(index);
      if(!select)continue;

      const current=MARKS.includes(select.value)?select.value:"";
      const wantsPersona=current.includes("◎");
      const wantsKey=current.includes("●");
      const keepPersona=wantsPersona&&!personaOwner;
      const keepKey=wantsKey&&!keyOwner;
      const normalized=keepPersona&&keepKey?"◎●":keepPersona?"◎":keepKey?"●":"";

      if(select.value!==normalized)select.value=normalized;
      if(keepPersona)personaOwner=index;
      if(keepKey)keyOwner=index;
    }

    syncAll();
  }

  function queueSync(){
    if(syncQueued)return;
    syncQueued=true;
    queueMicrotask(()=>{
      syncQueued=false;
      normalizeLoadedMarks();
    });
  }

  function enhance(){
    let ready=true;

    for(let index=1;index<=3;index++){
      const styleSelect=document.querySelector(`#style-${index}`);
      const markSelect=source(index);
      if(!styleSelect||!markSelect){
        ready=false;
        continue;
      }

      markSelect.closest("label")?.classList.add("style-mark-source");

      const styleLabel=styleSelect.closest("label");
      if(styleLabel&&!styleLabel.querySelector(".style-choice-row")){
        styleLabel.classList.add("style-name-label");

        const row=document.createElement("span");
        row.className="style-choice-row";
        styleSelect.before(row);
        row.append(styleSelect);

        const control=document.createElement("button");
        control.type="button";
        control.className="style-mark-cycle";
        control.dataset.styleMarkCycle=String(index);
        control.addEventListener("click",event=>{
          event.preventDefault();
          event.stopPropagation();
          cycle(index);
        });
        row.append(control);
      }

      if(markSelect.dataset.markCycleBound!=="1"){
        markSelect.dataset.markCycleBound="1";
        markSelect.addEventListener("change",queueSync);
      }

      syncButton(index);
    }

    enhanced=ready;
    return ready;
  }

  const rootObserver=new MutationObserver(()=>{
    if(!enhance())return;
    rootObserver.disconnect();
    queueSync();
  });

  if(enhance()){
    queueSync();
  }else{
    rootObserver.observe(root,{childList:true});
  }

  const status=document.querySelector("#save-status");
  if(status){
    new MutationObserver(queueSync).observe(status,{
      attributes:true,
      attributeFilter:["class"],
      childList:true,
      characterData:true,
      subtree:true
    });
  }
}

initializeStyleMarkCycle();
