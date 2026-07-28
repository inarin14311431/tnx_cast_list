/* Complete legacy style-skill imports after the base importer and preserve name symbols. */
(()=>{
  const APPLY="#legacy-import-apply";
  const TEXT="#legacy-import-json";
  const MESSAGE="#legacy-import-message";
  const ROOT="#style-skills";
  const ADD="#add-style-skill";
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
  const canonical=value=>String(value||"").trim()
    .replace(/\[\s*["']?([^\]"']+)["']?\s*\]/g,".$1")
    .replace(/^[.#]+|[.]$/g,"")
    .replace(/\.{2,}/g,".");
  const exactName=value=>String(value??"").trim().replace(/Ｎ◎ＶＡ/g,"N◎VA");
  const matchName=value=>exactName(value).replace(/^[★■┗]+\s*/,"");
  const first=(object,...keys)=>{
    for(const key of keys){
      const value=object?.[key];
      if(value!==undefined&&value!==null)return value;
    }
    return "";
  };
  const truth=value=>{
    if(value===true)return true;
    if(value===false||value===null||value===undefined)return false;
    return !["","0","false","off","no","null","undefined"].includes(String(value).trim().toLowerCase());
  };
  const number=value=>{const match=String(value??"").match(/-?\d+/);return match?Number(match[0]):0};

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
    const key=canonical(prefix);
    if(key&&!map.has(key))map.set(key,value);
  }

  function fieldMap(data){
    const map=new Map();
    const put=(key,value)=>{const normalized=canonical(key);if(normalized&&(!map.has(normalized)||String(value??"")!==""))map.set(normalized,value)};
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

  function sourceSkills(data){
    return groups(fieldMap(data),["superhumanskills","styleskills","styleSkills"])
      .map(item=>({...item,name:exactName(first(item,"name"))}))
      .filter(item=>item.name&&!item.name.startsWith("■")&&skillLevel(item)>0);
  }

  function skillSuits(data){
    return {
      reason:truth(first(data,"s","reason","spade")),
      passion:truth(first(data,"c","passion","club")),
      life:truth(first(data,"h","life","heart")),
      mundane:truth(first(data,"d","mundane","diamond"))
    };
  }
  function skillLevel(data){
    const suits=skillSuits(data);
    return Math.max(0,number(first(data,"level","lv")),Object.values(suits).filter(Boolean).length);
  }
  function skillKind(data){
    const label=String(first(data,"type","kind","category")||"");
    if(/演出|方向/.test(label))return "direction";
    if(/奥義/.test(label))return "ultimate";
    if(/秘技/.test(label))return "secret";
    const cost=number(first(data,"expbase","experience","cost"));
    return cost>=50?"ultimate":cost>=20?"secret":cost>0&&cost<=2?"direction":"normal";
  }

  function setValue(element,value){
    if(!element)return false;
    const next=element.type==="checkbox"?Boolean(value):String(value??"");
    const current=element.type==="checkbox"?element.checked:element.value;
    if(current===next)return true;
    if(element.type==="checkbox")element.checked=next;else element.value=next;
    element.dispatchEvent(new Event("input",{bubbles:true}));
    element.dispatchEvent(new Event("change",{bubbles:true}));
    return true;
  }

  const rows=()=>[...document.querySelectorAll(`${ROOT} tr[data-skill-key]`)];
  const rowValue=row=>exactName(row?.querySelector('[data-f="name"]')?.value);
  const comparable=value=>matchName(value);

  async function waitForNewRow(before,timeout=10000){
    const existing=rows().find(row=>!before.has(row.dataset.skillKey));
    if(existing)return existing;
    return new Promise(resolve=>{
      const root=document.querySelector(ROOT);
      if(!root){resolve(null);return}
      let settled=false;
      const finish=row=>{if(settled)return;settled=true;observer.disconnect();clearTimeout(timer);resolve(row)};
      const observer=new MutationObserver(()=>{
        const row=rows().find(candidate=>!before.has(candidate.dataset.skillKey));
        if(row)finish(row);
      });
      observer.observe(root,{childList:true,subtree:true});
      const timer=setTimeout(()=>finish(null),timeout);
    });
  }

  async function waitStableRow(key,timeout=5000){
    const started=Date.now();
    while(Date.now()-started<timeout){
      const row=document.querySelector(`${ROOT} tr[data-skill-key="${CSS.escape(key)}"]`);
      if(row?.querySelector('[data-f="name"]')&&row.querySelector('[data-f="skill_kind"]')&&row.querySelector('[data-f="level"]'))return row;
      await frame();
    }
    return document.querySelector(`${ROOT} tr[data-skill-key="${CSS.escape(key)}"]`);
  }

  async function applySkill(row,data){
    if(!row)return false;
    const key=row.dataset.skillKey;
    row=await waitStableRow(key);
    if(!row)return false;
    setValue(row.querySelector('[data-f="name"]'),data.name);
    setValue(row.querySelector('[data-f="skill_kind"]'),skillKind(data));
    const suits=skillSuits(data);
    const level=skillLevel(data);
    setValue(row.querySelector('[data-f="level"]'),level);
    for(const [suit,on] of Object.entries(suits))setValue(row.querySelector(`[data-f="${suit}"]`),on);
    setValue(row.querySelector('[data-f="level"]'),level);
    const detail=[
      first(data,"skill")&&`技能：${first(data,"skill")}`,
      first(data,"limit")&&`上限：${first(data,"limit")}`,
      first(data,"timing")&&`タイミング：${first(data,"timing")}`,
      first(data,"target")&&`対象：${first(data,"target")}`,
      first(data,"range")&&`射程：${first(data,"range")}`,
      first(data,"aim","difficulty")&&`目標値：${first(data,"aim","difficulty")}`,
      first(data,"confront","confrontation")&&`対決：${first(data,"confront","confrontation")}`,
      first(data,"page")&&`参照P：${first(data,"page")}`,
      first(data,"notes","description")
    ].filter(Boolean).join("\n");
    setValue(row.querySelector('[data-f="description"]'),detail);
    return true;
  }

  async function addMissingSkill(data){
    const before=new Set(rows().map(row=>row.dataset.skillKey));
    document.querySelector(ADD)?.click();
    const row=await waitForNewRow(before);
    return applySkill(row,data);
  }

  async function waitBaseImport(button){
    for(let attempt=0;attempt<2400;attempt++){
      const message=document.querySelector(MESSAGE)?.textContent||"";
      if(/取込エラー/.test(message))throw new Error(message);
      if(!button.disabled&&/反映しました/.test(message))return;
      await sleep(25);
    }
    throw new Error("基本取込の完了を確認できませんでした。");
  }

  async function repair(data,button){
    const expected=sourceSkills(data);
    await waitBaseImport(button);
    const used=new Set();
    let repaired=0;
    for(const skill of expected){
      let row=rows().find(candidate=>!used.has(candidate.dataset.skillKey)&&comparable(rowValue(candidate))===comparable(skill.name));
      if(row){
        used.add(row.dataset.skillKey);
        if(await applySkill(row,skill))repaired++;
      }else if(await addMissingSkill(skill)){
        row=rows().find(candidate=>!used.has(candidate.dataset.skillKey)&&rowValue(candidate)===skill.name);
        if(row)used.add(row.dataset.skillKey);
        repaired++;
      }
    }
    const missing=expected.filter(skill=>!rows().some(row=>rowValue(row)===skill.name));
    if(missing.length)throw new Error(`スタイル技能${missing.length}件を取込できませんでした：${missing.map(item=>item.name).join("、")}`);
    document.querySelector(ROOT)?.dispatchEvent(new Event("input",{bubbles:true}));
    window.TNXExperience?.queue?.();
    return {total:expected.length,repaired};
  }

  document.addEventListener("click",event=>{
    const button=event.target.closest?.(APPLY);
    if(!button)return;
    let data;
    try{data=JSON.parse(document.querySelector(TEXT)?.value||"")}catch{return}
    window.TNXLegacyStyleSkillRepair=(async()=>{
      try{return await repair(data,button)}
      catch(error){
        console.error(error);
        const message=document.querySelector(MESSAGE);
        if(message)message.textContent=`取込エラー：${error.message||String(error)}`;
        throw error;
      }
    })();
  },true);
})();