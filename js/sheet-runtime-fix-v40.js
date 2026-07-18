(function(){
  const INITIAL_CREATION=170;
  const INITIAL_SOCIAL=20;
  const INITIAL_CONNECTION=15;
  const FIXED_GENERAL=new Set(["医療","射撃","知覚","電脳","心理","自我","交渉","運動","回避","白兵","信用","圧力","隠密"]);
  const total=document.querySelector("#exp-total");
  const breakdown=document.querySelector("#exp-breakdown");
  let observer=null;
  let queued=false;
  let applying=false;

  function groupType(group){
    const title=group.querySelector(".skill-group-title")?.textContent||"";
    if(title.includes("社会"))return "social";
    if(title.includes("コネクション"))return "connection";
    return "general";
  }

  function generalCost(){
    let value=0;
    document.querySelectorAll("#general-skills .skill-group").forEach(group=>{
      const type=groupType(group);
      group.querySelectorAll("tbody>tr[data-skill-key]").forEach(row=>{
        const name=row.querySelector('[data-f="name"]')?.value.trim()||"";
        const level=Math.max(0,Number(row.querySelector('[data-f="level"]')?.value||0));
        if(!name||level===0)return;
        const kind=row.querySelector('[data-f="skill_kind"]')?.value||"proper";
        let free=0;
        if(type==="general"&&FIXED_GENERAL.has(name))free=1;
        value+=Math.max(0,level-free)*(kind==="proper"?5:10);
      });
    });
    return value;
  }

  function baseEntries(){
    return [...breakdown.querySelectorAll(":scope>div")].filter(row=>!row.dataset.fixedDeduction);
  }

  function deductionRow(label,value){
    const row=document.createElement("div");
    row.dataset.fixedDeduction="1";
    row.innerHTML=`<dt>${label}</dt><dd>-${value}</dd>`;
    return row;
  }

  function applyExperience(){
    queued=false;
    if(applying||!total||!breakdown)return;
    const entries=baseEntries();
    if(!entries.length)return;
    applying=true;
    observer?.disconnect();
    try{
      const general=entries.find(row=>row.querySelector("dt")?.textContent.trim()==="一般技能");
      if(general){const dd=general.querySelector("dd");if(dd)dd.textContent=String(generalCost());}
      breakdown.querySelectorAll('[data-fixed-deduction="1"]').forEach(row=>row.remove());
      breakdown.append(
        deductionRow("社会初期分",INITIAL_SOCIAL),
        deductionRow("コネ初期分",INITIAL_CONNECTION),
        deductionRow("初期作成分",INITIAL_CREATION)
      );
      const subtotal=entries.reduce((sum,row)=>sum+Number(row.querySelector("dd")?.textContent||0),0);
      total.textContent=String(Math.max(0,subtotal-INITIAL_SOCIAL-INITIAL_CONNECTION-INITIAL_CREATION));
    }finally{
      applying=false;
      observer?.observe(breakdown,{childList:true,subtree:true,characterData:true});
    }
  }

  function queueExperience(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(applyExperience);
  }

  function clearDraft(){
    if(!confirm("新規作成画面の一時保存を削除し、初期状態へ戻します。よろしいですか？"))return;
    for(let index=localStorage.length-1;index>=0;index--){
      const key=localStorage.key(index)||"";
      if(key.startsWith("tnx-sheet-browser-draft:v28:new")||key.startsWith("tnx-skill-order:new:"))localStorage.removeItem(key);
    }
    location.reload();
  }

  function addClearButton(){
    if(new URLSearchParams(location.search).get("id")||document.querySelector("#clear-browser-draft"))return;
    const anchor=document.querySelector("#legacy-import-open")||document.querySelector("#save-button");
    if(!anchor)return;
    const button=document.createElement("button");
    button.id="clear-browser-draft";
    button.type="button";
    button.innerHTML="一時保存をクリア <small>CLEAR TEMP DATA</small>";
    button.addEventListener("click",clearDraft);
    anchor.after(button);
  }

  function initialize(){
    if(!total||!breakdown||!document.querySelector("#general-skills .skill-group")){setTimeout(initialize,80);return;}
    addClearButton();
    observer=new MutationObserver(queueExperience);
    observer.observe(breakdown,{childList:true,subtree:true,characterData:true});
    document.addEventListener("input",queueExperience,true);
    document.addEventListener("change",queueExperience,true);
    document.addEventListener("click",event=>{
      if(event.target.closest("[data-delete-skill],[data-skill-move],#add-general,#add-social,#add-connection,#add-style-skill"))setTimeout(queueExperience,0);
    },true);
    queueExperience();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});else initialize();
})();
