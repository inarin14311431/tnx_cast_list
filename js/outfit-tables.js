/* Convert outfit cards into category-specific tables without changing save logic. */
(function(){
  const root=document.querySelector('#outfit-list');
  if(!root)return;

  const CATEGORIES=[
    ['weapon','武器','WEAPONS'],
    ['armor','防具','ARMOR'],
    ['cyberware','サイバーウェア','CYBERWARE'],
    ['tron','トロン','TRON'],
    ['vehicle','ヴィークル','VEHICLES'],
    ['residence','住居','RESIDENCES'],
    ['other','その他','OTHER']
  ];

  const LABELS={
    category:'分類',name:'名称',purchase_value:'購入',experience_cost:'常備化',concealment:'隠匿',
    attack:'攻撃',defense:'防御',defense_s:'S',defense_i:'I',defense_p:'P',range:'射程',slot:'部位／エリア',
    control_modifier:'制御',cs_modifier:'CS',mundane_modifier:'外界',description:'解説',actions:''
  };

  const SCHEMAS={
    weapon:['category','name','purchase_value','experience_cost','concealment','attack','range','slot','description','actions'],
    armor:['category','name','purchase_value','experience_cost','concealment','defense_s','defense_i','defense_p','slot','description','actions'],
    cyberware:['category','name','purchase_value','experience_cost','concealment','slot','control_modifier','cs_modifier','mundane_modifier','description','actions'],
    tron:['category','name','purchase_value','experience_cost','concealment','slot','control_modifier','cs_modifier','mundane_modifier','description','actions'],
    vehicle:['category','name','purchase_value','experience_cost','attack','defense','control_modifier','cs_modifier','description','actions'],
    residence:['category','name','purchase_value','experience_cost','mundane_modifier','slot','description','actions'],
    other:['category','name','purchase_value','experience_cost','concealment','slot','control_modifier','cs_modifier','mundane_modifier','description','actions']
  };

  let queued=false;
  const observer=new MutationObserver(queue);

  function queue(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;enhance();});
  }

  function parseArmorDefense(value){
    const text=String(value??'').trim();
    if(!text)return {s:'',i:'',p:''};
    const labeled={s:'',i:'',p:''};
    const matches=[...text.matchAll(/\b([SIP])\s*[:：]?\s*(-?\d+)/gi)];
    if(matches.length){
      for(const match of matches)labeled[match[1].toLowerCase()]=match[2];
      return labeled;
    }
    const parts=text.split(/[\/／,，\s]+/).filter(Boolean);
    if(parts.length>=2)return {s:parts[0]||'',i:parts[1]||'',p:parts[2]||''};
    return {s:text,i:'',p:''};
  }

  function encodeArmorDefense(values){
    return [values.s,values.i,values.p].map(value=>String(value??'').trim()).join('/');
  }

  function armorValue(card,key){
    if(!card._armorDefenseValues){
      const original=card.querySelector('[data-o="defense"]');
      card._armorDefenseOriginal=original||null;
      card._armorDefenseValues=parseArmorDefense(original?.value||'');
    }
    return card._armorDefenseValues[key.slice(-1)]??'';
  }

  function updateArmorDefense(card,key,value){
    const part=key.slice(-1);
    if(!card._armorDefenseValues)armorValue(card,key);
    card._armorDefenseValues[part]=value;
    const original=card._armorDefenseOriginal;
    if(!original)return;
    original.value=encodeArmorDefense(card._armorDefenseValues);
    original.dispatchEvent(new Event('input',{bubbles:true}));
    updateArmorTotals(card.closest('.outfit-table-group--armor'));
  }

  function controlFor(card,key){
    if(key==='category')return card.querySelector('[data-o="category"]');
    if(key==='actions')return card.querySelector('[data-delete-outfit]');
    return card.querySelector(`[data-o="${key}"]`);
  }

  function makeArmorDefenseCell(card,key){
    const td=document.createElement('td');
    td.className=`outfit-table-cell outfit-table-cell--${key}`;
    const input=document.createElement('input');
    input.type='number';
    input.step='1';
    input.value=armorValue(card,key);
    input.dataset.armorDefense=key.slice(-1).toUpperCase();
    input.setAttribute('aria-label',`防御値${key.slice(-1).toUpperCase()}`);
    input.addEventListener('input',()=>updateArmorDefense(card,key,input.value));
    td.append(input);
    if(key==='defense_s'&&card._armorDefenseOriginal){
      card._armorDefenseOriginal.hidden=true;
      card._armorDefenseOriginal.style.display='none';
      card._armorDefenseOriginal.tabIndex=-1;
      td.append(card._armorDefenseOriginal);
    }
    return td;
  }

  function makeCell(card,key){
    if(/^defense_[sip]$/.test(key))return makeArmorDefenseCell(card,key);
    const td=document.createElement('td');
    td.className=`outfit-table-cell outfit-table-cell--${key}`;
    const control=controlFor(card,key);
    if(!control)return td;
    if(key==='description'&&control.tagName==='TEXTAREA')control.rows=1;
    td.append(control);
    return td;
  }

  function makeRow(card,category){
    const tr=document.createElement('tr');
    tr.dataset.outfitKey=card.dataset.outfitKey||'';
    tr.className='outfit-table-row';
    for(const key of SCHEMAS[category])tr.append(makeCell(card,key));
    return tr;
  }

  function makeArmorFooter(){
    const tfoot=document.createElement('tfoot');
    const row=document.createElement('tr');
    row.className='armor-defense-total-row';
    const label=document.createElement('th');
    label.colSpan=5;
    label.textContent='防御値合計';
    row.append(label);
    for(const key of ['s','i','p']){
      const cell=document.createElement('td');
      cell.className=`armor-defense-total armor-defense-total--${key}`;
      cell.dataset.armorTotal=key;
      cell.textContent='0';
      row.append(cell);
    }
    const tail=document.createElement('td');
    tail.colSpan=3;
    row.append(tail);
    tfoot.append(row);
    return tfoot;
  }

  function updateArmorTotals(section){
    if(!section)return;
    const totals={s:0,i:0,p:0};
    section.querySelectorAll('[data-armor-defense]').forEach(input=>{
      const key=input.dataset.armorDefense.toLowerCase();
      totals[key]+=Number(input.value||0);
    });
    for(const key of ['s','i','p']){
      const cell=section.querySelector(`[data-armor-total="${key}"]`);
      if(cell)cell.textContent=String(totals[key]);
    }
  }

  function makeTable(category,cards,label,en){
    const section=document.createElement('section');
    section.className=`outfit-table-group outfit-table-group--${category}`;
    section.dataset.outfitCategory=category;

    const title=document.createElement('h3');
    title.className='outfit-table-title';
    title.innerHTML=`${label} <small>${en}</small>`;

    const scroll=document.createElement('div');
    scroll.className='outfit-table-scroll';
    const table=document.createElement('table');
    table.className='outfit-table';
    table.dataset.outfitSchema=category;

    const thead=document.createElement('thead');
    const headRow=document.createElement('tr');
    for(const key of SCHEMAS[category]){
      const th=document.createElement('th');
      th.className=`outfit-table-head outfit-table-head--${key}`;
      th.textContent=LABELS[key];
      headRow.append(th);
    }
    thead.append(headRow);

    const tbody=document.createElement('tbody');
    cards.forEach(card=>tbody.append(makeRow(card,category)));
    table.append(thead,tbody);
    if(category==='armor')table.append(makeArmorFooter());
    scroll.append(table);
    section.append(title,scroll);
    if(category==='armor')requestAnimationFrame(()=>updateArmorTotals(section));
    return section;
  }

  function enhance(){
    const cards=[...root.querySelectorAll(':scope > .outfit-card[data-outfit-key]')];
    if(!cards.length)return;

    const grouped=new Map(CATEGORIES.map(([key])=>[key,[]]));
    for(const card of cards){
      const category=card.querySelector('[data-o="category"]')?.value||'other';
      (grouped.get(category)||grouped.get('other')).push(card);
    }

    observer.disconnect();
    try{
      const fragment=document.createDocumentFragment();
      for(const [key,label,en] of CATEGORIES){
        const items=grouped.get(key)||[];
        if(items.length)fragment.append(makeTable(key,items,label,en));
      }
      root.replaceChildren(fragment);
    }finally{
      observer.observe(root,{childList:true,subtree:true});
    }
  }

  observer.observe(root,{childList:true,subtree:true});
  queue();
})();