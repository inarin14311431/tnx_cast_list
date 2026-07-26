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

  function setLevelZero(row,index){
    const level=document.getElementById(`superhumanskills.${index}.level`)
      ||row?.querySelector('input[id$=".level"],input[name$=".level"],input[name*="level"]');
    if(!level)return false;

    level.value="0";
    level.setAttribute("value","0");
    notify(level);

    try{if(typeof window.levelChange==="function")window.levelChange(level)}catch{}

    /* levelChange may restore a previous value, so zero it once more without touching type. */
    level.value="0";
    level.setAttribute("value","0");
    notify(level);
    return true;
  }

  async function repairSeparators(data){
    const list=records(data.style_skill||{});
    if(!list.length)return;
    const rows=await ensureRows(list.length);

    for(let position=0;position<list.length;position++){
      if(!isSeparator(list[position]))continue;
      const row=rows[position];
      if(!row)continue;
      setLevelZero(row,rowIndex(row,position));
    }

    try{window.sumExp?.()}catch{}
  }

  try{
    const data=parse(String(window.__TNX_TRANSFER_TSV__||""));
    /* The existing level-writing repair loop finishes at about 10.35 seconds. */
    for(const delay of [450,1000,2200,4500,8000,11000,12500]){
      window.setTimeout(()=>{
        repairSeparators(data).catch(error=>console.error("TNX style-separator level-zero repair failed",error));
      },delay);
    }
  }catch(error){
    console.error("TNX style-separator level-zero repair failed",error);
  }
})();
