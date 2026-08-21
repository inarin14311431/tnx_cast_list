/* Character-sheets direct URL import for the sheet editor. VERSION 1.5.2 */
(()=>{
  const VERSION='1.5.2';
  const STYLE_CODE_NAMES=new Map([
    ['0','カブキ'],['1','バサラ'],['2','タタラ'],['3','ミストレス'],['4','カブト'],['5','カリスマ'],['6','マネキン'],['7','カゼ'],['8','フェイト'],['9','クロマク'],['10','エグゼク'],['11','カタナ'],['12','クグツ'],['13','カゲ'],['14','チャクラ'],['15','レッガー'],['16','カブトワリ'],['17','ハイランダー'],['18','マヤカシ'],['19','トーキー'],['20','イヌ'],['21','ニューロ'],
    ['-0','コモン'],['-1','ヒルコ'],['-2','クロガネ'],['-4','イブキ'],['-6','シキガミ'],['-7','アラシ'],['-9','カゲムシャ'],['-12','ミギウデ'],['-17','エトランゼ'],['-18','アヤカシ'],['-21','ウツワ']
  ]);
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
  if(heading)heading.textContent='キャラクターシート倉庫から取込';
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

  function parseJsonData(value){
    if(typeof value!=='string')return value;
    let source=value.trim();
    if(!source)return value;
    if(source.endsWith(';'))source=source.slice(0,-1).trim();
    if(source.startsWith('(')&&source.endsWith(')'))source=source.slice(1,-1).trim();
    try{return JSON.parse(source)}catch{return value}
  }

  function mergeWrapperMetadata(parsed,wrapper){
    if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return parsed;
    const result={...parsed};
    for(const key of ['outline','name','nameKana','player','display']){
      if((result[key]===undefined||result[key]===null||result[key]==='')&&wrapper?.[key]!==undefined)result[key]=wrapper[key];
    }
    return result;
  }

  function enrichLegacyStyles(data){
    if(!data||typeof data!=='object'||data.outline)return data;
    const styles=data.styles;
    if(!styles||typeof styles!=='object'||Array.isArray(styles))return data;
    const names=[styles.style1,styles.style2,styles.style3].map(value=>STYLE_CODE_NAMES.get(String(value??''))||'');
    if(names.every(Boolean))data.outline=`STYLE:${names.join('=')}`;
    return data;
  }

  function stripLegacyStarSkillMarkers(data){
    if(!data||typeof data!=='object')return data;
    const visit=(value,inSkillTree=false)=>{
      if(Array.isArray(value)){
        value.forEach(item=>visit(item,inSkillTree));
        return;
      }
      if(!value||typeof value!=='object')return;
      for(const [key,item] of Object.entries(value)){
        const nextSkillTree=inSkillTree||/skill/i.test(key);
        if(nextSkillTree&&key==='name'&&typeof item==='string')value[key]=item.replace(/^\s*★\s*/,'');
        else visit(item,nextSkillTree);
      }
    };
    visit(data,false);
    return data;
  }

  function normalizePayload(payload){
    let data=payload;
    for(let i=0;i<6;i++){
      if(typeof data==='string'){
        const parsed=parseJsonData(data);
        if(parsed!==data){data=parsed;continue;}
        break;
      }
      if(data&&typeof data==='object'&&typeof data.jsonData==='string'&&data.jsonData.trim()){
        const parsed=parseJsonData(data.jsonData);
        if(parsed!==data.jsonData){data=mergeWrapperMetadata(parsed,data);continue;}
      }
      if(data&&typeof data==='object'&&data.data&&typeof data.data==='object'&&!data.base&&!data.skills1&&!data.superhumanskills&&!data.weapons){
        const wrapper=data;
        data=mergeWrapperMetadata(data.data,wrapper);continue;
      }
      break;
    }
    if(!data||typeof data!=='object')throw new Error('キャラクターシート倉庫から有効なデータを取得できませんでした。');
    data=enrichLegacyStyles(data);
    data=stripLegacyStarSkillMarkers(data);
    const supported=Array.isArray(data.fields)||data.base||data.skills1||data.skills2||data.superhumanskills||data.weapons||data.outfits;
    if(!supported)throw new Error('取得データをTNXキャラクターシートとして認識できません。');
    return data;
  }

  function jsonpOnce(url,timeout=12000){
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
        settled=true;
        clearTimeout(timer);
        cleanup();
        fn(value);
      };
      const timer=setTimeout(()=>finish(reject,new Error('応答がタイムアウトしました。')),timeout);
      window[callback]=payload=>finish(resolve,payload);
      script.onerror=()=>finish(reject,new Error('データ取得リクエストに失敗しました。'));
      const request=new URL(url);
      request.searchParams.set('callback',callback);
      script.src=request.toString();
      document.head.append(script);
    });
  }

  async function fetchJsonp(key){
    const encoded=encodeURIComponent(key);
    const urls=[
      `https://character-sheets.appspot.com/tnx/display?ajax=1&key=${encoded}`,
      `https://character-sheets.appspot.com/tnx/display.html?ajax=1&key=${encoded}`,
      `https://character-sheets.appspot.com/tnx/display?key=${encoded}&ajax=1`,
      `https://character-sheets.appspot.com/tnx/display.html?key=${encoded}&ajax=1`
    ];
    const failures=[];
    for(const url of urls){
      try{return await jsonpOnce(url);}catch(error){failures.push(`${url}: ${error?.message||error}`);}
    }
    console.error('character-sheets JSONP endpoints failed',failures);
    throw new Error('キャラクターシート倉庫のデータ取得に失敗しました。');
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
    setMessage('キャラクターシート倉庫からデータを取得しています…');
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
