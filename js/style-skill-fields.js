/* Restore the full style-skill editor fields used by the original sheet. */
(function(){
  const PREFIX="@@TNX_STYLE_DETAIL_V1@@";
  const SEPARATOR_MARKER="[[STYLE_SEPARATOR]]";
  const SUITS=[
    ["reason","♠"],
    ["passion","♣"],
    ["life","♥"],
    ["mundane","♦"]
  ];
  const FIELDS=[
    ["skill","技能","input"],
    ["limit","上限","input"],
    ["timing","タイミング","input"],
    ["target","対象","input"],
    ["range","射程","input"],
    ["difficulty","目標値","input"],
    ["confrontation","対決","input"],
    ["description","解説","textarea"],
    ["page","参照P","input"]
  ];

  function emptyData(){return Object.fromEntries(FIELDS.map(([key])=>[key,""]));}

  function parse(value){
    const text=String(value||"");
    if(text.startsWith(PREFIX)){
      try{return {...emptyData(),...JSON.parse(text.slice(PREFIX.length).trim())};}catch{}
    }
    const data=emptyData();
    const labels={"技能":"skill","上限":"limit","タイミング":"timing","対象":"target","射程":"range","目標値":"difficulty","対決":"confrontation","参照P":"page"};
    const description=[];
    for(const line of text.split(/\r?\n/)){
      const match=line.match(/^([^：:]+)[：:]\s*(.*)$/);
      const key=match&&labels[match[1].trim()];
      if(key)data[key]=match[2];else description.push(line);
    }
    data.description=description.join("\n").trim();
    return data;
  }

  function encode(data){return PREFIX+"\n"+JSON.stringify(data);}

  function isSeparatorRow(row){
    if(!row)return false;
    if(row.dataset.styleSeparator==="1"||row.classList.contains("style-skill-separator-row"))return true;
    const original=row.querySelector('textarea[data-f="description"]');
    if(!original)return false;
    return String(parse(original.value).description||"").startsWith(SEPARATOR_MARKER);
  }

  function ensureKindOptions(row){
    const select=row.querySelector('select[data-f="skill_kind"]');
    if(!select)return;
    if(isSeparatorRow(row)||select.dataset.styleSeparatorLocked==="1")return;

    const definitions=window.TNXStyleSkillKinds?.definitions||[
      {value:"normal",label:"通常"},{value:"secret",label:"秘技"},{value:"ultimate",label:"奥義"},{value:"direction",label:"演出"}
    ];
    const selected=select.value;
    const current=[...select.options];
    const same=current.length===definitions.length&&current.every((option,index)=>{
      const item=definitions[index];
      return option.value===item.value&&option.textContent===item.label;
    });
    if(!same){
      select.replaceChildren(...definitions.map(item=>{
        const option=document.createElement("option");
        option.value=item.value;
        option.textContent=item.label;
        return option;
      }));
    }
    select.value=definitions.some(item=>item.value===selected)?selected:"normal";
  }

  function rebuildHeader(table){
    const row=table.querySelector("thead tr");
    if(!row||row.dataset.fullStyleFields==="1")return;
    const suitHeads=SUITS.map(([key,mark])=>`<th class="suit-col style-suit-head style-suit-head--${key}" title="${key}">${mark}</th>`).join("");
    row.innerHTML=`<th class="name-col">名称</th><th class="type-col">種別</th><th class="lv-col">レベル</th>${suitHeads}${FIELDS.map(([key,label])=>`<th class="style-field-head style-field-head--${key}">${label}</th>`).join("")}<th class="delete-col"></th>`;
    row.dataset.fullStyleFields="1";
  }

  function syncRowFromOriginal(row){
    if(!row||row.dataset.fullStyleFields!=="1"||isSeparatorRow(row))return false;
    const original=row.querySelector('textarea[data-f="description"]');
    if(!original)return false;
    const data=parse(original.value);
    let synced=false;
    row.querySelectorAll("[data-style-field]").forEach(control=>{
      const key=control.dataset.styleField;
      const next=String(data[key]??"");
      if(control.value!==next)control.value=next;
      synced=true;
    });
    return synced;
  }

  function rebuildRow(row){
    /* A divider must stay in the native row shape until separator.js reduces it
       to its stable two-cell layout. Expanding it to the 17-column skill layout
       is what caused the row to collapse after move-up/move-down rerenders. */
    if(isSeparatorRow(row))return;
    ensureKindOptions(row);
    if(row.dataset.fullStyleFields==="1")return;
    const nameCell=row.children[0];
    const typeCell=row.children[1];
    const levelCell=row.children[2];
    const suitCells=[...row.querySelectorAll(":scope > .suit-cell")];
    const original=row.querySelector('textarea[data-f="description"]');
    const actionCell=row.lastElementChild;
    if(!nameCell||!typeCell||!levelCell||suitCells.length!==4||!original||!actionCell)return;

    suitCells.forEach((cell,index)=>{
      cell.classList.add("style-suit-cell",`style-suit-cell--${SUITS[index][0]}`);
      const checkbox=cell.querySelector('input[type="checkbox"]');
      if(checkbox)checkbox.setAttribute("aria-label",`${SUITS[index][1]}スート`);
    });

    const data=parse(original.value);
    const cells=[nameCell,typeCell,levelCell,...suitCells];
    for(const [key,label,tag] of FIELDS){
      const td=document.createElement("td");
      td.className=`style-field-cell style-field-cell--${key}`;
      const control=document.createElement(tag);
      control.dataset.styleField=key;
      control.setAttribute("aria-label",label);
      control.value=data[key]||"";
      if(tag==="textarea")control.rows=1;
      control.addEventListener("input",()=>{
        const values={};
        row.querySelectorAll("[data-style-field]").forEach(element=>values[element.dataset.styleField]=element.value);
        original.value=encode(values);
        original.dispatchEvent(new Event("input",{bubbles:true}));
      });
      td.append(control);
      if(key==="description"){
        original.hidden=true;
        original.style.display="none";
        original.tabIndex=-1;
        td.append(original);
      }
      cells.push(td);
    }
    cells.push(actionCell);
    row.replaceChildren(...cells);
    row.dataset.fullStyleFields="1";
  }

  function enhance(){
    const root=document.querySelector("#style-skills");
    if(!root)return;
    const table=root.querySelector("table.skill-table");
    if(!table)return;
    table.classList.add("style-skill-full-table");
    rebuildHeader(table);
    table.querySelectorAll("tbody tr[data-skill-key]").forEach(rebuildRow);
  }

  function syncAll(){
    const root=document.querySelector("#style-skills");
    if(!root)return 0;
    let count=0;
    root.querySelectorAll('tbody tr[data-skill-key][data-full-style-fields="1"]').forEach(row=>{
      if(syncRowFromOriginal(row))count++;
    });
    return count;
  }

  function initialize(){
    const root=document.querySelector("#style-skills");
    if(!root){setTimeout(initialize,100);return;}
    let queued=false;
    const queue=()=>{
      if(queued)return;
      queued=true;
      requestAnimationFrame(()=>{queued=false;enhance();});
    };
    new MutationObserver(queue).observe(root,{childList:true,subtree:true});
    root.addEventListener("input",event=>{
      const original=event.target.closest?.('textarea[data-f="description"]');
      if(!original||!root.contains(original))return;
      const row=original.closest('tr[data-skill-key]');
      if(isSeparatorRow(row))return;
      syncRowFromOriginal(row);
    },true);
    queue();
  }

  window.TNXStyleSkillFields={enhance,syncAll,syncRow:syncRowFromOriginal};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});
  else initialize();
})();
