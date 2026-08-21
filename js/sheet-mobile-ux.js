const $=selector=>document.querySelector(selector);

const SOURCE_DIALOGS=[
  {dialog:"#mobile-ability-dialog",source:"#mobile-ability-dialog-cancel",title:"能力値編集"},
  {dialog:"#mobile-cs-dialog",source:"#mobile-cs-dialog-cancel",title:"CS編集"},
  {dialog:"#mobile-general-dialog",source:"#mobile-general-close",title:"技能編集",kind:"general"}
];

let pendingGeneralNew=false;
let pendingGeneralSaveState=null;

function loadUxStyles(){
  if(document.querySelector("link[data-mobile-ux-style]"))return;
  const link=document.createElement("link");
  link.rel="stylesheet";
  link.href="./css-next/pages/sheet-mobile-ux.css?v=2";
  link.dataset.mobileUxStyle="1";
  document.head.append(link);
}

function readSaveVisual(){
  const button=$("#mobile-save");
  const status=$("#mobile-save-status");
  return {
    buttonState:button?.dataset.state||"saved",
    buttonText:button?.textContent||"保存済み",
    statusState:status?.dataset.state||"saved",
    statusText:status?.textContent||"保存済み"
  };
}

function restoreSaveVisual(state){
  if(!state)return;
  const button=$("#mobile-save");
  const status=$("#mobile-save-status");
  if(button){button.dataset.state=state.buttonState;button.textContent=state.buttonText;}
  if(status){status.dataset.state=state.statusState;status.textContent=state.statusText;}
}

function cancelGeneral(){
  const dialog=$("#mobile-general-dialog");
  if(pendingGeneralNew){
    const source=$("#mobile-general-delete");
    if(source){
      source.dataset.mobileSilentDelete="1";
      source.click();
      delete source.dataset.mobileSilentDelete;
    }else dialog?.close();
    restoreSaveVisual(pendingGeneralSaveState);
  }else dialog?.close();
  pendingGeneralNew=false;
  pendingGeneralSaveState=null;
}

function installExplicitActions({dialog:dialogSelector,source:sourceSelector,title,kind}){
  const dialog=$(dialogSelector);
  const source=$(sourceSelector);
  const header=dialog?.querySelector(".mobile-editor-dialog__header");
  if(!dialog||!source||!header||header.dataset.mobileExplicitActions==="1")return;
  header.dataset.mobileExplicitActions="1";
  header.classList.remove("mobile-editor-dialog__header--close-only");
  header.classList.add("mobile-editor-dialog__header--actions");
  source.hidden=true;
  source.dataset.mobileApplySource="1";

  const cancel=document.createElement("button");
  cancel.type="button";
  cancel.className="mobile-dialog-cancel";
  cancel.textContent="キャンセル";

  const apply=document.createElement("button");
  apply.type="button";
  apply.className="mobile-dialog-apply";
  apply.textContent="反映";

  const strong=header.querySelector("strong");
  if(strong&&!strong.textContent.trim())strong.textContent=title;
  header.prepend(cancel);
  header.append(apply);

  cancel.addEventListener("click",()=>{
    if(kind==="general")cancelGeneral();
    else dialog.close();
  });
  apply.addEventListener("click",()=>{
    if(kind==="general"){
      pendingGeneralNew=false;
      pendingGeneralSaveState=null;
    }
    source.click();
  });
  dialog.addEventListener("cancel",event=>{
    event.preventDefault();
    event.stopImmediatePropagation();
    if(kind==="general")cancelGeneral();
    else dialog.close();
  },true);
}

function installAllExplicitActions(){SOURCE_DIALOGS.forEach(installExplicitActions);}

function trackTransientGeneralAdds(){
  document.addEventListener("click",event=>{
    const add=event.target.closest?.("[data-add-skill]");
    if(add&&add.dataset.addSkill!=="style"){
      pendingGeneralSaveState=readSaveVisual();
      pendingGeneralNew=true;
      return;
    }
    if(event.target.closest?.("[data-general-id]")){
      pendingGeneralNew=false;
      pendingGeneralSaveState=null;
    }
  },true);
}

