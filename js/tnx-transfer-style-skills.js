(()=>{
  const common=window.TNXTransferRepairCommon;
  if(!common)throw new Error("TNX transfer common utilities are not loaded.");
  const {records,clean,setById,ensureRows,rowIndex,notify}=common;
  const MARKER="[[STYLE_SEPARATOR]]";

  function expbase(kind){
    const value=clean(kind).toLowerCase();
    if(["secret","秘技"].includes(value))return"20";
    if(["ultimate","奥義"].includes(value))return"50";
    if(["none","direction","演出","なし"].includes(value))return"0";
    return"10";
  }

  async function repairStyleSkills(data){
    const list=records(data.style_skill||{});
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
      for(const [source,target] of Object.entries(fields))setById(`${prefix}.${index}.${target}`,record[source]??"");
      setById(`${prefix}.${index}.expbase`,expbase(record.kind));
      for(const field of Object.keys(common.SUITS))await common.setLegacySuit(prefix,index,field,record[field]);
      try{
        const level=document.getElementById(`${prefix}.${index}.level`);
        if(level&&typeof window.levelChange==="function")window.levelChange(level);
      }catch{}
    }
  }

  function isSeparator(record){
    return String(record?.description||"").includes(MARKER);
  }

  function setLevelZero(row,index){
    const level=document.getElementById(`superhumanskills.${index}.level`)
      ||row?.querySelector('input[id$=".level"],input[name$=".level"],input[name*="level"]');
    if(!level)return false;
    level.value="0";
    level.setAttribute("value","0");
    notify(level);
    try{if(typeof window.levelChange==="function")window.levelChange(level)}catch{}
    level.value="0";
    level.setAttribute("value","0");
    notify(level);
    return true;
  }

  async function repairStyleSeparators(data){
    const list=records(data.style_skill||{});
    if(!list.length)return;
    const rows=await ensureRows("superhumanskills",list.length);
    for(let position=0;position<list.length;position++){
      if(!isSeparator(list[position]))continue;
      const row=rows[position];
      if(row)setLevelZero(row,rowIndex(row,"superhumanskills",position));
    }
    try{window.sumExp?.()}catch{}
  }

  window.TNXTransferRepairs.repairStyleSkills=repairStyleSkills;
  window.TNXTransferRepairs.repairStyleSeparators=repairStyleSeparators;
})();