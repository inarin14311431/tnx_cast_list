/* Keep style-skill name prefixes synchronized with the selected skill kind. */
(function(){
  const ROOT_SELECTOR="#style-skills";
  const ROW_SELECTOR="tr[data-skill-key]";
  const PREFIXES={secret:"†",ultimate:"※",direction:"＠"};
  const LABEL_KINDS={秘技:"secret",奥義:"ultimate",演出:"direction",通常:"normal",なし:"none"};
  let queued=false;

  function resolveKind(select){
    const value=String(select?.value||"").trim().toLowerCase();
    if(PREFIXES[value]||value==="normal"||value==="none")return value;
    const label=String(select?.selectedOptions?.[0]?.textContent||"").trim();
    return LABEL_KINDS[label]||"normal";
  }

  function formatName(value,kind){
    const text=String(value||"");
    const leading=(text.match(/^[\s　]*/)||[""])[0];
    const base=text.slice(leading.length).replace(/^(?:[†※＠][\s　]*)+/,"");
    if(!base)return "";
    return `${PREFIXES[kind]||""}${base}`;
  }

  function normalizeRow(row,dispatch=true){
    if(!row||!row.closest(ROOT_SELECTOR))return false;
    const nameInput=row.querySelector('input[data-f="name"]');
    const kindSelect=row.querySelector('select[data-f="skill_kind"]');
    if(!nameInput||!kindSelect)return false;

    const next=formatName(nameInput.value,resolveKind(kindSelect));
    if(next===nameInput.value)return false;

    nameInput.value=next;
    if(dispatch){
      nameInput.dispatchEvent(new Event("input",{bubbles:true}));
      nameInput.dispatchEvent(new Event("change",{bubbles:true}));
    }
    return true;
  }

  function bindRow(row){
    const nameInput=row.querySelector('input[data-f="name"]');
    const kindSelect=row.querySelector('select[data-f="skill_kind"]');
    if(!nameInput||!kindSelect)return;

    if(!kindSelect.dataset.prefixSyncBound){
      kindSelect.dataset.prefixSyncBound="1";
      const apply=()=>{
        normalizeRow(row);
        window.setTimeout(()=>normalizeRow(row),0);
      };
      kindSelect.addEventListener("change",apply);
      kindSelect.addEventListener("input",apply);
    }

    if(!nameInput.dataset.prefixSyncBound){
      nameInput.dataset.prefixSyncBound="1";
      nameInput.addEventListener("change",()=>normalizeRow(row));
      nameInput.addEventListener("blur",()=>normalizeRow(row));
    }

    normalizeRow(row);
  }

  function bindAll(){
    const root=document.querySelector(ROOT_SELECTOR);
    if(!root)return;
    root.querySelectorAll(ROW_SELECTOR).forEach(bindRow);
  }

  function queueBind(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{
      queued=false;
      bindAll();
    });
  }

  function scheduleImportNormalization(){
    [0,40,120,300,700].forEach(delay=>window.setTimeout(bindAll,delay));
  }

  function initialize(){
    const root=document.querySelector(ROOT_SELECTOR);
    if(!root){
      window.setTimeout(initialize,100);
      return;
    }

    new MutationObserver(queueBind).observe(root,{childList:true,subtree:true});
    bindAll();
    [80,250,600].forEach(delay=>window.setTimeout(bindAll,delay));
  }

  document.addEventListener("change",event=>{
    const select=event.target;
    if(select?.matches?.('select[data-f="skill_kind"]')&&select.closest(ROOT_SELECTOR)){
      normalizeRow(select.closest(ROW_SELECTOR));
    }
  },true);

  document.addEventListener("click",event=>{
    if(event.target.closest?.("#save-button")){
      bindAll();
      return;
    }
    if(event.target.closest?.("#tsv-apply")&&/SKD/i.test(document.querySelector("#tsv-title")?.textContent||"")){
      scheduleImportNormalization();
    }
    if(event.target.closest?.("#legacy-import-apply"))scheduleImportNormalization();
  },true);

  window.TNXStyleSkillPrefixes={formatName,normalizeRow,normalizeAll:bindAll};

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});
  else initialize();
})();
