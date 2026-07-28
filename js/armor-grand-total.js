/* Compatibility shim. Armor totals are maintained by outfit-tables.js. */
(function(){
  const root=document.querySelector('#outfit-list');
  if(!root)return;

  function numericValue(value){
    const number=Number(String(value??'').trim());
    return Number.isFinite(number)?number:0;
  }

  function updateSection(section){
    const totals={s:0,i:0,p:0};
    section.querySelectorAll('tbody [data-armor-defense]').forEach(input=>{
      const key=String(input.dataset.armorDefense||'').toLowerCase();
      if(key in totals)totals[key]+=numericValue(input.value);
    });
    for(const key of ['s','i','p']){
      const output=section.querySelector(`[data-armor-total="${key}"]`);
      if(output&&output.textContent!==String(totals[key]))output.textContent=String(totals[key]);
    }
  }

  function updateAll(){
    root.querySelectorAll('.outfit-table-group--armor').forEach(updateSection);
  }

  root.addEventListener('input',event=>{
    if(event.target.matches('[data-armor-defense]'))updateSection(event.target.closest('.outfit-table-group--armor'));
  },true);
  root.addEventListener('change',event=>{
    if(event.target.matches('[data-armor-defense]'))updateSection(event.target.closest('.outfit-table-group--armor'));
  },true);

  requestAnimationFrame(updateAll);
  setTimeout(updateAll,300);
})();