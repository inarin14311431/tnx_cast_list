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

  try{
    let transferText=String(window.__TNX_TRANSFER_TSV__||"");
    if(!transferText){
      try{
        transferText=await navigator.clipboard.readText();
      }catch{
        transferText=prompt("転記TSVを貼り付けてください。","")||"";
      }
    }
    if(!transferText.startsWith(`${FORMAT}\t`)){
      throw new Error("転記TSVを取得できませんでした。先にキャスト画面の「転記TSV」を押してください。");
    }

    transferText=normalizeStyleSeparatorLevels(transferText);
    window.__TNX_TRANSFER_TSV__=transferText;

    /* All import and repair passes read exactly the same normalized payload. */
    const clipboard=navigator.clipboard;
    const originalReadText=clipboard?.readText?.bind(clipboard);
    let overridden=false;
    if(clipboard){
      try{
        Object.defineProperty(clipboard,"readText",{
          configurable:true,
          value:async()=>window.__TNX_TRANSFER_TSV__
        });
        overridden=true;
      }catch{
        try{clipboard.readText=async()=>window.__TNX_TRANSFER_TSV__;overridden=true}catch{}
      }
    }

    await load("https://cdn.jsdelivr.net/gh/inarin14311431/tnx_cast_list@893d5243ca5dedd2f525f23d6a4536f96d9fd772/js/tnx-transfer-bookmarklet.js");
    await load(localResource("tnx-transfer-bookmarklet-fixes.js"));
    await load(localResource("tnx-transfer-bookmarklet-fixes-v3.js"));
    await load(localResource("tnx-transfer-bookmarklet-fixes-v4.js"));
    await load(localResource("tnx-transfer-bookmarklet-fixes-v5.js"));

    if(overridden&&clipboard&&originalReadText){
      window.setTimeout(()=>{
        try{Object.defineProperty(clipboard,"readText",{configurable:true,value:originalReadText})}catch{}
      },20000);
    }
  }catch(error){
    console.error("TNX transfer loader failed",error);
    alert(`転記スクリプトの読込に失敗しました。\n${error.message}`);
  }
})();
