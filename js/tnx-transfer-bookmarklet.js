(async()=>{
  const load=src=>new Promise((resolve,reject)=>{
    const script=document.createElement("script");
    script.src=src;
    script.onload=()=>{script.remove();resolve()};
    script.onerror=()=>{script.remove();reject(new Error(`転記スクリプトを読み込めませんでした: ${src}`))};
    document.documentElement.append(script);
  });

  const preserveGeneralSkillNames=()=>{
    const saved={};
    for(const prefix of ["skills1","skills2"]){
      document.querySelectorAll(`#${prefix} input[id$=".name"], #${prefix} textarea[id$=".name"]`).forEach(element=>{
        saved[element.id]=element.value;
      });
    }
    return saved;
  };

  const restoreGeneralSkillNames=saved=>{
    for(const [id,value] of Object.entries(saved||{})){
      const element=document.getElementById(id);
      if(!element)continue;
      element.value=value;
      element.setAttribute("value",value);
      element.dispatchEvent(new Event("input",{bubbles:true}));
      element.dispatchEvent(new Event("change",{bubbles:true}));
      try{window.jQuery?.(element).trigger("input").trigger("change")}catch{}
    }
  };

  try{
    let transferText=String(window.__TNX_TRANSFER_TSV__||"");
    if(!transferText){
      try{
        transferText=await navigator.clipboard.readText();
      }catch{
        transferText=prompt("転記TSVを貼り付けてください。","")||"";
      }
    }
    if(!transferText.startsWith("TNX_CAST_TRANSFER_TSV\t")){
      throw new Error("転記TSVを取得できませんでした。先にキャスト画面の「転記TSV」を押してください。");
    }

    window.__TNX_TRANSFER_TSV__=transferText;
    window.__TNX_GENERAL_SKILL_NAMES__=preserveGeneralSkillNames();

    /* Both the main importer and repair passes read exactly the same payload. */
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
    await load(`https://inarin14311431.github.io/tnx_cast_list/js/tnx-transfer-bookmarklet-fixes.js?t=${Date.now()}`);
    await load(`https://inarin14311431.github.io/tnx_cast_list/js/tnx-transfer-bookmarklet-fixes-v3.js?t=${Date.now()}`);

    /* The original sheet has fixed general-skill names. Restore only those
       names after every delayed import pass; levels and suits remain imported. */
    for(const delay of [100,500,1200,2500,5000,9000]){
      window.setTimeout(()=>restoreGeneralSkillNames(window.__TNX_GENERAL_SKILL_NAMES__),delay);
    }

    if(overridden&&clipboard&&originalReadText){
      window.setTimeout(()=>{
        try{Object.defineProperty(clipboard,"readText",{configurable:true,value:originalReadText})}catch{}
      },18000);
    }
  }catch(error){
    console.error("TNX transfer loader failed",error);
    alert(`転記スクリプトの読込に失敗しました。\n${error.message}`);
  }
})();
