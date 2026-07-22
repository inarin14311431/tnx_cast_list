/* Click-cycle controls for ◎ / ● style assignments.
 * The original select elements remain the source of truth for save/load compatibility.
 */
(function(){
  const MARKS=["","◎","●","◎●"];
  const root=document.querySelector("#style-grid");
  if(!root)return;

  function source(index){return document.querySelector(`#style-${index}-mark`);}
  function button(index){return document.querySelector(`[data-style-mark-cycle="${index}"]`);}

  function labelFor(value){return value||"なし";}

  function syncButton(index){
    const select=source(index);
    const control=button(index);
    if(!select||!control)return;
    const value=MARKS.includes(select.value)?select.value:"";
    if(select.value!==value)select.value=value;
    control.textContent=labelFor(value);
    control.dataset.mark=value;
    control.setAttribute("aria-label",`スタイル${index}の指定：${labelFor(value)}。クリックで切り替え`);
    control.title="クリックで ◎ → ● → ◎● → なし の順に切り替え";
  }

  function syncAll(){for(let index=1;index<=3;index++)syncButton(index);}

  function setValue(index,value,notify=true){
    const select=source(index);
    if(!select||select.value===value)return false;
    select.value=value;
    syncButton(index);
    if(notify)select.dispatchEvent(new Event("change",{bubbles:true}));
    return true;
  }

  function applyExclusive(index,next){
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
      setValue(other,replacement,true);
    }
    setValue(index,next,true);
    syncAll();
  }

  function cycle(index){
    const current=source(index)?.value||"";
    const position=MARKS.indexOf(current);
    const next=MARKS[(position<0?0:position+1)%MARKS.length];
    applyExclusive(index,next);
  }

  function normalizeLoadedMarks(){
    let personaOwner=0;
    let keyOwner=0;
    for(let index=1;index<=3;index++){
      const select=source(index);
      if(!select)continue;
      let value=MARKS.includes(select.value)?select.value:"";
      const wantsPersona=value.includes("◎");
      const wantsKey=value.includes("●");
      const keepPersona=wantsPersona&&!personaOwner;
      const keepKey=wantsKey&&!keyOwner;
      value=keepPersona&&keepKey?"◎●":keepPersona?"◎":keepKey?"●":"";
      select.value=value;
      if(keepPersona)personaOwner=index;
      if(keepKey)keyOwner=index;
    }
    syncAll();
  }

  function enhance(){
    let ready=true;
    for(let index=1;index<=3;index++){
      const styleSelect=document.querySelector(`#style-${index}`);
      const markSelect=source(index);
      if(!styleSelect||!markSelect){ready=false;continue;}

      const markLabel=markSelect.closest("label");
      markLabel?.classList.add("style-mark-source");

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
          cycle(index);
        });
        row.append(control);
      }
      syncButton(index);
    }
    return ready;
  }

  const observer=new MutationObserver(()=>{
    if(enhance())normalizeLoadedMarks();
  });
  observer.observe(root,{childList:true,subtree:true});

  let attempts=0;
  const timer=setInterval(()=>{
    if(enhance())normalizeLoadedMarks();
    if(++attempts>=60)clearInterval(timer);
  },100);
  enhance();
})();
