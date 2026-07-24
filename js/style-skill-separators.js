/* Style-skill separator rows. Persisted as zero-cost style skills with an internal marker. */
(()=>{
  const MARKER="[[STYLE_SEPARATOR]]";
  const container=document.querySelector("#style-skills");
  const addButton=document.querySelector("#add-style-separator");
  if(!container||!addButton)return;

  const wait=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const rows=()=>[...container.querySelectorAll('tr[data-skill-key]')];
  const description=row=>row.querySelector('[data-f="description"]');
  const isSeparator=row=>String(description(row)?.value||"").startsWith(MARKER);
  const emit=element=>{
    element?.dispatchEvent(new Event("input",{bubbles:true}));
    element?.dispatchEvent(new Event("change",{bubbles:true}));
  };

  function decorate(row){
    if(!isSeparator(row))return;
    row.classList.add("style-skill-separator-row");
    row.dataset.styleSeparator="1";
    const cells=[...row.children];
    cells.forEach(cell=>cell.removeAttribute("colspan"));
    if(cells[0])cells[0].colSpan=Math.max(1,cells.length-1);
    const name=row.querySelector('[data-f="name"]');
    if(name){
      name.placeholder="区切り名（例：アヤカシ）";
      name.setAttribute("aria-label","スタイル技能の区切り名");
    }
  }

  function decorateAll(){rows().forEach(decorate);}

  async function createSeparator(){
    addButton.disabled=true;
    try{
      const before=new Set(rows().map(row=>row.dataset.skillKey));
      document.querySelector("#add-style-skill")?.click();
      let row=null;
      for(let i=0;i<15&&!row;i++){
        await wait();
        row=rows().find(candidate=>!before.has(candidate.dataset.skillKey));
      }
      if(!row)return;

      const name=row.querySelector('[data-f="name"]');
      const kind=row.querySelector('[data-f="skill_kind"]');
      const level=row.querySelector('[data-f="level"]');
      const detail=description(row);
      if(name){name.value="スタイル技能";emit(name);}
      if(kind){
        if(!kind.querySelector('option[value="none"]')){
          const option=document.createElement("option");
          option.value="none";option.textContent="なし";kind.prepend(option);
        }
        kind.value="none";emit(kind);
      }
      if(level){level.value="0";emit(level);}
      row.querySelectorAll('input[type="checkbox"][data-f]').forEach(box=>{box.checked=false;emit(box);});
      row.querySelectorAll('[data-f]').forEach(field=>{
        const key=field.dataset.f;
        if(["name","skill_kind","level","description","reason","passion","life","mundane"].includes(key))return;
        field.value="";emit(field);
      });
      if(detail){detail.value=MARKER;emit(detail);}
      decorate(row);
      name?.focus();name?.select();
    }finally{addButton.disabled=false;}
  }

  addButton.addEventListener("click",createSeparator);
  new MutationObserver(decorateAll).observe(container,{childList:true,subtree:true});
  container.addEventListener("input",event=>{
    const row=event.target.closest?.('tr[data-skill-key]');
    if(row)decorate(row);
  });
  decorateAll();
})();
