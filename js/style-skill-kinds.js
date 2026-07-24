/* Shared style-skill kind definitions for UI, import and EXP calculation. */
(function(){
  const definitions=[
    {value:"none",label:"なし",cost:0},
    {value:"normal",label:"通常",cost:10},
    {value:"secret",label:"秘技",cost:20},
    {value:"ultimate",label:"奥義",cost:50},
    {value:"direction",label:"演出",cost:2}
  ];

  const normalize=value=>String(value||"").trim();
  const canonicalKey=value=>normalize(value)
    .replace(/\[\s*["']?([^\]"']+)["']?\s*\]/g,".$1")
    .replace(/^[.#]+|[.]$/g,"")
    .replace(/\.{2,}/g,".");
  const cleanName=value=>normalize(value).replace(/^[★†※■┗]+\s*/,"");
  const isNone=value=>/^(?:なし|none)$/i.test(normalize(value));
  const isExplicitZero=value=>{
    const text=normalize(value);
    return text!==""&&Number(text)===0;
  };
  let pendingNoneNames=new Set();
  let pendingUntil=0;
  let applyTimer=0;

  function legacyNoneNames(raw){
    const names=new Set();
    let data;
    try{data=JSON.parse(raw);}catch{return names;}
    const rows=new Map();
    const put=(prefix,index,key,value)=>{
      const id=`${prefix}.${index}`;
      if(!rows.has(id))rows.set(id,{});
      rows.get(id)[key]=value;
    };

    for(const field of Array.isArray(data?.fields)?data.fields:[]){
      for(const source of [field.path,field.id,field.name]){
        const key=canonicalKey(source);
        const match=key.match(/^(superhumanskills|styleskills|styleSkills)\.([^.]*)\.(name|type|kind|category|expbase|experience|cost|level|lv)$/);
        if(match)put(match[1],match[2],match[3],field.value);
      }
    }

    for(const prefix of ["superhumanskills","styleskills","styleSkills"]){
      const group=data?.[prefix];
      if(Array.isArray(group))group.forEach((item,index)=>Object.entries(item||{}).forEach(([key,value])=>put(prefix,index,key,value)));
      else if(group&&typeof group==="object")Object.entries(group).forEach(([index,item])=>Object.entries(item||{}).forEach(([key,value])=>put(prefix,index,key,value)));
    }

    for(const row of rows.values()){
      const type=row.type??row.kind??row.category;
      const cost=row.expbase??row.experience??row.cost;
      const name=cleanName(row.name);
      if(name&&(isNone(type)||isExplicitZero(cost)))names.add(name);
    }
    return names;
  }

  function tsvNoneNames(raw){
    const lines=String(raw||"").replace(/\r/g,"").trim().split("\n").filter(Boolean).map(line=>line.split("\t"));
    if(lines.length<2)return new Set();
    const headers=lines.shift().map(value=>value.trim());
    const nameIndex=headers.indexOf("名称");
    const typeIndex=headers.indexOf("種別");
    if(nameIndex<0||typeIndex<0)return new Set();
    return new Set(lines.filter(row=>isNone(row[typeIndex])).map(row=>cleanName(row[nameIndex])).filter(Boolean));
  }

  function ensureNoneOption(select){
    if(!select||select.querySelector('option[value="none"]'))return;
    const option=document.createElement("option");
    option.value="none";
    option.textContent="なし";
    select.prepend(option);
  }

  function applyPendingNone(){
    clearTimeout(applyTimer);
    if(!pendingNoneNames.size||Date.now()>pendingUntil){pendingNoneNames.clear();return;}
    document.querySelectorAll('#style-skills tr[data-skill-key]').forEach(row=>{
      const name=cleanName(row.querySelector('[data-f="name"]')?.value);
      if(!pendingNoneNames.has(name))return;
      const select=row.querySelector('select[data-f="skill_kind"]');
      if(!select)return;
      ensureNoneOption(select);
      if(select.value!=="none"){
        select.value="none";
        select.dispatchEvent(new Event("input",{bubbles:true}));
        select.dispatchEvent(new Event("change",{bubbles:true}));
      }
    });
    applyTimer=window.setTimeout(applyPendingNone,80);
  }

  function queueNoneMapping(names){
    pendingNoneNames=names;
    pendingUntil=Date.now()+120000;
    applyPendingNone();
  }

  document.addEventListener("click",event=>{
    if(event.target.closest?.("#legacy-import-apply")){
      queueNoneMapping(legacyNoneNames(document.querySelector("#legacy-import-json")?.value||""));
    }else if(event.target.closest?.("#tsv-apply")&&/SKD/i.test(document.querySelector("#tsv-title")?.textContent||"")){
      queueNoneMapping(tsvNoneNames(document.querySelector("#tsv-text")?.value||""));
    }
  },true);

  window.TNXStyleSkillKinds={
    definitions,
    values:definitions.map(item=>item.value),
    labels:Object.fromEntries(definitions.map(item=>[item.value,item.label])),
    costs:Object.fromEntries(definitions.map(item=>[item.value,item.cost])),
    fromLabel(label){
      const text=normalize(label);
      return definitions.find(item=>item.label===text||item.value===text.toLowerCase())?.value||"normal";
    }
  };
})();