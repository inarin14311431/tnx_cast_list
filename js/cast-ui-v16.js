let castLayoutAttempts = 0;

function applyCastV16Layout(){
  const container = document.querySelector('#skills-container');
  const sections = [...document.querySelectorAll('#skills-container .skill-section')];
  if(!container || !sections.length){
    if(castLayoutAttempts++ < 40) window.setTimeout(applyCastV16Layout,100);
    return;
  }

  container.classList.add('cast-skill-layout');

  let sideColumn = container.querySelector(':scope > .cast-skill-side');
  if(!sideColumn){
    sideColumn = document.createElement('div');
    sideColumn.className = 'cast-skill-side';
  }

  sections.forEach(section => {
    const title = section.querySelector('h3')?.textContent || '';
    section.classList.remove('is-general','is-social','is-connection','is-style');

    if(title.includes('一般技能')){
      section.classList.add('is-general');
      removeDetailColumn(section);
    }else if(title.includes('社会')){
      section.classList.add('is-social');
      removeDetailColumn(section);
      sideColumn.append(section);
    }else if(title.includes('コネクション')){
      section.classList.add('is-connection');
      removeDetailColumn(section);
      sideColumn.append(section);
    }else if(title.includes('スタイル技能')){
      section.classList.add('is-style');
    }
  });

  const general = container.querySelector(':scope > .skill-section.is-general');
  const style = container.querySelector(':scope > .skill-section.is-style');
  if(sideColumn.children.length && !sideColumn.parentElement){
    if(general) general.insertAdjacentElement('afterend',sideColumn);
    else container.prepend(sideColumn);
  }
  if(style) container.append(style);

  const sessionPanels = [...document.querySelectorAll('#tab-session .data-layout > .data-panel')];
  sessionPanels[0]?.classList.add('panel-ability');
  sessionPanels[1]?.classList.add('panel-skills');
  sessionPanels[2]?.classList.add('panel-combos');

  document.querySelectorAll('#outfit-container .data-panel').forEach(panel => panel.classList.add('panel-outfits'));
}

function removeDetailColumn(section){
  section.querySelectorAll('tr').forEach(row => {
    if(row.children.length >= 7) row.children[6].remove();
  });
}

applyCastV16Layout();
