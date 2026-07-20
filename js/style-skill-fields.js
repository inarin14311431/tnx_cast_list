/* Restore the full style-skill editor fields used by the original sheet. */
(function(){
  const PREFIX="@@TNX_STYLE_DETAIL_V1@@";
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

  function rebuildHeader(table){
    const row=table.querySelector("thead tr");
    if(!row||row.dataset.fullStyleFields==="1")return;
    const suitHeads=SUITS.map(([key,mark])=>`<th class="suit-col style-suit-head style-suit-head--${key}" title="${key}">${mark}</th>`).join("");
    row.innerHTML=`<th class="name-col">名称</th><th class="type-col">種別</th><th class="lv-col">レベル</th>${suitHeads}${FIELDS.map(([key,label])=>`<th class="style-field-head style-field-head--${key}">${label}</th>`).join("")}<th class="delete-col"></th>`;
    row.dataset.fullStyleFields="1";
  }

  function rebuildRow(row){
    if(row.dataset.fullStyleFields==="1")return;
    const nameCell=row.children[0];
    const typeCell=row.children[1];
    const levelCell=row.children[2];
    const suitCells=[...row.querySelectorAll(":scope > .suit-cell")];
    const original=row.querySelector('textarea[data-f="description"]');
    const deleteCell=row.lastElementChild;
    if(!nameCell||!typeCell||!levelCell||suitCells.length!==4||!original||!deleteCell)return;

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

    cells.push(deleteCell);
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
    queue();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});
  else initialize();
})();