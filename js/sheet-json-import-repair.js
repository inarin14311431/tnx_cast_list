(()=>{
  const source=document.querySelector("#legacy-import-json");
  const apply=document.querySelector("#legacy-import-apply");
  const message=document.querySelector("#legacy-import-message");
  if(!source||!apply)return;

  const normalizeImportedLineBreaks=value=>String(value??"")
    .replace(/\r\n?/g,"\n")
    .replace(/\\r\\n|\\n|\\r/g,"\n");

  function replaceStyleNameInput(input,value){
    if(!(input instanceof HTMLInputElement)||!input.matches('#style-skills input[data-f="name"]'))return null;
    const field=document.createElement("textarea");
    for(const attribute of [...input.attributes]){
      if(attribute.name==="type"||attribute.name==="value")continue;
      field.setAttribute(attribute.name,attribute.value);
    }
    field.rows=1;
    field.value=normalizeImportedLineBreaks(value);
    field.oninput=input.oninput;
    field.onchange=input.onchange;
    input.replaceWith(field);

    Object.defineProperty(input,"value",{
      configurable:true,
      get:()=>field.value,
      set:nextValue=>{field.value=normalizeImportedLineBreaks(nextValue);}
    });

    requestAnimationFrame(()=>{
      field.style.height="auto";
      field.style.height=`${Math.max(36,field.scrollHeight+2)}px`;
    });
    return field;
  }

  function installStyleNameValueBridge(){
    if(window.__tnxStyleNameValueBridgeInstalled)return;
    const descriptor=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value");
    if(!descriptor?.get||!descriptor?.set)return;
    window.__tnxStyleNameValueBridgeInstalled=true;
    Object.defineProperty(HTMLInputElement.prototype,"value",{
      configurable:descriptor.configurable,
      enumerable:descriptor.enumerable,
      get:descriptor.get,
      set(value){
        const text=String(value??"");
        if(this.matches?.('#style-skills input[data-f="name"]')&&/(?:\r|\n|\\r|\\n)/.test(text)){
          replaceStyleNameInput(this,text);
          return;
        }
        descriptor.set.call(this,value);
      }
    });
  }

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

  installStyleNameValueBridge();

  apply.addEventListener("click",()=>{
    const repaired=repairJsonStringControls(source.value);
    if(repaired!==source.value){
      source.value=repaired;
      if(message)message.textContent="JSON内の改行コードを修復して取り込みます…";
    }
    window.TNXMultilineFields?.enhance?.();
  },true);

  if(message){
    new MutationObserver(()=>{
      if(message.textContent.includes("旧キャラシ"))message.textContent=message.textContent.replaceAll("旧キャラシ","キャラシ倉庫");
      if(message.textContent.includes("旧サイト"))message.textContent=message.textContent.replaceAll("旧サイト","キャラシ倉庫");
    }).observe(message,{childList:true,subtree:true,characterData:true});
  }
})();
