/* Sheet editor helper features.
 * Keeps only presentation helpers. DB persistence is handled by sheet.js,
 * and experience calculation is handled by experience.js.
 */

initialize();

function initialize(){
  initializeSaveButtonState();
}

function initializeSaveButtonState(){
  const status=document.querySelector("#save-status");
  const button=document.querySelector("#save-button");
  if(!status||!button)return;

  const labels={
    unsaved:["未保存","NOT SAVED"],
    saving:["保存中…","SAVING"],
    saved:["保存済み","SAVED"],
    error:["保存失敗","SAVE ERROR"]
  };

  const sync=()=>{
    const text=status.textContent||"";
    let state="unsaved";
    if(status.classList.contains("error")||/エラー|失敗/.test(text))state="error";
    else if(status.classList.contains("saving")||/保存中|読込中|初期化中/.test(text))state="saving";
    else if(status.classList.contains("saved")||/保存済み/.test(text))state="saved";

    button.classList.remove("is-unsaved","is-saving","is-saved","is-error");
    button.classList.add(`is-${state}`);
    button.dataset.saveState=state;

    const [jp,en]=labels[state];
    button.replaceChildren(document.createTextNode(jp+" "));
    const small=document.createElement("small");
    small.textContent=en;
    button.append(small);
    button.setAttribute("aria-label",jp);
  };

  new MutationObserver(sync).observe(status,{
    attributes:true,
    attributeFilter:["class"],
    childList:true,
    subtree:true,
    characterData:true
  });
  sync();
}
