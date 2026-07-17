(function(){
  const nativeSetTimeout=window.setTimeout.bind(window);
  window.setTimeout=function(callback,delay,...args){
    const source=typeof callback==="function"?Function.prototype.toString.call(callback):"";
    if(Number(delay)===1200&&source.includes("saveAll(false)"))return 0;
    return nativeSetTimeout(callback,delay,...args);
  };

  const PREFIX="tnx-sheet-browser-draft:v28:";
  const SUITS=["reason","passion","life","mundane"];
  let restoring=false;
  let draftTimer=0;
  let activeKey="";

  const pageId=()=>new URLSearchParams(location.search).get("id")?.trim()||"new";
  const draftKey=()=>PREFIX+pageId();
  const hasDatabaseRecord=()=>pageId()!=="new";

  function setButtonState(state){
    const button=document.querySelector("#save-button");
    if(!button)return;
    button.dataset.saveState=state;
    const labels={unsaved:["未保存","NOT SAVED"],editing:["編集中","EDITING"],saved:["保存済み","SAVED"]};
    const [jp,en]=labels[state]||labels.unsaved;
    button.innerHTML=`${jp} <small>${en}</small>`;
  }

  function fieldValue(element){return element.type==="checkbox"?element.checked:element.value;}
  function snapshotFields(root,selector){
    return [...root.querySelectorAll(selector)].map(element=>({id:element.id||"",field:element.dataset.f||element.dataset.o||"",type:element.type||element.tagName.toLowerCase(),value:fieldValue(element)}));
  }
  function snapshotSkills(){
    return [...document.querySelectorAll("#general-skills .skill-group,#style-skills .skill-group")].map(group=>({
      title:group.querySelector(".skill-group-title")?.textContent.trim()||"",
      rows:[...group.querySelectorAll("tbody>tr[data-skill-key]")].map(row=>snapshotFields(row,"[data-f]"))
    }));
  }
  function snapshotOutfits(){
    return [...document.querySelectorAll("#outfit-list [data-outfit-key]")].map(card=>snapshotFields(card,"[data-o]"));
  }
  function captureDraft(){
    const staticFields=[...document.querySelectorAll("input[id],select[id],textarea[id]")]
      .filter(element=>!element.closest("#general-skills,#style-skills,#outfit-list,#tsv-dialog")&&!['save-button'].includes(element.id))
      .map(element=>({id:element.id,type:element.type||element.tagName.toLowerCase(),value:fieldValue(element)}));
    return {version:28,savedAt:Date.now(),staticFields,skills:snapshotSkills(),outfits:snapshotOutfits()};
  }
  function saveDraft(){
    if(restoring)return;
    try{localStorage.setItem(draftKey(),JSON.stringify(captureDraft()));activeKey=draftKey();setButtonState("editing");}catch(error){console.warn("Draft save failed",error);}
  }
  function queueDraft(){clearTimeout(draftTimer);draftTimer=nativeSetTimeout(saveDraft,180);}

  function assign(element,value,dispatch=true){
    if(!element)return;
    if(element.type==="checkbox")element.checked=Boolean(value);else element.value=value??"";
    if(dispatch)element.dispatchEvent(new Event("input",{bubbles:true}));
  }
  function rowName(row){return row.querySelector('[data-f="name"]')?.value||"";}
  function groupKind(title){if(title.includes("スタイル技能"))return"style";if(title.includes("社会"))return"social";if(title.includes("コネクション"))return"connection";return"general";}
  function addButton(kind){return document.querySelector({general:"#add-general",social:"#add-social",connection:"#add-connection",style:"#add-style-skill"}[kind]);}
  function ensureRows(group,title,savedRows){
    const kind=groupKind(title);
    const existing=[...group.querySelectorAll("tbody>tr[data-skill-key]")];
    const required=savedRows.length;
    let guard=0;
    while(group.querySelectorAll("tbody>tr[data-skill-key]").length<required&&guard++<50)addButton(kind)?.click();
    return [...group.querySelectorAll("tbody>tr[data-skill-key]")];
  }
  function rowData(fields){return Object.fromEntries(fields.map(item=>[item.field,item.value]));}
  async function restoreSkillGroup(savedGroup){
    let group=[...document.querySelectorAll("#general-skills .skill-group,#style-skills .skill-group")].find(item=>(item.querySelector(".skill-group-title")?.textContent||"").includes(savedGroup.title.split(/\s/)[0]));
    if(!group)return;
    ensureRows(group,savedGroup.title,savedGroup.rows);
    const used=new Set();
    for(const fields of savedGroup.rows){
      const data=rowData(fields);const wanted=String(data.name||"");
      let rows=[...group.querySelectorAll("tbody>tr[data-skill-key]")];
      let row=rows.find((item,index)=>!used.has(index)&&rowName(item)===wanted);
      if(!row)row=rows.find((item,index)=>!used.has(index)&&!rowName(item));
      if(!row)continue;
      let index=rows.indexOf(row);used.add(index);
      for(const field of ["name","skill_kind","description"]){const element=row.querySelector(`[data-f="${field}"]`);if(element&&data[field]!==undefined)assign(element,data[field],true);}
      for(const suit of SUITS){
        rows=[...group.querySelectorAll("tbody>tr[data-skill-key]")];
        row=rows.find(item=>rowName(item)===wanted)||rows[index];
        const checkbox=row?.querySelector(`[data-f="${suit}"]`);
        if(checkbox&&checkbox.checked!==Boolean(data[suit])){checkbox.checked=Boolean(data[suit]);checkbox.dispatchEvent(new Event("input",{bubbles:true}));}
      }
      rows=[...group.querySelectorAll("tbody>tr[data-skill-key]")];row=rows.find(item=>rowName(item)===wanted)||rows[index];
      const level=row?.querySelector('[data-f="level"]');if(level&&Number(level.value)!==Number(data.level||0))assign(level,Number(data.level||0),true);
    }
  }
  function restoreOutfits(saved){
    let guard=0;while(document.querySelectorAll("#outfit-list [data-outfit-key]").length<saved.length&&guard++<50)document.querySelector("#add-outfit")?.click();
    const cards=[...document.querySelectorAll("#outfit-list [data-outfit-key]")];
    saved.forEach((fields,index)=>{const card=cards[index];if(!card)return;const data=rowData(fields);for(const [field,value] of Object.entries(data)){const element=card.querySelector(`[data-o="${field}"]`);if(element)assign(element,value,true);}});
  }
  async function restoreDraft(draft){
    restoring=true;
    try{
      for(const item of draft.staticFields||[]){const element=document.getElementById(item.id);if(element)assign(element,item.value,true);}
      for(const group of draft.skills||[])await restoreSkillGroup(group);
      restoreOutfits(draft.outfits||[]);
      setButtonState("editing");
    }finally{restoring=false;}
  }
  function ready(){return document.querySelector("#save-button")&&document.querySelector("#general-skills .skill-group")&&!/初期化中|読込中/.test(document.querySelector("#save-status")?.textContent||"");}
  function initialize(){
    if(!ready()){nativeSetTimeout(initialize,80);return;}
    activeKey=draftKey();
    let draft=null;try{draft=JSON.parse(localStorage.getItem(activeKey)||"null");}catch{}
    if(draft)restoreDraft(draft);else setButtonState(hasDatabaseRecord()?"saved":"unsaved");
    document.addEventListener("input",event=>{if(!restoring&&event.target.matches("input,select,textarea"))queueDraft();},true);
    document.addEventListener("change",event=>{if(!restoring&&event.target.matches("input,select,textarea"))queueDraft();},true);
    document.addEventListener("click",event=>{if(!restoring&&event.target.closest("[data-delete-skill],[data-delete-outfit],[data-skill-move],#add-general,#add-social,#add-connection,#add-style-skill,#add-outfit"))nativeSetTimeout(queueDraft,0);},true);
    const status=document.querySelector("#save-status");
    new MutationObserver(()=>{
      const text=status.textContent.trim();
      if(text==="保存済み"){
        localStorage.removeItem(activeKey);
        activeKey=draftKey();localStorage.removeItem(activeKey);
        setButtonState("saved");
      }else if(/失敗|エラー/.test(text))setButtonState("editing");
    }).observe(status,{childList:true,subtree:true,characterData:true});
  }
  document.addEventListener("DOMContentLoaded",initialize,{once:true});
})();