(function(){
  const DRAFT_KEY="tnx-sheet-browser-draft:v28:new";
  const isNewSheet=()=>!(new URLSearchParams(location.search).get("id")||"").trim();

  function groupByTitle(text){
    return [...document.querySelectorAll("#general-skills .skill-group")].find(group=>(group.querySelector(".skill-group-title")?.textContent||"").includes(text));
  }

  function removeAllRows(title){
    let guard=0;
    while(guard++<20){
      const group=groupByTitle(title);
      const remove=group?.querySelector("tbody>tr[data-skill-key] [data-delete-skill]");
      if(!remove)break;
      remove.click();
    }
  }

  function clickAdd(selector,count){
    const button=document.querySelector(selector);
    if(!button)return;
    for(let i=0;i<count;i++)button.click();
  }

  function setFirstSocialName(){
    const input=groupByTitle("社会")?.querySelector('tbody>tr[data-skill-key] input[data-f="name"]');
    if(!input)return;
    input.value="社会：Ｎ◎ＶＡ";
    input.dispatchEvent(new Event("input",{bubbles:true}));
  }

  function configureInitialSlots(){
    if(!isNewSheet()||localStorage.getItem(DRAFT_KEY))return;
    removeAllRows("社会");
    removeAllRows("コネクション");
    clickAdd("#add-social",4);
    clickAdd("#add-connection",3);
    setFirstSocialName();
  }

  function ready(){
    const status=document.querySelector("#save-status")?.textContent||"";
    return groupByTitle("社会")&&groupByTitle("コネクション")&&!/初期化中|読込中/.test(status);
  }

  function initialize(){
    if(!isNewSheet()||localStorage.getItem(DRAFT_KEY))return;
    if(!ready()){setTimeout(initialize,80);return;}
    configureInitialSlots();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});
  else initialize();
})();
