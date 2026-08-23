/* Legacy character-sheets JSON import for the sheet editor. */
(()=>{
  const $=selector=>document.querySelector(selector);
  const $$=selector=>[...document.querySelectorAll(selector)];
  const dialog=$('#legacy-import-dialog');
  const open=$('#legacy-import-open');
  const copy=$('#legacy-bookmarklet-copy');
  const apply=$('#legacy-import-apply');
  const text=$('#legacy-import-json');
  const msg=$('#legacy-import-message');
  if(!dialog||!open||!apply||!text||!msg)return;
  const BASE_IMPORT_EVENT='tnx:legacy-import-base-finished';
  const reportProgress=(percent,label,detail='')=>window.TNXLegacyImportProgress?.update?.(percent,label,detail);

  const exporter=`javascript:(()=>{const label=e=>{const id=e.id;const l=id&&document.querySelector('label[for="'+CSS.escape(id)+'"]');return(l?.innerText||e.closest('label')?.innerText||e.closest('th,td')?.innerText||'').trim()};const section=e=>{let n=e;while(n&&n!==document.body){const h=n.querySelector?.(':scope>h1,:scope>h2,:scope>h3,:scope>legend');if(h)return h.innerText.trim();n=n.parentElement}return''};const fields=[...document.querySelectorAll('input,select,textarea')].filter(e=>!['button','submit','password'].includes(e.type)).map(e=>({path:e.id||e.name||'',id:e.id||'',name:e.name||'',type:e.type||e.tagName.toLowerCase(),value:e.type==='checkbox'||e.type==='radio'?(e.checked?(e.value||true):false):e.value,checked:!!e.checked,label:label(e),section:section(e)}));const data={format:'tnx-character-sheets-v2',url:location.href,exportedAt:new Date().toISOString(),title:document.title,fields};const out=JSON.stringify(data,null,2);navigator.clipboard.writeText(out).then(()=>alert('キャラシJSONをコピーしました。')).catch(()=>prompt('JSONをコピーしてください',out));})();`;
  const wait=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const cleanName=value=>String(value||'').trim().replace(/^[★†※■┗]+\s*/,'').replace(/Ｎ◎ＶＡ/g,'N◎VA');
  const parseCastName=value=>{const raw=String(value||'').trim();const match=raw.match(/^[\s　]*[“”"「『](.+?)[“”"」』][\s　]*(.+)$/);return match?{handle:match[1].trim(),name:match[2].trim()}:{handle:'',name:raw}};
  const number=value=>{const match=String(value??'').match(/-?\d+/);return match?Number(match[0]):0};
  const truth=value=>{
    if(value===true)return true;
    if(value===false||value===null||value===undefined)return false;
    const normalized=String(value).trim().toLowerCase();
    return !['','0','false','off','no','null','undefined'].includes(normalized);
  };
  const canonicalKey=value=>String(value||'').trim()
    .replace(/\[\s*["']?([^\]"']+)["']?\s*\]/g,'.$1')
    .replace(/^[.#]+|[.]$/g,'')
    .replace(/\.{2,}/g,'.');
  const firstDefined=(object,...keys)=>{
    for(const key of keys)if(object&&object[key]!==undefined&&object[key]!==null)return object[key];
    return '';
  };

  function flatten(value,prefix,map){
    if(value===null||value===undefined)return;
    if(Array.isArray(value)){
      value.forEach((item,index)=>flatten(item,prefix?`${prefix}.${index}`:String(index),map));
      return;
    }
    if(typeof value==='object'){
      for(const [key,item] of Object.entries(value)){
        if(['fields','format','url','exportedAt','title'].includes(key)&&!prefix)continue;
        flatten(item,prefix?`${prefix}.${key}`:key,map);
      }
      return;
    }
    const key=canonicalKey(prefix);
    if(key&&!map.has(key))map.set(key,value);
  }

  function fieldMap(data){
    const map=new Map();
    const put=(key,value,prefer=false)=>{
      const normalized=canonicalKey(key);
      if(!normalized)return;
      if(!map.has(normalized)||prefer||(!truth(map.get(normalized))&&truth(value)))map.set(normalized,value);
    };
    for(const field of Array.isArray(data.fields)?data.fields:[]){
      const type=String(field.type||'').toLowerCase();
      const value=(type==='checkbox'||type==='radio')?(field.checked?firstDefined(field,'value')||true:false):firstDefined(field,'value');
      const prefer=(type==='checkbox'||type==='radio')?Boolean(field.checked):String(value??'')!=='';
      for(const key of [field.path,field.id,field.name])put(key,value,prefer);
    }
    flatten(data,'',map);
    return map;
  }

  const get=(map,...ids)=>{
    for(const id of ids){
      const key=canonicalKey(id);
      if(map.has(key))return map.get(key);
    }
    return '';
  };

  function groups(map,prefixes){
    const list=Array.isArray(prefixes)?prefixes:[prefixes];
    const output=new Map();
    for(const [id,value] of map){
      for(const prefix of list){
        const escaped=canonicalKey(prefix).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
        const match=id.match(new RegExp(`^${escaped}\\.([^.]*)\\.(.+)$`));
        if(!match)continue;
        const [,index,key]=match;
        if(!output.has(index))output.set(index,{});
        output.get(index)[key]=value;
        break;
      }
    }
    return [...output.entries()]
      .sort(([a],[b])=>{const an=Number(a),bn=Number(b);return Number.isFinite(an)&&Number.isFinite(bn)?an-bn:String(a).localeCompare(String(b),'ja')})
      .map(([,value])=>value);
  }

  const setElement=async(selector,value)=>{
    const element=$(selector);
    if(!element||value===undefined||value===null)return false;
    element.value=String(value);
    element.dispatchEvent(new Event('input',{bubbles:true}));
    element.dispatchEvent(new Event('change',{bubbles:true}));
    await wait();
    return true;
  };
  const setInput=async(element,value)=>{
    if(!element)return false;
    if(element.type==='checkbox')element.checked=Boolean(value);else element.value=String(value??'');
    element.dispatchEvent(new Event('input',{bubbles:true}));
    element.dispatchEvent(new Event('change',{bubbles:true}));
    await wait();
    return true;
  };
  const click=async selector=>{const element=$(selector);if(!element)return false;element.click();await wait();return true};
  const rowName=row=>cleanName(row?.querySelector('[data-f="name"]')?.value);
  const skillGroups=label=>[...document.querySelectorAll('#general-skills .skill-group')].filter(group=>(group.querySelector('.skill-group-title')?.textContent||'').includes(label));
  const skillRows=label=>skillGroups(label).flatMap(group=>[...group.querySelectorAll('tbody>tr[data-skill-key]')]);
  const findRow=(label,name)=>skillRows(label).find(row=>rowName(row)===cleanName(name));

  async function clearRows(getRows,filter=()=>true){
    let guard=0;
    while(guard++<250){
      const row=getRows().find(filter);
      if(!row)break;
      const del=row.querySelector('[data-delete-skill]');
      if(!del)break;
      del.click();
      await wait();
    }
  }
  async function clearInitialSocialAndConnections(){
    await clearRows(()=>skillRows('社会'));
    await clearRows(()=>skillRows('コネクション'));
  }

  function skillSuits(data){
    return {
      reason:truth(firstDefined(data,'s','reason','spade')),
      passion:truth(firstDefined(data,'c','passion','club')),
      life:truth(firstDefined(data,'h','life','heart')),
      mundane:truth(firstDefined(data,'d','mundane','diamond'))
    };
  }
  function skillLevel(data){
    const suits=skillSuits(data);
    return Math.max(0,number(firstDefined(data,'level','lv')),Object.values(suits).filter(Boolean).length);
  }
  function skillFreeLevel(data){
    const level=skillLevel(data);
    return Math.min(level,Math.max(0,number(firstDefined(data,'free_level','freeLevel'))));
  }

  async function setSkillRow(row,data,kind){
    if(!row)return false;
    const key=row.dataset.skillKey;
    const locate=()=>document.querySelector(`tr[data-skill-key="${CSS.escape(key)}"]`);
    let current=locate();
    await setInput(current?.querySelector('[data-f="name"]'),cleanName(data.name));
    current=locate();
    await setInput(current?.querySelector('[data-f="skill_kind"]'),kind);
    const suits=skillSuits(data);
    const level=skillLevel(data);
    current=locate();
    await setInput(current?.querySelector('[data-f="level"]'),level);
    for(const [suit,on] of Object.entries(suits)){
      current=locate();
      const box=current?.querySelector(`[data-f="${suit}"]`);
      if(box&&box.checked!==on)await setInput(box,on);
    }
    current=locate();
    await setInput(current?.querySelector('[data-f="level"]'),level);
    current=locate();
    await setInput(current?.querySelector('[data-f="free_level"]'),skillFreeLevel(data));
    current=locate();
    const description=current?.querySelector('[data-f="description"]');
    if(description){
      const detail=[
        firstDefined(data,'skill')&&`技能：${firstDefined(data,'skill')}`,
        firstDefined(data,'limit')&&`上限：${firstDefined(data,'limit')}`,
        firstDefined(data,'timing')&&`タイミング：${firstDefined(data,'timing')}`,
        firstDefined(data,'target')&&`対象：${firstDefined(data,'target')}`,
        firstDefined(data,'range')&&`射程：${firstDefined(data,'range')}`,
        firstDefined(data,'aim','difficulty')&&`目標値：${firstDefined(data,'aim','difficulty')}`,
        firstDefined(data,'confront','confrontation')&&`対決：${firstDefined(data,'confront','confrontation')}`,
        firstDefined(data,'page')&&`参照P：${firstDefined(data,'page')}`,
        firstDefined(data,'notes','description')
      ].filter(Boolean).join('\n');
      await setInput(description,detail);
    }
    return true;
  }

  const rowsForImportLabel=label=>label==='__style__'?$$('#style-skills tr[data-skill-key]'):skillRows(label);
  async function addSkill(button,label,data,kind){
    const before=new Set(rowsForImportLabel(label).map(row=>row.dataset.skillKey));
    if(!await click(button))return false;
    let row=null;
    for(let attempt=0;attempt<12&&!row;attempt++){
      row=rowsForImportLabel(label).find(candidate=>!before.has(candidate.dataset.skillKey));
      if(!row)await wait();
    }
    return setSkillRow(row,data,kind);
  }

  const STYLE_NAMES={
    kabuki:'カブキ',katana:'カタナ',vasara:'バサラ',tatara:'タタラ',mistress:'ミストレス',kabuto:'カブト',charisma:'カリスマ',mannequin:'マネキン',kaze:'カゼ',fate:'フェイト',kuromaku:'クロマク',exec:'エグゼク',kugutsu:'クグツ',kage:'カゲ',chakra:'チャクラ',legger:'レッガー',kabutowari:'カブトワリ',highlander:'ハイランダー',mayakashi:'マヤカシ',talkie:'トーキー',inu:'イヌ',neuro:'ニューロ',hiruko:'ヒルコ',common:'コモン',kurogane:'クロガネ',ibuki:'イブキ',shikigami:'シキガミ',arashi:'アラシ',kagemusha:'カゲムシャ',migiude:'ミギウデ',etranger:'エトランゼ',ayakashi:'アヤカシ',utsuwa:'ウツワ'
  };
  function styleName(value){
    const raw=cleanName(value).replace(/^STYLE:/i,'').replace(/[◎●□]/g,'').trim();
    if(!raw)return '';
    const token=raw.toLowerCase().replace(/[\s_\-・]/g,'');
    return STYLE_NAMES[token]||raw;
  }
  function styleMark(value){const raw=String(value||'');return raw.includes('◎')&&raw.includes('●')?'◎●':raw.includes('◎')?'◎':raw.includes('●')?'●':''}

  async function importStyles(map){
    const direct=groups(map,['styles','style']);
    const outline=String(get(map,'outline','base.outline','base.style','stylesOutline')||'')
      .replace(/^STYLE:/i,'')
      .replace(/\s+(?:ID|AGE|GENDER):.*$/i,'');
    const outlineParts=outline.split(/[=,]/).map(value=>value.trim()).filter(Boolean);
    for(let index=0;index<3;index++){
      const item=direct[index]||{};
      const raw=firstDefined(item,'name','style','value')||get(map,`style${index+1}`,`styles.${index}.name`)||outlineParts[index]||'';
      const name=styleName(raw);
      const mark=styleMark(firstDefined(item,'mark','symbol')||raw);
      await setElement(`#style-${index+1}`,name);
      await setElement(`#style-${index+1}-mark`,mark);
      const attribute=firstDefined(item,'attribute','utsuwa');
      if(name==='ウツワ'&&attribute)await setElement(`#style-${index+1}-attribute`,attribute);
    }
  }

  async function importAbilities(map){
    for(const key of ['reason','passion','life','mundane']){
      const ability=get(map,`ability.${key}.abl`,`ability.${key}.value`,`abilities.${key}.value`);
      const control=get(map,`ability.${key}.ctl`,`ability.${key}.control`,`abilities.${key}.control`);
      await setElement(`#${key}-base`,number(ability));
      const controlNumbers=(String(control??'').match(/-?\d+/g)||[]).map(Number);
      const base=controlNumbers[0]||0;
      const final=controlNumbers[1]??base;
      await setElement(`#${key}-control-base`,base);
      await setElement(`#${key}-control-mod`,final-base);
    }
    await setElement('#cs-base',number(get(map,'ability.cs','abilities.cs','cs')));
  }

  const FIXED_GENERAL=new Set(['医療','射撃','知覚','電脳','製作：','心理','自我','交渉','芸術：','運動','回避','白兵','操縦：','信用','圧力','隠密']);
  const GENERAL_SPECIALIZATION_PREFIXES=['製作：','芸術：','操縦：'];
  const prefixed=(name,prefix)=>{const cleaned=cleanName(name);if(!cleaned)return '';return cleaned.startsWith(prefix)?cleaned:`${prefix}${cleaned}`};
  const findGeneralRow=name=>{
    const exact=findRow('一般技能',name);
    if(exact)return exact;
    const normalized=cleanName(name);
    const prefix=GENERAL_SPECIALIZATION_PREFIXES.find(value=>normalized.startsWith(value));
    return prefix?findRow('一般技能',prefix):null;
  };

  async function resetSpecializedGeneralRows(){
    for(const prefix of GENERAL_SPECIALIZATION_PREFIXES){
      const row=skillRows('一般技能').find(candidate=>{
        const name=rowName(candidate);
        return (name===prefix||name.startsWith(prefix))&&!candidate.querySelector('[data-delete-skill]');
      });
      if(!row)continue;
      await setSkillRow(row,{name:prefix,level:0,s:false,c:false,h:false,d:false,free_level:0},'proper');
    }
  }

  async function importGeneral(map,stats){
    await resetSpecializedGeneralRows();
    await clearRows(()=>skillRows('一般技能'),row=>!FIXED_GENERAL.has(rowName(row)));
    for(const data of [...groups(map,'skills1'),...groups(map,'skills2')]){
      const rawName=firstDefined(data,'name');
      const name=cleanName(rawName);
      const level=skillLevel(data);
      if(!name||!level)continue;
      const row=findGeneralRow(name);
      const kind=name.includes('：')?'proper':'general';
      const done=row?await setSkillRow(row,{...data,name:rawName},kind):await addSkill('#add-general','一般技能',{...data,name:rawName},kind);
      if(done)stats.general++;
    }
    for(const data of groups(map,['skills3','socialskills','social'])){
      const rawName=firstDefined(data,'name');
      const name=prefixed(rawName,'社会：');
      if(!name||!skillLevel(data))continue;
      if(await addSkill('#add-social','社会',{...data,name:/^\s*★/.test(String(rawName||''))?`★${name}`:name},'proper'))stats.social++;
    }
    for(const data of groups(map,['skills4','connectionskills','connections'])){
      const rawName=firstDefined(data,'name');
      const raw=cleanName(rawName);
      if(!raw||/^ー+$/.test(raw)||!skillLevel(data))continue;
      const name=prefixed(raw,'コネ：');
      if(await addSkill('#add-connection','コネクション',{...data,name:/^\s*★/.test(String(rawName||''))?`★${name}`:name},'proper'))stats.connection++;
    }
  }

  function styleSkillKind(data){
    const label=String(firstDefined(data,'type','kind','category')||'');
    if(/演出|方向/.test(label))return 'direction';
    if(/奥義/.test(label))return 'ultimate';
    if(/秘技/.test(label))return 'secret';
    const cost=number(firstDefined(data,'expbase','experience','cost'));
    return cost>=50?'ultimate':cost>=20?'secret':cost>0&&cost<=2?'direction':'normal';
  }

  async function importStyleSkills(map,stats){
    await clearRows(()=>$$('#style-skills tr[data-skill-key]'));
    for(const data of groups(map,['superhumanskills','styleskills','styleSkills'])){
      const rawName=firstDefined(data,'name');
      const name=cleanName(rawName);
      const level=skillLevel(data);
      if(!name||!level||String(rawName).trim().startsWith('■'))continue;
      if(await addSkill('#add-style-skill','__style__',{...data,name:rawName},styleSkillKind(data)))stats.style++;
    }
  }

  open.addEventListener('click',()=>{msg.textContent='';dialog.showModal()});
  copy?.addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText(exporter);msg.textContent='ブックマークレットをコピーしました。'}
    catch{msg.textContent='コピーに失敗しました。ブラウザの権限を確認してください。'}
  });

  apply.addEventListener('click',async()=>{
    apply.disabled=true;
    msg.textContent='JSONを解析しています…';
    reportProgress(3,'JSONを解析中','取込データを検証しています');
    try{
      const data=JSON.parse(text.value);
      const supportedFields=Array.isArray(data.fields);
      const supportedRaw=data&&typeof data==='object'&&(data.base||data.skills1||data.superhumanskills||data.weapons);
      if(!supportedFields&&!supportedRaw)throw new Error('対応する旧キャラシJSONではありません。ブックマークレットで取得したJSON、または旧サイトの生JSONを貼り付けてください。');
      const map=fieldMap(data);
      if(!map.size)throw new Error('JSON内に取り込める項目がありません。');
      const stats={general:0,social:0,connection:0,style:0};

      msg.textContent='基本情報を反映しています…';
      reportProgress(8,'基本情報を取込中','プロフィールとライフパスを反映しています');
      await clearInitialSocialAndConnections();
      const castName=parseCastName(get(map,'base.name','name'));
      await setElement('#character-name',castName.name);
      await setElement('#handle',get(map,'base.handle','handle')||castName.handle);
      await setElement('#handle-kana',get(map,'base.handleKana','base.handle_kana','handleKana','handle_kana'));
      await setElement('#character-kana',get(map,'base.nameKana','base.kana','kana'));
      await setElement('#player-name',get(map,'base.player','player'));
      await setElement('#affiliation',get(map,'base.post','base.affiliation','affiliation'));
      await setElement('#citizen-rank',get(map,'base.rank','rank'));
      await setElement('#summary',get(map,'base.lifepath.memo','base.summary','summary'));
      await setElement('#age',get(map,'base.age','age'));
      await setElement('#gender',get(map,'base.sex','base.gender','sex','gender'));
      await setElement('#height',get(map,'base.height','height'));
      await setElement('#weight',get(map,'base.weight','weight'));
      await setElement('#eyes',get(map,'base.eyes','eyes'));
      await setElement('#hair',get(map,'base.hair','hair'));
      await setElement('#skin',get(map,'base.skin','skin'));
      await setElement('#life-path-origin',get(map,'base.lifepath.origin','base.lifepath.experience','life_path_origin'));
      await setElement('#life-path-experience',get(map,'base.lifepath.environment','life_path_experience'));
      await setElement('#life-path-encounter',get(map,'base.lifepath.encounter','base.lifepath.encouter','life_path_encounter'));
      const profileParts=[
        get(map,'base.memoir','base.profile','profile'),
        get(map,'base.memo')&&`【メモ】\n${get(map,'base.memo')}`,
        get(map,'base.birth')&&`出身：${get(map,'base.birth')}`
      ].filter(Boolean);
      await setElement('#profile',profileParts.join('\n\n'));

      msg.textContent='スタイルと能力値を反映しています…';
      reportProgress(18,'スタイル・能力値を取込中','スタイル、能力値、CSを反映しています');
      await importStyles(map);
      await importAbilities(map);
      msg.textContent='技能を反映しています…';
      reportProgress(28,'技能を取込中','一般技能・社会・コネを反映しています');
      await importGeneral(map,stats);
      reportProgress(36,'技能を取込中',`一般技能${stats.general}件・社会${stats.social}件・コネ${stats.connection}件を反映`);
      await importStyleSkills(map,stats);
      reportProgress(42,'スタイル技能を取込中',`スタイル技能${stats.style}件の取込を完了`);
      reportProgress(50,'基本取込完了','プロフィール・技能の基本取込を完了しました');

      document.dispatchEvent(new Event('input',{bubbles:true}));
      window.TNXExperience?.queue?.();
      const summary=`一般技能${stats.general}件、社会${stats.social}件、コネ${stats.connection}件、スタイル技能${stats.style}件`;
      const finalizing=dialog.getAttribute('data-importing')==='1';
      msg.textContent=finalizing
        ?`基本取込が完了しました（${summary}）。引き続き最終変換を行っています…`
        :`取込が完了し、編集画面へ反映しました。${summary}です。内容を確認し、保存ボタンでDBへ保存してください。`;
      document.dispatchEvent(new CustomEvent(BASE_IMPORT_EVENT,{detail:{ok:true,stats}}));
    }catch(error){
      console.error(error);
      const reason=error?.message||String(error);
      msg.textContent='取込エラー：'+reason;
      document.dispatchEvent(new CustomEvent(BASE_IMPORT_EVENT,{detail:{ok:false,error:reason}}));
    }finally{
      if(dialog.getAttribute('data-importing')!=='1')apply.disabled=false;
    }
  });
})();