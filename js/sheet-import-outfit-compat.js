/* Convert warehouse outfits after the base import has finished. */
(()=>{
  const APPLY="#legacy-import-apply";
  const TEXT="#legacy-import-json";
  const ROOT="#outfit-list";
  const MESSAGE="#legacy-import-message";
  const DIALOG="#legacy-import-dialog";
  const BASE_IMPORT_EVENT="tnx:legacy-import-base-finished";
  const FINAL_START=52;
  const FINAL_END=98;
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
  const clean=value=>String(value??"").trim().replace(/^[★†※■┗]+\s*/,"");
  const first=(object,...keys)=>{for(const key of keys){const value=object?.[key];if(value!==undefined&&value!==null&&String(value)!=="")return value}return ""};
  const canonical=value=>String(value||"").trim().replace(/\[\s*["']?([^\]"']+)["']?\s*\]/g,".$1").replace(/^[.#]+|[.]$/g,"").replace(/\.{2,}/g,".");

  function ensureProgressUi(){
    let root=document.querySelector("#legacy-import-progress");
    if(root)return root;
    root=document.createElement("section");
    root.id="legacy-import-progress";
    root.hidden=true;
    root.innerHTML='<p><strong data-import-progress-label>取込準備中</strong><span data-import-progress-percent>0%</span></p><progress max="100" value="0"></progress><small data-import-progress-detail></small>';
    document.querySelector(MESSAGE)?.before(root);
    return root;
  }

  function progress(percent,label,detail=""){
    const root=ensureProgressUi();
    root.hidden=false;
    root.querySelector("progress").value=Math.max(0,Math.min(100,percent));
    root.querySelector("[data-import-progress-percent]").textContent=`${Math.round(percent)}%`;
    root.querySelector("[data-import-progress-label]").textContent=label;
    root.querySelector("[data-import-progress-detail]").textContent=detail;
  }

  window.TNXLegacyImportProgress={update:progress};

  function setImportLock(dialog,locked){
    if(!dialog)return;
    if(locked)dialog.setAttribute("data-importing","1");else dialog.removeAttribute("data-importing");
    const close=dialog.querySelector('[value="cancel"]');
    if(close)close.disabled=locked;
    const apply=dialog.querySelector(APPLY);
    if(apply){
      if(locked)apply.setAttribute("aria-busy","true");
      else{apply.removeAttribute("aria-busy");apply.disabled=false}
    }
  }

  function waitBaseImport(){
    return new Promise((resolve,reject)=>{
      let settled=false,timer=0;
      const finish=(callback,value)=>{
        if(settled)return;
        settled=true;
        window.clearTimeout(timer);
        document.removeEventListener(BASE_IMPORT_EVENT,onFinished);
        callback(value);
      };
      const onFinished=event=>{
        if(event.detail?.ok)finish(resolve,event.detail);
        else finish(reject,new Error(event.detail?.error||"基本取込に失敗しました。"));
      };
      document.addEventListener(BASE_IMPORT_EVENT,onFinished,{once:true});
      timer=window.setTimeout(()=>finish(reject,new Error("基本取込の完了を確認できませんでした。データ量を確認して再実行してください。")),150000);
    });
  }

  function flatten(value,prefix,map){
    if(value===null||value===undefined)return;
    if(Array.isArray(value)){value.forEach((item,index)=>flatten(item,prefix?`${prefix}.${index}`:String(index),map));return}
    if(typeof value==="object"){for(const [key,item] of Object.entries(value)){if(["fields","format","url","exportedAt","title"].includes(key)&&!prefix)continue;flatten(item,prefix?`${prefix}.${key}`:key,map)}return}
    const key=canonical(prefix);if(key&&!map.has(key))map.set(key,value);
  }

  function fieldMap(data){
    const map=new Map();
    const put=(key,value)=>{const normalized=canonical(key);if(normalized&&(!map.has(normalized)||String(value??"")!==""))map.set(normalized,value)};
    for(const field of Array.isArray(data?.fields)?data.fields:[]){const type=String(field.type||"").toLowerCase();const value=(type==="checkbox"||type==="radio")?(field.checked?(field.value||true):false):field.value;[field.path,field.id,field.name].forEach(key=>put(key,value))}
    flatten(data,"",map);return map;
  }

  function groups(map,prefixes){
    const list=Array.isArray(prefixes)?prefixes:[prefixes],output=new Map();
    for(const [id,value] of map){for(const prefix of list){const escaped=canonical(prefix).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");const match=id.match(new RegExp(`^${escaped}\\.([^.]*)\\.(.+)$`));if(!match)continue;const [,index,key]=match;if(!output.has(index))output.set(index,{});output.get(index)[key]=value;break}}
    return [...output.entries()].sort(([a],[b])=>Number(a)-Number(b)||String(a).localeCompare(String(b),"ja")).map(([,value])=>value);
  }

  function sourceOutfits(data){
    const map=fieldMap(data);
    return [["weapon",["weapons"]],["armor",["armours","armors"]],["cyberware",["cyberwares"]],["tron",["trons"]],["vehicle",["vehicles"]],["residence",["residences"]],["other",["outfits"]]]
      .flatMap(([category,prefixes])=>groups(map,prefixes).filter(item=>clean(first(item,"name"))).map(item=>({category,data:item,name:clean(first(item,"name"))})));
  }

  function setValue(element,value){
    if(!element||value===undefined||value===null)return false;
    const next=String(value);
    if(element.value===next)return true;
    element.value=next;
    element.dispatchEvent(new Event("input",{bubbles:true}));
    element.dispatchEvent(new Event("change",{bubbles:true}));
    return true;
  }

  function parseTronCapacity(value){
    const text=String(value||"");
    const read=labels=>{for(const label of labels){const match=text.match(new RegExp(`${label}\\s*[：:]?\\s*([0-9０-９]+)`,"i"));if(match)return match[1].replace(/[０-９]/g,char=>String("０１２３４５６７８９".indexOf(char)))}return ""};
    return {tron_software:read(["ソ","software"]),tron_support:read(["サ","support"]),tron_hardware:read(["ハ","hardware"])};
  }

  const required={
    weapon:["parry","speed","electronic_control","page_number"],
    armor:["control_value","electronic_control","page_number"],
    cyberware:["electronic_control","page_number"],
    tron:["speed","electronic_control","tron_software","tron_support","tron_hardware","cs_value","page_number"],
    vehicle:["speed","electronic_control","defense_s","defense_i","defense_p","crew","sf","page_number"],
    residence:["speed","electronic_control","residence_entry","page_number"],
    other:["page_number"]
  };

  async function waitForColumns(row,category,timeout=8000){
    const fields=required[category]||required.other;
    const key=row?.dataset.outfitKey;
    const started=Date.now();
    while(Date.now()-started<timeout){
      const current=key?document.querySelector(`${ROOT} [data-outfit-key="${CSS.escape(key)}"]`):row;
      if(current&&fields.every(field=>current.querySelector(`[data-ofc="${field}"]`)))return current;
      window.TNXOutfitOfcFields?.queueEnhance?.();
      await frame();
    }
    return key?document.querySelector(`${ROOT} [data-outfit-key="${CSS.escape(key)}"]`):row;
  }

  async function createFallbackRow(item){
    const before=new Set([...document.querySelectorAll(`${ROOT} [data-outfit-key]`)].map(row=>row.dataset.outfitKey));
    const add=document.querySelector('#add-outfit');
    if(!add)return null;
    add.click();
    let row=null;
    const started=Date.now();
    while(Date.now()-started<8000&&!row){
      row=[...document.querySelectorAll(`${ROOT} [data-outfit-key]`)].find(candidate=>!before.has(candidate.dataset.outfitKey));
      if(!row)await frame();
    }
    if(!row)return null;
    setValue(row.querySelector('[data-o="category"]'),item.category);
    const key=row.dataset.outfitKey;
    const categoryStarted=Date.now();
    while(Date.now()-categoryStarted<8000){
      const current=document.querySelector(`${ROOT} [data-outfit-key="${CSS.escape(key)}"]`);
      if(current&&rowCategory(current)===item.category){row=current;break}
      await frame();
    }
    setValue(row.querySelector('[data-o="name"]'),item.name);
    return row;
  }

  function rowCategory(row){return row.querySelector('[data-o="category"]')?.value||row.closest("table")?.dataset.outfitSchema||"other"}
  function rowName(row){return clean(row.querySelector('[data-o="name"]')?.value)}

  async function applyItem(row,item,onColumnsReady){
    setValue(row.querySelector('[data-o="category"]'),item.category);
    row=await waitForColumns(row,item.category);
    onColumnsReady?.();
    const data=item.data;
    const base=(field,value)=>setValue(row.querySelector(`[data-o="${field}"]`),value);
    const ofc=(field,value)=>String(value??"")!==""&&setValue(row.querySelector(`[data-ofc="${field}"]`),value);

    base("name",item.name);
    base("purchase_value",first(data,"purchase","purchaseValue"));
    base("experience_cost",first(data,"permanent","experienceCost"));
    const concealA=first(data,"concealA","concealment"),concealB=first(data,"concealB","concealmentPenalty");
    base("concealment",[concealA,concealB].filter(value=>String(value??"")!=="").join("/"));
    base("description",first(data,"notes","description"));
    ofc("page_number",first(data,"page","pageNumber"));
    ofc("electronic_control",first(data,"electrical_control","electronic_control","electricalControl","electronicControl"));

    if(item.category==="weapon"){
      base("attack",first(data,"attack"));base("range",first(data,"range"));base("slot",first(data,"slot","part"));ofc("parry",first(data,"parry","defense"));ofc("speed",first(data,"speed"));
    }else if(item.category==="armor"){
      const s=first(data,"protecS","defenseS"),i=first(data,"protecI","defenseI"),p=first(data,"protecP","defenseP");base("defense",[s,i,p].map(value=>String(value??"")).join("/"));base("slot",first(data,"slot","part"));ofc("control_value",first(data,"control","controlValue"));
    }else if(item.category==="cyberware"){
      base("control_modifier",first(data,"control","controlModifier"));base("slot",first(data,"slot","part"));
    }else if(item.category==="tron"){
      base("control_modifier",first(data,"control","controlModifier"));base("slot",first(data,"slot"));ofc("speed",first(data,"speed"));const capacity=parseTronCapacity(first(data,"part","capacity","notes"));ofc("tron_software",first(data,"software","tron_software")||capacity.tron_software);ofc("tron_support",first(data,"support","tron_support")||capacity.tron_support);ofc("tron_hardware",first(data,"hardware","tron_hardware")||capacity.tron_hardware);ofc("cs_value",first(data,"cs","csValue"));
    }else if(item.category==="vehicle"){
      base("attack",first(data,"attack"));
      base("control_modifier",first(data,"control","controlModifier"));
      ofc("speed",first(data,"slot","speed"));
      ofc("electronic_control",first(data,"electrical_control","electronic_control","electricalControl","electronicControl"));
      ofc("defense_s",first(data,"protecS","defenseS"));
      ofc("defense_p",first(data,"protecP","defenseP"));
      ofc("defense_i",first(data,"protecI","defenseI"));
      ofc("crew",first(data,"crew","passenger","passengers"));
      ofc("sf",first(data,"sf","speedFactor"));
    }else if(item.category==="residence"){
      base("slot",first(data,"part","slot"));ofc("speed",first(data,"speed"));ofc("residence_entry",first(data,"entry"));ofc("residence_electric",first(data,"electric","residence_electric"));ofc("residence_area",first(data,"area","residence_area"));
    }else base("slot",first(data,"slot","part"));
  }

  async function convertAll(items){
    const rows=[...document.querySelectorAll(`${ROOT} [data-outfit-key]`)];
    const used=new Set();
    const missing=[];
    if(!items.length){progress(FINAL_END,"アウトフィットを最終変換中","変換対象のアウトフィットはありません");return missing}
    const step=(index,fraction=0)=>FINAL_START+((index+fraction)/items.length)*(FINAL_END-FINAL_START);
    for(let index=0;index<items.length;index++){
      const item=items[index];
      progress(step(index),"アウトフィットを最終変換中",`${index+1}/${items.length}件　${item.category}：${item.name}`);
      let row=rows.find(candidate=>!used.has(candidate.dataset.outfitKey)&&rowName(candidate)===item.name&&rowCategory(candidate)===item.category);
      if(!row&&["cyberware","tron"].includes(item.category))row=rows.find(candidate=>!used.has(candidate.dataset.outfitKey)&&rowName(candidate)===item.name&&rowCategory(candidate)==="other");
      if(!row){
        progress(step(index,.25),"アウトフィット行を再生成中",`${index+1}/${items.length}件　${item.name}`);
        row=await createFallbackRow(item);
        if(row)rows.push(row);
      }
      if(!row){missing.push(item);progress(step(index,1),"アウトフィットを最終変換中",`${index+1}/${items.length}件を確認`);continue}
      used.add(row.dataset.outfitKey);
      await applyItem(row,item,()=>progress(step(index,.55),"アウトフィット列を調整中",`${index+1}/${items.length}件　${item.name}`));
      progress(step(index,1),"アウトフィットを最終変換中",`${index+1}/${items.length}件の変換完了`);
    }
    document.querySelector(ROOT)?.dispatchEvent(new Event("input",{bubbles:true}));
    window.TNXExperience?.queue?.();
    return missing;
  }

  function observeBaseImport(){
    const message=document.querySelector(MESSAGE);if(!message)return ()=>{};
    const observer=new MutationObserver(()=>{const text=message.textContent||"";if(/基本情報/.test(text))progress(8,"基本情報を取込中",text);else if(/スタイルと能力値/.test(text))progress(18,"スタイル・能力値を取込中",text);else if(/技能/.test(text))progress(28,"技能を取込中",text);else if(/アウトフィット/.test(text))progress(44,"アウトフィットを取込中",text)});
    observer.observe(message,{childList:true,subtree:true,characterData:true});return ()=>observer.disconnect();
  }

  const importDialog=document.querySelector(DIALOG);
  importDialog?.addEventListener("cancel",event=>{
    if(importDialog.getAttribute("data-importing")==="1")event.preventDefault();
  });

  document.addEventListener("click",event=>{
    const button=event.target.closest?.(APPLY);if(!button)return;
    let data;try{data=JSON.parse(document.querySelector(TEXT)?.value||"")}catch{return}
    const items=sourceOutfits(data),dialog=document.querySelector(DIALOG);
    setImportLock(dialog,true);
    progress(3,"JSONを解析中",`アウトフィット${items.length}件を検出`);
    const stopObserver=observeBaseImport();

    (async()=>{
      try{
        await waitBaseImport();
        if(window.TNXLegacyStyleSkillRepair){progress(50,"技能データを確認中","スタイル技能の互換調整を確認しています");await window.TNXLegacyStyleSkillRepair}
        progress(FINAL_START,"アウトフィットを最終変換中",`アウトフィット${items.length}件を現行列へ調整します`);
        const missing=await convertAll(items);
        if(missing.length)throw new Error(`アウトフィット${missing.length}件を変換できませんでした：${missing.map(item=>item.name).join("、")}`);
        progress(100,"取込完了",`アウトフィット${items.length}件を現行形式へ変換しました`);
        const message=document.querySelector(MESSAGE);
        if(message)message.textContent="取込が完了し、編集画面へ反映しました。内容を確認し、保存ボタンでDBへ保存してください。";
        await sleep(250);
        if(dialog?.open)dialog.close();
      }catch(error){
        progress(100,"取込エラー",error.message||String(error));
        const message=document.querySelector(MESSAGE);
        if(message)message.textContent=`取込エラー：${error.message||String(error)}`;
      }finally{
        stopObserver();
        setImportLock(dialog,false);
      }
    })();
  },true);
})();
