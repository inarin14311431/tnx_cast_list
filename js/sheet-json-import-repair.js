(()=>{
  const source=document.querySelector("#legacy-import-json");
  const apply=document.querySelector("#legacy-import-apply");
  const message=document.querySelector("#legacy-import-message");
  const styleRoot=document.querySelector("#style-skills");
  if(!source||!apply)return;

  let pendingStyleNames=[];
  let syncTimers=[];

  const normalizeLineBreaks=value=>String(value??"")
    .replace(/\r\n?/g,"\n")
    .replace(/\\r\\n|\\n|\\r/g,"\n");
  const compact=value=>normalizeLineBreaks(value).replace(/\s+/g,"");
  const cleanName=value=>normalizeLineBreaks(value)
    .trim()
    .replace(/^[★†※■┗]+\s*/,"")
    .replace(/Ｎ◎ＶＡ/g,"N◎VA");
  const number=value=>{
    const match=String(value??"").match(/-?\d+/);
    return match?Number(match[0]):0;
  };
  const truth=value=>{
    if(value===true)return true;
    if(value===false||value===null||value===undefined)return false;
    return !["","0","false","off","no","null","undefined"].includes(String(value).trim().toLowerCase());
  };

  function repairJsonStringControls(value){
    const text=String(value??"");
    let output="";
    let inString=false;
    let escaped=false;

    for(const character of text){
      if(!inString){
        output+=character;
        if(character==='"')inString=true;
        continue;
      }
      if(escaped){
        output+=character;
        escaped=false;
        continue;
      }
      if(character==='\\'){
        output+=character;
        escaped=true;
        continue;
      }
      if(character==='"'){
        output+=character;
        inString=false;
        continue;
      }
      if(character==='\n')output+='\\n';
      else if(character==='\r')output+='\\r';
      else if(character==='\t')output+='\\t';
      else if(character.charCodeAt(0)<0x20)output+=`\\u${character.charCodeAt(0).toString(16).padStart(4,"0")}`;
      else output+=character;
    }
    return output;
  }

  function fieldValue(field){
    const type=String(field?.type||"").toLowerCase();
    if(type==="checkbox"||type==="radio")return field.checked?(field.value??true):false;
    return field?.value??"";
  }

  function extractFieldStyleRows(data){
    const grouped=new Map();
    for(const field of Array.isArray(data?.fields)?data.fields:[]){
      const path=String(field.path||field.id||field.name||"");
      const match=path.match(/^(?:superhumanskills|styleskills|styleSkills)\.([^.]+)\.(name|level|lv|s|c|h|d|reason|passion|life|mundane)$/i);
      if(!match)continue;
      const [,index,key]=match;
      if(!grouped.has(index))grouped.set(index,{});
      grouped.get(index)[key.toLowerCase()]=fieldValue(field);
    }
    return [...grouped.entries()]
      .sort(([a],[b])=>{
        const an=Number(a),bn=Number(b);
        return Number.isFinite(an)&&Number.isFinite(bn)?an-bn:String(a).localeCompare(String(b),"ja");
      })
      .map(([,row])=>row);
  }

  function extractRawStyleRows(data){
    const raw=data?.superhumanskills??data?.styleskills??data?.styleSkills;
    if(Array.isArray(raw))return raw;
    if(raw&&typeof raw==="object")return Object.entries(raw)
      .sort(([a],[b])=>Number(a)-Number(b))
      .map(([,row])=>row);
    return [];
  }

  function importedLevel(row){
    const suits=["s","c","h","d","reason","passion","life","mundane"]
      .filter(key=>truth(row?.[key])).length;
    return Math.max(0,number(row?.level??row?.lv),suits);
  }

  function extractStyleNames(data){
    const rows=extractFieldStyleRows(data);
    const sourceRows=rows.length?rows:extractRawStyleRows(data);
    return sourceRows
      .filter(row=>{
        const raw=String(row?.name??"");
        return raw.trim()&&!raw.trim().startsWith("■")&&importedLevel(row)>0;
      })
      .map(row=>cleanName(row.name))
      .filter(Boolean);
  }

  function ensureTextarea(field){
    if(field instanceof HTMLTextAreaElement)return field;
    if(!(field instanceof HTMLInputElement))return null;
    const textarea=document.createElement("textarea");
    for(const attribute of [...field.attributes]){
      if(attribute.name==="type"||attribute.name==="value")continue;
      textarea.setAttribute(attribute.name,attribute.value);
    }
    textarea.rows=1;
    textarea.value=field.value;
    textarea.oninput=field.oninput;
    textarea.onchange=field.onchange;
    field.replaceWith(textarea);
    return textarea;
  }

  function fitTextarea(field){
    if(!(field instanceof HTMLTextAreaElement))return;
    field.style.height="auto";
    field.style.height=`${Math.max(36,field.scrollHeight+2)}px`;
  }

  function removeUnexpectedDuplicates(){
    if(!styleRoot||!pendingStyleNames.length)return;
    const remaining=new Map();
    for(const name of pendingStyleNames){
      const key=compact(name);
      remaining.set(key,(remaining.get(key)||0)+1);
    }
    for(const row of [...styleRoot.querySelectorAll("tr[data-skill-key]")]){
      const key=compact(row.querySelector('[data-f="name"]')?.value);
      if(!key)continue;
      const count=remaining.get(key)||0;
      if(count>0){
        remaining.set(key,count-1);
        continue;
      }
      row.querySelector("[data-delete-skill]")?.click();
    }
  }

  function syncImportedStyleNames(){
    if(!pendingStyleNames.length||!styleRoot||window.__tnxLegacyImportInProgress)return;
    const rows=[...styleRoot.querySelectorAll("tr[data-skill-key]")];
    if(!rows.length)return;
    const unused=new Set(rows);

    for(const [index,name] of pendingStyleNames.entries()){
      const wanted=compact(name);
      let row=[...unused].find(candidate=>compact(candidate.querySelector('[data-f="name"]')?.value)===wanted);
      if(!row)row=[...unused].find(candidate=>!compact(candidate.querySelector('[data-f="name"]')?.value));
      if(!row)row=[...unused][index]||[...unused][0];
      if(!row)continue;
      unused.delete(row);

      const field=ensureTextarea(row.querySelector('[data-f="name"]'));
      if(!field)continue;
      const normalized=normalizeLineBreaks(name);
      if(field.value!==normalized){
        field.value=normalized;
        field.dispatchEvent(new Event("input",{bubbles:true}));
        field.dispatchEvent(new Event("change",{bubbles:true}));
      }
      fitTextarea(field);
    }
    removeUnexpectedDuplicates();
    window.TNXMultilineFields?.enhance?.();
  }

  function clearSyncTimers(){
    for(const timer of syncTimers)clearTimeout(timer);
    syncTimers=[];
  }

  function scheduleCompletedSync(){
    clearSyncTimers();
    for(const delay of [0,80,220,500])syncTimers.push(setTimeout(syncImportedStyleNames,delay));
  }

  apply.addEventListener("click",()=>{
    clearSyncTimers();
    const repaired=repairJsonStringControls(source.value);
    if(repaired!==source.value){
      source.value=repaired;
      if(message)message.textContent="JSON内の改行コードを修復して取り込みます…";
    }
    try{
      pendingStyleNames=extractStyleNames(JSON.parse(source.value));
      window.__tnxLegacyImportInProgress=true;
    }catch{
      pendingStyleNames=[];
      window.__tnxLegacyImportInProgress=false;
    }
  },true);

  if(message){
    new MutationObserver(()=>{
      if(message.textContent.includes("旧キャラシ"))message.textContent=message.textContent.replaceAll("旧キャラシ","キャラシ倉庫");
      if(message.textContent.includes("旧サイト"))message.textContent=message.textContent.replaceAll("旧サイト","キャラシ倉庫");
      if(message.textContent.includes("保存ボタンでDBへ保存してください。")){
        message.textContent=message.textContent.replace(
          "内容を確認し、保存ボタンでDBへ保存してください。",
          "反映内容は約1.2秒後にDBへ自動保存されます。画面上部が「保存済み」になるまでページを閉じないでください。保存ボタンは、必要な場合に今すぐ保存するためにも使用できます。"
        );
        return;
      }
      if(message.textContent.includes("反映しました")){
        window.__tnxLegacyImportInProgress=false;
        scheduleCompletedSync();
      }else if(message.textContent.includes("取込エラー")){
        window.__tnxLegacyImportInProgress=false;
        pendingStyleNames=[];
        clearSyncTimers();
      }
    }).observe(message,{childList:true,subtree:true,characterData:true});
  }
})();