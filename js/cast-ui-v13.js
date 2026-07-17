const suits = ['♠','♣','♥','♦'];
let attempts = 0;

function enhanceSkillSuits(){
  const rows = [...document.querySelectorAll('#skills-container .skill-section tbody tr')];
  if(!rows.length){
    if(attempts++ < 40) setTimeout(enhanceSkillSuits,100);
    return;
  }

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
