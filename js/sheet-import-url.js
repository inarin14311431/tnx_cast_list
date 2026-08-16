/* Character-sheets direct URL import for the sheet editor. VERSION 1.3.0 */
(()=>{
  const VERSION='1.3.0';
  import('./help-ui.js?v=6').catch(error=>console.error('sheet help failed to load',error));

  const dialog=document.querySelector('#legacy-import-dialog');
  const form=dialog?.querySelector('form');
  const legacyText=document.querySelector('#legacy-import-json');
  const legacyApply=document.querySelector('#legacy-import-apply');
  const legacyCopy=document.querySelector('#legacy-bookmarklet-copy');
  const message=document.querySelector('#legacy-import-message');
  const importButton=document.querySelector('#legacy-import-open');
  if(!dialog||!form||!legacyText||!legacyApply||!message||!importButton)return;
  if(dialog.dataset.urlImportReady==='1')return;
  dialog.dataset.urlImportReady='1';
  dialog.dataset.urlImportVersion=VERSION;

  // 旧取込専用HELPは廃止済み。残存DOMだけを初期化時に1回掃除する。
  document.querySelectorAll('#sheet-import-help-button,#sheet-import-bookmarklet-copy,#sheet-import-help-dialog').forEach(node=>node.remove());
  const obsoleteControl=importButton.closest('.sheet-import-control');
  if(obsoleteControl&&obsoleteControl.parentNode){
    obsoleteControl.parentNode.insertBefore(importButton,obsoleteControl);
    obsoleteControl.remove();
  }
  importButton.classList.remove('sheet-import-main-action');
  importButton.innerHTML='データ取込 <small>IMPORT DATA</small>';

  const heading=form.querySelector('h2');
  const intro=heading?.nextElementSibling;
  if(heading)heading.textContent='キャラシ倉庫から取込';
  if(intro?.tagName==='P')intro.textContent='キャラクターシート倉庫のURLを入力して「取込み」を押してください。';

  legacyCopy?.remove();
  legacyText.hidden=true;
  legacyText.setAttribute('aria-hidden','true');
  legacyApply.hidden=true;
  legacyApply.setAttribute('aria-hidden','true');

  const box=document.createElement('section');
  box.className='character-sheets-url-import';
  box.innerHTML=`
    <label for="character-sheets-import-url">キャラクターシート倉庫URL</label>
    <input id="character-sheets-import-url" type="url" inputmode="url" autocomplete="off" spellcheck="false" placeholder="https://character-sheets.appspot.com/tnx/edit.html?key=...">
    <button id="character-sheets-import-run" type="button">取込み <small>IMPORT</small></button>
    <small class="character-sheets-url-import__version">URL IMPORT v${VERSION}</small>
  `;
  message.before(box);

  const input=box.querySelector('#character-sheets-import-url');
  const run=box.querySelector('#character-sheets-import-run');

  const style=document.createElement('style');
  style.textContent=`
    #legacy-import-dialog .character-sheets-url-import{display:grid;gap:10px;margin:16px 0}
    #legacy-import-dialog .character-sheets-url-import label{font-weight:700}
    #legacy-import-dialog .character-sheets-url-import input{width:100%;min-width:0;padding:11px 12px}
    #legacy-import-dialog .character-sheets-url-import button{min-height:44px}
    #legacy-import-dialog .character-sheets-url-import__version{justify-self:end;opacity:.52;font-size:10px;letter-spacing:.06em}
  `;
  document.head.append(style);

  function setMessage(text,isError=false){
    message.textContent=text;
    message.dataset.state=isError?'error':'';
  }

  function resolveSource(value){
    const raw=String(value||'').trim();
    if(!raw)throw new Error('キャラクターシート倉庫のURLを入力してください。');
    let url;
    try{url=new URL(raw)}catch{throw new Error('URLの形式を確認してください。');}
    if(url.hostname!=='character-sheets.appspot.com')throw new Error('character-sheets.appspot.com のURLを指定してください。');
    const parts=url.pathname.split('/').filter(Boolean);
    if(parts[0]!=='tnx')throw new Error('トーキョーN◎VAのキャラクターシートURLではありません。');
    const key=url.searchParams.get('key')?.trim();
    if(!key)throw new Error('URLに key がありません。保存済みキャラクターのURLを指定してください。');
    return key;
  }

  function normalizePayload(payload){
    let data=payload;
    for(let i=0;i<3;i++){
      if(typeof data==='string'){
        try{data=JSON.parse(data);continue;}catch{break;}
      }
      if(data&&typeof data==='object'&&typeof data.jsonData==='string'&&data.jsonData.trim()){
        try{data=JSON.parse(data.jsonData);continue;}catch{}
      }
      if(data&&typeof data==='object'&&data.data&&typeof data.data==='object'&&!data.base&&!data.skills1&&!data.superhumanskills&&!data.weapons){
        data=data.data;continue;
      }
      break;
    }
    if(!data||typeof data!=='object')throw new Error('キャラシ倉庫から有効なデータを取得できませんでした。');
    const supported=Array.isArray(data.fields)||data.base||data.skills1||data.skills2||data.superhumanskills||data.weapons||data.outfits;
    if(!supported)throw new Error('取得データをTNXキャラクターシートとして認識できません。');
    return data;
  }

  function fetchJsonp(key,timeout=15000){
    return new Promise((resolve,reject)=>{
      const callback=`__tnxSheetUrlImport_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const script=document.createElement('script');
      let settled=false;
      const cleanup=()=>{
        try{delete window[callback];}catch{window[callback]=undefined;}
        script.remove();
      };
      const finish=(fn,value)=>{
        if(settled)return;
        settled=true;clearTimeout(timer);cleanup();fn(value);
      };
      const timer=setTimeout(()=>finish(reject,new Error('キャラシ倉庫からの応答がタイムアウトしました。')),timeout);
      window[callback]=payload=>finish(resolve,payload);
      script.onerror=()=>finish(reject,new Error('キャラシ倉庫のデータ取得に失敗しました。'));
      script.src=`https://character-sheets.appspot.com/tnx/display?ajax=1&key=${encodeURIComponent(key)}&callback=${encodeURIComponent(callback)}`;
      document.head.append(script);
    });
  }

  function waitUntilFinished(timeout=180000){
    return new Promise(resolve=>{
      const started=Date.now();
      const tick=()=>{
        const busy=dialog.getAttribute('data-importing')==='1';
        if(!busy||!dialog.open||Date.now()-started>timeout)return resolve();
        setTimeout(tick,150);
      };
      setTimeout(tick,150);
    });
  }

  async function importFromUrl(){
    if(run.disabled)return;
    run.disabled=true;
    input.disabled=true;
    setMessage('キャラシ倉庫からデータを取得しています…');
    try{
      const key=resolveSource(input.value);
      const payload=await fetchJsonp(key);
      const data=normalizePayload(payload);
      const name=String(data?.base?.name||data?.characterName||data?.name||'').trim();
      setMessage(`${name?`「${name}」を取得しました。`:''}編集画面へ反映しています…`);
      legacyText.value=JSON.stringify(data);
      legacyText.dispatchEvent(new Event('input',{bubbles:true}));
      legacyApply.click();
      await waitUntilFinished();
    }catch(error){
      console.error('character-sheets direct import failed',error);
      setMessage(`取込エラー：${error?.message||error}`,true);
    }finally{
      run.disabled=false;
      input.disabled=false;
    }
  }

  run.addEventListener('click',importFromUrl);
  input.addEventListener('keydown',event=>{
    if(event.key!=='Enter')return;
    event.preventDefault();
    importFromUrl();
  });
})();
