/* Consolidated cast-view UI enhancements.
 * Formerly: cast-ui-v13.js, cast-ui-v14.js, cast-ui-v16.js,
 * cast-ui-v17.js, cast-ui-v20.js and cast-ui-v22.js.
 */

(() => {
  const suits = ['♠','♣','♥','♦'];
  let attempts = 0;
  function enhanceSkillSuits(){
    const rows = [...document.querySelectorAll('#skills-container .skill-section tbody tr')];
    if(!rows.length){if(attempts++ < 40) setTimeout(enhanceSkillSuits,100);return;}
    rows.forEach(row => {
      [3,4,5,6].forEach((column,index) => {
        const cell = row.children[column - 1];
        if(!cell || cell.querySelector('.cast-suit-box')) return;
        const active = cell.textContent.trim() !== '';
        cell.textContent = '';
        const box = document.createElement('span');
        box.className = `cast-suit-box${active ? ' is-active' : ''}`;
        box.textContent = suits[index];
        box.setAttribute('aria-label', `${suits[index]} ${active ? '取得済み' : '未取得'}`);
        cell.append(box);
      });
    });
  }
  enhanceSkillSuits();
})();

(() => {
  const publicId = new URLSearchParams(location.search).get('id')?.trim() || '';
  const editLink = document.querySelector('#cast-edit-button');
  if(editLink && publicId){editLink.href = `./sheet.html?id=${encodeURIComponent(publicId)}`;editLink.hidden = false;}
  let attempts = 0;
  function setBilingual(element,jp,en){
    if(!element) return;
    element.replaceChildren(document.createTextNode(jp));
    if(en){const small=document.createElement('small');small.textContent=en;element.append(document.createTextNode(' '),small);}
  }
  function setJapanese(element,jp){
    if(!element)return;
    element.replaceChildren(document.createTextNode(jp));
  }
  function localizeStatus(){
    const status=document.querySelector('#cast-status');if(!status)return;
    const text=status.textContent.trim();
    if(/^SCANNING IDENTIFICATION CODE:/i.test(text)){const code=text.split(':').slice(1).join(':').trim();status.textContent=`キャストデータを読み込み中：${code}`;}
    else if(text==='ACCESS GRANTED')status.textContent='キャストデータを表示しています。';
    else if(text==='ACCESS DENIED')status.textContent='キャストデータへアクセスできません。';
  }
  function localizeAbilityLabels(){
    const labels={VALUE:'能力値',CONTROL:'制御値',CURRENT:'現在値'};
    document.querySelectorAll('.ability-card__label').forEach(el=>{const hit=labels[el.textContent.trim().toUpperCase()];if(hit)setJapanese(el,hit);});
    const names={REASON:'理性',PASSION:'感情',LIFE:'生命',MUNDANE:'外界'};
    document.querySelectorAll('.ability-card:not(.ability-card--cs) header span:last-child').forEach(el=>{const hit=names[el.textContent.trim().toUpperCase()];if(hit)setJapanese(el,hit);});
  }
  function localizeSkillHeadings(){
    const labels={'GENERAL SKILLS':['一般技能','GENERAL SKILLS'],SOCIAL:['社会','SOCIAL'],CONNECTIONS:['コネクション','CONNECTIONS'],'STYLE SKILLS':['スタイル技能','STYLE SKILLS']};
    document.querySelectorAll('#skills-container .skill-section h3').forEach(el=>{const hit=labels[el.textContent.trim().toUpperCase()];if(hit)setBilingual(el,...hit);});
  }
  function localizeSkillTables(){
    const headers=['名称','LV','理性','感情','生命','外界','詳細'];
    document.querySelectorAll('#skills-container .data-table thead tr').forEach(row=>[...row.children].forEach((cell,index)=>{if(headers[index])setJapanese(cell,headers[index]);}));
  }
  function localizeOutfitTables(){
    const labels={NAME:'名称',PURCHASE:'購入',EXP:'常備化',SLOT:'部位',RANGE:'射程',ATTACK:'攻撃',DEFENSE:'防御',DESCRIPTION:'解説'};
    document.querySelectorAll('#outfit-container th').forEach(cell=>{const hit=labels[cell.textContent.trim().toUpperCase()];if(hit)setJapanese(cell,hit);});
  }
  function localizeOutfitHeadings(){
    const labels={WEAPON:['武器','WEAPON'],ARMOR:['防具','ARMOR'],CYBERWARE:['サイバーウェア','CYBERWARE'],TRON:['トロン','TRON'],VEHICLE:['ヴィークル','VEHICLE'],RESIDENCE:['住居','RESIDENCE'],OTHER:['その他','OTHER']};
    document.querySelectorAll('#outfit-container .outfit-section h2').forEach(el=>{const hit=labels[el.textContent.trim().toUpperCase()];if(hit)setBilingual(el,...hit);});
  }
  function localizeProfileLabels(){
    const labels={AGE:'年齢',GENDER:'性別',HEIGHT:'身長',WEIGHT:'体重',EYES:'瞳',HAIR:'髪',SKIN:'肌',ORIGIN:'出自',EXPERIENCE:'経験',ENCOUNTER:'邂逅'};
    document.querySelectorAll('#personal-data dt, #life-path dt').forEach(el=>{const hit=labels[el.textContent.trim().toUpperCase()];if(hit)setJapanese(el,hit);});
  }
  function localizeCastView(){
    const content=document.querySelector('#cast-content');
    if(!content || content.hidden){localizeStatus();if(attempts++<40)setTimeout(localizeCastView,100);return;}
    localizeStatus();localizeAbilityLabels();localizeSkillTables();localizeOutfitTables();localizeProfileLabels();localizeSkillHeadings();localizeOutfitHeadings();
  }
  localizeCastView();
})();

