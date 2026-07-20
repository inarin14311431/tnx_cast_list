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
    attack:'攻撃',defense:'防御',range:'射程',slot:'部位／エリア',control_modifier:'制御',
    cs_modifier:'CS',mundane_modifier:'外界',description:'解説',actions:''
  };

  const SCHEMAS={
    weapon:['category','name','purchase_value','experience_cost','concealment','attack','range','slot','description','actions'],
    armor:['category','name','purchase_value','experience_cost','concealment','defense','slot','description','actions'],
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

  function controlFor(card,key){
    if(key==='category')return card.querySelector('[data-o="category"]');
    if(key==='actions')return card.querySelector('[data-delete-outfit]');
    return card.querySelector(`[data-o="${key}"]`);
  }

  function makeCell(card,key){
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
    scroll.append(table);
    section.append(title,scroll);
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
