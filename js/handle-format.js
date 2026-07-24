/* Shared handle / handle-kana quoting for legacy import and display. */
(()=>{
  const OPEN="“";
  const CLOSE="”";
  const DISPLAY_SELECTORS="#cast-handle,#cast-handle-kana,.owned-cast__handle,.cast-card__handle";
  const PLACEHOLDERS=new Set(["","—","-","NO HANDLE","ハンドル未登録"]);

  const canonicalKey=value=>String(value||"").trim()
    .replace(/\[\s*["']?([^\]"']+)["']?\s*\]/g,".$1")
    .replace(/^[.#]+|[.]$/g,"")
    .replace(/\.{2,}/g,".");

  function stripOuterQuotes(value){
    let text=String(value??"").trim();
    for(let index=0;index<8;index++){
      const match=text.match(/^[\s　]*[“”"「『](.*)[“”"」』][\s　]*$/s);
      if(!match)break;
      const next=String(match[1]??"").trim();
      if(next===text)break;
      text=next;
    }
    return text;
  }

  function quoteHandle(value){
    const text=stripOuterQuotes(value);
    return text?`${OPEN}${text}${CLOSE}`:"";
  }

  function splitQuotedIdentity(value){
    const raw=String(value??"").trim();
    const match=raw.match(/^[\s　]*[“”"「『](.+?)[“”"」』][\s　]*(.*)$/s);
    if(!match)return {handle:"",name:raw};
    return {
      handle:stripOuterQuotes(match[1]),
      name:String(match[2]??"").trim()
    };
  }

  function readPath(object,path){
    if(!object||typeof object!=="object")return undefined;
    if(Object.prototype.hasOwnProperty.call(object,path))return object[path];
    return path.split(".").reduce((value,key)=>value&&typeof value==="object"?value[key]:undefined,object);
  }

  function fieldMap(data){
    const map=new Map();
    for(const field of Array.isArray(data?.fields)?data.fields:[]){
      const type=String(field.type||"").toLowerCase();
      const value=(type==="checkbox"||type==="radio")?(field.checked?(field.value||true):false):(field.value??"");
      for(const source of [field.path,field.id,field.name]){
        const key=canonicalKey(source);
        if(!key)continue;
        const current=map.get(key);
        if(!map.has(key)||(!String(current??"").trim()&&String(value??"").trim()))map.set(key,value);
      }
    }
    return map;
  }

  function lookup(data,map,keys){
    for(const source of keys){
      const key=canonicalKey(source);
      const value=map.has(key)?map.get(key):readPath(data,source);
      if(value!==undefined&&value!==null&&String(value).trim()!=="")return String(value);
    }
    return "";
  }

  function createImportPlan(raw){
    let data;
    try{data=JSON.parse(raw);}catch{return null;}
    if(!data||typeof data!=="object")return null;

    const map=fieldMap(data);
    const nameSource=lookup(data,map,["base.name","name"]);
    const kanaSource=lookup(data,map,["base.nameKana","base.kana","nameKana","kana"]);
    const parsedName=splitQuotedIdentity(nameSource);
    const parsedKana=splitQuotedIdentity(kanaSource);
    const explicitHandle=lookup(data,map,["base.handle","handle"]);
    const explicitHandleKana=lookup(data,map,["base.handleKana","base.handle_kana","handleKana","handle_kana"]);
    const handle=quoteHandle(explicitHandle||parsedName.handle);
    const handleKana=quoteHandle(explicitHandleKana||parsedKana.handle);

    return {
      handle,
      handleKana,
      hasCharacterKana:Boolean(kanaSource),
      characterKana:parsedKana.name
    };
  }

  function setInputValue(selector,value,enabled=true){
    if(!enabled)return;
    const input=document.querySelector(selector);
    if(!input||input.value===String(value??""))return;
    input.value=String(value??"");
    input.dispatchEvent(new Event("input",{bubbles:true}));
    input.dispatchEvent(new Event("change",{bubbles:true}));
  }

  function maintainImportedValues(plan){
    if(!plan)return;
    const deadline=Date.now()+8000;
    const apply=()=>{
      setInputValue("#handle",plan.handle,Boolean(plan.handle));
      setInputValue("#handle-kana",plan.handleKana,Boolean(plan.handleKana));
      setInputValue("#character-kana",plan.characterKana,plan.hasCharacterKana);

      const message=document.querySelector("#legacy-import-message")?.textContent||"";
      const finished=/反映しました|取込エラー/.test(message);
      if(!finished&&Date.now()<deadline)window.setTimeout(apply,80);
    };
    window.setTimeout(apply,0);
  }

  document.addEventListener("click",event=>{
    if(!event.target.closest?.("#legacy-import-apply"))return;
    const raw=document.querySelector("#legacy-import-json")?.value||"";
    maintainImportedValues(createImportPlan(raw));
  },true);

  function normalizeDisplayElement(element){
    if(!element)return;
    const current=String(element.textContent??"").trim();
    if(PLACEHOLDERS.has(current))return;
    const normalized=quoteHandle(current);
    if(normalized&&normalized!==current)element.textContent=normalized;
  }

  function normalizeDisplays(root=document){
    if(root instanceof Element&&root.matches(DISPLAY_SELECTORS))normalizeDisplayElement(root);
    root.querySelectorAll?.(DISPLAY_SELECTORS).forEach(normalizeDisplayElement);
  }

  function initializeDisplayNormalization(){
    normalizeDisplays(document);
    const observer=new MutationObserver(mutations=>{
      for(const mutation of mutations){
        if(mutation.type==="characterData")normalizeDisplayElement(mutation.target.parentElement?.closest?.(DISPLAY_SELECTORS));
        mutation.addedNodes.forEach(node=>{
          if(node.nodeType===Node.ELEMENT_NODE)normalizeDisplays(node);
          else if(node.parentElement)normalizeDisplayElement(node.parentElement.closest?.(DISPLAY_SELECTORS));
        });
      }
    });
    observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  }

  window.TNXHandleFormat={quoteHandle,splitQuotedIdentity};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initializeDisplayNormalization,{once:true});
  else initializeDisplayNormalization();
})();
