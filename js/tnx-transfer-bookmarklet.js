(async()=>{
  const FORMAT="TNX_CAST_TRANSFER_TSV";
  const STYLE_SEPARATOR_MARKER="[[STYLE_SEPARATOR]]";
  const RESOURCE_BASE=new URL(".",document.currentScript?.src||"https://inarin14311431.github.io/tnx_cast_list/js/tnx-transfer-bookmarklet.js");
  const load=src=>new Promise((resolve,reject)=>{
    const script=document.createElement("script");
    script.src=src;
    script.onload=()=>{script.remove();resolve()};
    script.onerror=()=>{script.remove();reject(new Error(`転記スクリプトを読み込めませんでした: ${src}`))};
    document.documentElement.append(script);
  });
  const localResource=name=>{
    const url=new URL(name,RESOURCE_BASE);
    url.searchParams.set("t",Date.now());
    return url.href;
  };

  function normalizeStyleSeparatorLevels(text){
    const lines=String(text||"").replace(/\r/g,"").split("\n");
    const styleRecords=new Map();
    for(const line of lines){
      const columns=line.split("\t");
      if(columns[0]!==FORMAT||columns[2]!=="style_skill")continue;
      const index=columns[3]||"0";
      const field=columns[4]||"";
      const value=columns.slice(5).join("\t");
      if(!styleRecords.has(index))styleRecords.set(index,{});
      styleRecords.get(index)[field]=value;
    }
    const separatorIndexes=new Set(
      [...styleRecords]
        .filter(([,record])=>String(record.description||"").includes(STYLE_SEPARATOR_MARKER))
        .map(([index])=>index)
    );
    return lines.map(line=>{
      const columns=line.split("\t");
      if(columns[0]!==FORMAT||columns[2]!=="style_skill"||columns[4]!=="level"||!separatorIndexes.has(columns[3]||"0"))return line;
      return [...columns.slice(0,5),"0"].join("\t");
    }).join("\n");
  }

  function countTransferRows(text){
    return String(text||"")
      .replace(/\r/g,"")
      .split("\n")
      .filter(line=>line.startsWith(`${FORMAT}\t`))
      .length;
  }

  function installClipboardBridge(){
    const nativeClipboard=navigator.clipboard;
    const restore=[];
    const bridgeReadText=async()=>String(window.__TNX_TRANSFER_TSV__||"");

    const navigatorDescriptor=Object.getOwnPropertyDescriptor(navigator,"clipboard");
    if(nativeClipboard){
      try{
        const shim=Object.create(nativeClipboard);
        Object.defineProperty(shim,"readText",{configurable:true,value:bridgeReadText});
        Object.defineProperty(navigator,"clipboard",{configurable:true,value:shim});
        restore.push(()=>{
          try{
            if(navigatorDescriptor)Object.defineProperty(navigator,"clipboard",navigatorDescriptor);
            else delete navigator.clipboard;
          }catch{}
        });
        return ()=>restore.reverse().forEach(fn=>fn());
      }catch{}

      const ownDescriptor=Object.getOwnPropertyDescriptor(nativeClipboard,"readText");
      try{
        Object.defineProperty(nativeClipboard,"readText",{configurable:true,value:bridgeReadText});
        restore.push(()=>{
          try{
            if(ownDescriptor)Object.defineProperty(nativeClipboard,"readText",ownDescriptor);
            else delete nativeClipboard.readText;
          }catch{}
        });
        return ()=>restore.reverse().forEach(fn=>fn());
      }catch{}

      const prototype=Object.getPrototypeOf(nativeClipboard);
      const prototypeDescriptor=prototype&&Object.getOwnPropertyDescriptor(prototype,"readText");
      if(prototype&&prototypeDescriptor){
        try{
          Object.defineProperty(prototype,"readText",{
            ...prototypeDescriptor,
            configurable:true,
            value:bridgeReadText
          });
          restore.push(()=>{
            try{Object.defineProperty(prototype,"readText",prototypeDescriptor)}catch{}
          });
          return ()=>restore.reverse().forEach(fn=>fn());
        }catch{}
      }
    }

    return ()=>{};
  }

  function startResponsibilityRepairs(data){
    const common=window.TNXTransferRepairCommon;
    const repairs=window.TNXTransferRepairs;
    if(!common||!repairs)throw new Error("転記補正モジュールを初期化できませんでした。");

    (async()=>{
      for(const delay of [250,700,1400,2800,5200]){
        await common.wait(delay);
        await repairs.repairSocialConnection(data);
        await repairs.repairStyleSkills(data);
        try{window.sumExp?.()}catch{}
        document.dispatchEvent(new Event("input",{bubbles:true}));
        document.dispatchEvent(new Event("change",{bubbles:true}));
      }
    })().catch(error=>console.error("TNX exact transfer repair failed",error));

    (async()=>{
      for(const delay of [350,900,1800,3400,6000]){
        await common.wait(delay);
        await repairs.repairGeneralSkills(data);
      }
    })().catch(error=>console.error("TNX general-skill mapping failed",error));

    for(const delay of [450,1000,2200,4500,8000,11000,12500]){
      window.setTimeout(()=>{
        repairs.repairStyleSeparators(data).catch(error=>console.error("TNX style-separator level-zero repair failed",error));
      },delay);
    }
  }

  try{
    let transferText=String(window.__TNX_TRANSFER_TSV__||"");
    if(!transferText){
      try{transferText=await navigator.clipboard.readText()}
      catch{transferText=prompt("転記TSVを貼り付けてください。","")||""}
    }
    if(!transferText.startsWith(`${FORMAT}\t`)){
      throw new Error("転記TSVを取得できませんでした。先にキャスト画面の「転記TSV」を押してください。");
    }

    transferText=normalizeStyleSeparatorLevels(transferText);
    const transferRows=countTransferRows(transferText);
    if(transferRows<=1){
      throw new Error("転記TSVに実データがありません。スマホ転記画面へ戻り、転記TSVをもう一度コピーしてください。");
    }
    window.__TNX_TRANSFER_TSV__=transferText;

    const restoreClipboard=installClipboardBridge();
    try{
      await load("https://cdn.jsdelivr.net/gh/inarin14311431/tnx_cast_list@893d5243ca5dedd2f525f23d6a4536f96d9fd772/js/tnx-transfer-bookmarklet.js");
      await load(localResource("tnx-transfer-bookmarklet-fixes.js"));
      await load(localResource("tnx-transfer-common.js"));
      await load(localResource("tnx-transfer-social-connection.js"));
      await load(localResource("tnx-transfer-style-skills.js"));
      await load(localResource("tnx-transfer-general-skills.js"));
      await load(localResource("tnx-transfer-handle-repair.js"));

      startResponsibilityRepairs(window.TNXTransferRepairCommon.parse(window.__TNX_TRANSFER_TSV__));
    }finally{
      window.setTimeout(restoreClipboard,20000);
    }
  }catch(error){
    console.error("TNX transfer loader failed",error);
    alert(`転記スクリプトの読込に失敗しました。\n${error.message}`);
  }
})();