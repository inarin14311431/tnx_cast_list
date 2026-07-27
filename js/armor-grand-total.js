/* Recalculate armor S/I/P totals vertically and keep the footer aligned. */
(function(){
  const root=document.querySelector('#outfit-list');
  if(!root)return;

  let queued=false;

  function removeGrandTotal(row){
    row.querySelector('.armor-defense-grand-label')?.remove();
    row.querySelector('[data-armor-grand-total]')?.remove();
    const spacer=row.querySelector('.armor-defense-total-spacer');
    if(spacer)spacer.classList.remove('armor-defense-total-spacer');
  }

  function numericValue(value){
    const number=Number(String(value??'').trim());
    return Number.isFinite(number)?number:0;
  }

  function setColSpan(cell,value){
    if(!cell)return;
    const next=Math.max(1,Number(value)||1);
    if(cell.colSpan!==next)cell.colSpan=next;
  }

  function alignFooter(section,row){
    const table=section.querySelector('table[data-outfit-schema="armor"]');
    const label=row.querySelector('th');
    const tail=row.querySelector('td:last-child:not([data-armor-total])');
    if(!table||!label||!tail)return;

    const visibleHeaders=[...table.querySelectorAll('thead tr > th')].filter(cell=>{
      if(cell.classList.contains('outfit-rule-hidden'))return false;
      return getComputedStyle(cell).display!=='none';
    });
    const defenseIndexes=['defense_s','defense_i','defense_p']
      .map(field=>visibleHeaders.findIndex(cell=>cell.classList.contains(`outfit-table-head--${field}`)))
      .filter(index=>index>=0);
    if(defenseIndexes.length!==3)return;

    const first=Math.min(...defenseIndexes);
    const last=Math.max(...defenseIndexes);
    setColSpan(label,first);

    const tailCount=visibleHeaders.length-last-1;
    const shouldHide=tailCount<=0;
    if(tail.hidden!==shouldHide)tail.hidden=shouldHide;
    if(!shouldHide)setColSpan(tail,tailCount);
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
    alignFooter(section,row);
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
  new MutationObserver(queue).observe(root,{
    childList:true,
    subtree:true,
    attributes:true,
    attributeFilter:['class','colspan','hidden']
  });
  queue();
  window.setTimeout(queue,120);
  window.setTimeout(queue,500);
  window.setTimeout(queue,1200);
})();