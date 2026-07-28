/* Convert warehouse outfits after the base import has finished. */
(()=>{
  const APPLY="#legacy-import-apply";
  const TEXT="#legacy-import-json";
  const ROOT="#outfit-list";
  const MESSAGE="#legacy-import-message";
  const DIALOG="#legacy-import-dialog";
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

  async function waitForColumns(row,category){
    const fields=required[category]||required.other;
    for(let attempt=0;attempt<120;attempt++){
      const key=row?.dataset.outfitKey;
      const current=key?document.querySelector(`${ROOT} [data-outfit-key="${CSS.escape(key)}"]`):row;
      if(current&&fields.every(field=>current.querySelector(`[data-ofc="${field}"]`)))return current;
      await frame();
    }
    return row;
  }

  function rowCategory(row){return row.querySelector('[data-o="category"]')?.value||row.closest("table")?.dataset.outfitSchema||"other"}
  function rowName(row){return clean(row.querySelector('[data-o="name"]')?.value)}

  async function applyItem(row,item){
    setValue(row.querySelector('[data-o="category"]'),item.category);
    row=await waitForColumns(row,item.category);
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
    for(let index=0;index<items.length;index++){
      const item=items[index];
      progress(72+(index/Math.max(items.length,1))*25,"アウトフィットを最終変換中",`${index+1}/${items.length}件　${item.category}：${item.name}`);
      let row=rows.find(candidate=>!used.has(candidate.dataset.outfitKey)&&rowName(candidate)===item.name&&rowCategory(candidate)===item.category);
      if(!row&&["cyberware","tron"].includes(item.category))row=rows.find(candidate=>!used.has(candidate.dataset.outfitKey)&&rowName(candidate)===item.name&&rowCategory(candidate)==="other");
      if(!row){missing.push(item);continue}
      used.add(row.dataset.outfitKey);
      await applyItem(row,item);
    }
    document.querySelector(ROOT)?.dispatchEvent(new Event("input",{bubbles:true}));
    window.TNXExperience?.queue?.();
    return missing;
  }

  function observeBaseImport(){
    const message=document.querySelector(MESSAGE);if(!message)return ()=>{};
    const observer=new MutationObserver(()=>{const text=message.textContent||"";if(/基本情報/.test(text))progress(12,"基本情報を取込中",text);else if(/スタイルと能力値/.test(text))progress(28,"スタイル・能力値を取込中",text);else if(/技能/.test(text))progress(45,"技能を取込中",text);else if(/アウトフィット/.test(text))progress(65,"アウトフィットを取込中",text)});
    observer.observe(message,{childList:true,subtree:true,characterData:true});return ()=>observer.disconnect();
  }

  document.addEventListener("click",event=>{
    const button=event.target.closest?.(APPLY);if(!button)return;
    let data;try{data=JSON.parse(document.querySelector(TEXT)?.value||"")}catch{return}
    const items=sourceOutfits(data),dialog=document.querySelector(DIALOG);
    dialog?.setAttribute("data-importing","1");
    progress(3,"JSONを解析中",`アウトフィット${items.length}件を検出`);
    const stopObserver=observeBaseImport();

    (async()=>{
      try{
        for(let attempt=0;attempt<2400;attempt++){
          const text=document.querySelector(MESSAGE)?.textContent||"";
          if(/取込エラー/.test(text))throw new Error(text.replace(/^.*取込エラー：?/,""));
          if(!button.disabled&&/反映しました/.test(text))break;
          await sleep(25);
        }
        const missing=await convertAll(items);
        if(missing.length)throw new Error(`アウトフィット${missing.length}件を変換できませんでした：${missing.map(item=>item.name).join("、")}`);
        progress(100,"取込完了",`アウトフィット${items.length}件を現行形式へ変換しました`);
        const message=document.querySelector(MESSAGE);
        if(message)message.textContent="取込が完了しました。画面へ反映し、自動保存を開始しました。";
        await sleep(250);
        if(dialog?.open)dialog.close();
      }catch(error){
        progress(100,"取込エラー",error.message||String(error));
      }finally{
        stopObserver();
        dialog?.removeAttribute("data-importing");
      }
    })();
  },true);
})();