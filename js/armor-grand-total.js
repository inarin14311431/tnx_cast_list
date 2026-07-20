/* Add an overall S+I+P total to the armor table footer. */
(function(){
  const root=document.querySelector('#outfit-list');
  if(!root)return;

  let queued=false;

  function ensureFooter(section){
    const row=section.querySelector('.armor-defense-total-row');
    if(!row)return;

    let spacer=row.querySelector('.armor-defense-total-spacer');
    if(!spacer){
      spacer=row.lastElementChild;
      if(spacer){
        spacer.classList.add('armor-defense-total-spacer');
        spacer.colSpan=1;
      }
    }

    let label=row.querySelector('.armor-defense-grand-label');
    let value=row.querySelector('[data-armor-grand-total]');
    if(!label){
      label=document.createElement('th');
      label.className='armor-defense-grand-label';
      label.textContent='総合計';
      row.append(label);
    }
    if(!value){
      value=document.createElement('td');
      value.className='armor-defense-grand-total';
      value.dataset.armorGrandTotal='1';
      value.textContent='0';
      row.append(value);
    }
  }

  function update(){
    queued=false;
    root.querySelectorAll('.outfit-table-group--armor').forEach(section=>{
      ensureFooter(section);
      const total=['s','i','p'].reduce((sum,key)=>{
        const cell=section.querySelector(`[data-armor-total="${key}"]`);
        return sum+Number(cell?.textContent||0);
      },0);
      const output=section.querySelector('[data-armor-grand-total]');
      if(output)output.textContent=String(total);
    });
  }

  function queue(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(update);
  }

  root.addEventListener('input',queue,true);
  root.addEventListener('change',queue,true);
  new MutationObserver(queue).observe(root,{childList:true,subtree:true,characterData:true});
  queue();
})();
