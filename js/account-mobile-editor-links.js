import { SITE_BASE_PATH } from "./config.js?v=2";
const root=document.querySelector("#owned-casts");
function renameMobileCreate(){const link=document.querySelector('a[href="./sheet-mobile-new.html"],a[href$="/sheet-mobile-new.html"]');const label=link?.querySelector("span");if(label)label.textContent="Mobile版 新規作成";}
function enhance(){renameMobileCreate();root?.querySelectorAll(".owned-cast__links").forEach(group=>{if(group.querySelector('[data-mobile-sheet-link]'))return;const pc=group.querySelector('a[href*="sheet.html?id="]');if(!pc)return;const url=new URL(pc.href,location.href),id=url.searchParams.get("id");if(!id)return;const link=document.createElement("a");link.href=`${SITE_BASE_PATH}sheet-mobile.html?id=${encodeURIComponent(id)}`;link.dataset.mobileSheetLink="1";link.innerHTML='<span class="action-label__jp">モバイル編集</span><small class="action-label__en">MOBILE EDIT</small>';pc.after(link);});}
renameMobileCreate();
if(root){enhance();new MutationObserver(enhance).observe(root,{childList:true,subtree:true});}
