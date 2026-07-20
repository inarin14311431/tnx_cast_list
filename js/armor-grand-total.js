/* Recalculate armor S/I/P totals vertically. No combined grand total. */
(function(){
  const root=document.querySelector('#outfit-list');
  if(!root)return;

  let queued=false;

  function removeGrandTotal(row){
    row.querySelector('.armor-defense-grand-label')?.remove();
    row.querySelector('[data-armor-grand-total]')?.remove();
    const spacer=row.querySelector('.armor-defense-total-spacer');
    if(spacer){
      spacer.classList.remove('armor-defense-total-spacer');
      spacer.colSpan=3;
    }
  }

  function numericValue(value){
    const number=Number(String(value??'').trim());
    return Number.isFinite(number)?number:0;
  }

  function updateSection(section){
    const row=section.querySelector('.armor-defense-total-row');
    if(!row)return;
    removeGrandTotal(row);

    const totals={s:0,i:0,p:0};
    section.querySelectorAll('tbody [data-armor-defense]').forEach(input=>{
      const key=String(input.dataset.armorDefense||'').toLowerCase();
      if(key in totals)totals[key]+=numericValue(input.value);
    });

    for(const key of ['s','i','p']){
      const output=section.querySelector(`[data-armor-total="${key}"]`);
      if(output)output.textContent=String(totals[key]);
    }
  }

  function update(){
    queued=false;
    root.querySelectorAll('.outfit-table-group--armor').forEach(updateSection);
  }

  function queue(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(update);
  }

  root.addEventListener('input',event=>{
    if(event.target.matches('[data-armor-defense]'))queue();
  },true);
  root.addEventListener('change',event=>{
    if(event.target.matches('[data-armor-defense]'))queue();
  },true);
  new MutationObserver(queue).observe(root,{childList:true,subtree:true});
  queue();
})();