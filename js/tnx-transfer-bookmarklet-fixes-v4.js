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
    element.value=String(value??"");
    element.setAttribute("value",element.value);
    notify(element);
    return true;
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

  async function setLegacySuit(prefix,index,field,value,enabled=true){
    const suit=SUITS[field];
    const desired=enabled&&truth(value);
    const hidden=document.getElementById(`${prefix}.${index}.${suit.code}`);
    const image=document.getElementById(`${prefix}.${index}.${suit.code}gif`);
    const current=hidden?.value==="1";

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

  function normalizedName(value){
    return clean(value)
      .replace(/^★\s*/,"")
      .replace(/:/g,"：")
      .replace(/\s+/g,"");
  }

  function properType(value){
    const match=normalizedName(value).match(/^(製作|芸術|操縦)：(.*)$/);
    return match?{type:match[1],suffix:match[2]}:null;
  }

  const FIXED=[
    {prefix:"skills1",index:"0",key:"医療",display:"医療"},
    {prefix:"skills1",index:"1",key:"射撃",display:"★射撃"},
    {prefix:"skills1",index:"2",key:"知覚",display:"知覚"},
    {prefix:"skills1",index:"3",key:"電脳",display:"電脳"},
    {prefix:"skills1",index:"4",key:"製作",display:"製作：",proper:true},
    {prefix:"skills1",index:"5",key:"心理",display:"★心理"},
    {prefix:"skills1",index:"6",key:"自我",display:"★自我"},
    {prefix:"skills1",index:"7",key:"交渉",display:"交渉"},
    {prefix:"skills2",index:"0",key:"芸術",display:"芸術：",proper:true},
    {prefix:"skills2",index:"1",key:"運動",display:"運動"},
    {prefix:"skills2",index:"2",key:"回避",display:"★回避"},
    {prefix:"skills2",index:"3",key:"操縦",display:"★操縦：",proper:true},
    {prefix:"skills2",index:"4",key:"白兵",display:"★白兵"},
    {prefix:"skills2",index:"5",key:"圧力",display:"★圧力"},
    {prefix:"skills2",index:"6",key:"信用",display:"★信用"},
    {prefix:"skills2",index:"7",key:"隠密",display:"隠密"}
  ];

  function positiveLevel(record){
    const level=Number(record?.level||0);
    return Number.isFinite(level)&&level>0?level:0;
  }

  function chooseProper(list,type){
    const candidates=list.filter(record=>properType(record.name)?.type===type);
    const chosen=candidates.find(record=>properType(record.name)?.suffix)||candidates[0]||null;
    return {chosen,extras:candidates.filter(record=>record!==chosen)};
  }

  async function writeFixedRow(definition,record){
    const level=positiveLevel(record);
    let name=definition.display;
    if(definition.proper&&record){
      const source=clean(record.name).replace(/^★\s*/,"").replace(/:/g,"：");
      name=definition.key==="操縦"?`★${source}`:source;
    }
    setById(`${definition.prefix}.${definition.index}.name`,name);
    setById(`${definition.prefix}.${definition.index}.level`,level||"");
    for(const field of Object.keys(SUITS)){
      await setLegacySuit(definition.prefix,definition.index,field,record?.[field],level>0);
    }
    try{
      const control=document.getElementById(`${definition.prefix}.${definition.index}.level`);
      if(control&&typeof window.levelChange==="function")window.levelChange(control);
    }catch{}
  }

  function tableRows(prefix){
    return [...document.querySelectorAll(`#${CSS.escape(prefix)} tbody tr[id^="${prefix}."]`)];
  }

  async function ensureRows(prefix,count){
    let rows=tableRows(prefix);
    while(rows.length<count){
      const before=rows.length;
      try{if(typeof window.addSkillsRow==="function")window.addSkillsRow(prefix)}catch(error){console.warn(`Could not add ${prefix} row`,error)}
      await frame();
      await wait(30);
      rows=tableRows(prefix);
      if(rows.length<=before)break;
    }
    return rows;
  }

  function rowIndex(row,prefix,position){
    return row?.id?.startsWith(`${prefix}.`)?row.id.slice(prefix.length+1):String(position);
  }

  function socialName(value){
    const bare=clean(value).replace(/^社会[：:]\s*/,"");
    return bare?`社会：${bare}`:"社会：";
  }

  async function writeSocialAndExtras(social,extras){
    const desired=[
      ...social.map(record=>({...record,name:socialName(record.name)})),
      ...extras.map(record=>({...record,name:clean(record.name).replace(/^★\s*/,"").replace(/:/g,"：")}))
    ];
    const rows=await ensureRows("skills3",Math.max(1,desired.length));

    for(let position=0;position<rows.length;position++){
      const row=rows[position];
      const index=rowIndex(row,"skills3",position);
      const record=desired[position]||null;
      const level=positiveLevel(record);
      setById(`skills3.${index}.name`,record?.name||"");
      setById(`skills3.${index}.level`,level||"");
      for(const field of Object.keys(SUITS)){
        await setLegacySuit("skills3",index,field,record?.[field],level>0);
      }
      try{
        const control=document.getElementById(`skills3.${index}.level`);
        if(control&&typeof window.levelChange==="function")window.levelChange(control);
      }catch{}
    }
  }

  async function repairGeneralSkills(data){
    const general=records(data.general||{});
    const used=new Set();
    const properChoices={};
    const extras=[];

    for(const type of ["製作","芸術","操縦"]){
      const result=chooseProper(general,type);
      properChoices[type]=result.chosen;
      if(result.chosen)used.add(result.chosen);
      result.extras.forEach(record=>{used.add(record);extras.push(record)});
    }

    for(const definition of FIXED){
      let record=null;
      if(definition.proper){
        record=properChoices[definition.key]||null;
      }else{
        record=general.find(candidate=>!used.has(candidate)&&normalizedName(candidate.name)===definition.key)||null;
        if(record)used.add(record);
      }
      await writeFixedRow(definition,record);
    }

    await writeSocialAndExtras(records(data.social||{}),extras);
  }

  try{
    const data=parse(String(window.__TNX_TRANSFER_TSV__||""));
    for(const delay of [350,900,1800,3400,6000]){
      await wait(delay);
      await repairGeneralSkills(data);
    }
  }catch(error){
    console.error("TNX general-skill mapping failed",error);
  }
})();
