(async()=>{
  const FORMAT="TNX_CAST_TRANSFER_TSV";
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const frame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const clean=value=>String(value??"").trim();
  const canonical=value=>clean(value).toLowerCase()
    .replace(/\[\s*["']?([^\]"']+)["']?\s*\]/g,".$1")
    .replace(/^[.#]+|[.]$/g,"")
    .replace(/\.{2,}/g,".");
  const truth=value=>!["","0","false","off","no","null","undefined","□","なし"].includes(clean(value).toLowerCase());
  const unescapeCell=value=>String(value||"").replace(/\\(\\|t|n|r)/g,(_,token)=>token==="\\"?"\\":token==="t"?"\t":token==="n"?"\n":"\r");

  function parse(text){
    const lines=String(text||"").replace(/\r/g,"").split("\n").filter(Boolean);
    const head=lines.shift()?.split("\t")||[];
    if(head[0]!==FORMAT)throw new Error("転記TSVを取得できませんでした。");
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

  let controls=[];
  let exactMap=new Map();
  function refresh(){
    controls=[...document.querySelectorAll("input,select,textarea")];
    exactMap=new Map();
    for(const element of controls){
      for(const key of [element.id,element.name]){
        const normalized=canonical(key);
        if(normalized&&!exactMap.has(normalized))exactMap.set(normalized,element);
      }
    }
  }

  function exact(paths){
    for(const path of paths.map(canonical).filter(Boolean)){
      if(exactMap.has(path))return exactMap.get(path);
    }
    return null;
  }

  function indexes(prefix){
    const found=new Set();
    const escaped=canonical(prefix).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
    const pattern=new RegExp(`^${escaped}\\.([^.]*)\\.`);
    for(const key of exactMap.keys()){
      const match=key.match(pattern);
      if(match)found.add(match[1]);
    }
    return [...found].sort((a,b)=>(Number(a)-Number(b))||String(a).localeCompare(String(b)));
  }

  function notify(element){
    element.dispatchEvent(new Event("input",{bubbles:true}));
    element.dispatchEvent(new Event("change",{bubbles:true}));
    try{window.jQuery?.(element).trigger("input").trigger("change")}catch{}
  }

  function setControl(element,value){
    if(!element)return false;
    if(element.type==="checkbox"||element.type==="radio")element.checked=truth(value);
    else if(element.tagName==="SELECT"){
      const target=clean(value).toLowerCase();
      const option=[...element.options].find(item=>clean(item.value).toLowerCase()===target)
        ||[...element.options].find(item=>clean(item.textContent).toLowerCase()===target)
        ||[...element.options].find(item=>clean(item.textContent).toLowerCase().includes(target));
      element.value=option?option.value:String(value??"");
    }else{
      element.value=String(value??"");
      element.setAttribute("value",element.value);
    }
    notify(element);
    return true;
  }

  function rowFor(prefix,index){
    const element=exact([
      `${prefix}.${index}.name`,`${prefix}[${index}].name`,
      `${prefix}.${index}.level`,`${prefix}[${index}].level`
    ]) || [...exactMap].find(([key])=>key.startsWith(`${canonical(prefix)}.${canonical(index)}.`))?.[1];
    return element?.closest("tr")||element?.closest(".row,.item,.record")||element?.parentElement||null;
  }

  function knockoutData(row){
    try{return window.ko?.dataFor?.(row)||window.ko?.contextFor?.(row)?.$data||null}catch{return null}
  }

  function setObservable(row,aliases,value){
    const data=knockoutData(row);
    if(!data)return false;
    for(const alias of aliases){
      if(!(alias in data))continue;
      const target=data[alias];
      try{
        if(typeof target==="function")target(value);
        else data[alias]=value;
        try{window.ko?.tasks?.runEarly?.()}catch{}
        return true;
      }catch{}
    }
    return false;
  }

  function ensurePrefix(name,prefix){
    const text=clean(name).replace(/^(社会|コネ(?:クション)?)[：:]\s*/,"");
    return text?`${prefix}${text}`:prefix;
  }

  const SUITS={
    reason:{aliases:["s","reason","spade"],symbol:"♠",position:0},
    passion:{aliases:["c","passion","club"],symbol:"♣",position:1},
    life:{aliases:["h","life","heart"],symbol:"♥",position:2},
    mundane:{aliases:["d","mundane","diamond"],symbol:"♦",position:3}
  };

  function booleanValue(element){
    if(!element)return false;
    if(element.type==="checkbox"||element.type==="radio")return element.checked;
    return truth(element.value);
  }

  function suitControl(prefix,index,field,row){
    const aliases=SUITS[field].aliases;
    const direct=exact(aliases.flatMap(alias=>[
      `${prefix}.${index}.${alias}`,`${prefix}[${index}].${alias}`,
      `${prefix}.${index}.suit.${alias}`,`${prefix}[${index}].suit.${alias}`,
      `${prefix}.${index}.suits.${alias}`,`${prefix}[${index}].suits.${alias}`
    ]));
    if(direct)return direct;

    const booleanControls=[...(row?.querySelectorAll("input")||[])].filter(element=>{
      const key=`${element.id||""} ${element.name||""}`.toLowerCase();
      if(/name|level|type|kind|skill|limit|timing|target|range|aim|difficulty|confront|notes|description|page|exp|cost/.test(key))return false;
      if(element.type==="checkbox"||element.type==="radio"||element.type==="hidden")return true;
      return ["","0","1","true","false","on","off"].includes(clean(element.value).toLowerCase());
    });
    return booleanControls[SUITS[field].position]||null;
  }

  function suitVisual(row,field,control){
    const suit=SUITS[field];
    const scope=control?.closest("td")||row;
    const candidates=[...(scope?.querySelectorAll("img,button,input[type='button'],a,[role='button'],label,span")||[])];
    const matched=candidates.find(element=>{
      const hint=[element.textContent,element.getAttribute?.("alt"),element.getAttribute?.("title"),element.getAttribute?.("aria-label"),element.getAttribute?.("src")].filter(Boolean).join(" ");
      return hint.includes(suit.symbol)||new RegExp(suit.aliases.join("|"),"i").test(hint);
    });
    if(matched)return matched;
    const images=[...(row?.querySelectorAll("img")||[])];
    return images[suit.position]||null;
  }

  async function setSuit(prefix,index,row,field,value){
    const desired=truth(value);
    const suit=SUITS[field];
    const observableSet=setObservable(row,suit.aliases,desired?1:0)||setObservable(row,suit.aliases,desired);
    const control=suitControl(prefix,index,field,row);
    const visual=suitVisual(row,field,control);

    if(control&&booleanValue(control)!==desired&&visual){
      try{visual.click();await frame()}catch{}
    }
    if(control){
      if(control.type==="checkbox"||control.type==="radio")control.checked=desired;
      else{
        control.value=desired?"1":"0";
        control.setAttribute("value",control.value);
      }
      notify(control);
    }else if(!observableSet&&visual){
      try{visual.click();await frame()}catch{}
    }
  }

  async function waitForIndexes(prefix,count){
    for(let attempt=0;attempt<80;attempt++){
      refresh();
      const list=indexes(prefix);
      if(list.length>=count)return list;
      await wait(125);
    }
    refresh();
    return indexes(prefix);
  }

  async function repairNamedSkillGroup(prefix,records,namePrefix){
    const list=Object.keys(records||{}).sort((a,b)=>Number(a)-Number(b)).map(key=>records[key]);
    if(!list.length)return;
    const rowIndexes=await waitForIndexes(prefix,list.length);
    for(let position=0;position<list.length;position++){
      const index=rowIndexes[position]??(position===0?"0":String(position).padStart(3,"0"));
      const row=rowFor(prefix,index);
      const record=list[position];
      const fullName=ensurePrefix(record.name,namePrefix);
      const name=exact([`${prefix}.${index}.name`,`${prefix}[${index}].name`]);
      if(name)setControl(name,fullName);else setObservable(row,["name"],fullName);
      for(const field of Object.keys(SUITS))await setSuit(prefix,index,row,field,record[field]);
    }
  }

  function headerIndexes(table){
    const rows=[...(table?.querySelectorAll("thead tr")||[])];
    const header=rows.sort((a,b)=>b.cells.length-a.cells.length)[0];
    const result={};
    [...(header?.cells||[])].forEach((cell,index)=>{
      const text=clean(cell.textContent).replace(/\s+/g,"");
      if(text.includes("名称"))result.name=index;
      else if(text.includes("種別"))result.kind=index;
      else if(text.includes("レベル"))result.level=index;
      else if(text==="技能"||text.includes("技能"))result.skill=index;
      else if(text.includes("上限"))result.limit=index;
      else if(text.includes("タイミング"))result.timing=index;
      else if(text.includes("対象"))result.target=index;
      else if(text.includes("射程"))result.range=index;
      else if(text.includes("目標値"))result.difficulty=index;
      else if(text.includes("対決"))result.confrontation=index;
      else if(text.includes("解説"))result.description=index;
      else if(text.includes("参照"))result.page=index;
    });
    return result;
  }

  function cellControl(row,index){
    if(index===undefined)return null;
    return row?.cells?.[index]?.querySelector("input:not([type='hidden']),select,textarea")||null;
  }

  function setRowField(prefix,index,row,aliases,value,headerIndex){
    const direct=exact(aliases.flatMap(alias=>[`${prefix}.${index}.${alias}`,`${prefix}[${index}].${alias}`]));
    if(direct)return setControl(direct,value);
    if(setObservable(row,aliases,value))return true;
    return setControl(cellControl(row,headerIndex),value);
  }

  function typeDefinition(value){
    const text=clean(value).toLowerCase();
    if(["secret","秘技"].includes(text))return{label:"秘技",expbase:20};
    if(["ultimate","奥義"].includes(text))return{label:"奥義",expbase:50};
    if(["direction","演出","なし"].includes(text))return{label:"なし",expbase:1};
    return{label:"特技",expbase:10};
  }

  async function repairStyleSkills(records){
    const list=Object.keys(records||{}).sort((a,b)=>Number(a)-Number(b)).map(key=>records[key]);
    if(!list.length)return;
    const rowIndexes=await waitForIndexes("superhumanskills",list.length);

    for(let position=0;position<list.length;position++){
      const index=rowIndexes[position]??(position===0?"0":String(position).padStart(3,"0"));
      const row=rowFor("superhumanskills",index);
      if(!row)continue;
      const record=list[position];
      const headers=headerIndexes(row.closest("table"));
      const definition=typeDefinition(record.kind);

      setRowField("superhumanskills",index,row,["name"],record.name||"",headers.name);
      setRowField("superhumanskills",index,row,["type","kind","category","skilltype"],definition.label,headers.kind);
      setRowField("superhumanskills",index,row,["expbase","experiencebase","baseexp","cost"],definition.expbase,undefined);
      setRowField("superhumanskills",index,row,["level"],record.level||0,headers.level);
      setRowField("superhumanskills",index,row,["skill"],record.skill||"",headers.skill);
      setRowField("superhumanskills",index,row,["limit"],record.limit||"",headers.limit);
      setRowField("superhumanskills",index,row,["timing"],record.timing||"",headers.timing);
      setRowField("superhumanskills",index,row,["target"],record.target||"",headers.target);
      setRowField("superhumanskills",index,row,["range"],record.range||"",headers.range);
      setRowField("superhumanskills",index,row,["aim","difficulty"],record.difficulty||"",headers.difficulty);
      setRowField("superhumanskills",index,row,["confront","confrontation"],record.confrontation||"",headers.confrontation);
      setRowField("superhumanskills",index,row,["notes","description"],record.description||"",headers.description);
      setRowField("superhumanskills",index,row,["page"],record.page||"",headers.page);

      for(const field of Object.keys(SUITS))await setSuit("superhumanskills",index,row,field,record[field]);
    }
  }

  try{
    const data=parse(String(window.__TNX_TRANSFER_TSV__||""));
    const repairAll=async()=>{
      refresh();
      await repairNamedSkillGroup("skills3",data.social||{},"社会：");
      await repairNamedSkillGroup("skills4",data.connection||{},"コネ：");
      await repairStyleSkills(data.style_skill||{});
      document.dispatchEvent(new Event("input",{bubbles:true}));
      document.dispatchEvent(new Event("change",{bubbles:true}));
    };

    for(const delay of [400,1000,2200,4500,8000]){
      await wait(delay);
      await repairAll();
    }
  }catch(error){
    console.error("TNX transfer v3 repair failed",error);
  }
})();
