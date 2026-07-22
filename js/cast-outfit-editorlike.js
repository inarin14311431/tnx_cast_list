import { supabase } from "./supabase-client.js";

const container=document.querySelector("#outfit-container");
const content=document.querySelector("#cast-content");

const CATEGORIES=[
  ["weapon","武器","WEAPONS"],
  ["armor","防具","ARMOR"],
  ["cyberware","サイバーウェア","CYBERWARE"],
  ["tron","トロン","TRON"],
  ["vehicle","ヴィークル","VEHICLES"],
  ["residence","住居","RESIDENCES"],
  ["other","その他","OTHER"]
];

const LABELS={
  name:"名称",
  purchase_value:"購入",
  experience_cost:"常備化",
  concealment:"隠匿",
  attack:"攻撃",
  defense:"防御",
  defense_s:"S",
  defense_p:"P",
  defense_i:"I",
  range:"射程",
  slot:"部位／エリア",
  control_modifier:"制御",
  cs_modifier:"CS",
  mundane_modifier:"外界",
  description:"解説"
};

const SCHEMAS={
  weapon:["name","purchase_value","experience_cost","concealment","attack","range","slot","description"],
  armor:["name","purchase_value","experience_cost","concealment","defense_s","defense_p","defense_i","slot","description"],
  cyberware:["name","purchase_value","experience_cost","concealment","slot","control_modifier","cs_modifier","mundane_modifier","description"],
  tron:["name","purchase_value","experience_cost","concealment","slot","control_modifier","cs_modifier","mundane_modifier","description"],
  vehicle:["name","purchase_value","experience_cost","attack","defense","control_modifier","cs_modifier","description"],
  residence:["name","purchase_value","experience_cost","mundane_modifier","slot","description"],
  other:["name","purchase_value","experience_cost","concealment","slot","control_modifier","cs_modifier","mundane_modifier","description"]
};

if(container)initialize();

async function initialize(){
  try{
    const publicId=new URLSearchParams(location.search).get("id")?.trim()||"";
    if(!publicId)return;

    const {data:character,error:characterError}=await supabase
      .from("characters")
      .select("id")
      .eq("public_id",publicId)
      .maybeSingle();
    if(characterError)throw characterError;
    if(!character)return;

    const {data:outfits,error:outfitError}=await supabase
      .from("character_outfits")
      .select("*")
      .eq("character_id",character.id)
      .order("category")
      .order("sort_order")
      .order("name");
    if(outfitError)throw outfitError;

    await waitForBaseView();
    /* Let the older cast-view enhancer finish before replacing its generic table. */
    await new Promise(resolve=>setTimeout(resolve,250));
    render(outfits||[]);
  }catch(error){
    console.error("Outfit view rebuild failed",error);
  }
}

function waitForBaseView(){
  if(!content||!content.hidden)return Promise.resolve();
  return new Promise(resolve=>{
    const observer=new MutationObserver(()=>{
      if(content.hidden)return;
      observer.disconnect();
      resolve();
    });
    observer.observe(content,{attributes:true,attributeFilter:["hidden"]});
  });
}

function render(outfits){
  if(!outfits.length){
    container.innerHTML='<p class="empty-data">アウトフィット未登録 <small>NO OUTFIT DATA</small></p>';
    return;
  }

  const grouped=Object.fromEntries(CATEGORIES.map(([key])=>[key,[]]));
  for(const outfit of outfits){
    const category=grouped[outfit.category]?outfit.category:"other";
    grouped[category].push(outfit);
  }

  container.className="cast-outfit-container";
  container.innerHTML=CATEGORIES
    .filter(([category])=>grouped[category].length)
    .map(([category,jp,en])=>createSection(category,jp,en,grouped[category]))
    .join("");
}

function createSection(category,jp,en,items){
  const schema=SCHEMAS[category];
  const totals=category==="armor"?armorTotals(items):null;
  return `
    <section class="data-panel panel-outfits cast-outfit-section cast-outfit-section--${category}">
      <header class="cast-outfit-title">
        <h2>${escapeHtml(jp)} <small>${escapeHtml(en)}</small></h2>
      </header>
      <div class="cast-outfit-table-scroll">
        <table class="cast-outfit-table" data-outfit-category="${category}">
          <thead><tr>${schema.map(createHeader).join("")}</tr></thead>
          <tbody>${items.map(item=>createRow(category,schema,item)).join("")}</tbody>
          ${totals?createArmorFooter(schema,totals):""}
        </table>
      </div>
    </section>`;
}

function createHeader(field){
  const label=LABELS[field]||field;
  return `<th class="cast-outfit-col--${field}">${escapeHtml(label)}</th>`;
}

function createRow(category,schema,item){
  const armor=category==="armor"?parseArmorDefense(item.defense):null;
  return `<tr>${schema.map(field=>createCell(field,item,armor)).join("")}</tr>`;
}

function createCell(field,item,armor){
  let value;
  if(field==="defense_s")value=armor.s;
  else if(field==="defense_p")value=armor.p;
  else if(field==="defense_i")value=armor.i;
  else value=item[field];

  const text=displayValue(value);
  return `<td class="cast-outfit-col--${field}"><span class="cast-outfit-value" title="${escapeAttribute(text)}">${escapeHtml(text)}</span></td>`;
}

function createArmorFooter(schema,totals){
  const firstDefense=schema.indexOf("defense_s");
  const tail=schema.length-firstDefense-3;
  return `
    <tfoot><tr class="cast-armor-total-row">
      <th colspan="${firstDefense}">防御値合計</th>
      <td class="cast-armor-total">${totals.s}</td>
      <td class="cast-armor-total">${totals.p}</td>
      <td class="cast-armor-total">${totals.i}</td>
      ${tail>0?`<td colspan="${tail}"></td>`:""}
    </tr></tfoot>`;
}

function parseArmorDefense(value){
  const text=String(value??"").trim();
  const result={s:"",p:"",i:""};
  if(!text)return result;

  const labeled=[...text.matchAll(/(?:^|[\s,，/／])([SPI])\s*[:：]?\s*([+-]?\d+)/gi)];
  if(labeled.length){
    for(const match of labeled)result[match[1].toLowerCase()]=match[2];
    return result;
  }

  /* Legacy character-sheets data is stored in S / P / I order. */
  const parts=text.split(/[\/／,，\s]+/).filter(Boolean);
  result.s=parts[0]||"";
  result.p=parts[1]||"";
  result.i=parts[2]||"";
  return result;
}

function armorTotals(items){
  const totals={s:0,p:0,i:0};
  for(const item of items){
    const defense=parseArmorDefense(item.defense);
    for(const key of Object.keys(totals))totals[key]+=numeric(defense[key]);
  }
  return totals;
}

function numeric(value){
  const match=String(value??"").match(/[+-]?\d+(?:\.\d+)?/);
  return match?Number(match[0]):0;
}

function displayValue(value){
  if(value===null||value===undefined||String(value).trim()==="")return "—";
  return String(value);
}

function escapeHtml(value){
  return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}

function escapeAttribute(value){
  return escapeHtml(value).replace(/\r?\n/g,"&#10;");
}