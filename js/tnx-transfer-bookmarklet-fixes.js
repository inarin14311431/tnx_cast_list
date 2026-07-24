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

  async function readText(){
    try{return await navigator.clipboard.readText()}catch{return prompt("転記TSVを貼り付けてください。","")||""}
  }

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

  let map=new Map();
  function refresh(){
    map=new Map();
    for(const element of document.querySelectorAll("input,select,textarea")){
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

  function currentBoolean(element){
    if(element.type==="checkbox"||element.type==="radio")return element.checked;
    return truth(element.value);
  }

  function toggleFor(element){
    const label=element.id&&document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
    const local=[...(element.parentElement?.querySelectorAll("img,button,input[type='button'],a,[role='button'],label,span")||[])];
    return label||local.find(candidate=>candidate!==element)||null;
  }

  async function setBoolean(element,value){
    if(!element)return false;
    const desired=truth(value);
    if(element.type==="checkbox"||element.type==="radio"){
      if(element.checked!==desired){
        try{element.click();await frame()}catch{}
        if(element.checked!==desired){element.checked=desired;notify(element)}
      }else notify(element);
      return true;
    }
    if(currentBoolean(element)!==desired){
      const toggle=toggleFor(element);
      if(toggle){try{toggle.click();await frame()}catch{}}
    }
    if(currentBoolean(element)!==desired){element.value=desired?"1":"0";notify(element)}
    return true;
  }

  const SUITS={reason:["s","reason","spade"],passion:["c","passion","club"],life:["h","life","heart"],mundane:["d","mundane","diamond"]};
  async function setSuit(prefix,index,field,value){
    const element=find(SUITS[field].flatMap(alias=>[`${prefix}.${index}.${alias}`,`${prefix}[${index}].${alias}`]));
    if(element)await setBoolean(element,value);
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
      const index=rowIndexes[position]??String(position);
      for(const field of Object.keys(SUITS))await setSuit(prefix,index,field,list[position][field]);
    }
  }

  function styleSkillType(value){
    const text=clean(value).toLowerCase();
    if(["normal","通常","特技"].includes(text))return"特技";
    if(["secret","秘技"].includes(text))return"秘技";
    if(["ultimate","奥義"].includes(text))return"奥義";
    if(["direction","演出","なし"].includes(text))return"なし";
    return"特技";
  }

  function setChoice(element,value){
    if(!element)return;
    if(element.tagName==="SELECT"){
      const target=clean(value);
      const option=[...element.options].find(item=>clean(item.value)===target||clean(item.textContent)===target)
        ||[...element.options].find(item=>clean(item.textContent).includes(target));
      element.value=option?option.value:target;
    }else element.value=value;
    notify(element);
  }

  async function repairStyleSkills(records){
    const list=Object.keys(records||{}).sort((a,b)=>Number(a)-Number(b)).map(key=>records[key]);
    if(!list.length)return;
    const rowIndexes=await waitRows("superhumanskills",list.length);
    for(let position=0;position<list.length;position++){
      const index=rowIndexes[position]??String(position);
      const record=list[position];
      const type=find([`superhumanskills.${index}.type`,`superhumanskills.${index}.kind`,`superhumanskills.${index}.category`]);
      setChoice(type,styleSkillType(record.kind));
      for(const field of Object.keys(SUITS))await setSuit("superhumanskills",index,field,record[field]);
    }
  }

  function normalizeMark(value){
    const text=clean(value);
    if(text.includes("◎")&&text.includes("●"))return"◎●";
    if(text.includes("◎"))return"◎";
    if(text.includes("●"))return"●";
    const token=text.toLowerCase();
    if(/both|double|persona.?key|key.?persona/.test(token))return"◎●";
    if(/persona|cast|primary/.test(token))return"◎";
    if(/key|single|secondary/.test(token))return"●";
    return"";
  }

  function readMark(element){
    for(const value of [element?.value,element?.textContent,element?.getAttribute?.("alt"),element?.getAttribute?.("title"),element?.getAttribute?.("aria-label")]){
      const mark=normalizeMark(value);if(mark)return mark;
    }
    return"";
  }

  const STYLE_NAMES=["カブキ","カタナ","バサラ","タタラ","ミストレス","カブト","カリスマ","マネキン","カゼ","フェイト","クロマク","エグゼク","クグツ","カゲ","チャクラ","レッガー","カブトワリ","ハイランダー","マヤカシ","トーキー","イヌ","ニューロ","ヒルコ","コモン","クロガネ","イブキ","シキガミ","アラシ","カゲムシャ","ミギウデ","エトランゼ","アヤカシ","ウツワ"];
  function styleSelects(){
    return [...document.querySelectorAll("select")].filter(select=>STYLE_NAMES.filter(name=>[...select.options].some(option=>clean(option.textContent).includes(name))).length>=5).slice(0,3);
  }

  async function repairMark(position,index,value){
    const desired=normalizeMark(value);
    const prefixes=[`styles.${index}.`,`style.${index}.`];
    let persona=null,key=null;
    for(const [path,element] of map){
      if(!prefixes.some(prefix=>path.startsWith(prefix)))continue;
      if(/persona|cast|primary/.test(path))persona=element;
      if(/(^|\.)key($|\.)|single|secondary/.test(path))key=element;
    }
    if(persona||key){
      if(persona)await setBoolean(persona,desired.includes("◎"));
      if(key)await setBoolean(key,desired.includes("●"));
      if(persona&&key)return;
    }

    const direct=find([`styles.${index}.mark`,`style.${index}.mark`,`styles.${index}.symbol`,`style.${index}.symbol`,`styles.${index}.type`,`style.${index}.type`]);
    if(direct){setChoice(direct,desired||"□");await frame();if(readMark(direct)===desired)return}

    const style=styleSelects()[position];
    const scope=style?.closest("td")||style?.parentElement;
    if(!scope)return;
    const current=()=>{
      for(const element of scope.querySelectorAll("input,select,img,button,span")){const mark=readMark(element);if(mark)return mark}
      return"";
    };
    if(current()===desired)return;
    const clickables=[...scope.querySelectorAll("img,button,input[type='button'],a,[role='button'],label,span")];
    for(const element of clickables){
      const hint=[element.value,element.textContent,element.getAttribute?.("alt"),element.getAttribute?.("title")].filter(Boolean).join(" ");
      if(clickables.length>3&&!/[◎●□]|mark|persona|key/i.test(hint))continue;
      for(let count=0;count<4;count++){
        try{element.click();await frame()}catch{break}
        if(current()===desired)return;
      }
    }
  }

  async function repairStyles(records){
    const list=Object.keys(records||{}).sort((a,b)=>Number(a)-Number(b)).map(key=>records[key]);
    for(let attempt=0;attempt<40&&styleSelects().length<3;attempt++)await wait(100);
    refresh();
    const styleIndexes=indexes("styles");
    for(let position=0;position<Math.min(3,list.length);position++){
      const index=styleIndexes[position]??(position===0?"0":String(position).padStart(3,"0"));
      await repairMark(position,index,list[position].mark);
    }
  }

  try{
    const data=parse(await readText());
    const repairAll=async()=>{
      refresh();
      await repairStyles(data.style||{});
      await repairSkillSuits("skills3",data.social||{});
      await repairSkillSuits("skills4",data.connection||{});
      await repairStyleSkills(data.style_skill||{});
      document.dispatchEvent(new Event("input",{bubbles:true}));
      document.dispatchEvent(new Event("change",{bubbles:true}));
    };
    for(const delay of [800,2200,5000,10000]){await wait(delay);await repairAll()}
  }catch(error){
    console.error("TNX transfer fix failed",error);
  }
})();
