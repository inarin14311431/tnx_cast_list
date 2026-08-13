(()=>{
  const importButton=document.querySelector('#legacy-import-open');
  if(!importButton||document.querySelector('#sheet-import-help-button'))return;
  let control=importButton.closest('.sheet-import-control');
  if(!control){control=document.createElement('section');control.className='sheet-import-control';importButton.before(control);control.append(importButton);}
  control.classList.add('sheet-import-panel');
  importButton.classList.add('sheet-import-main-action');
  importButton.innerHTML='<span>データ取込</span>';
  const helpButton=document.createElement('button');
  helpButton.id='sheet-import-help-button';helpButton.className='sheet-import-help-button';helpButton.type='button';helpButton.dataset.sheetHelp='import';helpButton.setAttribute('aria-haspopup','dialog');helpButton.setAttribute('aria-controls','sheet-import-help-dialog');helpButton.setAttribute('aria-label','データ取込ヘルプ');helpButton.innerHTML='<span class="sheet-import-help-mark">?</span>';helpButton.title='データ取込・ブックマークレットの詳しい使い方';
  const copyButton=document.createElement('button');copyButton.id='sheet-import-bookmarklet-copy';copyButton.className='sheet-import-bookmarklet-copy';copyButton.type='button';copyButton.innerHTML='<span class="sheet-import-bookmark-icon" aria-hidden="true"></span><span>ブックマークレットをコピー</span>';copyButton.title='キャラシ倉庫用ブックマークレットをコピー';
  control.append(helpButton,copyButton);
  copyButton.addEventListener('click',()=>{const source=document.querySelector('#legacy-bookmarklet-copy');if(!source){window.alert('ブックマークレットを準備できませんでした。データ取込画面を開いてから再度お試しください。');return;}source.click();});
  const steps=[
    ['データ取込画面を開く','編集画面左側の「データ取込」を押し、「キャラシ倉庫JSON取込」を開きます。','ここが取込作業の入口です。'],
    ['ブックマークレットをコピー','「ブックマークレットをコピー」を押します。コードがクリップボードへコピーされます。','ブックマークレットとは、開いているキャラシ倉庫ページからデータを取得する小さなプログラムです。'],
    ['ブラウザへ登録','新しいブックマークを作り、URL欄へコピーした内容を貼り付けて保存します。登録は最初の1回だけです。','Chromeではブックマークバーで右クリック→「ページを追加」。名前は「キャラシ倉庫取込」などで構いません。URLが javascript: から始まる状態で保存します。'],
    ['対象キャストを開く','キャラシ倉庫で、取り込みたいキャストのページを開きます。','別キャストのページで実行すると、そのキャストのデータを取得します。'],
    ['ブックマークレットを実行','対象キャストを表示した状態で、登録したブックマークをクリックします。','動かない場合は、対象キャストページか、ページの読み込みが完了しているか、ブックマークのURLが javascript: から始まっているかを確認します。'],
    ['JSONをコピー','「キャラシJSONをコピーしました。」と表示されれば取得成功です。','コピーできない場合はブラウザのクリップボード制限が考えられます。手動コピー画面が出た場合は、表示されたJSONをすべてコピーします。'],
    ['このアプリへ戻る','N◎VA ARCHIVEのデータ取込画面へ戻ります。','キャラシ倉庫のタブは閉じても構いません。'],
    ['JSONを貼り付ける','「キャラシ倉庫JSON取込」の入力欄へ、コピーしたJSONを貼り付けます。','貼り付けた文字列を途中で編集する必要はありません。'],
    ['編集画面へ反映','「編集画面へ反映」を押します。プロフィール、スタイル、能力値、技能、アウトフィット等へデータが反映されます。','キャラシ倉庫と本アプリでは入力形式が異なるため、一部は完全一致しない場合があります。'],
    ['確認して保存','反映された内容を確認し、必要な修正を行ってからキャストを保存します。','取込だけではDBへの保存は完了しません。最後に必ず通常の保存操作を行ってください。']
  ];
  const dialog=document.createElement('dialog');dialog.id='sheet-import-help-dialog';dialog.className='sheet-import-help-dialog';
  dialog.innerHTML=`<article class="sheet-import-help-shell"><header class="sheet-import-help-header"><div><h2>データ取込ヘルプ</h2><small>IMPORT HELP</small></div><button type="button" class="sheet-import-help-close" aria-label="ヘルプを閉じる">×</button></header><p class="sheet-import-help-intro">全体の流れを確認し、①から順番に進めてください。</p><nav class="sheet-import-help-progress" aria-label="データ取込手順">${steps.map((_,i)=>`<button type="button" data-import-step="${i}"${i===0?' class="is-current" aria-current="step"':''}>${i+1}</button>`).join('')}</nav><section class="sheet-import-help-stage" aria-live="polite"><div class="sheet-import-help-stage__number">1</div><div class="sheet-import-help-stage__content"><small>STEP 01 / 10</small><h3></h3><p class="sheet-import-help-stage__text"></p><aside class="sheet-import-help-point"><strong>POINT</strong><p></p></aside></div></section><footer class="sheet-import-help-footer"><button type="button" data-import-prev disabled>← 前へ</button><span>反映内容を確認し、最後にキャストを保存してください。</span><button type="button" data-import-next>次へ →</button></footer></article>`;
  document.body.append(dialog);
  const stageTitle=dialog.querySelector('.sheet-import-help-stage h3'),stageText=dialog.querySelector('.sheet-import-help-stage__text'),stagePoint=dialog.querySelector('.sheet-import-help-point p'),stageNumber=dialog.querySelector('.sheet-import-help-stage__number'),stageSmall=dialog.querySelector('.sheet-import-help-stage__content>small'),prev=dialog.querySelector('[data-import-prev]'),next=dialog.querySelector('[data-import-next]'),progress=[...dialog.querySelectorAll('[data-import-step]')];let current=0;
  const renderStep=index=>{current=Math.max(0,Math.min(steps.length-1,index));const [title,text,point]=steps[current];stageNumber.textContent=current+1;stageSmall.textContent=`STEP ${String(current+1).padStart(2,'0')} / ${steps.length}`;stageTitle.textContent=title;stageText.textContent=text;stagePoint.textContent=point;prev.disabled=current===0;next.disabled=current===steps.length-1;next.textContent=current===steps.length-1?'完了':'次へ →';progress.forEach((button,i)=>{button.classList.toggle('is-current',i===current);if(i===current)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');});};
  progress.forEach(button=>button.addEventListener('click',()=>renderStep(Number(button.dataset.importStep))));prev.addEventListener('click',()=>renderStep(current-1));next.addEventListener('click',()=>{if(current<steps.length-1)renderStep(current+1);});
  const openHelp=()=>{renderStep(0);if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');};const closeHelp=()=>dialog.close?.();helpButton.addEventListener('click',openHelp);dialog.querySelector('.sheet-import-help-close').addEventListener('click',closeHelp);dialog.addEventListener('click',event=>{if(event.target===dialog)closeHelp();});
})();
