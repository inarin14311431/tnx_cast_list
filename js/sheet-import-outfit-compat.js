/* Rebuild legacy outfits after the base import has finished. */
(()=>{
  const APPLY="#legacy-import-apply",TEXT="#legacy-import-json",ROOT="#outfit-list",MESSAGE="#legacy-import-message",DIALOG="#legacy-import-dialog";
  const BASE_IMPORT_EVENT="tnx:legacy-import-base-finished";
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const clean=v=>String(v??"").trim().replace(/^[★†※■┗]+\s*/,"");
  const first=(o,...keys)=>{for(const k of keys){const v=o?.[k];if(v!==undefined&&v!==null&&String(v)!=="")return v}return ""};
  const canonical=v=>String(v||"").trim().replace(/\[\s*["']?([^\]"']+)["']?\s*\]/g,".$1").replace(/^[.#]+|[.]$/g,"").replace(/\.{2,}/g,".");
  function progress(percent,label,detail=""){
    let root=document.querySelector("#legacy-import-progress");
    if(!root){root=document.createElement("section");root.id="legacy-import-progress";root.innerHTML='<p><strong data-import-progress-label></strong><span data-import-progress-percent></span></p><progress max="100"></progress><small data-import-progress-detail></small>';document.querySelector(MESSAGE)?.before(root)}
    root.hidden=false;root.querySelector("progress").value=percent;root.querySelector("[data-import-progress-percent]").textContent=`${Math.round(percent)}%`;root.querySelector("[data-import-progress-label]").textContent=label;root.querySelector("[data-import-progress-detail]").textContent=detail;
  }
  window.TNXLegacyImportProgress={update:progress};
  function lock(dialog,on){if(!dialog)return;if(on)dialog.setAttribute("data-importing","1");else dialog.removeAttribute("data-importing");const close=dialog.querySelector('[value="cancel"]');if(close)close.disabled=on;const apply=dialog.querySelector(APPLY);if(apply){apply.disabled=on;if(on)apply.setAttribute("aria-busy","true");else apply.removeAttribute("aria-busy")}}
  function flatten(v,prefix,map){if(v==null)return;if(Array.isArray(v)){v.forEach((x,i)=>flatten(x,prefix?`${prefix}.${i}`:String(i),map));return}if(typeof v==="object"){for(const [k,x] of Object.entries(v)){if(["fields","format","url","exportedAt","title"].includes(k)&&!prefix)continue;flatten(x,prefix?`${prefix}.${k}`:k,map)}return}const k=canonical(prefix);if(k&&!map.has(k))map.set(k,v)}
  function fieldMap(data){const map=new Map(),put=(k,v)=>{k=canonical(k);if(k&&(!map.has(k)||String(v??"")!==""))map.set(k,v)};for(const f of Array.isArray(data?.fields)?data.fields:[]){const t=String(f.type||"").toLowerCase(),v=(t==="checkbox"||t==="radio")?(f.checked?(f.value||true):false):f.value;[f.path,f.id,f.name].forEach(k=>put(k,v))}flatten(data,"",map);return map}
  function groups(map,prefixes){const out=new Map();for(const [id,v] of map)for(const prefix of prefixes){const esc=canonical(prefix).replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),m=id.match(new RegExp(`^${esc}\\.([^.]*)\\.(.+)$`));if(m){if(!out.has(m[1]))out.set(m[1],{});out.get(m[1])[m[2]]=v;break}}return [...out.entries()].sort(([a],[b])=>Number(a)-Number(b)||String(a).localeCompare(String(b),"ja")).map(([,v])=>v)}
  function source(data){const map=fieldMap(data);return [["weapon",["weapons"]],["armor",["armours","armors"]],["cyberware",["cyberwares"]],["tron",["trons"]],["vehicle",["vehicles"]],["residence",["residences"]],["other",["outfits"]]].flatMap(([category,p])=>groups(map,p).filter(x=>clean(first(x,"name"))).map(data=>({category,data,name:clean(first(data,"name"))})))}
  function set(el,v){if(!el||v===undefined||v===null)return false;el.value=String(v);el.dispatchEvent(new Event("input",{bubbles:true}));el.dispatchEvent(new Event("change",{bubbles:true}));return true}
  const rows=()=>[...document.querySelectorAll(`${ROOT} [data-outfit-key]`)];
  const rowName=r=>clean(r?.querySelector('[data-o="name"]')?.value);
  async function clearAll(){let guard=0;while(rows().length&&guard++<300){const del=rows()[0]?.querySelector('[data-delete-outfit]');if(!del)break;del.click();await frame()}}
  async function add(item){
    const before=new Set(rows());document.querySelector("#add-outfit")?.click();let row=null;
    for(let i=0;i<30&&!row;i++){await frame();row=rows().find(r=>!before.has(r))}
    if(!row)throw new Error(`アウトフィット行を作成できません：${item.name}`);
    set(row.querySelector('[data-o="name"]'),item.name);await frame();
    row=rows().find(r=>rowName(r)===item.name)||row;
    set(row.querySelector('[data-o="category"]'),item.category);
    for(let i=0;i<40;i++){await frame();const found=rows().find(r=>rowName(r)===item.name);if(found){row=found;break}}
    window.TNXOutfitOfcFields?.queueEnhance?.();await frame();
    row=rows().find(r=>rowName(r)===item.name)||row;
    const d=item.data,base=(f,v)=>set(row.querySelector(`[data-o="${f}"]`),v),ofc=(f,v)=>String(v??"")!==""&&set(row.querySelector(`[data-ofc="${f}"]`),v);
    base("name",item.name);base("purchase_value",first(d,"purchase","purchaseValue"));base("experience_cost",first(d,"permanent","experienceCost"));
    const ca=first(d,"concealA","concealment"),cb=first(d,"concealB","concealmentPenalty");base("concealment",[ca,cb].filter(v=>String(v??"")!=="").join("/"));base("description",first(d,"notes","description"));ofc("page_number",first(d,"page","pageNumber"));ofc("electronic_control",first(d,"electrical_control","electronic_control","electricalControl","electronicControl"));
    if(item.category==="weapon"){base("attack",first(d,"attack"));base("range",first(d,"range"));base("slot",first(d,"slot","part"));ofc("parry",first(d,"parry","defense"));ofc("speed",first(d,"speed"))}
    else if(item.category==="armor"){const s=first(d,"protecS","defenseS"),i=first(d,"protecI","defenseI"),p=first(d,"protecP","defenseP");base("defense",[s,i,p].map(v=>String(v??"")).join("/"));base("slot",first(d,"slot","part"));ofc("control_value",first(d,"control","controlValue"))}
    else if(item.category==="cyberware"){base("control_modifier",first(d,"control","controlModifier"));base("slot",first(d,"slot","part"))}
    else if(item.category==="tron"){base("control_modifier",first(d,"control","controlModifier"));base("slot",first(d,"slot"));ofc("speed",first(d,"speed"));ofc("tron_software",first(d,"software","tron_software"));ofc("tron_support",first(d,"support","tron_support"));ofc("tron_hardware",first(d,"hardware","tron_hardware"));ofc("cs_value",first(d,"cs","csValue"))}
    else if(item.category==="vehicle"){base("attack",first(d,"attack"));base("control_modifier",first(d,"control","controlModifier"));ofc("speed",first(d,"slot","speed"));ofc("defense_s",first(d,"protecS","defenseS"));ofc("defense_p",first(d,"protecP","defenseP"));ofc("defense_i",first(d,"protecI","defenseI"));ofc("crew",first(d,"crew","passenger","passengers"));ofc("sf",first(d,"sf","speedFactor"))}
    else if(item.category==="residence"){base("slot",first(d,"part","slot"));ofc("speed",first(d,"speed"));ofc("residence_entry",first(d,"entry"));ofc("residence_electric",first(d,"electric","residence_electric"));ofc("residence_area",first(d,"area","residence_area"))}
    else base("slot",first(d,"slot","part"));
  }
  function waitBase(){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error("基本取込の完了を確認できませんでした。")),150000);document.addEventListener(BASE_IMPORT_EVENT,e=>{clearTimeout(timer);e.detail?.ok?resolve():reject(new Error(e.detail?.error||"基本取込に失敗しました。"))},{once:true})})}
  document.addEventListener("click",event=>{if(!event.target.closest?.(APPLY))return;let data;try{data=JSON.parse(document.querySelector(TEXT)?.value||"")}catch{return}const items=source(data),dialog=document.querySelector(DIALOG);lock(dialog,true);(async()=>{try{progress(3,"JSONを解析中",`アウトフィット${items.length}件を検出`);await waitBase();progress(52,"アウトフィットを再構築中","旧形式の一時行を整理しています");await clearAll();for(let i=0;i<items.length;i++){progress(52+46*i/Math.max(1,items.length),"アウトフィットを再構築中",`${i+1}/${items.length}件　${items[i].name}`);await add(items[i])}document.querySelector(ROOT)?.dispatchEvent(new Event("input",{bubbles:true}));window.TNXExperience?.queue?.();progress(100,"取込完了",`アウトフィット${items.length}件を現行形式へ変換しました`);const msg=document.querySelector(MESSAGE);if(msg)msg.textContent="取込が完了し、編集画面へ反映しました。内容を確認し、保存ボタンでDBへ保存してください。";await sleep(250);if(dialog?.open)dialog.close()}catch(error){progress(100,"取込エラー",error.message||String(error));const msg=document.querySelector(MESSAGE);if(msg)msg.textContent=`取込エラー：${error.message||String(error)}`}finally{lock(dialog,false)}})()},true);
})();