(async()=>{
  const FORMAT="TNX_CAST_TRANSFER_TSV";
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const frame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const clean=value=>String(value??"").trim();
  const canonical=value=>clean(value).toLowerCase()
    .replace(/\[\s*["']?([^\]"']+)["']?\s*\]/g,".$1")
    .replace(/^[.#]+|[.]$/g,"")
    .replace(/\.{2,}/g,".");
  const truth=value=>!["","0","false","off","no","null","undefined","□","なし"].includes(clean(value).toLowerCase());
  const unescapeCell=value=>String(value||"").replace(/\\(\\|t|n|r)/g,(_,token)=>token==="\\"?"\\":token==="t"?"\t":token==="n"?"\n":"\r");

  function parse(text){
    const lines=String(text||"").replace(/\r/g,"").split("\n").filter(Boolean);
    const head=lines.shift()?.split("\t")||[];
    if(head[0]!==FORMAT)throw new Error("転記TSVを取得できませんでした。");
    const data={};
    for(const line of lines){
      const columns=line.split("\t");
      if(columns[0]!==FORMAT)continue;
      const section=columns[2]||"";
      const index=columns[3]||"0";
      const field=columns[4]||"";
      data[section]??={};
      data[section][index]??={};
      data[section][index][field]=unescapeCell(columns.slice(5).join("\t"));
    }
    return data;
  }

  let controls=[];
  let map=new Map();
  function refresh(){
    controls=[...document.querySelectorAll("input,select,textarea")];
    map=new Map();
    for(const element of controls){
      for(const key of [element.id,element.name]){
        const normalized=canonical(key);
        if(normalized&&!map.has(normalized))map.set(normalized,element);
      }
    }
  }

  function find(paths){
    const keys=paths.map(canonical).filter(Boolean);
    for(const key of keys)if(map.has(key))return map.get(key);
    for(const key of keys){
      const hit=[...map].find(([candidate])=>candidate.endsWith(`.${key}`)||candidate.endsWith(key));
      if(hit)return hit[1];
    }
    return null;
  }

  function indexes(prefix){
    const result=new Set();
    const escaped=canonical(prefix).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
    const pattern=new RegExp(`^${escaped}\\.([^.]*)\\.`);
    for(const key of map.keys()){
      const match=key.match(pattern);
      if(match)result.add(match[1]);
    }
    return [...result].sort((a,b)=>(Number(a)-Number(b))||String(a).localeCompare(String(b)));
  }

  function notify(element){
    element.dispatchEvent(new Event("input",{bubbles:true}));
    element.dispatchEvent(new Event("change",{bubbles:true}));
    try{window.jQuery?.(element).trigger("input").trigger("change")}catch{}
  }

  function setTextControl(element,value){
    if(!element)return false;
    if(element.tagName==="SELECT"){
      const target=clean(value).toLowerCase();
      const option=[...element.options].find(item=>clean(item.value).toLowerCase()===target)
        ||[...element.options].find(item=>clean(item.textContent).toLowerCase()===target)
        ||[...element.options].find(item=>clean(item.textContent).toLowerCase().includes(target));
      element.value=option?option.value:String(value??"");
    }else{
      element.value=String(value??"");
    }
    notify(element);
    return true;
  }

  function rowFor(prefix,index){
    const control=find([
      `${prefix}.${index}.name`,`${prefix}[${index}].name`,
      `${prefix}.${index}.level`,`${prefix}[${index}].level`
    ]);
    if(control)return control.closest("tr")||control.closest(".row,.item,.record")||control.parentElement;
    const keyPrefix=`${canonical(prefix)}.${canonical(index)}.`;
    const hit=[...map].find(([key])=>key.startsWith(keyPrefix));
    const element=hit?.[1];
    return element?.closest("tr")||element?.closest(".row,.item,.record")||element?.parentElement||null;
  }

  const SUITS={
    reason:{aliases:["s","reason","spade"],symbol:"♠",position:0,hints:/spade|reason|suit.?s|(^|[._-])s([._-]|$)/i},
    passion:{aliases:["c","passion","club"],symbol:"♣",position:1,hints:/club|passion|suit.?c|(^|[._-])c([._-]|$)/i},
    life:{aliases:["h","life","heart"],symbol:"♥",position:2,hints:/heart|life|suit.?h|(^|[._-])h([._-]|$)/i},
    mundane:{aliases:["d","mundane","diamond"],symbol:"♦",position:3,hints:/diamond|mundane|suit.?d|(^|[._-])d([._-]|$)/i}
  };

  function controlIdentity(element){
    return [element?.id,element?.name,element?.className,element?.getAttribute?.("data-bind"),element?.getAttribute?.("data-field")]
      .filter(Boolean).join(" ");
  }

  function suitControl(prefix,index,field,row){
    const suit=SUITS[field];
    const direct=find(suit.aliases.flatMap(alias=>[
      `${prefix}.${index}.${alias}`,`${prefix}[${index}].${alias}`,
      `${prefix}.${index}.suit.${alias}`,`${prefix}[${index}].suit.${alias}`,
      `${prefix}.${index}.suits.${alias}`,`${prefix}[${index}].suits.${alias}`
    ]));
    if(direct)return direct;

    const rowControls=[...(row?.querySelectorAll("input,select,textarea")||[])];
    const named=rowControls.find(element=>suit.hints.test(controlIdentity(element)));
    if(named)return named;

    const booleanLike=rowControls.filter(element=>{
      const identity=controlIdentity(element);
      if(/name|level|skill|limit|timing|target|range|aim|difficulty|confront|notes|description|page|type|kind|exp/i.test(identity))return false;
      if(element.type==="checkbox"||element.type==="radio"||element.type==="hidden")return true;
      return ["","0","1","true","false","on","off"].includes(clean(element.value).toLowerCase());
    });
    return booleanLike[suit.position]||null;
  }

  function suitVisual(row,field,control){
    const suit=SUITS[field];
    const scope=control?.closest("td")||control?.parentElement||row;
    const candidates=[...(scope?.querySelectorAll("img,button,input[type='button'],a,[role='button'],label,span")||[])];
    const identified=candidates.find(element=>{
      const text=[element.textContent,element.getAttribute?.("alt"),element.getAttribute?.("title"),element.getAttribute?.("aria-label"),element.getAttribute?.("src"),element.id,element.className].filter(Boolean).join(" ");
      return text.includes(suit.symbol)||suit.hints.test(text);
    });
    if(identified)return identified;
    const rowImages=[...(row?.querySelectorAll("img")||[])];
    return rowImages[suit.position]||null;
  }

  function booleanState(element){
    if(!element)return false;
    if(element.type==="checkbox"||element.type==="radio")return element.checked;
    return truth(element.value);
  }

  async function setBoolean(element,value,row,field){
    if(!element)return false;
    const desired=truth(value);
    const visual=suitVisual(row,field,element);

    for(let attempt=0;attempt<4&&booleanState(element)!==desired;attempt++){
      if(visual){
        try{visual.click();await frame()}catch{}
      }else break;
    }

    if(element.type==="checkbox"||element.type==="radio"){
      if(element.checked!==desired)element.checked=desired;
    }else if(booleanState(element)!==desired){
      element.value=desired?"1":"0";
      element.setAttribute("value",element.value);
    }
    notify(element);
    return true;
  }

  async function waitRows(prefix,count){
    for(let attempt=0;attempt<80;attempt++){
      refresh();
      const found=indexes(prefix);
      if(found.length>=count)return found;
      await wait(125);
    }
    refresh();
    return indexes(prefix);
  }

  async function repairSkillSuits(prefix,records){
    const list=Object.keys(records||{}).sort((a,b)=>Number(a)-Number(b)).map(key=>records[key]);
    if(!list.length)return;
    const rowIndexes=await waitRows(prefix,list.length);
    for(let position=0;position<list.length;position++){
      const index=rowIndexes[position]??String(position).padStart(position?3:1,"0");
      const row=rowFor(prefix,index);
      for(const field of Object.keys(SUITS)){
        const control=suitControl(prefix,index,field,row);
        await setBoolean(control,list[position][field],row,field);
      }
    }
  }

  function typeDefinition(value){
    const text=clean(value).toLowerCase();
    if(["secret","秘技"].includes(text))return{label:"秘技",expbase:20};
    if(["ultimate","奥義"].includes(text))return{label:"奥義",expbase:50};
    if(["direction","演出","なし"].includes(text))return{label:"なし",expbase:1};
    return{label:"特技",expbase:10};
  }

  function styleTypeControl(index,row){
    const direct=find([
      `superhumanskills.${index}.type`,`superhumanskills[${index}].type`,
      `superhumanskills.${index}.kind`,`superhumanskills[${index}].kind`,
      `superhumanskills.${index}.category`,`superhumanskills[${index}].category`,
      `superhumanskills.${index}.skilltype`,`superhumanskills[${index}].skilltype`
    ]);
    if(direct)return direct;
    return [...(row?.querySelectorAll("select,input")||[])].find(element=>/type|kind|category|skill.?type|種別/i.test(controlIdentity(element)))||null;
  }

  function styleExpBaseControl(index,row){
    const direct=find([
      `superhumanskills.${index}.expbase`,`superhumanskills[${index}].expbase`,
      `superhumanskills.${index}.experiencebase`,`superhumanskills[${index}].experiencebase`,
      `superhumanskills.${index}.baseexp`,`superhumanskills[${index}].baseexp`,
      `superhumanskills.${index}.cost`,`superhumanskills[${index}].cost`
    ]);
    if(direct)return direct;
    return [...(row?.querySelectorAll("input,select")||[])].find(element=>/expbase|experience.?base|base.?exp|cost/i.test(controlIdentity(element)))||null;
  }

  async function repairStyleSkills(records){
    const list=Object.keys(records||{}).sort((a,b)=>Number(a)-Number(b)).map(key=>records[key]);
    if(!list.length)return;
    const rowIndexes=await waitRows("superhumanskills",list.length);

    for(let position=0;position<list.length;position++){
      const index=rowIndexes[position]??String(position).padStart(position?3:1,"0");
      const record=list[position];
      const row=rowFor("superhumanskills",index);
      const definition=typeDefinition(record.kind);

      const type=styleTypeControl(index,row);
      if(type)setTextControl(type,definition.label);

      const expbase=styleExpBaseControl(index,row);
      if(expbase)setTextControl(expbase,definition.expbase);

      for(const field of Object.keys(SUITS)){
        const control=suitControl("superhumanskills",index,field,row);
        await setBoolean(control,record[field],row,field);
      }
    }
  }

  function normalizeMark(value){
    const text=clean(value);
    if(text.includes("◎")&&text.includes("●"))return"◎●";
    if(text.includes("◎"))return"◎";
    if(text.includes("●"))return"●";
    return"";
  }

  async function repairStyles(records){
    const list=Object.keys(records||{}).sort((a,b)=>Number(a)-Number(b)).map(key=>records[key]);
    const styleIndexes=indexes("styles");
    for(let position=0;position<Math.min(3,list.length);position++){
      const index=styleIndexes[position]??(position===0?"0":String(position).padStart(3,"0"));
      const desired=normalizeMark(list[position].mark);
      const row=rowFor("styles",index);
      const mark=find([
        `styles.${index}.mark`,`styles[${index}].mark`,
        `styles.${index}.symbol`,`styles[${index}].symbol`,
        `styles.${index}.type`,`styles[${index}].type`
      ]);
      if(mark)setTextControl(mark,desired||"□");

      const rowControls=[...(row?.querySelectorAll("input")||[])];
      const persona=rowControls.find(element=>/persona|cast|primary/i.test(controlIdentity(element)));
      const key=rowControls.find(element=>/(^|[._-])key([._-]|$)|single|secondary/i.test(controlIdentity(element)));
      if(persona)await setBoolean(persona,desired.includes("◎"),row,"reason");
      if(key)await setBoolean(key,desired.includes("●"),row,"passion");
    }
  }

  try{
    const text=String(window.__TNX_TRANSFER_TSV__||"");
    const data=parse(text);
    const repairAll=async()=>{
      refresh();
      await repairStyles(data.style||{});
      await repairSkillSuits("skills3",data.social||{});
      await repairSkillSuits("skills4",data.connection||{});
      await repairStyleSkills(data.style_skill||{});
      document.dispatchEvent(new Event("input",{bubbles:true}));
      document.dispatchEvent(new Event("change",{bubbles:true}));
    };

    for(const delay of [500,1200,2500,5000,9000]){
      await wait(delay);
      await repairAll();
    }
  }catch(error){
    console.error("TNX transfer fix failed",error);
  }
})();
