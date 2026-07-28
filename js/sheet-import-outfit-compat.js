/* Repair character-sheets warehouse outfit imports for the current outfit schema. */
(()=>{
  const APPLY_SELECTOR="#legacy-import-apply";
  const TEXT_SELECTOR="#legacy-import-json";
  const ROOT_SELECTOR="#outfit-list";
  const MESSAGE_SELECTOR="#legacy-import-message";

  const waitFrame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const clean=value=>String(value??"").trim().replace(/^[★†※■┗]+\s*/,"");
  const first=(object,...keys)=>{
    for(const key of keys){
      const value=object?.[key];
      if(value!==undefined&&value!==null&&String(value)!=="")return value;
    }
    return "";
  };
  const canonical=value=>String(value||"").trim()
    .replace(/\[\s*["']?([^\]"']+)["']?\s*\]/g,".$1")
    .replace(/^[.#]+|[.]$/g,"")
    .replace(/\.{2,}/g,".");

  function flatten(value,prefix,map){
    if(value===null||value===undefined)return;
    if(Array.isArray(value)){
      value.forEach((item,index)=>flatten(item,prefix?`${prefix}.${index}`:String(index),map));
      return;
    }
    if(typeof value==="object"){
      for(const [key,item] of Object.entries(value)){
        if(["fields","format","url","exportedAt","title"].includes(key)&&!prefix)continue;
        flatten(item,prefix?`${prefix}.${key}`:key,map);
      }
      return;
    }
    const key=canonical(prefix);
    if(key&&!map.has(key))map.set(key,value);
  }

  function fieldMap(data){
    const map=new Map();
    const put=(key,value)=>{
      const normalized=canonical(key);
      if(normalized&&(!map.has(normalized)||String(value??"")!==""))map.set(normalized,value);
    };
    for(const field of Array.isArray(data?.fields)?data.fields:[]){
      const type=String(field.type||"").toLowerCase();
      const value=(type==="checkbox"||type==="radio")?(field.checked?(field.value||true):false):field.value;
      [field.path,field.id,field.name].forEach(key=>put(key,value));
    }
    flatten(data,"",map);
    return map;
  }

  function groups(map,prefixes){
    const list=Array.isArray(prefixes)?prefixes:[prefixes];
    const output=new Map();
    for(const [id,value] of map){
      for(const prefix of list){
        const escaped=canonical(prefix).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
        const match=id.match(new RegExp(`^${escaped}\\.([^.]*)\\.(.+)$`));
        if(!match)continue;
        const [,index,key]=match;
        if(!output.has(index))output.set(index,{});
        output.get(index)[key]=value;
        break;
      }
    }
    return [...output.entries()]
      .sort(([a],[b])=>Number(a)-Number(b)||String(a).localeCompare(String(b),"ja"))
      .map(([,value])=>value);
  }

  function sourceOutfits(data){
    const map=fieldMap(data);
    const definitions=[
      ["weapon",["weapons"]],
      ["armor",["armours","armors"]],
      ["cyberware",["cyberwares"]],
      ["tron",["trons"]],
      ["vehicle",["vehicles"]],
      ["residence",["residences"]],
      ["other",["outfits"]]
    ];
    return definitions.flatMap(([category,prefixes])=>groups(map,prefixes)
      .filter(item=>clean(first(item,"name")))
      .map(item=>({category,data:item,name:clean(first(item,"name"))})));
  }

  function setValue(element,value){
    if(!element||value===undefined||value===null)return false;
    element.value=String(value);
    element.dispatchEvent(new Event("input",{bubbles:true}));
    element.dispatchEvent(new Event("change",{bubbles:true}));
    return true;
  }

  function parseTronCapacity(value){
    const text=String(value||"");
    const read=labels=>{
      for(const label of labels){
        const match=text.match(new RegExp(`${label}\\s*[：:]?\\s*([0-9０-９]+)`,"i"));
        if(match)return match[1].replace(/[０-９]/g,char=>String("０１２３４５６７８９".indexOf(char)));
      }
      return "";
    };
    return {tron_software:read(["ソ","software"]),tron_support:read(["サ","support"]),tron_hardware:read(["ハ","hardware"])};
  }

  function rowName(row){return clean(row?.querySelector('[data-o="name"]')?.value)}
  function rows(){return [...document.querySelectorAll(`${ROOT_SELECTOR} [data-outfit-key]`)]}

  async function findUnusedRow(name,used){
    for(let attempt=0;attempt<30;attempt++){
      const row=rows().find(candidate=>!used.has(candidate.dataset.outfitKey)&&rowName(candidate)===name);
      if(row)return row;
      await sleep(50);
    }
    return null;
  }

  async function waitForField(key,selector){
    for(let attempt=0;attempt<30;attempt++){
      const row=document.querySelector(`${ROOT_SELECTOR} [data-outfit-key="${CSS.escape(key)}"]`);
      const field=row?.querySelector(selector);
      if(field)return field;
      await waitFrame();
    }
    return null;
  }

  async function applyCurrentSchema(row,item){
    const key=row.dataset.outfitKey;
    const data=item.data;
    setValue(row.querySelector('[data-o="category"]'),item.category);
    await waitFrame();

    const base=async(field,value)=>setValue(await waitForField(key,`[data-o="${field}"]`),value);
    const ofc=async(field,value)=>{
      if(value===undefined||value===null||String(value)==="")return false;
      return setValue(await waitForField(key,`[data-ofc="${field}"]`),value);
    };

    await base("name",item.name);
    await base("purchase_value",first(data,"purchase","purchaseValue"));
    await base("experience_cost",first(data,"permanent","experienceCost"));
    const concealA=first(data,"concealA","concealment");
    const concealB=first(data,"concealB","concealmentPenalty");
    await base("concealment",[concealA,concealB].filter(value=>String(value??"")!=="").join("/"));
    await base("description",first(data,"notes","description"));
    await ofc("page_number",first(data,"page","pageNumber"));
    await ofc("electronic_control",first(data,"electrical_control","electronic_control","electricalControl"));

    if(item.category==="weapon"){
      await base("attack",first(data,"attack"));
      await base("range",first(data,"range"));
      await base("slot",first(data,"slot","part"));
      await ofc("parry",first(data,"parry","defense"));
      await ofc("speed",first(data,"speed"));
    }else if(item.category==="armor"){
      const s=first(data,"protecS","defenseS");
      const i=first(data,"protecI","defenseI");
      const p=first(data,"protecP","defenseP");
      await base("defense",[s,i,p].map(value=>String(value??"")).join("/"));
      await base("slot",first(data,"slot","part"));
      await ofc("control_value",first(data,"control","controlValue"));
    }else if(item.category==="cyberware"){
      await base("control_modifier",first(data,"control","controlModifier"));
      await base("slot",first(data,"slot","part"));
    }else if(item.category==="tron"){
      await base("control_modifier",first(data,"control","controlModifier"));
      await base("slot",first(data,"slot"));
      await ofc("speed",first(data,"speed"));
      const capacity=parseTronCapacity(first(data,"part","capacity","notes"));
      await ofc("tron_software",first(data,"software","tron_software")||capacity.tron_software);
      await ofc("tron_support",first(data,"support","tron_support")||capacity.tron_support);
      await ofc("tron_hardware",first(data,"hardware","tron_hardware")||capacity.tron_hardware);
      await ofc("cs_value",first(data,"cs","csValue"));
    }else if(item.category==="vehicle"){
      await base("attack",first(data,"attack"));
      await base("control_modifier",first(data,"control","controlModifier"));
      await ofc("speed",first(data,"speed"));
      await ofc("defense_s",first(data,"protecS","defenseS"));
      await ofc("defense_i",first(data,"protecI","defenseI"));
      await ofc("defense_p",first(data,"protecP","defenseP"));
      await ofc("crew",first(data,"crew"));
      await ofc("sf",first(data,"sf"));
    }else if(item.category==="residence"){
      await base("slot",first(data,"part","slot"));
      await ofc("speed",first(data,"speed"));
      await ofc("residence_entry",first(data,"entry"));
      await ofc("residence_electric",first(data,"electric","residence_electric"));
      await ofc("residence_area",first(data,"area","residence_area"));
    }else{
      await base("slot",first(data,"slot","part"));
    }
  }

  async function repair(data){
    const items=sourceOutfits(data);
    if(!items.length)return;
    const used=new Set();
    for(const item of items){
      const row=await findUnusedRow(item.name,used);
      if(!row)continue;
      used.add(row.dataset.outfitKey);
      await applyCurrentSchema(row,item);
    }
    document.dispatchEvent(new Event("input",{bubbles:true}));
    window.TNXExperience?.queue?.();
  }

  document.addEventListener("click",event=>{
    const button=event.target.closest?.(APPLY_SELECTOR);
    if(!button)return;
    let data;
    try{data=JSON.parse(document.querySelector(TEXT_SELECTOR)?.value||"");}
    catch{return;}
    (async()=>{
      for(let attempt=0;attempt<240;attempt++){
        const message=document.querySelector(MESSAGE_SELECTOR)?.textContent||"";
        if(!button.disabled&&/反映しました|取込エラー/.test(message))break;
        await sleep(100);
      }
      if(/取込エラー/.test(document.querySelector(MESSAGE_SELECTOR)?.textContent||""))return;
      await repair(data);
      const message=document.querySelector(MESSAGE_SELECTOR);
      if(message&&/反映しました/.test(message.textContent))message.textContent += " アウトフィットを現行分類・項目へ変換しました。";
    })();
  },true);
})();