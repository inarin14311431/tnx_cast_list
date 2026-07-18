const INITIAL_CREATION_EXP = 170;
const INITIAL_SOCIAL_EXP = 20;
const INITIAL_CONNECTION_EXP = 15;
const FIXED_GENERAL = new Set(["医療","射撃","知覚","電脳","製作：","心理","自我","交渉","芸術：","運動","回避","白兵","操縦：","信用","圧力","隠密"]);
const total = document.querySelector("#exp-total");
const breakdown = document.querySelector("#exp-breakdown");
let correcting = false;

function calculateGeneralExperience(){
  let cost = 0;
  document.querySelectorAll("#general-skills .skill-group").forEach(group => {
    const title = group.querySelector(".skill-group-title")?.textContent || "";
    group.querySelectorAll("tr[data-skill-key]").forEach(row => {
      const name = row.querySelector('input[data-f="name"]')?.value.trim() || "";
      const level = Number(row.querySelector('input[data-f="level"]')?.value || 0);
      if(!name || level <= 0) return;
      const kind = row.querySelector('select[data-f="skill_kind"]')?.value || "proper";
      let free = 0;
      if(title.includes("一般技能") && FIXED_GENERAL.has(name) && !name.endsWith("：")) free = 1;
      else if(title.includes("社会") && /^社会[：:]?[ＮN]◎[ＶV][ＡA]$/i.test(name.replace(/\s/g,""))) free = 1;
      cost += Math.max(0, level - free) * (kind === "proper" ? 5 : 10);
    });
  });
  return Math.max(0, cost - INITIAL_SOCIAL_EXP - INITIAL_CONNECTION_EXP);
}

function setDeductionRow(key,label,value){
  let row = breakdown.querySelector(`[data-exp-deduction="${key}"]`);
  if(!row){
    row = document.createElement("div");
    row.dataset.expDeduction = key;
    breakdown.append(row);
  }
  row.innerHTML = `<dt>${label}</dt><dd>-${value}</dd>`;
}

function applyExperienceRules(){
  if(correcting || !total || !breakdown) return;
  const entries = [...breakdown.querySelectorAll(":scope > div")].filter(row => !row.dataset.expDeduction);
  if(!entries.length) return;
  correcting = true;

  const generalEntry = entries.find(row => row.querySelector("dt")?.textContent.trim() === "一般技能");
  if(generalEntry){
    const value = generalEntry.querySelector("dd");
    if(value) value.textContent = String(calculateGeneralExperience());
  }

  setDeductionRow("social","社会初期分",INITIAL_SOCIAL_EXP);
  setDeductionRow("connection","コネ初期分",INITIAL_CONNECTION_EXP);
  setDeductionRow("creation","初期作成分",INITIAL_CREATION_EXP);

  const subtotal = entries.reduce((sum,row) => sum + Number(row.querySelector("dd")?.textContent || 0),0);
  total.textContent = String(Math.max(0, subtotal - INITIAL_CREATION_EXP));
  correcting = false;
}

if(total && breakdown){
  const observer = new MutationObserver(() => requestAnimationFrame(applyExperienceRules));
  observer.observe(total,{childList:true,subtree:true,characterData:true});
  observer.observe(breakdown,{childList:true,subtree:true,characterData:true});
  document.addEventListener("input",() => requestAnimationFrame(applyExperienceRules));
  document.addEventListener("change",() => requestAnimationFrame(applyExperienceRules));
  requestAnimationFrame(applyExperienceRules);
}
