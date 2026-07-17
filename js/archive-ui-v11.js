const status = document.querySelector("#status-text");
const count = document.querySelector("#archive-result-count");
const grid = document.querySelector("#cast-grid");

const observer = new MutationObserver(() => refreshArchiveUi());
if(status) observer.observe(status,{childList:true,subtree:true});
if(count) observer.observe(count,{childList:true,subtree:true});
if(grid) observer.observe(grid,{childList:true,subtree:true});
refreshArchiveUi();

function refreshArchiveUi(){
  document.querySelectorAll(".cast-card__styles").forEach(element => {
    element.textContent = element.textContent.replace(/\s*\/\s*/g,"、");
  });
  document.querySelectorAll(".cast-card__player").forEach(element => {
    element.textContent = element.textContent.replace(/^PLAYER\s*\/\/\s*/i,"プレイヤー：");
  });
  document.querySelectorAll(".cast-card__handle").forEach(element => {
    if(element.textContent.trim()==="NO HANDLE") element.textContent="ハンドル未登録";
  });
  document.querySelectorAll(".empty-message").forEach(element => element.textContent="条件に一致するキャストはいません。");
  if(status){
    const text=status.textContent;
    const detected=text.match(/^(\d+) CASTS? DETECTED$/);
    if(detected) status.textContent=`${detected[1]}件の公開キャストを読み込みました。`;
    else if(/SCANNING CAST DATABASE/i.test(text)) status.textContent="公開キャストを読み込み中…";
    else if(/DATABASE CONNECTION FAILED/i.test(text)) status.textContent="データベースへの接続に失敗しました。";
  }
  if(count){
    const match=count.textContent.match(/^(\d+)\s*\/\s*(\d+) CASTS SHOWN$/);
    if(match) count.textContent=`${match[2]}件中 ${match[1]}件を表示`;
    else if(/^0 CASTS SHOWN$/i.test(count.textContent)) count.textContent="0件表示";
  }
}
