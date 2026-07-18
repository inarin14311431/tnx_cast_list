(()=>{
  const root=document.querySelector('#outfit-list');
  if(!root)return;
  function enhance(){
    root.querySelectorAll('[data-outfit-key]').forEach(card=>{
      const fields=[...card.querySelectorAll('[data-o="description"]')];
      if(!fields.length)return;
      const primary=fields[0];
      fields.slice(1).forEach(extra=>{
        const label=extra.closest('label');
        if(label&&label!==primary.closest('label'))label.remove();else extra.remove();
      });
      if(primary.tagName==='TEXTAREA'){
        primary.rows=3;
        primary.classList.add('outfit-description-textarea');
        return;
      }
      const textarea=document.createElement('textarea');
      textarea.dataset.o='description';
      textarea.value=primary.value||'';
      textarea.rows=3;
      textarea.className='outfit-description-textarea';
      textarea.setAttribute('aria-label','解説');
      textarea.oninput=primary.oninput;
      textarea.onchange=primary.onchange;
      primary.replaceWith(textarea);
    });
  }
  let queued=false;
  const queue=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhance();});};
  new MutationObserver(queue).observe(root,{childList:true,subtree:true});
  queue();
})();
