/* Convert persisted style-skill separator records into full-width public rows. */
(()=>{
  const MARKER="[[STYLE_SEPARATOR]]";
  const root=document.querySelector("#skills-container");
  if(!root)return;

  function convert(){
    root.querySelectorAll("tr").forEach(row=>{
      if(row.dataset.publicSeparator==="1")return;
      if(!row.textContent.includes(MARKER))return;
      const cells=[...row.children];
      const title=(cells[0]?.textContent||"スタイル技能").trim();
      row.className="style-skill-public-separator";
      row.dataset.publicSeparator="1";
      row.innerHTML=`<td colspan="99"><span>${escapeHtml(title)}</span><small>STYLE SECTION</small></td>`;
    });
  }
  function escapeHtml(value){return String(value).replace(/[&<>'"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch]));}
  new MutationObserver(convert).observe(root,{childList:true,subtree:true});
  convert();
})();