(() => {
  let attempts=0;
  function removeDetailColumn(section){section.querySelectorAll('tr').forEach(row=>{if(row.children.length>=7)row.children[6].remove();});}
  function applyLayout(){
    const container=document.querySelector('#skills-container');
    const sections=[...document.querySelectorAll('#skills-container .skill-section')];
    if(!container || !sections.length){if(attempts++<40)setTimeout(applyLayout,100);return;}
    container.classList.add('cast-skill-layout');
    let side=container.querySelector(':scope > .cast-skill-side');
    if(!side){side=document.createElement('div');side.className='cast-skill-side';}
    sections.forEach(section=>{
      const title=section.querySelector('h3')?.textContent||'';
      section.classList.remove('is-general','is-social','is-connection','is-style');
      if(title.includes('一般技能')){section.classList.add('is-general');removeDetailColumn(section);}
      else if(title.includes('社会')){section.classList.add('is-social');removeDetailColumn(section);side.append(section);}
      else if(title.includes('コネクション')){section.classList.add('is-connection');removeDetailColumn(section);side.append(section);}
      else if(title.includes('スタイル技能'))section.classList.add('is-style');
    });
    const general=container.querySelector(':scope > .skill-section.is-general');
    const style=container.querySelector(':scope > .skill-section.is-style');
    if(side.children.length && !side.parentElement){if(general)general.insertAdjacentElement('afterend',side);else container.prepend(side);}
    if(style)container.append(style);
    const panels=[...document.querySelectorAll('#tab-session .data-layout > .data-panel')];
    panels[0]?.classList.add('panel-ability');panels[1]?.classList.add('panel-skills');panels[2]?.classList.add('panel-combos');
    document.querySelectorAll('#outfit-container .data-panel').forEach(panel=>panel.classList.add('panel-outfits'));
  }
  applyLayout();
})();

(() => {
  let attempts=0;
  function apply(){
    const styleSection=document.querySelector('#skills-container .skill-section.is-style');
    if(!styleSection){if(attempts++<40)setTimeout(apply,100);return;}
    styleSection.querySelectorAll('tbody tr').forEach(row=>{
      const cell=row.lastElementChild;if(!cell || cell.querySelector('.cast-detail-textarea'))return;
      const textarea=document.createElement('textarea');textarea.className='cast-detail-textarea';textarea.readOnly=true;textarea.value=cell.textContent.trim();textarea.setAttribute('aria-label','スタイル技能の解説');cell.replaceChildren(textarea);
    });
  }
  apply();
})();

(() => {
  let attempts=0;
  function splitSkillPanels(){
    const original=document.querySelector('#tab-session .panel-skills');
    const styleSection=document.querySelector('#skills-container .skill-section.is-style');
    if(!original || !styleSection){if(attempts++<40)setTimeout(splitSkillPanels,100);return;}
    if(document.querySelector('#style-skill-panel'))return;
    const panel=document.createElement('section');panel.id='style-skill-panel';panel.className='data-panel data-panel--wide panel-style-skills';
    panel.innerHTML='<header class="data-panel__header"><h2>スタイル技能 <small>STYLE SKILLS</small></h2></header><div class="style-skill-panel__body"></div>';
    panel.querySelector('.style-skill-panel__body').append(styleSection);original.insertAdjacentElement('afterend',panel);
    const heading=styleSection.querySelector('h3');if(heading)heading.hidden=true;
  }
  splitSkillPanels();
})();

(() => {
  let attempts=0;
  function apply(){
    const outfit=document.querySelector('#outfit-container');
    if(!outfit || !outfit.querySelector('table')){if(attempts++<40)setTimeout(apply,100);return;}
    outfit.querySelectorAll('table').forEach(table=>{
      const headers=[...table.querySelectorAll('thead th')];
      const detailIndex=headers.findIndex(cell=>/解説|詳細/.test(cell.textContent));if(detailIndex<0)return;
      table.querySelectorAll('tbody tr').forEach(row=>{
        const cell=row.children[detailIndex];if(!cell || cell.querySelector('.cast-outfit-detail'))return;
        const textarea=document.createElement('textarea');textarea.className='cast-outfit-detail';textarea.readOnly=true;textarea.value=cell.textContent.trim();textarea.setAttribute('aria-label','アウトフィット解説');cell.replaceChildren(textarea);
      });
    });
  }
  apply();
})();