(async()=>{
  const FORMAT="TNX_CAST_TRANSFER_TSV";
  const FRAGMENT_PREFIX="#tnxcast=";
  const TARGET_HOST="character-sheets.appspot.com";
  const TARGET_PATH="/tnx/edit.html";
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

  function transferError(message){
    return Object.assign(new Error(message),{userFacing:true});
  }

  // Remove the payload from the address bar before anything else can fail.
  function takeFragment(){
    if(!location.hash.startsWith(FRAGMENT_PREFIX))return "";
    const fragment=location.hash;
    try{history.replaceState(history.state,"",location.pathname+location.search)}catch{}
    return fragment;
  }

  // Empty on the blank page that registers a new sheet.
  function pageKey(){
    return new URLSearchParams(location.search).get("key")||"";
  }

  async function readFragment(fragment){
    let module;
    try{module=await import(localResource("transfer-fragment.js"))}
    catch{throw transferError("転記スクリプトを読み込めませんでした。入力していません。\nCAST ARCHIVEの転記ボタンから開き直してください。")}
    let payload;
    try{payload=await module.decodeTransferFragment(fragment)}
    catch(error){throw transferError(`${error?.userMessage||"転記データを読み取れませんでした。"}入力していません。\nCAST ARCHIVEの転記ボタンから開き直してください。`)}
    if(payload.key!==pageKey()){
      throw transferError("転記データと、開いているシートが一致しません。入力していません。\nCAST ARCHIVEの転記ボタンから開き直してください。");
    }
    return payload.tsv;
  }

  async function readClipboardTransfer(){
    let text="";
    try{text=await navigator.clipboard.readText()}
    catch{text=prompt("転記TSVを貼り付けてください。","")||""}
    if(!text.startsWith(`${FORMAT}\t`)){
      throw transferError("転記データがありません。CAST ARCHIVEの転記ボタンから開き直してください。");
    }
    const name=text.match(/^TNX_CAST_TRANSFER_TSV\t[^\t]*\tbase\t0\tname\t([^\r\n]*)/m)?.[1]||"名称不明";
    if(!confirm(`クリップボードの転記データ「${name}」を、このシートに入力しますか？`))return null;
    return text;
  }

  // The editor fills its form over AJAX; writing before that finishes would be overwritten.
  async function waitForSheetLoaded(){
    if(!pageKey()||!("originData" in window))return;
    for(let attempt=0;attempt<150;attempt++){
      if(window.originData!=null)return;
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    throw transferError("シートの読み込みが終わりません。入力していません。\nCAST ARCHIVEの転記ボタンから開き直してください。");
  }

  function showProgress(message){
    const panel=document.createElement("div");
    panel.id="tnx-transfer-progress";
    panel.setAttribute("role","status");
    panel.textContent=message;
    panel.style.cssText="position:fixed;z-index:2147483647;top:12px;left:50%;transform:translateX(-50%);padding:10px 18px;border-radius:6px;background:CanvasText;color:Canvas;font:14px/1.5 sans-serif";
    document.body.append(panel);
    return panel;
  }

  // Every writer dispatches input events, so the distinct targets are the fields that were filled.
  function trackFilledFields(){
    const fields=new Set();
    const onInput=event=>{
      if(event.target instanceof Element&&event.target.matches("input,select,textarea"))fields.add(event.target);
    };
    document.addEventListener("input",onInput,true);
    return {
      stop:()=>document.removeEventListener("input",onInput,true),
      count:()=>[...fields].filter(field=>field.isConnected&&String(field.value??"")!=="").length
    };
  }

  // Resolves after the last delayed repair, so completion is not reported early.
  function startResponsibilityRepairs(data){
    const common=window.TNXTransferRepairCommon;
    const repairs=window.TNXTransferRepairs;
    if(!common||!repairs)throw new Error("転記補正モジュールを初期化できませんでした。");

    const exact=(async()=>{
      for(const delay of [250,700,1400,2800,5200]){
        await common.wait(delay);
        await repairs.repairSocialConnection(data);
        await repairs.repairStyleSkills(data);
        try{window.sumExp?.()}catch{}
        document.dispatchEvent(new Event("input",{bubbles:true}));
        document.dispatchEvent(new Event("change",{bubbles:true}));
      }
    })();

    const general=(async()=>{
      for(const delay of [350,900,1800,3400,6000]){
        await common.wait(delay);
        await repairs.repairGeneralSkills(data);
      }
    })();

    const separators=[450,1000,2200,4500,8000,11000,12500].map(async delay=>{
      await common.wait(delay);
      await repairs.repairStyleSeparators(data);
    });

    return Promise.all([exact,general,...separators]);
  }

  if(location.hostname!==TARGET_HOST||!location.pathname.endsWith(TARGET_PATH)){
    alert("このブックマークレットはトーキョーN◎VAキャラクターシート編集画面で実行してください。");
    return;
  }
  if(window.__TNX_TRANSFER_RUNNING__){
    alert("転記中です。完了の表示が出るまでお待ちください。");
    return;
  }
  window.__TNX_TRANSFER_RUNNING__=true;

  let progress=null;
  let tracker=null;
  try{
    const fragment=takeFragment();
    let transferText=fragment
      ?await readFragment(fragment)
      :String(window.__TNX_TRANSFER_TSV__||"")||await readClipboardTransfer();
    if(transferText===null)return;
    transferText=normalizeStyleSeparatorLevels(transferText);
    if(!transferText.startsWith(`${FORMAT}\t`)||countTransferRows(transferText)<=1){
      throw transferError("転記データに中身がありません。入力していません。\nCAST ARCHIVEの転記ボタンから開き直してください。");
    }

    progress=showProgress("転記中です。完了の表示が出るまで保存しないでください。");
    await waitForSheetLoaded();
    window.__TNX_TRANSFER_TSV__=transferText;

    await load(localResource("tnx-transfer-base.js"));
    await load(localResource("tnx-transfer-common.js"));
    await load(localResource("tnx-transfer-social-connection.js"));
    await load(localResource("tnx-transfer-style-skills.js"));
    await load(localResource("tnx-transfer-general-skills.js"));

    tracker=trackFilledFields();
    const results=await window.TNXTransferBase.run(transferText);
    await load(localResource("tnx-transfer-bookmarklet-fixes.js"));
    await load(localResource("tnx-transfer-handle-repair.js"));
    await Promise.all([
      window.TNXTransferFixesDone,
      window.TNXTransferHandleDone,
      startResponsibilityRepairs(window.TNXTransferRepairCommon.parse(transferText))
    ]);

    progress.remove();
    const missing=results.missing?`\n（入力先が見つからなかった項目：${results.missing}件）`:"";
    const note=pageKey()
      ?"別のシートとして残すときは「コピーして登録」を押してください（リストに載せない状態で登録されます）。"
      :"登録後に表示されるページのURLを、CAST ARCHIVEの倉庫URL欄に保存してください。次から更新転記になります。";
    alert(`${tracker.count()}項目を入力しました。保存してください。\n\n${note}${missing}`);
  }catch(error){
    console.error("TNX transfer failed",error);
    alert(error?.userFacing?error.message:`転記に失敗しました。保存せずに開き直してください。\n${error?.message||error}`);
  }finally{
    progress?.remove();
    tracker?.stop();
    delete window.__TNX_TRANSFER_TSV__;
    window.__TNX_TRANSFER_RUNNING__=false;
  }
})();
