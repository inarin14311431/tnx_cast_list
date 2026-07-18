const PREFIX="@@TNX_STYLE_DETAIL_V1@@";
const FIELDS=[
  ["skill","技能"],["limit","上限"],["timing","タイミング"],["target","対象"],["range","射程"],
  ["difficulty","目標値"],["confrontation","対決"],["description","解説"],["page","参照P"]
];
const root=document.querySelector("#style-skills");
if(root){
  const parse=value=>{
    const text=String(value||"");
    if(text.startsWith(PREFIX)){
      try{return {...Object.fromEntries(FIELDS.map(([key])=>[key,""])),...JSON.parse(text.slice(PREFIX.length).trim())};}catch{}
    }
    const data=Object.fromEntries(FIELDS.map(([key])=>[key,""]));
    const labels={"技能":"skill","上限":"limit","タイミング":"timing","対象":"target","射程":"range","目標値":"difficulty","対決":"confrontation","参照P":"page"};
    const remain=[];
    for(const line of text.split(/\r?\n/)){
      const match=line.match(/^([^：:]+)[：:]\s*(.*)$/);
      const key=match&&labels[match[1].trim()];
      if(key)data[key]=match[2];else remain.push(line);
    }
    data.description=remain.join("\n").trim();
    return data;
  };
  const encode=data=>PREFIX+"\n"+JSON.stringify(data);
  const esc=value=>String(value??"").replace(/[&<>\"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]));
  function enhance(){
    const table=root.querySelector("table.skill-table.has-detail");
    if(!table)return;
    const header=table.querySelector("thead tr");
    if(header&&!header.dataset.detailV32){
      const cells=[...header.children];
      const detail=cells[cells.length-2];
      if(detail){detail.remove();const end=header.lastElementChild;for(const [,label] of FIELDS){const th=document.createElement("th");th.textContent=label;th.className="style-detail-col style-detail-col--"+label;header.insertBefore(th,end);}}
      header.dataset.detailV32="1";
    }
    table.querySelectorAll("tbody tr[data-skill-key]").forEach(row=>{
      if(row.dataset.detailV32)return;
      const original=row.querySelector('textarea[data-f="description"]');
      if(!original)return;
      const sourceCell=original.closest("td");
      const deleteCell=row.lastElementChild;
      const data=parse(original.value);
      sourceCell.remove();
      FIELDS.forEach(([key,label])=>{
        const td=document.createElement("td");
        td.className="style-detail-cell style-detail-cell--"+key;
        const control=key==="description"?document.createElement("textarea"):document.createElement("input");
        control.dataset.styleDetail=key;
        control.setAttribute("aria-label",label);
        control.value=data[key]||"";
        if(control.tagName==="TEXTAREA")control.rows=3;
        control.addEventListener("input",()=>{
          const values={};row.querySelectorAll("[data-style-detail]").forEach(el=>values[el.dataset.styleDetail]=el.value);
          original.value=encode(values);
          original.dispatchEvent(new Event("input",{bubbles:true}));
        });
        td.append(control);
        if(key==="description"){original.hidden=true;original.tabIndex=-1;td.append(original);}
        row.insertBefore(td,deleteCell);
      });
      row.dataset.detailV32="1";
    });
  }
  let queued=false;
  const queue=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhance();});};
  new MutationObserver(queue).observe(root,{childList:true,subtree:true});
  queue();
}
export {PREFIX,FIELDS};