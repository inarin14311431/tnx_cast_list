/* Sheet editor helper features.
 * Keeps only presentation helpers. Draft persistence and experience
 * calculation are handled elsewhere and must not be duplicated here.
 */

initialize();

function initialize(){
  initializeSaveButtonState();
  initializeSkillDetails();
  initializeEmptyStyleSkills();
  initializeOutfitDescriptions();
}

function initializeSaveButtonState(){
  const status=document.querySelector("#save-status");
  const button=document.querySelector("#save-button");
  if(!status||!button)return;

  const sync=()=>{
    const text=status.textContent||"";
    let state="unsaved";
    if(status.classList.contains("error")||/エラー|失敗/.test(text))state="error";
    else if(status.classList.contains("saving")||/保存中|読込中|初期化中/.test(text))state="saving";
    else if(status.classList.contains("saved")||/保存済み/.test(text))state="saved";

    button.classList.remove("is-unsaved","is-saving","is-saved","is-error");
    button.classList.add(`is-${state}`);
    button.dataset.saveState=state;
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

function initializeSkillDetails(){
  const area=document.querySelector("#style-skills");
  if(!area)return;
  let queued=false;
  const refresh=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;fixStyleDetails();});};
  new MutationObserver(refresh).observe(area,{childList:true,subtree:true});
  refresh();
}

function fixStyleDetails(){
  document.querySelectorAll('#style-skills tr[data-skill-key]').forEach(row=>{
    const textarea=row.querySelector('textarea[data-f="description"]');
    if(!textarea)return;
    textarea.placeholder="タイミング、対象、射程、目標値、対決、解説など";
  });
}

function initializeEmptyStyleSkills(){
  const area=document.querySelector("#style-skills");
  const addButton=document.querySelector("#add-style-skill");
  if(!area||!addButton)return;
  let queued=false;
  const refresh=()=>{
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{
      queued=false;
      ensureEmptyStyleTable(area);
    });
  };
  new MutationObserver(refresh).observe(area,{childList:true,subtree:true});
  addButton.addEventListener("click",()=>{
    requestAnimationFrame(()=>{
      requestAnimationFrame(()=>{
        const rows=area.querySelectorAll('tr[data-skill-key]');
        rows[rows.length-1]?.querySelector('[data-f="name"]')?.focus();
        ensureEmptyStyleTable(area);
      });
    });
  });
  refresh();
}

function ensureEmptyStyleTable(area){
  if(area.querySelector('tr[data-skill-key]'))return;
  if(area.querySelector('.style-skill-empty-table'))return;
  area.innerHTML=`<section class="skill-group style-skill-empty-table"><h3 class="skill-group-title">スタイル技能 <small>STYLE SKILLS</small></h3><div class="skill-table-scroll"><table class="skill-table has-detail"><thead><tr><th class="name-col">名称</th><th class="type-col">種別</th><th class="lv-col">LV</th><th class="suit-col">♠</th><th class="suit-col">♣</th><th class="suit-col">♥</th><th class="suit-col">♦</th><th class="detail-col">詳細</th><th class="delete-col"></th></tr></thead><tbody><tr class="style-skill-empty-row"><td colspan="9">スタイル技能は未登録です。「スタイル技能を追加」から入力できます。</td></tr></tbody></table></div></section>`;
}

function initializeOutfitDescriptions(){
  const list=document.querySelector("#outfit-list");
  if(!list)return;
  let queued=false;
  const refresh=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;fixOutfitDescriptions();});};
  new MutationObserver(refresh).observe(list,{childList:true,subtree:true});
  refresh();
}

function fixOutfitDescriptions(){
  document.querySelectorAll('#outfit-list .outfit-form').forEach(card=>{
    const fields=card.querySelector('.outfit-fields');
    if(!fields)return;
    const descriptions=[...fields.querySelectorAll('[data-o="description"]')];
    if(!descriptions.length)return;
    const first=descriptions[0];
    for(const duplicate of descriptions.slice(1))duplicate.closest('label')?.remove();
    if(first.tagName==='TEXTAREA'){
      first.rows=3;
      first.closest('label')?.classList.add('outfit-wide');
      return;
    }
    const textarea=document.createElement('textarea');
    textarea.dataset.o='description';
    textarea.rows=3;
    textarea.value=first.value;
    textarea.addEventListener('input',()=>{
      first.value=textarea.value;
      first.dispatchEvent(new Event('input',{bubbles:true}));
    });
    first.hidden=true;
    first.removeAttribute('data-o');
    first.after(textarea);
    first.closest('label')?.classList.add('outfit-wide');
  });
}
