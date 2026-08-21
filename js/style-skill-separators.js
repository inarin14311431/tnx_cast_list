/* Divider rows are rendered natively by sheet.js. This file only owns the add button. */
(()=>{
  function initializeStyleSkillSeparators(){
    const toolbar=document.querySelector("#add-style-skill")?.closest(".toolbar");
    if(!toolbar||toolbar.dataset.styleSkillSeparatorsInitialized==="1")return;
    toolbar.dataset.styleSkillSeparatorsInitialized="1";

    let button=document.querySelector("#add-style-separator");
    if(!button){
      button=document.createElement("button");
      button.id="add-style-separator";
      button.type="button";
      button.className="skill-inline-add style-separator-add";
      button.innerHTML="区切りを追加<small>ADD DIVIDER</small>";
      toolbar.append(button);
    }
    toolbar.classList.add("has-style-divider");
    button.onclick=()=>window.TNXSheetEditor?.addStyleSeparator?.();
  }

  initializeStyleSkillSeparators();
})();
