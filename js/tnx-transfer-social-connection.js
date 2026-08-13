(()=>{
  const common=window.TNXTransferRepairCommon;
  if(!common)throw new Error("TNX transfer common utilities are not loaded.");
  const {records,clean,setById,ensureRows,rowIndex,SUITS,setLegacySuit}=common;

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

  async function repairSocialConnection(data){
    await repairNamedSkills("skills3",data.social||{},"社会：");
    await repairNamedSkills("skills4",data.connection||{},"コネ：");
  }

  window.TNXTransferRepairs.repairSocialConnection=repairSocialConnection;
})();