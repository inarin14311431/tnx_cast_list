/* Canonical legacy outfit import owner: strips outfit payloads from the base importer and rebuilds them once. */
(()=>{
  const APPLY="#legacy-import-apply",TEXT="#legacy-import-json",ROOT="#outfit-list",MESSAGE="#legacy-import-message",DIALOG="#legacy-import-dialog";
  const BASE_IMPORT_EVENT="tnx:legacy-import-base-finished";
  const PREFIXES=["weapons","armours","armors","cyberwares","trons","vehicles","residences","outfits"];
  const OUTFIT_ADAPTER=import("./outfit-ofc-adapter.js?v=1");
  let normalizeImportedOutfitDetails=(category,value)=>value;
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const frame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const clean=value=>String(value??"").trim().replace(/^[★†※■┗]+\s*/,"");
  const first=(object,...keys)=>{for(const key of keys){const value=object?.[key];if(value!==undefined&&value!==null&&String(value)!=="")return value}return ""};
  const canonical=value=>String(value||"").trim().replace(/\[\s*["']?([^\]"']+)["']?\s*\]/g,".$1").replace(/^[.#]+|[.]$/g,"").replace(/\.{2,}/g,".");

  function progress(percent,label,detail=""){
    let root=document.querySelector("#legacy-import-progress");
    if(!root){
      root=document.createElement("section");root.id="legacy-import-progress";
      root.innerHTML='<p><strong data-import-progress-label></strong><span data-import-progress-percent></span></p><progress max="100"></progress><small data-import-progress-detail></small>';
      document.querySelector(MESSAGE)?.before(root);
    }
    root.hidden=false;
    root.querySelector("progress").value=Math.max(0,Math.min(100,percent));
    root.querySelector("[data-import-progress-percent]").textContent=`${Math.round(percent)}%`;
    root.querySelector("[data-import-progress-label]").textContent=label;
    root.querySelector("[data-import-progress-detail]").textContent=detail;
  }

  function lock(dialog,on){
    if(!dialog)return;
    if(on){dialog.setAttribute("data-importing","1");dialog.dataset.outfitImportOwner="canonical"}
    else{dialog.removeAttribute("data-importing");delete dialog.dataset.outfitImportOwner}
    const close=dialog.querySelector('[value="cancel"]');if(close)close.disabled=on;
    const apply=dialog.querySelector(APPLY);if(apply){if(on)apply.setAttribute("aria-busy","true");else{apply.removeAttribute("aria-busy");apply.disabled=false}}
  }

  function flatten(value,prefix,map){
    if(value===null||value===undefined)return;
    if(Array.isArray(value)){value.forEach((item,index)=>flatten(item,prefix?`${prefix}.${index}`:String(index),map));return}
    if(typeof value==="object"){
      for(const [key,item] of Object.entries(value)){
        if(["fields","format","url","exportedAt","title"].includes(key)&&!prefix)continue;
        flatten(item,prefix?`${prefix}.${key}`:key,map);
      }
      return;
    }
    const key=canonical(prefix);if(key&&!map.has(key))map.set(key,value);
  }

  function fieldMap(data){
    const map=new Map();
    const put=(key,value)=>{const normalized=canonical(key);if(normalized&&(!map.has(normalized)||String(value??"")!==""))map.set(normalized,value)};
    for(const field of Array.isArray(data?.fields)?data.fields:[]){
      const type=String(field.type||"").toLowerCase();
      const value=(type==="checkbox"||type==="radio")?(field.checked?(field.value||true):false):field.value;
      [field.path,field.id,field.name].forEach(key=>put(key,value));
    }
    flatten(data,"",map);return map;
  }

  function groups(map,prefixes){
    const output=new Map();
    for(const [id,value] of map){
      for(const prefix of prefixes){
        const escaped=canonical(prefix).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
        const match=id.match(new RegExp(`^${escaped}\\.([^.]*)\\.(.+)$`));
        if(!match)continue;
        if(!output.has(match[1]))output.set(match[1],{});
        output.get(match[1])[match[2]]=value;break;
      }
    }
    return [...output.entries()].sort(([a],[b])=>Number(a)-Number(b)||String(a).localeCompare(String(b),"ja")).map(([,value])=>value);
  }

  function sourceOutfits(data){
    const map=fieldMap(data);
    return [["weapon",["weapons"]],["armor",["armours","armors"]],["cyberware",["cyberwares"]],["tron",["trons"]],["vehicle",["vehicles"]],["residence",["residences"]],["other",["outfits"]]]
      .flatMap(([category,prefixes])=>groups(map,prefixes).filter(item=>clean(first(item,"name"))).map(item=>({category,data:item,name:clean(first(item,"name"))})));
  }

  function stripOutfits(data){
    const clone=JSON.parse(JSON.stringify(data));
    for(const prefix of PREFIXES)delete clone[prefix];
    if(Array.isArray(clone.fields))clone.fields=clone.fields.filter(field=>{
      const keys=[field.path,field.id,field.name].map(canonical).filter(Boolean);
      return !keys.some(key=>PREFIXES.some(prefix=>key===prefix||key.startsWith(`${prefix}.`)));
    });
    return clone;
  }

  function setValue(element,value){
    if(!element||value===undefined||value===null)return false;
    element.value=String(value);
    element.dispatchEvent(new Event("input",{bubbles:true}));
    element.dispatchEvent(new Event("change",{bubbles:true}));
    return true;
  }

  function waitBaseImport(){
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error("基本取込の完了を確認できませんでした。")),150000);
      document.addEventListener(BASE_IMPORT_EVENT,event=>{
        clearTimeout(timer);
        event.detail?.ok?resolve(event.detail):reject(new Error(event.detail?.error||"基本取込に失敗しました。"));
      },{once:true});
    });
  }

  async function clearExisting(){
    const directClear=window.TNXSheetEditor?.clearOutfitsForImport;
    if(typeof directClear==="function"){
      directClear();
      await frame();
      return;
    }
    let guard=0;
    while(guard++<300){
      const remove=document.querySelector(`${ROOT} [data-delete-outfit]`);
      if(!remove)break;
      remove.click();await frame();
    }
  }

  function canonicalModifiers(item){
    const data=item.data;
    return normalizeImportedOutfitDetails(item.category,{
      control_modifier:first(data,"control","controlModifier","controlValue"),
      cs_modifier:first(data,"cs","csModifier")
    });
  }

  function commonValues(item){
    const data=item.data;
    const modifiers=canonicalModifiers(item);
    return {
      name:item.name,
      purchase_value:first(data,"purchase","purchaseValue"),
      experience_cost:first(data,"permanent","experienceCost"),
      concealment:first(data,"concealA","concealment"),
      slot:first(data,"slot","part"),
      ...modifiers,
      description:first(data,"notes","description")
    };
  }

  function fieldControl(row,field){
    return row?.querySelector?.(`[data-o="${field}"]`)
      ||row?.querySelector?.(`[data-pc-outfit-proxy="${field}"]`)
      ||null;
  }

  async function waitForCreatedRow(before,timeout=8000){
    const root=document.querySelector(ROOT),started=Date.now();
    while(root&&Date.now()-started<timeout){
      const row=[...root.querySelectorAll('[data-outfit-key]')].find(candidate=>!before.has(candidate.dataset.outfitKey));
      if(row)return row;
      await frame();
    }
    return null;
  }

  async function createRaw(item){
    const root=document.querySelector(ROOT);
    if(!root)throw new Error("アウトフィット追加欄を確認できません。");

    const directAdd=window.TNXSheetEditor?.addOutfitForImport;
    if(typeof directAdd==="function"){
      const key=directAdd(item.category);
      if(!key)throw new Error(`アウトフィット行を作成できません：${item.name}`);
      const row=await waitRow(key);
      if(!row)throw new Error(`アウトフィット行を作成できません：${item.name}`);
      const values=commonValues(item);
      for(const [field,value] of Object.entries(values))setValue(fieldControl(row,field),value);
      return key;
    }

    const before=new Set([...root.querySelectorAll('[data-outfit-key]')].map(row=>row.dataset.outfitKey));
    const categoryAdd=root.querySelector(`[data-add-outfit-category="${CSS.escape(item.category)}"]`);
    const generic=document.querySelector("#add-outfit");
    const add=categoryAdd||generic;
    if(!add)throw new Error("アウトフィット追加欄を確認できません。");
    add.click();

    let row=await waitForCreatedRow(before);
    if(!row)throw new Error(`アウトフィット行を作成できません：${item.name}`);
    const key=row.dataset.outfitKey;

    if(!categoryAdd){
      setValue(fieldControl(row,"category"),item.category);
      await frame();
      row=root.querySelector(`[data-outfit-key="${CSS.escape(key)}"]`)||row;
    }
    const values=commonValues(item);
    for(const [field,value] of Object.entries(values))setValue(fieldControl(row,field),value);
    return key;
  }

  async function waitRow(key,timeout=8000){
    const started=Date.now();
    while(Date.now()-started<timeout){
      window.TNXOutfitOfcFields?.queueEnhance?.();
      const row=document.querySelector(`${ROOT} [data-outfit-key="${CSS.escape(key)}"]`);
      if(row){await frame();return document.querySelector(`${ROOT} [data-outfit-key="${CSS.escape(key)}"]`)||row}
      await frame();
    }
    return null;
  }

  async function applyExtended(key,item){
    let row=await waitRow(key);
    if(!row)throw new Error(`アウトフィット行の再描画に失敗しました：${item.name}`);
    const data=item.data;
    const modifiers=canonicalModifiers(item);
    const base=(field,value)=>setValue(fieldControl(row,field),value);
    const ofc=(field,value)=>String(value??"")!==""&&setValue(row.querySelector(`[data-ofc="${field}"]`),value);
    base("name",item.name);
    ofc("concealment_penalty",first(data,"concealB","concealmentPenalty","concealment_penalty"));
    if(item.category==="weapon"){
      base("attack",first(data,"attack"));base("range",first(data,"range"));base("slot",first(data,"slot","part"));
      ofc("parry",first(data,"parry","defense"));ofc("speed",first(data,"speed"));
    }else if(item.category==="armor"){
      const s=first(data,"protecS","defenseS"),p=first(data,"protecP","defenseP"),i=first(data,"protecI","defenseI");
      base("slot",first(data,"slot","part"));base("control_modifier",modifiers.control_modifier);
      ofc("defense_s",s);ofc("defense_p",p);ofc("defense_i",i);
    }else if(item.category==="cyberware"){
      base("slot",first(data,"slot","part"));
    }else if(item.category==="tron"){
      base("slot",first(data,"slot"));base("cs_modifier",modifiers.cs_modifier);ofc("speed",first(data,"speed"));
      ofc("tron_software",first(data,"software","tron_software"));ofc("tron_support",first(data,"support","tron_support"));ofc("tron_hardware",first(data,"hardware","tron_hardware"));
    }else if(item.category==="vehicle"){
      const s=first(data,"protecS","defenseS"),p=first(data,"protecP","defenseP"),i=first(data,"protecI","defenseI");
      base("attack",first(data,"attack"));base("control_modifier",modifiers.control_modifier);base("cs_modifier",modifiers.cs_modifier);
      ofc("speed",first(data,"speed","slot"));ofc("defense_s",s);ofc("defense_p",p);ofc("defense_i",i);ofc("crew",first(data,"crew","passenger","passengers"));ofc("sf",first(data,"sf","speedFactor"));
    }else if(item.category==="residence"){
      base("slot",first(data,"part","slot"));ofc("speed",first(data,"speed"));ofc("residence_entry",first(data,"entry"));ofc("residence_electric",first(data,"electric","residence_electric"));ofc("residence_area",first(data,"area","residence_area"));
    }else base("slot",first(data,"slot","part"));
    ofc("page_number",first(data,"page","pageNumber"));
    ofc("electronic_control",first(data,"electrical_control","electronic_control","electricalControl","electronicControl"));
  }

  window.TNXLegacyOutfitImport={owner:"sheet-import-outfit-compat",sourceOutfits,stripOutfits};
  window.TNXLegacyImportProgress={update:progress};

  const dialog=document.querySelector(DIALOG);
  dialog?.addEventListener("cancel",event=>{if(dialog.getAttribute("data-importing")==="1")event.preventDefault()});

  document.addEventListener("click",event=>{
    if(!event.target.closest?.(APPLY))return;
    const textarea=document.querySelector(TEXT);
    let originalData;
    try{originalData=JSON.parse(textarea?.value||"")}catch{return}
    const originalText=textarea.value;
    const items=sourceOutfits(originalData);
    const baseData=stripOutfits(originalData);
    const importDialog=document.querySelector(DIALOG);
    lock(importDialog,true);
    progress(3,"JSONを解析中",`アウトフィット${items.length}件を分離して取込みます`);

    /* The base importer receives no outfit payload. This module is the only runtime owner of outfit reconstruction. */
    textarea.value=JSON.stringify(baseData);
    const basePromise=waitBaseImport();

    (async()=>{
      try{
        const adapter=await OUTFIT_ADAPTER;
        normalizeImportedOutfitDetails=adapter.normalizeImportedOutfitDetails;
        await basePromise;
        textarea.value=originalText;
        progress(50,"アウトフィットを準備中","既存のアウトフィットを整理しています");
        await clearExisting();
        const created=[];
        for(let index=0;index<items.length;index++){
          const item=items[index];
          progress(52+32*(index/Math.max(1,items.length)),"アウトフィットを作成中",`${index+1}/${items.length}件　${item.name}`);
          const key=await createRaw(item);
          created.push({key,item});
        }
        for(let index=0;index<created.length;index++){
          const {key,item}=created[index];
          progress(84+14*(index/Math.max(1,created.length)),"アウトフィット詳細を変換中",`${index+1}/${created.length}件　${item.name}`);
          await applyExtended(key,item);
        }
        document.querySelector(ROOT)?.dispatchEvent(new Event("input",{bubbles:true}));
        window.TNXExperience?.queue?.();
        progress(100,"取込完了",`アウトフィット${items.length}件を現行形式へ変換しました`);
        const message=document.querySelector(MESSAGE);if(message)message.textContent="取込が完了し、編集画面へ反映しました。内容を確認し、保存ボタンでDBへ保存してください。";
        await sleep(200);if(importDialog?.open)importDialog.close();
      }catch(error){
        textarea.value=originalText;
        progress(100,"取込エラー",error.message||String(error));
        const message=document.querySelector(MESSAGE);if(message)message.textContent=`取込エラー：${error.message||String(error)}`;
      }finally{lock(importDialog,false)}
    })();
  },true);
})();