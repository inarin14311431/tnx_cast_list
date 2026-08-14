/* Network scan sequence and ambient data stream for the public cast view. */
(function(){
  // Playwright visual tests need a stable DOM. The scan sequence mutates the
  // overlay with timers even after CSS animations are disabled, so skip the
  // presentation-only effect for automated browsers while keeping production
  // behavior unchanged.
  if(navigator.webdriver===true)return;
  if(window.matchMedia?.('(max-width: 600px)').matches===true)return;
  document.body.classList.add('cast-scan-mode');
  const publicId=new URLSearchParams(location.search).get('id')?.trim()||'UNKNOWN';
  const scanSessionKey='tnx-cast-scan-complete-v2';
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
  const entries=fastScan
    ? [['LINK','既存認証経路を再接続'],['VERIFY','キャッシュ済み認証を確認']]
    : [['ROUTE','都市ネットへ接続'],['TRACE','対象IDを追跡'],['AUTH','アクセス権限を照合'],['SCAN','身体・経歴・技能データを抽出'],['VERIFY','データ整合性を確認']];
  const startedAt=performance.now();
  const minimumDisplayMs=fastScan?520:3600;
  let progress=0,line=0,resolved=false;

  function addLog(label,text,ok=false){const p=document.createElement('p');p.className=ok?'ok':'';p.innerHTML=`<strong>${escapeHtml(label)}</strong> // ${escapeHtml(text)}`;log.append(p);}
  function finish(success){
    if(resolved)return;resolved=true;progress=100;bar.style.width='100%';addLog(success?'ACCESS GRANTED':'DENIED',success?(fastScan?'認証済みデータへ接続':'パーソナルデータ取得完了'):'対象データの取得に失敗',success);
    if(success){try{sessionStorage.setItem(scanSessionKey,String(Date.now()));}catch{}}
    const remain=Math.max(0,minimumDisplayMs-(performance.now()-startedAt));
    window.setTimeout(()=>{
      overlay.classList.add('is-complete');
      window.setTimeout(()=>{
        overlay.remove();
        window.dispatchEvent(new CustomEvent('tnx:cast-scan-complete',{detail:{success,fastScan}}));
      },fastScan?260:620);
    },remain+(fastScan?80:420));
  }
  addLog('LINK',fastScan?'既存の認証経路を呼び出し中…':'暗号化経路を確立中…');
  const timer=setInterval(()=>{
    const content=document.querySelector('#cast-content'),error=document.querySelector('#cast-error');
    const dataReady=content&&!content.hidden,failed=error&&!error.hidden,cap=(dataReady||failed)?100:90;
    const factor=fastScan?.42:.10;
    progress=Math.min(cap,progress+Math.max(fastScan?12:2,Math.round((cap-progress)*factor)));bar.style.width=`${progress}%`;
    const threshold=fastScan?[34,72]:[14,32,50,70,88];while(line<entries.length&&progress>=threshold[line]){addLog(entries[line][0],entries[line][1],line<1);line++;}
    if(failed){clearInterval(timer);finish(false);return;}if(dataReady&&progress>=96){clearInterval(timer);finish(true);}
  },fastScan?45:130);
  window.setTimeout(()=>{if(resolved)return;const content=document.querySelector('#cast-content'),error=document.querySelector('#cast-error');if(content&&!content.hidden){clearInterval(timer);finish(true);}else if(error&&!error.hidden){clearInterval(timer);finish(false);}},fastScan?1000:4600);
  function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
})();
