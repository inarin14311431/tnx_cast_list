(function(){
  const isNewSheet=()=>!(new URLSearchParams(location.search).get("id")||"").trim();
  const SUITS=["reason","passion","life","mundane"];
  let moving=false;

  const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
  const rowByKey=key=>document.querySelector(`[data-skill-key="${CSS.escape(key)}"]`);

  function snapshot(row){
    const data={};
    row.querySelectorAll("[data-f]").forEach(element=>{
      data[element.dataset.f]=element.type==="checkbox"?element.checked:element.value;
    });
    return data;
  }

  function setField(key,field,value){
    const row=rowByKey(key);
    const element=row?.querySelector(`[data-f="${field}"]`);
    if(!element)return false;
    if(element.type==="checkbox")element.checked=Boolean(value);else element.value=value??"";
    element.dispatchEvent(new Event("input",{bubbles:true}));
    return true;
  }

  async function applySnapshot(key,data){
    for(const field of ["name","skill_kind","description"]){
      if(data[field]!==undefined){setField(key,field,data[field]);await nextFrame();}
    }
    if(data.level!==undefined){setField(key,"level",Number(data.level||0));await nextFrame();}
    for(const suit of SUITS){
      if(data[suit]!==undefined){setField(key,suit,Boolean(data[suit]));await nextFrame();}
    }
  }

  async function swapRows(button){
    if(moving)return;
    const row=button.closest("tr[data-skill-key]");
    const tbody=row?.parentElement;
    if(!row||!tbody)return;
    const rows=[...tbody.querySelectorAll(":scope > tr[data-skill-key]")];
    const index=rows.indexOf(row);
    const targetIndex=button.dataset.skillMove==="up"?index-1:index+1;
    if(index<0||targetIndex<0||targetIndex>=rows.length)return;

    moving=true;
    try{
      const target=rows[targetIndex];
      const rowKey=row.dataset.skillKey;
      const targetKey=target.dataset.skillKey;
      const rowData=snapshot(row);
      const targetData=snapshot(target);
      await applySnapshot(rowKey,targetData);
      await applySnapshot(targetKey,rowData);
      document.querySelector("#save-status")?.classList.add("unsaved");
    }finally{
      moving=false;
    }
  }

  function clearTemporaryDraft(){
    if(!confirm("新規作成画面の一時保存を削除し、初期状態へ戻します。よろしいですか？"))return;
    const prefixes=["tnx-sheet-browser-draft:v28:new","tnx-skill-order:new:"];
    for(let index=localStorage.length-1;index>=0;index--){
      const key=localStorage.key(index)||"";
      if(prefixes.some(prefix=>key.startsWith(prefix)))localStorage.removeItem(key);
    }
    location.reload();
  }

  function addClearButton(){
    if(!isNewSheet()||document.querySelector("#clear-browser-draft"))return;
    const anchor=document.querySelector("#legacy-import-open")||document.querySelector("#save-button");
    if(!anchor)return;
    const button=document.createElement("button");
    button.id="clear-browser-draft";
    button.type="button";
    button.className="clear-browser-draft";
    button.innerHTML="一時保存をクリア <small>CLEAR TEMP DATA</small>";
    button.addEventListener("click",clearTemporaryDraft);
    anchor.after(button);
  }

  document.addEventListener("click",event=>{
    if(!isNewSheet())return;
    const move=event.target.closest("[data-skill-move]");
    if(!move)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    swapRows(move);
  },true);

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",addClearButton,{once:true});else addClearButton();
})();
