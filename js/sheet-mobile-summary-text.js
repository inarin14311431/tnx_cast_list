const $=selector=>document.querySelector(selector);
let patching=false;
function source(field){return document.querySelector(`[data-mobile-character-field="${field}"]`);}
function patch(){if(patching)return;patching=true;for(const [group,field] of [["summary","summary"],["profile","profile"]]){const node=document.querySelector(`[data-mobile-profile-group="${group}"] [data-mobile-profile-summary]`);if(!node)continue;const value=String(source(field)?.value||"未入力");if(node.textContent!==value)node.textContent=value;}patching=false;}
function init(){patch();const root=$("#mobile-profile-summary-grid");if(root)new MutationObserver(patch).observe(root,{childList:true,subtree:true});$("#mobile-profile-form")?.addEventListener("input",patch);document.addEventListener("tnx:mobile-profile-loaded",patch);}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
