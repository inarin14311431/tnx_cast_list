const INITIAL_CREATION_EXP = 170;
const total = document.querySelector("#exp-total");
const breakdown = document.querySelector("#exp-breakdown");
let correcting = false;

function applyInitialCreationDeduction(){
  if(correcting || !total || !breakdown) return;
  correcting = true;

  let deductionRow = breakdown.querySelector('[data-initial-exp-deduction="1"]');
  const hasDeduction = Boolean(deductionRow);
  const currentTotal = Number(total.textContent || 0);

  if(!hasDeduction){
    total.textContent = String(Math.max(0, currentTotal - INITIAL_CREATION_EXP));
    deductionRow = document.createElement("div");
    deductionRow.dataset.initialExpDeduction = "1";
    deductionRow.innerHTML = `<dt>初期作成分</dt><dd>-${INITIAL_CREATION_EXP}</dd>`;
    breakdown.append(deductionRow);
  }

  correcting = false;
}

if(total && breakdown){
  const observer = new MutationObserver(() => requestAnimationFrame(applyInitialCreationDeduction));
  observer.observe(total,{childList:true,subtree:true,characterData:true});
  observer.observe(breakdown,{childList:true,subtree:true,characterData:true});
  requestAnimationFrame(applyInitialCreationDeduction);
}
