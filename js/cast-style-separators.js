/* Render stored style-skill separator markers as full-width headings. */
(()=>{
  const MARKER="[[STYLE_SEPARATOR]]";
  const root=document.querySelector("#cast-content")||document.body;

  function decorate(){
    document.querySelectorAll("#style-skill-panel .style-skill-view-table tbody tr").forEach(row=>{
      if(row.dataset.styleSeparatorPublic==="1")return;
      const description=row.querySelector(".style-description-expandable")?.value||"";
      if(!String(description).startsWith(MARKER))return;

      const label=row.querySelector('.style-view-cell--name .style-field-scroll')?.value?.trim()||"スタイル技能";
      const cell=document.createElement("td");
      cell.colSpan=16;
      cell.innerHTML=`<span class="style-skill-public-separator__label"></span><small>STYLE SECTION</small>`;
      cell.querySelector(".style-skill-public-separator__label").textContent=label;
      row.replaceChildren(cell);
      row.className="style-skill-public-separator";
      row.dataset.styleSeparatorPublic="1";
    });
  }

  new MutationObserver(decorate).observe(root,{childList:true,subtree:true});
  decorate();
})();
