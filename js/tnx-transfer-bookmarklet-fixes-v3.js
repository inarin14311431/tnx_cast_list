(async()=>{
  const FORMAT="TNX_CAST_TRANSFER_TSV";
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const frame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const clean=value=>String(value??"").trim();
  const truth=value=>!["","0","false","off","no","null","undefined","□","なし"].includes(clean(value).toLowerCase());
  const unescapeCell=value=>String(value||"").replace(/\\(\\|t|n|r)/g,(_,token)=>token==="\\"?"\\":token==="t"?"\t":token==="n"?"\n":"\r");

  function parse(text){
    const lines=String(text||"").replace(/\r/g,"").split("\n").filter(Boolean);
    const header=lines.shift()?.split("\t")||[];
    if(header[0]!==FORMAT)throw new Error("転記TSVを取得できませんでした。");
    const data={};
    for(const line of lines){
      const columns=line.split("\t");
      if(columns[0]!==FORMAT)continue;
      const section=columns[2]||"";
      const index=columns[3]||"0";
      const field=columns[4]||"";
      data[section]??={};
      data[section][index]??={};
      data[section][index][field]=unescapeCell(columns.slice(5).join("\t"));
    }
    return data;
  }

  function records(section){
    return Object.keys(section||{})
      .sort((a,b)=>(Number(a)-Number(b))||String(a).localeCompare(String(b)))
      .map(key=>section[key]);
  }

  function notify(element){
    if(!element)return;
    element.dispatchEvent(new Event("input",{bubbles:true}));
    element.dispatchEvent(new Event("change",{bubbles:true}));
    try{window.jQuery?.(element).trigger("input").trigger("change")}catch{}
  }

  function setById(id,value){
    const element=document.getElementById(id);
    if(!element)return false;
    if(element.tagName==="SELECT"){
      const target=String(value??"");
      const option=[...element.options].find(item=>String(item.value)===target)
        ||[...element.options].find(item=>clean(item.textContent)===clean(target));
      element.value=option?option.value:target;
    }else{
      element.value=String(value??"");
      element.setAttribute("value",element.value);
    }
    notify(element);
    return true;
  }

  function tableRows(prefix){
    return [...document.querySelectorAll(`#${CSS.escape(prefix)} tbody tr[id^="${prefix}."]`)];
  }

  async function ensureRows(prefix,count){
    let rows=tableRows(prefix);
    while(rows.length<count){
      const before=rows.length;
      try{
        if(typeof window.addSkillsRow==="function")window.addSkillsRow(prefix);
      }catch(error){console.warn(`Could not add ${prefix} row`,error)}
      await frame();
      await wait(30);
      rows=tableRows(prefix);
      if(rows.length<=before)break;
    }
    return rows;
  }

  function rowIndex(row,prefix,position){
    return row?.id?.startsWith(`${prefix}.`)
      ? row.id.slice(prefix.length+1)
      : String(position);
  }

  const SUITS={
    reason:{code:"s",image:"spade"},
    passion:{code:"c",image:"clover"},
    life:{code:"h",image:"heart"},
    mundane:{code:"d",image:"diams"}
  };

  function replaceSuitImage(image,basename,active){
    if(!image)return;
    const suffix=active?"b":"w";
    const next=image.src.replace(/(spade|clover|heart|diams)_[bw]\.gif(?:\?.*)?$/i,`${basename}_${suffix}.gif`);
    if(next!==image.src)image.src=next;
  }

  async function setLegacySuit(prefix,index,field,value){
    const suit=SUITS[field];
    const desired=truth(value);
    const hidden=document.getElementById(`${prefix}.${index}.${suit.code}`);
    const image=document.getElementById(`${prefix}.${index}.${suit.code}gif`);
    const current=hidden?.value==="1";

    /* The legacy sheet keeps the hidden value and image in sync through imgClick. */
    if(current!==desired&&image&&typeof window.imgClick==="function"){
      try{window.imgClick(image);await frame()}catch(error){console.warn("imgClick failed",error)}
    }

    if(hidden){
      hidden.value=desired?"1":"";
      hidden.setAttribute("value",hidden.value);
      notify(hidden);
    }
    replaceSuitImage(image,suit.image,desired);
  }

  function prefixedName(value,prefix){
    const bare=clean(value).replace(/^(社会|コネ(?:クション)?)[：:]\s*/,"");
    return bare?`${prefix}${bare}`:prefix;
  }

  async function repairNamedSkills(prefix,section,namePrefix){
    const list=records(section);
    if(!list.length)return;
    const rows=await ensureRows(prefix,list.length);
    for(let position=0;position<list.length;position++){
      const row=rows[position];
      const index=rowIndex(row,prefix,position);
      const record=list[position];
      setById(`${prefix}.${index}.name`,prefixedName(record.name,namePrefix));
      setById(`${prefix}.${index}.level`,record.level||0);
      for(const field of Object.keys(SUITS))await setLegacySuit(prefix,index,field,record[field]);
      try{
        const level=document.getElementById(`${prefix}.${index}.level`);
        if(level&&typeof window.levelChange==="function")window.levelChange(level);
      }catch{}
    }
  }

  function expbase(kind){
    const value=clean(kind).toLowerCase();
    if(["secret","秘技"].includes(value))return"20";
    if(["ultimate","奥義"].includes(value))return"50";
    if(["direction","演出","なし"].includes(value))return"0";
    return"10";
  }

  async function repairStyleSkills(section){
    const list=records(section);
    if(!list.length)return;
    const prefix="superhumanskills";
    const rows=await ensureRows(prefix,list.length);
    const fields={
      name:"name",
      level:"level",
      skill:"skill",
      limit:"limit",
      timing:"timing",
      target:"target",
      range:"range",
      difficulty:"aim",
      confrontation:"confront",
      description:"notes",
      page:"page"
    };

    for(let position=0;position<list.length;position++){
      const row=rows[position];
      const index=rowIndex(row,prefix,position);
      const record=list[position];

      /* Every field is written, including empty strings, to prevent column drift. */
      for(const [source,target] of Object.entries(fields)){
        setById(`${prefix}.${index}.${target}`,record[source]??"");
      }
      setById(`${prefix}.${index}.expbase`,expbase(record.kind));

      for(const field of Object.keys(SUITS))await setLegacySuit(prefix,index,field,record[field]);
      try{
        const level=document.getElementById(`${prefix}.${index}.level`);
        if(level&&typeof window.levelChange==="function")window.levelChange(level);
      }catch{}
    }
  }

  async function repairAll(data){
    await repairNamedSkills("skills3",data.social||{},"社会：");
    await repairNamedSkills("skills4",data.connection||{},"コネ：");
    await repairStyleSkills(data.style_skill||{});
    try{window.sumExp?.()}catch{}
    document.dispatchEvent(new Event("input",{bubbles:true}));
    document.dispatchEvent(new Event("change",{bubbles:true}));
  }

  try{
    const data=parse(String(window.__TNX_TRANSFER_TSV__||""));
    for(const delay of [250,700,1400,2800,5200]){
      await wait(delay);
      await repairAll(data);
    }
  }catch(error){
    console.error("TNX exact transfer repair failed",error);
  }
})();
