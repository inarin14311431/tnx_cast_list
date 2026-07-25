(()=>{
  const source=document.querySelector("#legacy-import-json");
  const apply=document.querySelector("#legacy-import-apply");
  const message=document.querySelector("#legacy-import-message");
  if(!source||!apply)return;

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

  apply.addEventListener("click",()=>{
    const repaired=repairJsonStringControls(source.value);
    if(repaired===source.value)return;
    source.value=repaired;
    if(message)message.textContent="JSON内の改行コードを修復して取り込みます…";
  },true);

  if(message){
    new MutationObserver(()=>{
      if(message.textContent.includes("旧キャラシ"))message.textContent=message.textContent.replaceAll("旧キャラシ","キャラシ倉庫");
      if(message.textContent.includes("旧サイト"))message.textContent=message.textContent.replaceAll("旧サイト","キャラシ倉庫");
    }).observe(message,{childList:true,subtree:true,characterData:true});
  }
})();
