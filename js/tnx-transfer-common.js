(()=>{
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

  function rowIndex(row,prefix,position){
    return row?.id?.startsWith(`${prefix}.`)?row.id.slice(prefix.length+1):String(position);
  }

  async function trimRows(prefix,count){
    const target=Math.max(0,Number(count)||0);
    let rows=tableRows(prefix);
    let guard=0;
    while(rows.length>target&&guard++<100){
      const row=rows[rows.length-1];
      const index=rowIndex(row,prefix,rows.length-1);
      const remove=document.getElementById(`${prefix}.${index}.delete`)
        ||row?.querySelector('[id$=".delete"],button[data-action="delete"],input[type="button"][value="×"]');
      const before=rows.length;
      if(remove){
        try{remove.click()}catch{}
        await frame();
        await wait(30);
      }
      rows=tableRows(prefix);
      if(rows.length>=before){
        row?.remove();
        await frame();
        rows=tableRows(prefix);
      }
      if(rows.length>=before)break;
    }
    return rows;
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

  window.TNXTransferRepairCommon={FORMAT,wait,frame,clean,truth,parse,records,notify,setById,tableRows,trimRows,ensureRows,rowIndex,SUITS,setLegacySuit};
  window.TNXTransferRepairs=window.TNXTransferRepairs||{};
})();
