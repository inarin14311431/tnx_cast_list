/* Keep style-skill name prefixes synchronized with the selected skill kind. */
(function(){
  const STYLE_ROOT="#style-skills";

  function formatter(){
    return window.TNXStyleSkillKinds?.formatName;
  }

  function normalizeRow(row,dispatch=true){
    if(!row?.matches?.(`${STYLE_ROOT} tr[data-skill-key]`))return false;
    const nameInput=row.querySelector('input[data-f="name"]');
    const kindSelect=row.querySelector('select[data-f="skill_kind"]');
    const format=formatter();
    if(!nameInput||!kindSelect||typeof format!=="function")return false;

    const next=format(nameInput.value,kindSelect.value);
    if(next===nameInput.value)return false;
    nameInput.value=next;
    if(dispatch){
      nameInput.dispatchEvent(new Event("input",{bubbles:true}));
      nameInput.dispatchEvent(new Event("change",{bubbles:true}));
    }
    return true;
  }

  function normalizeAll(){
    document.querySelectorAll(`${STYLE_ROOT} tr[data-skill-key]`).forEach(row=>normalizeRow(row));
  }

  function scheduleImportNormalization(){
    [0,40,120,300].forEach(delay=>window.setTimeout(normalizeAll,delay));
  }

  document.addEventListener("input",event=>{
    const kind=event.target.closest?.(`${STYLE_ROOT} select[data-f="skill_kind"]`);
    if(kind)normalizeRow(kind.closest("tr[data-skill-key]"));
  });

  document.addEventListener("change",event=>{
    const kind=event.target.closest?.(`${STYLE_ROOT} select[data-f="skill_kind"]`);
    if(kind){
      normalizeRow(kind.closest("tr[data-skill-key]"));
      return;
    }

    const name=event.target.closest?.(`${STYLE_ROOT} input[data-f="name"]`);
    if(name)normalizeRow(name.closest("tr[data-skill-key]"));
  });

  document.addEventListener("click",event=>{
    if(event.target.closest?.("#save-button")){
      normalizeAll();
      return;
    }

    if(event.target.closest?.("#tsv-apply")&&/SKD/i.test(document.querySelector("#tsv-title")?.textContent||"")){
      scheduleImportNormalization();
    }
  },true);
})();
