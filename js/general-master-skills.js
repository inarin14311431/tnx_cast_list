/* Materialize fixed proper-name General skills only when first acquired.
 * The generated level-0 master row is replaced by one real editor row, so
 * repeated suit clicks never create duplicate 製作：/芸術：/操縦： records. */
(function(){
  const MASTER_NAMES=["製作：","芸術：","操縦："];
  const SUITS=["reason","passion","life","mundane"];
  const bound=new Set();
  const busy=new Set();
  let readyNotified=false;

  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));

  function generalGroups(){
    return [...document.querySelectorAll("#general-skills>.skill-group")].filter(group=>{
      const title=group.querySelector(".skill-group-title")?.textContent||"";
      return title.includes("一般技能");
    });
  }

  function rows(){
    return generalGroups().flatMap(group=>[...group.querySelectorAll("tbody tr[data-skill-key]")]);
  }

  function rowName(row){
    return (row?.querySelector('[data-f="name"]')?.value||"").trim();
  }

  function exactMasterName(row){
    const name=rowName(row);
    return MASTER_NAMES.includes(name)?name:"";
  }

  function suitBoxes(row){
    return SUITS.map(suit=>row?.querySelector(`[data-f="${suit}"]`)).filter(Boolean);
  }

  function selectedCount(row){
    return suitBoxes(row).filter(box=>box.checked).length;
  }

  function rowScore(row){
    const level=Math.max(0,Number(row?.querySelector('[data-f="level"]')?.value||0));
    return level*10+selectedCount(row);
  }

  function setControl(control,value){
    if(!control)return;
    if(control.type==="checkbox")control.checked=Boolean(value);
    else control.value=String(value);
    control.dispatchEvent(new Event("input",{bubbles:true}));
    control.dispatchEvent(new Event("change",{bubbles:true}));
  }

  function restoreScroll(position){
    window.scrollTo(position.x,position.y);
    requestAnimationFrame(()=>window.scrollTo(position.x,position.y));
  }

  async function waitFor(getter,attempts=100){
    for(let attempt=0;attempt<attempts;attempt++){
      const value=getter();
      if(value)return value;
      await wait(40);
    }
    return null;
  }

  async function settle(){
    await nextFrame();
    await wait(40);
  }

  async function removeDuplicateExactRows(name,preferredKey=""){
    for(let attempt=0;attempt<16;attempt++){
      const matches=rows().filter(row=>rowName(row)===name);
      if(matches.length<=1)return matches[0]||null;

      const keep=matches.find(row=>row.dataset.skillKey===preferredKey)
        || [...matches].sort((a,b)=>rowScore(b)-rowScore(a))[0];
      const victim=matches.find(row=>row!==keep);
      const button=victim?.querySelector("[data-delete-skill]");
      if(!button)return keep;

      button.click();
      await settle();
    }
    return rows().find(row=>rowName(row)===name)||null;
  }

  async function materialize(name,desiredSuits){
    if(bound.has(name)||busy.has(name))return;
    busy.add(name);
    const scrollPosition={x:window.scrollX,y:window.scrollY};

    try{
      const beforeKeys=new Set(rows().map(row=>row.dataset.skillKey));
      const addButton=document.querySelector("#add-general");
      if(!addButton)return;

      addButton.click();
      restoreScroll(scrollPosition);

      const blank=await waitFor(()=>[...rows()].reverse().find(row=>{
        return rowName(row)===""&&!beforeKeys.has(row.dataset.skillKey);
      }));
      if(!blank)return;

      const realKey=blank.dataset.skillKey;
      setControl(blank.querySelector('[data-f="skill_kind"]'),"proper");
      setControl(blank.querySelector('[data-f="name"]'),name);

      SUITS.forEach(suit=>{
        setControl(blank.querySelector(`[data-f="${suit}"]`),Boolean(desiredSuits[suit]));
      });
      setControl(blank.querySelector('[data-f="level"]'),SUITS.filter(suit=>desiredSuits[suit]).length);
      await settle();

      await removeDuplicateExactRows(name,realKey);
      bound.add(name);
    }finally{
      restoreScroll(scrollPosition);
      busy.delete(name);
    }
  }

  async function cleanupExistingDuplicates(){
    const root=await waitFor(()=>{
      const element=document.querySelector("#general-skills");
      return element?.querySelector("tr[data-skill-key]")?element:null;
    });
    if(!root)return;

    for(const name of MASTER_NAMES){
      const remaining=await removeDuplicateExactRows(name);
      if(remaining&&(rowScore(remaining)>0))bound.add(name);
    }

    if(!readyNotified){
      readyNotified=true;
      window.dispatchEvent(new CustomEvent("tnx:general-master-ready"));
    }
  }

  document.addEventListener("click",event=>{
    const label=event.target.closest?.(".suit-check");
    const box=label?.querySelector('input[data-f="reason"],input[data-f="passion"],input[data-f="life"],input[data-f="mundane"]');
    const row=box?.closest('tr[data-skill-key]');
    const name=exactMasterName(row);
    if(!box||!row||!name)return;

    /* A row with acquired data is already a real skill and should use the
       editor's normal handlers. Only the untouched level-0 master row needs
       conversion. */
    if(bound.has(name)||rowScore(row)>0){
      bound.add(name);
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    const desiredSuits=Object.fromEntries(SUITS.map(suit=>{
      const control=row.querySelector(`[data-f="${suit}"]`);
      return [suit,control===box?!control.checked:Boolean(control?.checked)];
    }));
    materialize(name,desiredSuits);
  },true);

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",cleanupExistingDuplicates,{once:true});
  }else{
    cleanupExistingDuplicates();
  }
})();