function addReorderToggle(sectionSelector,label){
  const section=$(sectionSelector);
  const header=section?.querySelector(":scope > header");
  if(!section||!header||header.querySelector("[data-mobile-reorder-toggle]"))return;
  const button=document.createElement("button");
  button.type="button";
  button.className="mobile-reorder-toggle";
  button.dataset.mobileReorderToggle="1";
  button.setAttribute("aria-pressed","false");
  button.textContent="並び替え";
  button.addEventListener("click",()=>{
    const active=section.classList.toggle("is-reorder-mode");
    button.setAttribute("aria-pressed",String(active));
    button.textContent=active?"並び替え完了":"並び替え";
    if(active)section.scrollIntoView({block:"start",behavior:"smooth"});
  });
  header.append(button);
}

function installReorderModes(){
  addReorderToggle("#mobile-style-skills-section","スタイル技能");
  addReorderToggle("#mobile-outfits-section","アウトフィット");
}

function moveVisibilityToProfile(){
  const visibility=$(".mobile-global-visibility");
  const body=$("#mobile-profile .mobile-sheet-section__body");
  if(!visibility||!body||visibility.closest("#mobile-profile"))return;
  visibility.classList.add("mobile-profile-visibility");
  const label=visibility.querySelector("span");
  if(label)label.textContent="公開状態";
  body.prepend(visibility);
}

function ensureNavLink(href,label){
  const nav=$(".mobile-sheet-nav");
  if(!nav||!$(href))return null;
  let link=nav.querySelector(`a[href='${href}']`);
  if(!link){
    link=document.createElement("a");
    link.href=href;
    nav.append(link);
  }
  if(link.textContent!==label)link.textContent=label;
  return link;
}

function normalizeSectionLabels(){
  const comboTitle=$("#mobile-combos-section > header h2");
  if(comboTitle&&comboTitle.textContent!=="07 コンボ")comboTitle.textContent="07 コンボ";
  ensureNavLink("#mobile-combos-section","07 コンボ");
  ensureNavLink("#mobile-snapshots-section","08 スナップショット");
  ensureNavLink("#mobile-image-section","09 キャスト画像");
}

function setupActiveNav(){
  const nav=$(".mobile-sheet-nav");
  if(!nav||!("IntersectionObserver" in window))return;
  const links=[...nav.querySelectorAll("a[href^='#']")];
  const sections=links.map(link=>document.querySelector(link.getAttribute("href"))).filter(Boolean);
  if(!sections.length)return;
  const activate=id=>{
    links.forEach(link=>{
      const active=link.getAttribute("href")===`#${id}`;
      link.classList.toggle("is-active",active);
      if(active)link.setAttribute("aria-current","location");
      else link.removeAttribute("aria-current");
    });
  };
  const observer=new IntersectionObserver(entries=>{
    const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
    if(visible)activate(visible.target.id);
  },{rootMargin:"-72px 0px -58% 0px",threshold:[0,.15,.35,.6]});
  sections.forEach(section=>observer.observe(section));
}

function syncSavingStatus(){
  const button=$("#mobile-save");
  const status=$("#mobile-save-status");
  if(!button||!status)return;
  new MutationObserver(()=>{
    if(button.dataset.state!=="saving")return;
    status.dataset.state="saving";
    status.textContent="保存中…";
  }).observe(button,{attributes:true,attributeFilter:["data-state"]});
}

function init(){
  loadUxStyles();
  trackTransientGeneralAdds();
  installAllExplicitActions();
  installReorderModes();
  moveVisibilityToProfile();
  normalizeSectionLabels();
  setupActiveNav();
  syncSavingStatus();
  const observer=new MutationObserver(()=>{
    installAllExplicitActions();
    installReorderModes();
    moveVisibilityToProfile();
    normalizeSectionLabels();
  });
  observer.observe(document.body,{childList:true,subtree:true});
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
else init();
