(async()=>{
  const FORMAT="TNX_CAST_TRANSFER_TSV";
  const MARKER="[[STYLE_SEPARATOR]]";
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const frame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const clean=value=>String(value??"").trim();
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

  function isSeparator(record){
    const kind=clean(record?.kind).toLowerCase();
    return kind==="none"||kind==="なし"||String(record?.description||"").includes(MARKER);
  }

  function notify(element){
    if(!element)return;
    element.dispatchEvent(new Event("input",{bubbles:true}));
    element.dispatchEvent(new Event("change",{bubbles:true}));
    try{window.jQuery?.(element).trigger("input").trigger("change")}catch{}
  }

  function tableRows(){
    return [...document.querySelectorAll('#superhumanskills tbody tr[id^="superhumanskills."]')];
  }

  async function ensureRows(count){
    let rows=tableRows();
    while(rows.length<count){
      const before=rows.length;
      try{if(typeof window.addSkillsRow==="function")window.addSkillsRow("superhumanskills")}catch(error){console.warn("Could not add style-skill row",error)}
      await frame();
      await wait(30);
      rows=tableRows();
      if(rows.length<=before)break;
    }
    return rows;
  }

  function rowIndex(row,position){
    return row?.id?.startsWith("superhumanskills.")
      ? row.id.slice("superhumanskills.".length)
      : String(position);
  }

  function identity(element){
    return [element?.id,element?.name,element?.className,element?.getAttribute?.("data-bind"),element?.getAttribute?.("data-field")]
      .filter(Boolean).join(" ");
  }

  function typeControl(row,index){
    for(const suffix of ["type","kind","category","skilltype"]){
      const direct=document.getElementById(`superhumanskills.${index}.${suffix}`)
        ||document.querySelector(`[name="superhumanskills.${CSS.escape(index)}.${suffix}"]`);
      if(direct)return direct;
    }
    const controls=[...(row?.querySelectorAll("select,input")||[])];
    return controls.find(element=>
      /type|kind|category|skill.?type|種別/i.test(identity(element))
      ||(element.tagName==="SELECT"&&[...element.options].some(option=>clean(option.textContent)==="なし"))
    )||null;
  }

  function expbaseControl(row,index){
    for(const suffix of ["expbase","experiencebase","baseexp","cost"]){
      const direct=document.getElementById(`superhumanskills.${index}.${suffix}`)
        ||document.querySelector(`[name="superhumanskills.${CSS.escape(index)}.${suffix}"]`);
      if(direct)return direct;
    }
    return [...(row?.querySelectorAll("input,select")||[])].find(element=>
      /expbase|experience.?base|base.?exp|cost/i.test(identity(element))
    )||null;
  }

  function setNoneType(element){
    if(!element)return false;
    if(element.tagName==="SELECT"){
      const option=[...element.options].find(item=>clean(item.textContent)==="なし")
        ||[...element.options].find(item=>["none","0","1"].includes(clean(item.value).toLowerCase()));
      if(option)element.value=option.value;
      else element.value="なし";
    }else{
      element.value="なし";
      element.setAttribute("value","なし");
    }
    notify(element);
    return true;
  }

  function setZeroExpbase(element){
    if(!element)return false;
    if(element.tagName==="SELECT"){
      const option=[...element.options].find(item=>clean(item.value)==="0")
        ||[...element.options].find(item=>clean(item.textContent)==="なし");
      element.value=option?option.value:"0";
    }else{
      element.value="0";
      element.setAttribute("value","0");
    }
    notify(element);
    return true;
  }

  async function repairSeparators(data){
    const list=records(data.style_skill||{});
    if(!list.length)return;
    const rows=await ensureRows(list.length);

    for(let position=0;position<list.length;position++){
      const record=list[position];
      if(!isSeparator(record))continue;
      const row=rows[position];
      if(!row)continue;
      const index=rowIndex(row,position);

      const type=typeControl(row,index);
      setNoneType(type);

      const expbase=expbaseControl(row,index);
      setZeroExpbase(expbase);

      try{
        const level=document.getElementById(`superhumanskills.${index}.level`);
        if(level&&typeof window.levelChange==="function")window.levelChange(level);
      }catch{}

      /* levelChange may recalculate the type, so apply the final values once more. */
      setNoneType(typeControl(row,index));
      setZeroExpbase(expbaseControl(row,index));
    }

    try{window.sumExp?.()}catch{}
  }

  try{
    const data=parse(String(window.__TNX_TRANSFER_TSV__||""));
    for(const delay of [450,1000,2200,4500,8000]){
      await wait(delay);
      await repairSeparators(data);
    }
  }catch(error){
    console.error("TNX style-separator transfer repair failed",error);
  }
})();
