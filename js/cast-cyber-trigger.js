/* Trigger visible cyber effects after cast data and enhanced style cards exist. */
(function(){
  // Keep automated visual captures deterministic. These effects re-trigger via
  // timers and class mutations even when Playwright disables CSS animations.
  if(navigator.webdriver===true)return;
  if(window.matchMedia?.('(max-width: 600px)').matches===true)return;
  const body=document.body;
  const content=document.querySelector('#cast-content');
  if(!body||!content)return;

  let started=false;
  function start(){
    if(started||content.hidden)return;
    if(document.querySelector('.cast-access-overlay'))return;
    const cards=[...document.querySelectorAll('#cast-styles .cast-style-card-simple')];
    if(cards.length<1)return;
    started=true;
    body.classList.remove('cast-cyber-enter');
    void body.offsetWidth;
    body.classList.add('cast-cyber-enter');
    cards.forEach((card,index)=>{
      card.classList.remove('cast-style-verify');
      card.style.setProperty('--cast-style-delay',`${380+index*320}ms`);
      void card.offsetWidth;
      card.classList.add('cast-style-verify');
    });
    const id=document.querySelector('.cast-header__public-id');
    if(id){
      const scan=()=>{id.classList.remove('cast-id-scan');void id.offsetWidth;id.classList.add('cast-id-scan');};
      window.setTimeout(scan,350);
      window.setInterval(scan,5600);
    }
  }

  const observer=new MutationObserver(()=>start());
  observer.observe(content,{attributes:true,attributeFilter:['hidden'],childList:true,subtree:true});
  window.addEventListener('tnx:cast-scan-complete',event=>{
    if(event.detail?.success!==false)start();
  },{once:true});
  window.setTimeout(start,0);
  window.setTimeout(start,250);
  window.setTimeout(start,700);
  window.setTimeout(start,1400);
  window.setTimeout(start,3200);
  window.setTimeout(()=>observer.disconnect(),6000);
})();
