/* Canonical compatibility layer for legacy style-skill imports.
 * Owns JSON control-character repair, symbol-preserving name matching,
 * multiline-name restoration, duplicate cleanup and source-order restoration after the base importer.
 */
(()=>{
  const APPLY="#legacy-import-apply";
  const TEXT="#legacy-import-json";
  const MESSAGE="#legacy-import-message";
  const ROOT="#style-skills";
  const ADD="#add-style-skill";
  const BASE_IMPORT_EVENT="tnx:legacy-import-base-finished";
  const STYLE_DETAIL_PREFIX="@@TNX_STYLE_DETAIL_V1@@";
  const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
  const canonical=value=>String(value||"").trim()
    .replace(/\[\s*["']?([^\]"']+)["']?\s*\]/g,".$1")
    .replace(/^[.#]+|[.]$/g,"")
    .replace(/\.{2,}/g,".");
  const normalizeMultiline=value=>String(value??"")
    .replace(/\r\n?/g,"\n")
    .replace(/\\r\\n|\\n|\\r/g,"\n");
  const exactName=value=>normalizeMultiline(value).trim().replace(/Ｎ◎ＶＡ/g,"N◎VA");
  const matchName=value=>exactName(value)
    .replace(/^[★■┗†※]+\s*/,"")
    .replace(/\s+/g,"")
    .trim();
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

  function repairJsonStringControls(value){
    const text=String(value??"");
    let output="",inString=false,escaped=false;
    for(const character of text){
      if(!inString){output+=character;if(character==='"')inString=true;continue}
      if(escaped){output+=character;escaped=false;continue}
      if(character==='\\'){output+=character;escaped=true;continue}
      if(character==='"'){output+=character;inString=false;continue}
      if(character==='\n')output+='\\n';
      else if(character==='\r')output+='\\r';
      else if(character==='\t')output+='\\t';
      else if(character.charCodeAt(0)<0x20)output+=`\\u${character.charCodeAt(0).toString(16).padStart(4,"0")}`;
      else output+=character;
    }
    return output;
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

  function sourceRecords(data){
    const direct=[];
    for(const key of ["superhumanskills","styleskills","styleSkills"]){
      if(Array.isArray(data?.[key]))direct.push(...data[key]);
    }
    if(direct.length)return direct;
    return groups(fieldMap(data),["superhumanskills","styleskills","styleSkills"]);
  }

  function sourceSkills(data){
    return sourceRecords(data)
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

  function styleDetail(data){
    return {
      skill:String(first(data,"skill")??""),
      limit:String(first(data,"limit")??""),
      timing:String(first(data,"timing")??""),
      target:String(first(data,"target")??""),
      range:String(first(data,"range")??""),
      difficulty:String(first(data,"aim","difficulty")??""),
      confrontation:String(first(data,"confront","confrontation")??""),
      description:String(first(data,"notes","description")??""),
      page:String(first(data,"page")??"")
    };
  }

  function encodeStyleDetail(data){
    return `${STYLE_DETAIL_PREFIX}\n${JSON.stringify(styleDetail(data))}`;
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

  function ensureMultilineNameField(row){
    if(!row)return row;
    window.TNXMultilineFields?.enhance?.();
    const key=row.dataset.skillKey;
    return document.querySelector(`${ROOT} tr[data-skill-key="${CSS.escape(key)}"]`)||row;
  }

  function setExactName(row,value){
    if(!row)return false;
    const field=window.TNXMultilineFields?.setStyleNameExact?.(row,value);
    if(field)return true;
    return setValue(row.querySelector('[data-f="name"]'),normalizeMultiline(value));
  }

  function alignImportedOrder(orderedKeys){
    for(let targetIndex=0;targetIndex<orderedKeys.length;targetIndex++){
      const key=orderedKeys[targetIndex];
      let guard=rows().length+1;
      while(guard-->0){
        const currentRows=rows();
        const currentIndex=currentRows.findIndex(row=>row.dataset.skillKey===key);
        if(currentIndex===targetIndex)break;
        if(currentIndex<targetIndex||currentIndex<0)return false;
        const up=currentRows[currentIndex].querySelector('[data-skill-move="up"]');
        if(!up||up.disabled)return false;
        up.click();
      }
      if(rows()[targetIndex]?.dataset.skillKey!==key)return false;
    }
    return true;
  }

  function removeUnexpectedRows(usedKeys){
    for(const row of rows()){
      if(usedKeys.has(row.dataset.skillKey))continue;
      if(!rowValue(row))continue;
      row.querySelector('[data-delete-skill]')?.click();
    }
  }

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
    row=ensureMultilineNameField(row);
    setExactName(row,data.name);
    await frame();
    row=ensureMultilineNameField(row);
    setExactName(row,data.name);
    setValue(row.querySelector('[data-f="skill_kind"]'),skillKind(data));
    const suits=skillSuits(data);
    const level=skillLevel(data);
    setValue(row.querySelector('[data-f="level"]'),level);
    for(const [suit,on] of Object.entries(suits))setValue(row.querySelector(`[data-f="${suit}"]`),on);
    setValue(row.querySelector('[data-f="level"]'),level);
    setValue(row.querySelector('[data-f="description"]'),encodeStyleDetail(data));
    window.TNXStyleSkillFields?.syncRow?.(row);
    return true;
  }

  async function addMissingSkill(data){
    const before=new Set(rows().map(row=>row.dataset.skillKey));
    document.querySelector(ADD)?.click();
    const row=await waitForNewRow(before);
    return applySkill(row,data);
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
      timer=window.setTimeout(()=>finish(reject,new Error("基本取込の完了を確認できませんでした。")),150000);
    });
  }

  async function repair(data){
    const expected=sourceSkills(data);
    await waitBaseImport();
    window.TNXMultilineFields?.enhance?.();
    const used=new Set();
    const orderedKeys=[];
    let repaired=0;
    for(const skill of expected){
      let row=rows().find(candidate=>!used.has(candidate.dataset.skillKey)&&comparable(rowValue(candidate))===comparable(skill.name));
      if(row){
        used.add(row.dataset.skillKey);
        orderedKeys.push(row.dataset.skillKey);
        if(await applySkill(row,skill))repaired++;
      }else if(await addMissingSkill(skill)){
        row=rows().find(candidate=>!used.has(candidate.dataset.skillKey)&&comparable(rowValue(candidate))===comparable(skill.name));
        if(row){used.add(row.dataset.skillKey);orderedKeys.push(row.dataset.skillKey)}
        repaired++;
      }
    }
    removeUnexpectedRows(used);
    window.TNXMultilineFields?.enhance?.();
    await frame();
    for(const skill of expected){
      const row=rows().find(candidate=>comparable(rowValue(candidate))===comparable(skill.name));
      if(row)setExactName(row,skill.name);
    }
    const missing=expected.filter(skill=>!rows().some(row=>comparable(rowValue(row))===comparable(skill.name)));
    if(missing.length)throw new Error(`スタイル技能${missing.length}件を取込できませんでした：${missing.map(item=>item.name.replace(/\n/g," / ")).join("、")}`);
    if(orderedKeys.length!==expected.length||!alignImportedOrder(orderedKeys))throw new Error("スタイル技能をJSONの並び順に復元できませんでした。");
    document.querySelector(ROOT)?.dispatchEvent(new Event("input",{bubbles:true}));
    window.TNXMultilineFields?.enhance?.();
    window.TNXExperience?.queue?.();
    return {total:expected.length,repaired};
  }

  document.addEventListener("click",event=>{
    const button=event.target.closest?.(APPLY);
    if(!button)return;
    const source=document.querySelector(TEXT);
    if(!source)return;
    const repairedText=repairJsonStringControls(source.value);
    if(repairedText!==source.value){
      source.value=repairedText;
      const message=document.querySelector(MESSAGE);
      if(message)message.textContent="JSON内の制御文字を修復して取り込みます…";
    }
    let data;
    try{data=JSON.parse(source.value||"")}catch{return}
    window.__tnxLegacyImportInProgress=true;
    window.TNXLegacyStyleSkillRepair=(async()=>{
      try{return await repair(data)}
      catch(error){
        console.error(error);
        const message=document.querySelector(MESSAGE);
        if(message)message.textContent=`取込エラー：${error.message||String(error)}`;
        throw error;
      }finally{
        window.__tnxLegacyImportInProgress=false;
      }
    })();
  },true);
})();
