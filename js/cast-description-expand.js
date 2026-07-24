/* Shared height-only description expansion for public style-skill and outfit tables. */
(function(){
  const BUTTON_SELECTOR=".style-description-toggle-all";
  const FIELD_SELECTOR=".style-description-expandable";
  const OUTFIT_CONTAINER=document.querySelector("#outfit-container");

  function setButtonState(button,expanded){
    if(!button)return;
    button.textContent=expanded?"縮小":"全表示";
    button.setAttribute("aria-pressed",expanded?"true":"false");
    button.setAttribute("aria-label",expanded?"すべての解説を縮小":"すべての解説を表示");
  }

  function resetTableWidth(scope){
    const table=scope?.querySelector(".style-skill-view-table,.cast-outfit-table");
    if(!table)return;
    table.style.removeProperty("min-width");
    table.querySelector("col.style-col-description")?.style.removeProperty("width");
  }

  function collapseDescriptions(scope){
    if(!scope)return;
    resetTableWidth(scope);
    scope.classList.remove("is-description-all-expanded");
    scope.querySelectorAll(FIELD_SELECTOR).forEach(field=>{
      field.classList.remove("is-expanded");
      field.style.removeProperty("height");
      field.scrollTop=0;
      field.scrollLeft=0;
      field.closest("tr")?.classList.remove("is-description-expanded");
    });
    setButtonState(scope.querySelector(BUTTON_SELECTOR),false);
  }

  function expandDescriptions(scope){
    if(!scope)return;
    const fields=[...scope.querySelectorAll(FIELD_SELECTOR)];
    if(!fields.length)return;
    resetTableWidth(scope);
    scope.classList.add("is-description-all-expanded");
    fields.forEach(field=>{
      field.classList.add("is-expanded");
      field.style.setProperty("height","auto","important");
      field.closest("tr")?.classList.add("is-description-expanded");
    });
    requestAnimationFrame(()=>{
      fields.forEach(field=>{
        const height=Math.max(35,field.scrollHeight+2);
        field.style.setProperty("height",`${height}px`,"important");
      });
    });
    setButtonState(scope.querySelector(BUTTON_SELECTOR),true);
  }

  function scopeForButton(button){
    return button.closest(".cast-outfit-section,.style-skill-section-v47,#style-skill-panel");
  }

  document.addEventListener("click",event=>{
    const button=event.target.closest(BUTTON_SELECTOR);
    if(!button)return;
    const scope=scopeForButton(button);
    if(!scope)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if(scope.classList.contains("is-description-all-expanded"))collapseDescriptions(scope);
    else expandDescriptions(scope);
  },true);

  function createOutfitDescriptionField(cell){
    if(cell.querySelector(FIELD_SELECTOR))return;
    const source=cell.querySelector(".cast-outfit-value");
    const text=source?.getAttribute("title")??source?.textContent??"";
    const field=document.createElement("textarea");
    field.className="style-field-scroll style-description-expandable outfit-description-expandable";
    field.rows=1;
    field.wrap="soft";
    field.readOnly=true;
    field.setAttribute("aria-label","解説");
    field.value=text;
    cell.classList.add("style-view-cell","style-view-cell--description");
    cell.replaceChildren(field);
  }

  function enhanceOutfitTable(table){
    if(table.dataset.descriptionToggleReady==="true")return;
    const heading=table.querySelector("thead th.cast-outfit-col--description");
    const cells=[...table.querySelectorAll("tbody td.cast-outfit-col--description")];
    if(!heading||!cells.length)return;

    heading.classList.add("style-description-heading");
    heading.replaceChildren();
    const label=document.createElement("span");
    label.textContent="解説";
    const button=document.createElement("button");
    button.type="button";
    button.className="style-description-toggle-all outfit-description-toggle-all";
    button.textContent="全表示";
    button.setAttribute("aria-pressed","false");
    button.setAttribute("aria-label","すべての解説を表示");
    heading.append(label,button);

    cells.forEach(createOutfitDescriptionField);
    table.dataset.descriptionToggleReady="true";
  }

  function enhanceOutfitTables(root=document){
    root.querySelectorAll?.(".cast-outfit-table").forEach(enhanceOutfitTable);
  }

  enhanceOutfitTables();
  if(OUTFIT_CONTAINER){
    const observer=new MutationObserver(()=>enhanceOutfitTables(OUTFIT_CONTAINER));
    observer.observe(OUTFIT_CONTAINER,{childList:true,subtree:true});
  }
})();