/* Convert complete outfit cards into category-specific tables. */
(function(){
  const root=document.querySelector('#outfit-list');
  if(!root)return;
  const RENDER_EVENT='tnx:outfit-tables-rendered';

  const CATEGORIES=[
    ['weapon','武器','WEAPONS','ADD WEAPON'],
    ['armor','防具','ARMOR','ADD ARMOR'],
    ['cyberware','サイバーウェア','CYBERWARE','ADD CYBERWARE'],
    ['tron','トロン','TRON','ADD TRON'],
    ['vehicle','ヴィークル','VEHICLES','ADD VEHICLE'],
    ['residence','住居','RESIDENCES','ADD RESIDENCE'],
    ['other','その他','OTHER','ADD OTHER']
  ];

  const OFC_FIELDS=new Set([
    'concealment_penalty','parry','speed','electronic_control','defense_s','defense_p','defense_i',
    'ianus_surface','ianus_deep','ianus_none','tron_software','tron_support','tron_hardware',
    'crew','sf','residence_entry','residence_electric','residence_area','manufacturer','page_number',
    'major_category','minor_category'
  ]);

  const BASE_LABELS={
    category:'分類',name:'名称',purchase_value:'購入',experience_cost:'常備化',concealment:'隠匿値',concealment_penalty:'隠匿修正',
    attack:'攻撃',parry:'受',range:'射程',speed:'ス',electronic_control:'電制',defense_s:'S',defense_p:'P',defense_i:'I',
    control_modifier:'制御値',cs_modifier:'CS修正',ianus_surface:'表',ianus_deep:'深',ianus_none:'無',
    tron_software:'ソ',tron_support:'サ',tron_hardware:'ハ',crew:'乗員',sf:'SF',residence_entry:'登',residence_electric:'電',residence_area:'ア',
    slot:'部位',manufacturer:'メーカー',page_number:'参照P',major_category:'OFC大分類',minor_category:'OFC小分類',description:'解説',actions:''
  };

  const RAW_CARD_SCHEMAS={
    weapon:['category','name','purchase_value','experience_cost','concealment','concealment_penalty','attack','parry','range','speed','electronic_control','slot','manufacturer','page_number','major_category','minor_category','description','actions'],
    armor:['category','name','purchase_value','experience_cost','concealment','concealment_penalty','defense_s','defense_p','defense_i','control_modifier','electronic_control','slot','manufacturer','page_number','major_category','minor_category','description','actions'],
    cyberware:['category','name','purchase_value','experience_cost','concealment','concealment_penalty','electronic_control','ianus_surface','ianus_deep','ianus_none','slot','manufacturer','page_number','major_category','minor_category','description','actions'],
    tron:['category','name','purchase_value','experience_cost','concealment','concealment_penalty','electronic_control','speed','tron_software','tron_support','tron_hardware','cs_modifier','slot','manufacturer','page_number','major_category','minor_category','description','actions'],
    vehicle:['category','name','purchase_value','experience_cost','concealment','concealment_penalty','attack','speed','control_modifier','cs_modifier','electronic_control','defense_s','defense_p','defense_i','crew','sf','slot','manufacturer','page_number','major_category','minor_category','description','actions'],
    residence:['category','name','purchase_value','experience_cost','concealment','concealment_penalty','speed','electronic_control','residence_entry','residence_electric','residence_area','slot','manufacturer','page_number','major_category','minor_category','description','actions'],
    other:['category','name','purchase_value','experience_cost','concealment','concealment_penalty','electronic_control','slot','manufacturer','page_number','major_category','minor_category','description','actions']
  };

  let queued=false;
  let rebuilding=false;
  const observer=new MutationObserver(queue);

  function queue(){
    if(queued||rebuilding)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;enhance();});
  }

  function notifyRendered(){
    root.dispatchEvent(new CustomEvent(RENDER_EVENT,{detail:{rows:root.querySelectorAll('.outfit-table-row[data-outfit-key]').length}}));
  }

  function controlFor(card,key){
    if(key==='category')return card.querySelector('[data-o="category"]');
    return card.querySelector(`[data-o="${key}"]`);
  }

  function readControlValue(control){
    return control.type==='number'?Number(control.value||0):control.value;
  }

  function captureCardData(card){
    const data={};
    card.querySelectorAll('[data-o]').forEach(control=>{
      data[control.dataset.o]=readControlValue(control);
    });
    return data;
  }

  function prepareNumberControl(control){
    if(!(control instanceof HTMLInputElement))return control;
    control.type='number';
    control.min='0';
    control.max='999';
    control.step='1';
    control.inputMode='numeric';
    return control;
  }

  function prepareDescriptionControl(control){
    if(!control)return null;
    if(control instanceof HTMLTextAreaElement){control.rows=1;return control;}
    if(!(control instanceof HTMLInputElement))return control;
    const textarea=document.createElement('textarea');
    textarea.dataset.o='description';
    textarea.rows=1;
    textarea.value=control.value;
    textarea.addEventListener('input',()=>{
      control.value=textarea.value;
      control.dispatchEvent(new Event('input',{bubbles:true}));
    });
    control.hidden=true;
    return textarea;
  }

  function moveButton(direction,key){
    const button=document.createElement('button');
    button.type='button';
    button.className=`row-action row-action--${direction} outfit-order-button`;
    button.dataset.action=direction==='up'?'move-up':'move-down';
    button.dataset.outfitMove=direction;
    button.dataset.outfitKey=key;
    button.textContent=direction==='up'?'▲':'▼';
    button.setAttribute('aria-label',direction==='up'?'上へ移動':'下へ移動');
    button.title=direction==='up'?'上へ移動':'下へ移動';
    return button;
  }

  function makeActionsCell(card){
    const td=document.createElement('td');
    td.className='outfit-table-cell outfit-table-cell--actions';
    const controls=document.createElement('span');
    controls.className='row-actions outfit-row-actions';
    const key=card.dataset.outfitKey||'';
    const remove=card.querySelector('[data-delete-outfit]');
    if(remove){
      remove.className='row-action row-action--delete outfit-delete-button';
      remove.dataset.action='delete';
      remove.textContent='×';
      remove.setAttribute('aria-label','削除');
      remove.title='削除';
    }
    controls.append(moveButton('up',key),moveButton('down',key));
    if(remove)controls.append(remove);
    td.append(controls);
    return td;
  }

  function makeCell(card,key){
    if(key==='actions')return makeActionsCell(card);
    const td=document.createElement('td');
    td.className=`outfit-table-cell outfit-table-cell--${key}${OFC_FIELDS.has(key)?' outfit-table-cell--ofc':''}`;
    if(OFC_FIELDS.has(key))td.dataset.ofcCell=key;
    let control=controlFor(card,key);
    if(!control)return td;
    if(key==='purchase_value'||key==='experience_cost')control=prepareNumberControl(control);
    if(key==='description')control=prepareDescriptionControl(control);
    td.append(control);
    return td;
  }

  function makeRow(card,category){
    const tr=document.createElement('tr');
    tr.dataset.outfitKey=card.dataset.outfitKey||'';
    tr.dataset.outfitOfcDetails=card.dataset.outfitOfcDetails||'{}';
    tr.className='outfit-table-row';
    tr._outfitTransportData=captureCardData(card);
    for(const key of RAW_CARD_SCHEMAS[category])tr.append(makeCell(card,key));
    return tr;
  }

  function makeArmorFooter(){
    const tfoot=document.createElement('tfoot');
    const row=document.createElement('tr');
    row.className='armor-defense-total-row';
    const label=document.createElement('th');
    label.colSpan=5; label.textContent='防御値合計'; row.append(label);
    for(const key of ['s','p','i']){
      const cell=document.createElement('td');
      cell.className=`armor-defense-total armor-defense-total--${key}`;
      cell.dataset.armorTotal=key; cell.textContent='0'; row.append(cell);
    }
    const tail=document.createElement('td'); tail.colSpan=4; row.append(tail);
    tfoot.append(row); return tfoot;
  }

  function updateArmorTotals(section){
    if(!section)return;
    const totals={s:0,p:0,i:0};
    for(const key of ['s','p','i']){
      section.querySelectorAll(`[data-ofc="defense_${key}"]`).forEach(input=>{
        totals[key]+=Number(input.value||0);
      });
      const cell=section.querySelector(`[data-armor-total="${key}"]`);
      if(cell)cell.textContent=String(totals[key]);
    }
  }

  function updateMoveStates(section){
    const rows=[...section.querySelectorAll('tbody .outfit-table-row')];
    rows.forEach((row,index)=>{
      const up=row.querySelector('[data-outfit-move="up"]');
      const down=row.querySelector('[data-outfit-move="down"]');
      if(up)up.disabled=index===0;
      if(down)down.disabled=index===rows.length-1;
    });
  }

  function makeCategoryAddButton(category,label,addLabel){
    const button=document.createElement('button');
    button.type='button';
    button.className='skill-inline-add outfit-category-add';
    button.dataset.addOutfitCategory=category;
    button.innerHTML=`${label}を追加 <small>${addLabel}</small>`;
    return button;
  }

  function makeTable(category,cards,label,en,addLabel){
    const section=document.createElement('section');
    section.className=`outfit-table-group outfit-table-group--${category}`;
    section.dataset.outfitCategory=category;

    const heading=document.createElement('div');
    heading.className='outfit-table-heading';
    const title=document.createElement('h3');
    title.className='outfit-table-title';
    title.innerHTML=`${label} <small>${en}</small>`;
    heading.append(title,makeCategoryAddButton(category,label,addLabel));
    section.append(heading);

    if(!cards.length){
      const empty=document.createElement('p');
      empty.className='outfit-table-empty';
      empty.textContent=`${label}は未登録です。`;
      section.append(empty);
      return section;
    }

    const scroll=document.createElement('div'); scroll.className='outfit-table-scroll';
    const table=document.createElement('table'); table.className='outfit-table'; table.dataset.outfitSchema=category;
    const thead=document.createElement('thead'); const headRow=document.createElement('tr');
    for(const key of RAW_CARD_SCHEMAS[category]){
      const th=document.createElement('th');
      th.className=`outfit-table-head outfit-table-head--${key}${OFC_FIELDS.has(key)?' outfit-table-head--ofc':''}`;
      if(OFC_FIELDS.has(key))th.dataset.ofcHead=key;
      th.textContent=BASE_LABELS[key];
      headRow.append(th);
    }
    thead.append(headRow);
    const tbody=document.createElement('tbody'); cards.forEach(card=>tbody.append(makeRow(card,category)));
    table.append(thead,tbody); if(category==='armor')table.append(makeArmorFooter());
    scroll.append(table); section.append(scroll);
    requestAnimationFrame(()=>{updateMoveStates(section);if(category==='armor')updateArmorTotals(section);});
    return section;
  }

  function readRow(row){
    const data={...(row._outfitTransportData||{})};
    row.querySelectorAll('[data-o]').forEach(control=>{
      data[control.dataset.o]=readControlValue(control);
    });
    return {key:row.dataset.outfitKey||'',category:data.category||'other',data};
  }

  function snapshot(){return [...root.querySelectorAll('.outfit-table-row[data-outfit-key]')].map(readRow);}

  function addRawOutfit(data){
    const generic=document.querySelector('#add-outfit');
    if(!generic)return;
    generic.click();
    let cards=[...root.querySelectorAll(':scope > .outfit-card[data-outfit-key]')];
    let card=cards[cards.length-1];
    if(!card)return;
    const category=card.querySelector('[data-o="category"]');
    category.value=data.category||'other';
    category.dispatchEvent(new Event('input',{bubbles:true}));
    cards=[...root.querySelectorAll(':scope > .outfit-card[data-outfit-key]')];
    card=cards[cards.length-1];
    if(!card)return;
    for(const [field,value] of Object.entries(data.data||{})){
      if(field==='category')continue;
      const control=card.querySelector(`[data-o="${field}"]`);
      if(!control)continue;
      control.value=value??'';
      control.dispatchEvent(new Event('input',{bubbles:true}));
    }
  }

  function rebuildFrom(items,focusKey=''){
    rebuilding=true; observer.disconnect();
    try{
      let remove;
      while((remove=root.querySelector('[data-delete-outfit]')))remove.click();
      items.forEach(item=>addRawOutfit(item));
    }finally{
      rebuilding=false;
      observer.observe(root,{childList:true,subtree:true});
      queue();
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        const target=focusKey&&root.querySelector(`.outfit-table-row[data-outfit-key="${focusKey}"] input[data-o="name"]`);
        target?.focus();
      }));
    }
  }

  function moveOutfit(key,direction){
    const rows=[...root.querySelectorAll('.outfit-table-row[data-outfit-key]')];
    const row=rows.find(item=>item.dataset.outfitKey===key);
    if(!row)return;
    const siblings=[...row.closest('tbody').querySelectorAll('.outfit-table-row[data-outfit-key]')];
    const localIndex=siblings.indexOf(row);
    const other=direction==='up'?siblings[localIndex-1]:siblings[localIndex+1];
    if(!other)return;
    const items=snapshot();
    const a=items.findIndex(item=>item.key===key);
    const b=items.findIndex(item=>item.key===other.dataset.outfitKey);
    if(a<0||b<0)return;
    [items[a],items[b]]=[items[b],items[a]];
    rebuildFrom(items,key);
  }

  function addCategory(category){
    addRawOutfit({category,data:{category}});
    queue();
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      const rows=[...root.querySelectorAll(`.outfit-table-group--${category} .outfit-table-row`)];
      rows[rows.length-1]?.querySelector('[data-o="name"]')?.focus();
    }));
  }

  function configureToolbar(){
    const generic=document.querySelector('#add-outfit');
    const toolbar=generic?.closest('.toolbar');
    if(!generic||!toolbar)return;
    toolbar.querySelector('.outfit-category-adds')?.remove();
    generic.hidden=true;
    generic.tabIndex=-1;
    generic.setAttribute('aria-hidden','true');
    toolbar.classList.add('outfit-import-toolbar');
  }

  function enhance(){
    const cards=[...root.querySelectorAll(':scope > .outfit-card[data-outfit-key]')];
    if(!cards.length&&root.querySelector('.outfit-table-group')){
      updateArmorTotals(root.querySelector('.outfit-table-group--armor'));
      return;
    }

    const grouped=new Map(CATEGORIES.map(([key])=>[key,[]]));
    for(const card of cards){
      const category=card.querySelector('[data-o="category"]')?.value||'other';
      (grouped.get(category)||grouped.get('other')).push(card);
    }

    observer.disconnect();
    try{
      const fragment=document.createDocumentFragment();
      for(const [key,label,en,addLabel] of CATEGORIES){
        fragment.append(makeTable(key,grouped.get(key)||[],label,en,addLabel));
      }
      root.replaceChildren(fragment);
      notifyRendered();
    }finally{
      observer.observe(root,{childList:true,subtree:true});
    }
  }

  document.addEventListener('click',event=>{
    const add=event.target.closest('[data-add-outfit-category]');
    if(add){event.preventDefault();addCategory(add.dataset.addOutfitCategory);return;}
    const move=event.target.closest('[data-outfit-move]');
    if(move){event.preventDefault();moveOutfit(move.dataset.outfitKey,move.dataset.outfitMove);}
  });

  root.addEventListener('input',event=>{
    if(!event.target.matches?.('[data-ofc="defense_s"],[data-ofc="defense_p"],[data-ofc="defense_i"]'))return;
    updateArmorTotals(event.target.closest('.outfit-table-group--armor'));
  });

  configureToolbar();
  observer.observe(root,{childList:true,subtree:true});
  queue();
})();