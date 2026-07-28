/* Convert warehouse outfits to the current schema with event-driven progress. */
(()=>{
  const APPLY="#legacy-import-apply";
  const TEXT="#legacy-import-json";
  const ROOT="#outfit-list";
  const MESSAGE="#legacy-import-message";
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
    const style=document.createElement("style");
    style.textContent=`#legacy-import-progress{margin:12px 0;padding:12px;border:1px solid rgba(65,232,255,.45);background:rgba(4,18,38,.9)}#legacy-import-progress p{display:flex;justify-content:space-between;gap:12px;margin:0 0 8px}#legacy-import-progress progress{display:block;width:100%;height:12px;accent-color:#41e8ff}#legacy-import-progress small{display:block;margin-top:8px;color:var(--text-muted)}#legacy-import-dialog[data-importing="1"] #legacy-import-apply{cursor:progress}`;
    document.head.append(style);
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
    const list=Array.isArray(prefixes)?prefixes:[prefixes];const output=new Map();
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

  const rows=()=>[...document.querySelectorAll(`${ROOT} [data-outfit-key]`)];
  const rowName=row=>clean(row?.querySelector('[data-o="name"]')?.value);
  const rowCategory=row=>row?.querySelector('[data-o="category"]')?.value||row?.closest("table")?.dataset.outfitSchema||"other";
  const categoryMatches=(row,item)=>rowCategory(row)===item.category||((item.category==="cyberware"||item.category==="tron")&&rowCategory(row)==="other");

  const REQUIRED={
    weapon:['[data-o="name"]','[data-o="description"]','[data-ofc="parry"]','[data-ofc="speed"]','[data-ofc="electronic_control"]','[data-ofc="page_number"]'],
    armor:['[data-o="name"]','[data-o="description"]','[data-ofc="control_value"]','[data-ofc="electronic_control"]','[data-ofc="page_number"]'],
    cyberware:['[data-o="name"]','[data-o="description"]','[data-ofc="electronic_control"]','[data-ofc="page_number"]'],
    tron:['[data-o="name"]','[data-o="description"]','[data-ofc="speed"]','[data-ofc="electronic_control"]','[data-ofc="tron_software"]','[data-ofc="tron_support"]','[data-ofc="tron_hardware"]','[data-ofc="cs_value"]','[data-ofc="page_number"]'],
    vehicle:['[data-o="name"]','[data-o="description"]','[data-ofc="speed"]','[data-ofc="electronic_control"]','[data-ofc="defense_s"]','[data-ofc="defense_i"]','[data-ofc="defense_p"]','[data-ofc="crew"]','[data-ofc="sf"]','[data-ofc="page_number"]'],
    residence:['[data-o="name"]','[data-o="description"]','[data-ofc="speed"]','[data-ofc="electronic_control"]','[data-ofc="residence_entry"]','[data-ofc="page_number"]'],
    other:['[data-o="name"]','[data-o="description"]','[data-ofc="page_number"]']
  };

  async function waitForRequiredFields(key,category){
    const selectors=REQUIRED[category]||REQUIRED.other;
    for(let attempt=0;attempt<180;attempt++){
      const row=document.querySelector(`${ROOT} [data-outfit-key="${CSS.escape(key)}"]`);
      if(row&&selectors.every(selector=>row.querySelector(selector)))return row;
      await frame();
    }
    return document.querySelector(`${ROOT} [data-outfit-key="${CSS.escape(key)}"]`);
  }

  async function applyCurrentSchema(row,item){
    const key=row.dataset.outfitKey;
    setValue(row.querySelector('[data-o="category"]'),item.category);
    row=await waitForRequiredFields(key,item.category);
    if(!row)return false;
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
      base("attack",first(data,"attack"));base("control_modifier",first(data,"control","controlModifier"));ofc("speed",first(data,"speed","slot"));ofc("defense_s",first(data,"protecS","defenseS"));ofc("defense_i",first(data,"protecI","defenseI"));ofc("defense_p",first(data,"protecP","defenseP"));ofc("crew",first(data,"crew","passenger","passengers"));ofc("sf",first(data,"sf","speedFactor"));
    }else if(item.category==="residence"){
      base("slot",first(data,"part","slot"));ofc("speed",first(data,"speed"));ofc("residence_entry",first(data,"entry"));ofc("residence_electric",first(data,"electric","residence_electric"));ofc("residence_area",first(data,"area","residence_area"));
    }else base("slot",first(data,"slot","part"));
    return true;
  }

  function convertAsRowsAppear(items){
    return new Promise(resolve=>{
      const pending=items.map((item,index)=>({...item,index,state:"pending"}));
      const used=new Set();
      let completed=0;
      let scheduled=false;
      let observer;

      const updateProgress=item=>progress(55+(completed/Math.max(items.length,1))*37,"アウトフィット変換中",`${completed}/${items.length}件完了${item?`　${item.category}：${item.name}`:""}`);
      const finish=()=>{observer?.disconnect();progress(93,"最終調整中","列配置と経験点を更新しています");document.querySelector(ROOT)?.dispatchEvent(new Event("input",{bubbles:true}));window.TNXExperience?.queue?.();resolve({completed,total:items.length,missing:pending.filter(item=>item.state!=="done")})};

      const reconcile=()=>{
        scheduled=false;
        const currentRows=rows();
        for(const item of pending){
          if(item.state!=="pending")continue;
          const row=currentRows.find(candidate=>!used.has(candidate.dataset.outfitKey)&&rowName(candidate)===item.name&&categoryMatches(candidate,item));
          if(!row)continue;
          item.state="processing";
          used.add(row.dataset.outfitKey);
          updateProgress(item);
          applyCurrentSchema(row,item).then(ok=>{item.state=ok?"done":"failed";completed++;updateProgress(item);if(completed===items.length)finish();else schedule()}).catch(()=>{item.state="failed";completed++;if(completed===items.length)finish();else schedule()});
        }
      };
      const schedule=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(reconcile)};
      observer=new MutationObserver(schedule);
      const root=document.querySelector(ROOT);
      if(root)observer.observe(root,{childList:true,subtree:true});
      schedule();
      if(!items.length)finish();
      window.setTimeout(()=>{for(const item of pending){if(item.state==="pending"){item.state="failed";completed++}}if(completed===items.length)finish()},45000);
    });
  }

  function observeBaseImport(){
    const message=document.querySelector(MESSAGE);if(!message)return ()=>{};
    const observer=new MutationObserver(()=>{const text=message.textContent||"";if(/基本情報/.test(text))progress(12,"基本情報を取込中",text);else if(/スタイルと能力値/.test(text))progress(28,"スタイル・能力値を取込中",text);else if(/技能/.test(text))progress(42,"技能を取込中",text);else if(/アウトフィット/.test(text))progress(55,"アウトフィットを取込中",text)});
    observer.observe(message,{childList:true,subtree:true,characterData:true});return ()=>observer.disconnect();
  }

  document.addEventListener("click",event=>{
    const button=event.target.closest?.(APPLY);if(!button)return;
    let data;try{data=JSON.parse(document.querySelector(TEXT)?.value||"")}catch{return}
    const items=sourceOutfits(data),dialog=document.querySelector("#legacy-import-dialog");
    dialog?.setAttribute("data-importing","1");progress(3,"JSONを解析中",`アウトフィット${items.length}件を検出`);
    const stopObserver=observeBaseImport();
    (async()=>{
      try{
        const conversion=convertAsRowsAppear(items);
        for(let attempt=0;attempt<1800;attempt++){
          const text=document.querySelector(MESSAGE)?.textContent||"";
          if(/取込エラー/.test(text))throw new Error(text.replace(/^.*取込エラー：?/,""));
          if(!button.disabled&&/反映しました/.test(text))break;
          await sleep(25);
        }
        const result=await conversion;
        if(result.missing.length)throw new Error(`アウトフィット${result.missing.length}件を変換できませんでした：${result.missing.map(item=>item.name).join("、")}`);
        progress(100,"取込完了",`アウトフィット${items.length}件を現行形式へ変換しました`);
        const message=document.querySelector(MESSAGE);if(message&&/反映しました/.test(message.textContent)&&!/現行分類/.test(message.textContent))message.textContent += " アウトフィットを現行分類・項目へ変換しました。";
      }catch(error){progress(100,"取込エラー",error.message||String(error));}
      finally{stopObserver();dialog?.removeAttribute("data-importing")}
    })();
  },true);
})();