const $=selector=>document.querySelector(selector);
const NAV_ITEMS=[
  ["#mobile-profile","01 基本情報"],
  ["#mobile-styles-section","02 スタイル"],
  ["#mobile-ability-section","03 能力値"],
  ["#mobile-general","04 一般技能"],
  ["#mobile-style-skills-section","05 スタイル技能"],
  ["#mobile-outfits-section","06 アウトフィット"],
  ["#mobile-combos-section","07 コンボ"],
  ["#mobile-snapshots-section","08 スナップショット"],
  ["#mobile-image-section","09 キャスト画像"]
];

function refreshUiStylesheet(){
  const link=document.querySelector("link[data-mobile-ui-style]");
  if(link)link.href="./css-next/pages/sheet-mobile-ui.css?v=9";
}

function normalizeNav(){
  const nav=$(".mobile-sheet-nav");
  if(!nav)return;
  for(const[href,label]of NAV_ITEMS){
    if(!document.querySelector(href))continue;
    let link=nav.querySelector(`a[href="${href}"]`);
    if(!link){
      link=document.createElement("a");
      link.href=href;
    }
    link.textContent=label;
    if(link.parentElement!==nav)nav.append(link);
    else if(nav.lastElementChild!==link)nav.append(link);
  }
}

function removeLegacyChromeMutations(){
  document.querySelectorAll(".mobile-section-top").forEach(node=>node.remove());
  document.querySelectorAll(".mobile-sheet-section > header > small").forEach(node=>node.remove());
}

function ensureSaveStatus(){
  if($("#mobile-save-status"))return;
  const shell=$(".mobile-sheet-shell");
  if(!shell)return;
  const status=document.createElement("p");
  status.id="mobile-save-status";
  status.className="mobile-sheet-status";
  status.dataset.state="saved";
  status.setAttribute("role","status");
  status.setAttribute("aria-live","polite");
  status.textContent="保存済み";
  shell.prepend(status);
}

function addEditNotice(){
  const text="各項目はタップして編集できます。編集画面は「反映」で確定、「キャンセル」で破棄します。最後に画面下部の保存ボタンでデータを保存します。";
  const current=$("#mobile-edit-notice");
  if(current){current.textContent=text;return;}
  const status=$("#mobile-save-status");
  if(!status)return;
  const notice=document.createElement("p");
  notice.id="mobile-edit-notice";
  notice.className="mobile-edit-notice";
  notice.textContent=text;
  status.after(notice);
}

function confirmGeneralDelete(event){
  const source=event.target?.closest?.("#mobile-general-delete");
  if(!source||source.dataset.mobileSilentDelete==="1")return;
  const name=$("#mobile-general-name")?.value.trim()||"名称未入力";
  if(confirm(`「${name}」を削除しますか？`))return;
  event.preventDefault();
  event.stopImmediatePropagation();
}

function promoteDeleteAction(source){
  if(!source?.matches?.(".mobile-editor-dialog .mobile-danger-action")||source.dataset.mobileDeleteProxy==="1")return;
  const dialog=source.closest(".mobile-editor-dialog");
  const body=dialog?.querySelector(".mobile-editor-dialog__body");
  if(!body)return;
  let proxy=body.querySelector(":scope > [data-mobile-delete-proxy='1']");
  if(!proxy){
    proxy=document.createElement("button");
    proxy.type="button";
    proxy.className="mobile-danger-action";
    proxy.dataset.mobileDeleteProxy="1";
    proxy.style.margin="0 0 12px";
    proxy.addEventListener("click",()=>proxy._mobileDeleteSource?.click());
    body.prepend(proxy);
  }
  proxy._mobileDeleteSource=source;
  proxy.textContent=source.textContent;
  proxy.hidden=source.hidden;
  source.dataset.mobileDeleteSource="1";
  source.style.display="none";
  if(body.firstElementChild!==proxy)body.prepend(proxy);
}

function promoteDeleteActions(root=document){
  if(root?.matches?.(".mobile-editor-dialog .mobile-danger-action"))promoteDeleteAction(root);
  root?.querySelectorAll?.(".mobile-editor-dialog .mobile-danger-action:not([data-mobile-delete-proxy='1'])").forEach(promoteDeleteAction);
}

function observeDeleteActions(){
  promoteDeleteActions();
  const observer=new MutationObserver(mutations=>{
    for(const mutation of mutations){
      if(mutation.type==="attributes"){
        if(mutation.target?.matches?.("[data-mobile-delete-source='1']"))promoteDeleteAction(mutation.target);
        continue;
      }
      for(const node of mutation.addedNodes){
        if(node.nodeType===Node.ELEMENT_NODE)promoteDeleteActions(node);
      }
    }
  });
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["hidden"]});
}

function init(){
  refreshUiStylesheet();
  removeLegacyChromeMutations();
  ensureSaveStatus();
  addEditNotice();
  normalizeNav();
  document.addEventListener("click",confirmGeneralDelete,true);
  observeDeleteActions();
  document.addEventListener("tnx:mobile-section-ready",normalizeNav);
}

init();
