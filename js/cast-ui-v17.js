let castV17Attempts = 0;

function applyCastV17(){
  const styleSection = document.querySelector('#skills-container .skill-section.is-style');
  if(!styleSection){
    if(castV17Attempts++ < 40) window.setTimeout(applyCastV17,100);
    return;
  }

  styleSection.querySelectorAll('tbody tr').forEach(row => {
    const cell = row.lastElementChild;
    if(!cell || cell.querySelector('.cast-detail-textarea')) return;
    const textarea = document.createElement('textarea');
    textarea.className = 'cast-detail-textarea';
    textarea.readOnly = true;
    textarea.value = cell.textContent.trim();
    textarea.setAttribute('aria-label','スタイル技能の解説');
    cell.replaceChildren(textarea);
  });
}

applyCastV17();