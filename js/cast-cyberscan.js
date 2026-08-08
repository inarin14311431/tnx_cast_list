/* Network scan sequence and ambient data stream for the public cast view. */
(function(){
  const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;
  if(reducedMotion){
    document.body.classList.add('cast-reduced-motion');
    return;
  }
  document.body.classList.add('cast-scan-mode');
  const publicId=new URLSearchParams(location.search).get('id')?.trim()||'UNKNOWN';
  const scanSessionKey='tnx-cast-scan-complete-v1';
  const fastScanWindowMs=10*60*1000;
  let fastScan=false;
  try{
    const lastScanAt=Number(sessionStorage.getItem(scanSessionKey));
    const elapsed=Date.now()-lastScanAt;
    fastScan=Number.isFinite(lastScanAt)&&lastScanAt>0&&elapsed>=0&&elapsed<=fastScanWindowMs;
  }catch{}
  if(fastScan)document.body.classList.add('cast-scan-fast');

  const rain=document.createElement('div');
  rain.className='cast-data-rain';
  rain.setAttribute('aria-hidden','true');
  const chars='01 N◎VA CAST ACCESS DATA LINK TRACE AUTH '; 
  for(let index=0;index<16;index++){
    const line=document.createElement('span');
    line.style.left=`${index*6.4+(index%3)*1.2}%`;
    line.style.animationDuration=`${10+(index%6)*2.2}s`;
    line.style.animationDelay=`-${(index*1.7)%12}s`;
    line.textContent=Array.from({length:34},(_,row)=>{
      const start=(index*7+row*5)%chars.length;
      return chars.slice(start,start+8).padEnd(8,'0');
    }).join('\n');
    rain.append(line);
  }
  document.body.prepend(rain);

  const overlay=document.createElement('section');
  overlay.className='cast-access-overlay';
  if(fastScan)overlay.classList.add('is-fast-scan');
  overlay.setAttribute('aria-live','polite');
  overlay.innerHTML=`
    <div class="cast-access-terminal">
      <p class="cast-access-kicker">N◎VA MUNICIPAL NET // SECURE TRACE</p>
      <h1 class="cast-access-title">CAST DATA SCAN</h1>
      <p class="cast-access-target">TARGET: ${escapeHtml(publicId)}</p>
      <div class="cast-access-progress" aria-label="スキャン進行"><span></span></div>
      <div class="cast-access-log"></div>
    </div>`;
  document.body.prepend(overlay);

  const bar=overlay.querySelector('.cast-access-progress span');
  const log=overlay.querySelector('.cast-access-log');
  const entries=[
    ['ROUTE','都市ネットへ接続'],
    ['TRACE','対象IDを追跡'],
    ['AUTH','アクセス権限を照合'],
    ['SCAN','身体・経歴・技能データを抽出'],
    ['VERIFY','データ整合性を確認']
  ];
  let progress=0;
  let line=0;
  let resolved=false;

  function addLog(label,text,ok=false){
    const p=document.createElement('p');
    p.className=ok?'ok':'';
    p.innerHTML=`<strong>${escapeHtml(label)}</strong> // ${escapeHtml(text)}`;
    log.append(p);
  }

  addLog('LINK',fastScan?'既存の認証経路を再接続中…':'暗号化経路を確立中…');
  const timer=setInterval(()=>{
    const content=document.querySelector('#cast-content');
    const error=document.querySelector('#cast-error');
    const dataReady=content&&!content.hidden;
    const failed=error&&!error.hidden;
    const cap=dataReady?100:failed?100:88;
    progress=Math.min(cap,progress+Math.max(fastScan?12:2,Math.round((cap-progress)*(fastScan ? 0.44 : 0.16))));
    bar.style.width=`${progress}%`;

    const threshold=[18,36,56,76,91];
    while(line<entries.length&&progress>=threshold[line]){
      addLog(entries[line][0],entries[line][1],line<2);
      line++;
    }

    if(failed&&!resolved){
      resolved=true;
      addLog('DENIED','対象データの取得に失敗','');
      setTimeout(()=>overlay.classList.add('is-complete'),700);
      clearInterval(timer);
      return;
    }

    if(dataReady&&progress>=100&&!resolved){
      resolved=true;
      addLog('ACCESS GRANTED','パーソナルデータ取得完了',true);
      try{sessionStorage.setItem(scanSessionKey,String(Date.now()));}catch{}
      document.querySelector('#cast-status')?.setAttribute('data-scan-state','complete');
      setTimeout(()=>overlay.classList.add('is-complete'),fastScan?90:520);
      setTimeout(()=>overlay.remove(),fastScan?460:1300);
      clearInterval(timer);
    }
  },fastScan?45:120);

  setTimeout(()=>{
    if(resolved)return;
    const content=document.querySelector('#cast-content');
    if(content&&!content.hidden){progress=100;bar.style.width='100%';}
  },fastScan?850:2600);

  function escapeHtml(value){
    return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }
})();
