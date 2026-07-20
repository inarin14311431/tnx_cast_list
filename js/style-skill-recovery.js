/* Ensure the style-skill editor always has an editable row. */
(function(){
  const MAX_RETRIES=30;
  let retries=0;
  let queued=false;

  function hasEditableRow(area){
    return !!area.querySelector('tr[data-skill-key]');
  }

  function ensureStyleSkillRow(){
    queued=false;
    const area=document.querySelector('#style-skills');
    const button=document.querySelector('#add-style-skill');
    if(!area||!button){
      if(retries++<MAX_RETRIES)setTimeout(ensureStyleSkillRow,100);
      return;
    }
    if(hasEditableRow(area))return;

    button.click();
    requestAnimationFrame(()=>{
      const row=area.querySelector('tr[data-skill-key]');
      row?.querySelector('[data-f="name"]')?.focus();
      if(!row&&retries++<MAX_RETRIES)setTimeout(ensureStyleSkillRow,100);
    });
  }

  function queueEnsure(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(ensureStyleSkillRow);
  }

  function initialize(){
    const area=document.querySelector('#style-skills');
    if(!area){
      if(retries++<MAX_RETRIES)setTimeout(initialize,100);
      return;
    }
    new MutationObserver(queueEnsure).observe(area,{childList:true,subtree:true});
    queueEnsure();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
  else initialize();
})();
