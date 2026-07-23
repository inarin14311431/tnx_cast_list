(async()=>{
  const FORMAT="TNX_CAST_TRANSFER_TSV";
  const TARGET_HOST="character-sheets.appspot.com";
  const TARGET_PATH="/tnx/edit.html";
  const wait=(ms=0)=>new Promise(resolve=>setTimeout(resolve,ms));
  const frame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const canonical=value=>String(value||"").trim().toLowerCase()
    .replace(/\[\s*["']?([^\]"']+)["']?\s*\]/g,".$1")
    .replace(/^[.#]+|[.]$/g,"")
    .replace(/\.{2,}/g,".");
  const clean=value=>String(value??"").trim();
  const truth=value=>!["","0","false","off","no","null","undefined"].includes(clean(value).toLowerCase());
  const unescapeCell=value=>String(value||"").replace(/\\(\\|t|n|r)/g,(_,token)=>token==="\\"?"\\":token==="t"?"\t":token==="n"?"\n":"\r");
  const stripPrefix=(value,prefix)=>clean(value).replace(new RegExp(`^${prefix}`),"");

  if(location.hostname!==TARGET_HOST||!location.pathname.endsWith(TARGET_PATH)){
    alert("このブックマークレットはトーキョーN◎VAキャラクターシート編集画面で実行してください。");
    return;
  }

  async function readTransferText(){
    try{
      if(navigator.clipboard&&window.isSecureContext)return await navigator.clipboard.readText();
    }catch(error){console.warn("Clipboard read failed",error)}
    return prompt("転記TSVを貼り付けてください。","")||"";
  }

  function parse(text){
    const lines=String(text||"").replace(/\r/g,"").split("\n").filter(Boolean);
    if(!lines.length)throw new Error("クリップボードが空です。");
    const first=lines.shift().split("\t");
    if(first[0]!==FORMAT)throw new Error("転記TSVではありません。先にキャスト画面の「転記TSV」を押してください。");
    const data={};
    for(const line of lines){
      const columns=line.split("\t");
      if(columns[0]!==FORMAT)continue;
      const section=columns[2]||"";
      const index=columns[3]||"0";
      const field=columns[4]||"";
      const value=unescapeCell(columns.slice(5).join("\t"));
      data[section]??={};
      data[section][index]??={};
      data[section][index][field]=value;
    }
    return data;
  }

  let controls=[];
  let controlMap=new Map();
  function refreshControls(){
    controls=[...document.querySelectorAll("input,select,textarea")].filter(element=>!["button","submit","reset","password","file"].includes(element.type));
    controlMap=new Map();
    for(const element of controls){
      for(const key of [element.id,element.name]){
        const normalized=canonical(key);
        if(normalized&&!controlMap.has(normalized))controlMap.set(normalized,element);
      }
    }
  }
  refreshControls();

  function findControl(paths){
    const normalizedPaths=paths.map(canonical).filter(Boolean);
    for(const path of normalizedPaths){
      if(controlMap.has(path))return controlMap.get(path);
    }
    for(const path of normalizedPaths){
      const match=[...controlMap.entries()].find(([key])=>key.endsWith(`.${path}`)||key.endsWith(path));
      if(match)return match[1];
    }
    return null;
  }

  function optionMatch(select,value){
    const raw=clean(value).replace(/[◎●]/g,"").toLowerCase();
    if(!raw)return null;
    const translated={normal:"通常",secret:"秘技",ultimate:"奥義",direction:"演出",general:"一般",proper:"固有名詞"}[raw];
    const targets=[raw,translated].filter(Boolean).map(item=>item.toLowerCase());
    const normalized=option=>({value:clean(option.value).toLowerCase(),text:clean(option.textContent).replace(/[◎●]/g,"").toLowerCase()});
    return [...select.options].find(option=>targets.includes(normalized(option).value))
      ||[...select.options].find(option=>targets.includes(normalized(option).text))
      ||[...select.options].find(option=>targets.some(target=>normalized(option).text.includes(target)));
  }

  function notify(element){
    element.dispatchEvent(new Event("input",{bubbles:true}));
    element.dispatchEvent(new Event("change",{bubbles:true}));
    if(window.jQuery){
      try{window.jQuery(element).trigger("input").trigger("change")}catch{}
    }
  }

  function setElement(element,value){
    if(!element)return false;
    if(element.type==="checkbox"||element.type==="radio")element.checked=truth(value);
    else if(element.tagName==="SELECT"){
      const option=optionMatch(element,value);
      element.value=option?option.value:String(value??"");
    }else element.value=String(value??"");
    notify(element);
    return true;
  }

  const results={set:0,missing:0,rows:0};
  function setPath(paths,value,optional=true){
    if(optional&&!clean(value))return true;
    const element=findControl(paths);
    if(!element){results.missing++;return false}
    setElement(element,value);results.set++;return true;
  }

  function setBase(base){
    const mappings={
      player:["base.player","player"],rank:["base.rank","rank"],name:["base.name","name"],kana:["base.namekana","base.kana","kana"],
      handle:["base.handle","handle"],affiliation:["base.post","base.affiliation","affiliation"],summary:["base.lifepath.memo","base.summary","summary"],
      profile:["base.memoir","base.profile","profile"],age:["base.age","age"],sex:["base.sex","base.gender","sex","gender"],
      height:["base.height","height"],weight:["base.weight","weight"],eyes:["base.eyes","base.eye","eyes","eye"],hair:["base.hair","hair"],skin:["base.skin","skin"],
      lifepath_origin:["base.lifepath.experience","base.lifepath.origin"],lifepath_experience:["base.lifepath.environment"],lifepath_encounter:["base.lifepath.encounter","base.lifepath.encouter"]
    };
    for(const [field,paths] of Object.entries(mappings))setPath(paths,base[field]);
  }

  const STYLE_NAMES=["カブキ","カタナ","バサラ","タタラ","ミストレス","カブト","カリスマ","マネキン","カゼ","フェイト","クロマク","エグゼク","クグツ","カゲ","チャクラ","レッガー","カブトワリ","ハイランダー","マヤカシ","トーキー","イヌ","ニューロ","ヒルコ","コモン","クロガネ","イブキ","シキガミ","アラシ","カゲムシャ","ミギウデ","エトランゼ","アヤカシ","ウツワ"];
  function styleSelects(){
    return [...document.querySelectorAll("select")].filter(select=>{
      const texts=[...select.options].map(option=>clean(option.textContent));
      return STYLE_NAMES.filter(name=>texts.some(text=>text.includes(name))).length>=5;
    }).slice(0,3);
  }

  function arrayKeys(prefix){
    const indexes=new Set();
    const escaped=canonical(prefix).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
    const pattern=new RegExp(`^${escaped}\\.([^.]*)\\.`);
    for(const key of controlMap.keys()){
      const match=key.match(pattern);
      if(match)indexes.add(match[1]);
    }
    return [...indexes].sort((a,b)=>(Number(a)-Number(b))||String(a).localeCompare(String(b)));
  }

  function setStyles(styles){
    const fallbacks=styleSelects();
    const detectedIndexes=arrayKeys("styles");
    for(let position=0;position<3;position++){
      const style=styles[String(position)]||{};
      const index=detectedIndexes[position]??(position===0?"0":String(position).padStart(3,"0"));
      const styleControl=findControl([`styles.${index}.name`,`style.${index}.name`,`styles.${index}.style`,`style.${index}.style`])||fallbacks[position];
      if(styleControl&&clean(style.name)){setElement(styleControl,style.name);results.set++}else if(clean(style.name))results.missing++;
      setPath([`styles.${index}.attribute`,`style.${index}.attribute`,`styles.${index}.utsuwa`],style.attribute);
      setPath([`styles.${index}.mark`,`style.${index}.mark`,`styles.${index}.symbol`],style.mark);
      const prefixes=[`styles.${index}.`,`style.${index}.`];
      for(const [key,element] of controlMap){
        if(!prefixes.some(prefix=>key.startsWith(prefix))||!(element.type==="checkbox"||element.type==="radio"))continue;
        if(/persona|double|cast|primary/.test(key)){setElement(element,String(style.mark||"").includes("◎"));results.set++}
        if(/key|single|secondary/.test(key)){setElement(element,String(style.mark||"").includes("●"));results.set++}
      }
    }
  }

  function setAbilities(abilities){
    for(const key of ["reason","passion","life","mundane"]){
      const data=abilities[key]||{};
      setPath([`ability.${key}.abl`,`ability.${key}.value`,`abilities.${key}.value`],data.value,false);
      setPath([`ability.${key}.ctl`,`ability.${key}.control`,`abilities.${key}.control`],data.control,false);
    }
    setPath(["ability.cs","abilities.cs","cs"],abilities.cs?.value,false);
  }

  function findContainer(prefix,headingPattern){
    const firstKey=[...controlMap.keys()].find(key=>key.startsWith(`${canonical(prefix)}.`));
    let element=firstKey?controlMap.get(firstKey):null;
    if(element){
      const table=element.closest("table");
      if(table)return table.parentElement||table;
    }
    const headings=[...document.querySelectorAll("h1,h2,h3,h4,legend,th,caption")];
    const heading=headings.find(node=>headingPattern.test(clean(node.textContent)));
    return heading?.closest("section,fieldset,div,table")||heading?.parentElement||document.body;
  }

  function addControl(container){
    const candidates=[...container.querySelectorAll('button,input[type="button"],input[type="image"],a,img')];
    const score=element=>{
      const text=[element.textContent,element.getAttribute("title"),element.getAttribute("alt"),element.getAttribute("value"),element.getAttribute("aria-label"),element.getAttribute("src"),element.className,element.id,element.getAttribute("onclick")].filter(Boolean).join(" ").toLowerCase();
      if(/delete|remove|minus|削除|消去/.test(text))return-100;
      let value=0;
      if(/add|plus|append|insert|new|追加|増や/.test(text))value+=20;
      if(/icon.*add|add.*icon|plus\.png|add\.png/.test(text))value+=20;
      if(element.closest("thead,tfoot"))value+=5;
      return value;
    };
    return candidates.map(element=>[score(element),element]).sort((a,b)=>b[0]-a[0]).find(([value])=>value>0)?.[1]||null;
  }

  async function ensureRows(prefix,count,headingPattern){
    refreshControls();
    let indexes=arrayKeys(prefix);
    let guard=0;
    while(indexes.length<count&&guard++<Math.min(100,count+10)){
      const container=findContainer(prefix,headingPattern);
      const add=addControl(container);
      if(!add)break;
      const before=indexes.length;
      add.click();
      await frame();
      await wait(20);
      refreshControls();
      indexes=arrayKeys(prefix);
      if(indexes.length<=before)break;
    }
    return indexes;
  }

  const FIELD_ALIASES={
    kind:["type","kind","category"],reason:["s","reason","spade"],passion:["c","passion","club"],life:["h","life","heart"],mundane:["d","mundane","diamond"],
    difficulty:["aim","difficulty"],confrontation:["confront","confrontation"],description:["notes","description"],
    purchase:["purchase","purchasevalue"],permanent:["permanent","experiencecost"],part:["part","slot"],slot:["slot","part"]
  };

  function setArrayField(prefix,index,field,value){
    if(!clean(value)&&!["level","reason","passion","life","mundane","permanent"].includes(field))return true;
    const aliases=FIELD_ALIASES[field]||[field];
    const paths=aliases.flatMap(alias=>[`${prefix}.${index}.${alias}`,`${prefix}[${index}].${alias}`]);
    const element=findControl(paths);
    if(!element){results.missing++;return false}
    setElement(element,value);results.set++;return true;
  }

  async function fillArray(prefix,records,headingPattern,transform=value=>value){
    const list=Object.keys(records||{}).sort((a,b)=>Number(a)-Number(b)).map(key=>transform({...records[key]})).filter(Boolean);
    if(!list.length)return;
    const indexes=await ensureRows(prefix,list.length,headingPattern);
    for(let position=0;position<list.length;position++){
      const index=indexes[position]??String(position);
      for(const [field,value] of Object.entries(list[position]))setArrayField(prefix,index,field,value);
      results.rows++;
    }
  }

  function skillRecord(record,prefix=""){
    return {
      name:prefix?stripPrefix(record.name,prefix):record.name,
      level:record.level,
      reason:record.reason,
      passion:record.passion,
      life:record.life,
      mundane:record.mundane
    };
  }

  function outfitPrefix(category){
    if(category==="weapon")return["weapons",/武器/];
    if(category==="armor")return["armours",/防具/];
    if(category==="vehicle")return["vehicles",/ヴィークル/];
    if(category==="residence")return["residences",/住居/];
    return["outfits",/装備|サイバーウェア|トロン/];
  }

  function outfitRecord(record){
    return {
      name:record.name,purchase:record.purchase,permanent:record.permanent,concealA:record.concealA,concealB:record.concealB,
      attack:record.attack,range:record.range,slot:record.slot,control:record.control,electrical_control:record.electrical_control,
      protecS:record.protecS,protecP:record.protecP,protecI:record.protecI,crew:record.crew,sf:record.sf,entry:record.entry,
      part:record.part,notes:record.notes,page:record.page
    };
  }

  try{
    const text=await readTransferText();
    const data=parse(text);
    setBase(data.base?.["0"]||{});
    setStyles(data.style||{});
    setAbilities(data.ability||{});

    const general=Object.keys(data.general||{}).sort((a,b)=>Number(a)-Number(b)).map(key=>data.general[key]);
    const firstGeneral=Object.fromEntries(general.slice(0,8).map((record,index)=>[index,skillRecord(record)]));
    const secondGeneral=Object.fromEntries(general.slice(8).map((record,index)=>[index,skillRecord(record)]));
    await fillArray("skills1",firstGeneral,/一般技能/,value=>value);
    await fillArray("skills2",secondGeneral,/一般技能/,value=>value);
    await fillArray("skills3",data.social||{},/一般技能|社会/,value=>skillRecord(value,"社会："));
    await fillArray("skills4",data.connection||{},/一般技能|コネ/,value=>skillRecord(value,"コネ："));
    await fillArray("superhumanskills",data.style_skill||{},/スタイル技能/,record=>({
      name:record.name,type:record.kind,level:record.level,s:record.reason,c:record.passion,h:record.life,d:record.mundane,
      skill:record.skill,limit:record.limit,timing:record.timing,target:record.target,range:record.range,
      aim:record.difficulty,confront:record.confrontation,notes:record.description,page:record.page
    }));

    const outfitGroups={};
    for(const key of Object.keys(data.outfit||{}).sort((a,b)=>Number(a)-Number(b))){
      const record=data.outfit[key];
      const [prefix,heading]=outfitPrefix(record.category);
      outfitGroups[prefix]??={heading,records:[]};
      outfitGroups[prefix].records.push(outfitRecord(record));
    }
    for(const [prefix,group] of Object.entries(outfitGroups)){
      await fillArray(prefix,Object.fromEntries(group.records.map((record,index)=>[index,record])),group.heading,value=>value);
    }

    document.dispatchEvent(new Event("input",{bubbles:true}));
    document.dispatchEvent(new Event("change",{bubbles:true}));
    alert(`転記しました。\n入力行：${results.rows}件\n設定項目：${results.set}件\n未検出項目：${results.missing}件\n\n画面の内容を確認してから登録してください。`);
  }catch(error){
    console.error("TNX transfer failed",error);
    alert(`転記エラー：${error?.message||error}`);
  }
})();
