const status = document.querySelector("#status-text");
const count = document.querySelector("#archive-result-count");
const grid = document.querySelector("#cast-grid");

let refreshQueued = false;
const observer = new MutationObserver(() => {
  if (refreshQueued) return;
  refreshQueued = true;
  requestAnimationFrame(() => {
    refreshQueued = false;
    refreshArchiveUi();
  });
});

if (status) observer.observe(status,{childList:true,subtree:true,characterData:true});
if (count) observer.observe(count,{childList:true,subtree:true,characterData:true});
if (grid) observer.observe(grid,{childList:true,subtree:true});
refreshArchiveUi();

function setTextIfChanged(element, nextText){
  if (element && element.textContent !== nextText) element.textContent = nextText;
}

function refreshArchiveUi(){
  document.querySelectorAll(".cast-card__styles").forEach(element => {
    const next = element.textContent.replace(/\s*\/\s*/g,"、");
    setTextIfChanged(element,next);
  });

  document.querySelectorAll(".cast-card__player").forEach(element => {
    const next = element.textContent.replace(/^PLAYER\s*\/\/\s*/i,"プレイヤー：");
    setTextIfChanged(element,next);
  });

  document.querySelectorAll(".cast-card__handle").forEach(element => {
    if(element.textContent.trim()==="NO HANDLE") setTextIfChanged(element,"ハンドル未登録");
  });

  document.querySelectorAll(".empty-message").forEach(element => {
    setTextIfChanged(element,"条件に一致するキャストはいません。");
  });

  if(status){
    const text=status.textContent;
    const detected=text.match(/^(\d+) CASTS? DETECTED$/);
    if(detected) setTextIfChanged(status,`${detected[1]}件の公開キャストを読み込みました。`);
    else if(/SCANNING CAST DATABASE/i.test(text)) setTextIfChanged(status,"公開キャストを読み込み中…");
    else if(/DATABASE CONNECTION FAILED/i.test(text)) setTextIfChanged(status,"データベースへの接続に失敗しました。");
  }

  if(count){
    const text=count.textContent;
    const match=text.match(/^(\d+)\s*\/\s*(\d+) CASTS SHOWN$/);
    if(match) setTextIfChanged(count,`${match[2]}件中 ${match[1]}件を表示`);
    else if(/^0 CASTS SHOWN$/i.test(text)) setTextIfChanged(count,"0件表示");
  }
}
