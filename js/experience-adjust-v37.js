const INITIAL_CREATION_COST = 170;
const SOCIAL_INITIAL_DEDUCTION = 20;
const CONNECTION_INITIAL_DEDUCTION = 15;
const FIXED_GENERAL = new Set(["医療","射撃","知覚","電脳","心理","自我","交渉","運動","回避","白兵","信用","圧力","隠密"]);

const breakdown = document.querySelector("#exp-breakdown");
const total = document.querySelector("#exp-total");
const skillRoot = document.querySelector("#general-skills");

if (breakdown && total && skillRoot) {
  let queued = false;
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      applyExperienceAdjustment();
    });
  };

  new MutationObserver(queue).observe(breakdown, { childList: true, subtree: true });
  new MutationObserver(queue).observe(skillRoot, { childList: true, subtree: true });
  document.addEventListener("input", queue);
  document.addEventListener("change", queue);
  queue();
}

function rowCost(row, freeFixedGeneral = false) {
  const name = row.querySelector('[data-f="name"]')?.value.trim().replace(/^★/, "") || "";
  const level = Math.max(0, Number(row.querySelector('[data-f="level"]')?.value || 0));
  if (!name || level <= 0) return 0;
  const kind = row.querySelector('[data-f="skill_kind"]')?.value || "proper";
  const rate = kind === "proper" ? 5 : 10;
  const free = freeFixedGeneral && kind === "general" && FIXED_GENERAL.has(name) ? 1 : 0;
  return Math.max(0, level - free) * rate;
}

function calculateGeneralCost() {
  let general = 0;
  let social = 0;
  let connection = 0;

  document.querySelectorAll("#general-skills .skill-group").forEach(group => {
    const title = group.querySelector(".skill-group-title")?.textContent || "";
    group.querySelectorAll("tr[data-skill-key]").forEach(row => {
      if (title.includes("一般技能")) general += rowCost(row, true);
      else if (title.includes("社会")) social += rowCost(row, false);
      else if (title.includes("コネクション")) connection += rowCost(row, false);
    });
  });

  return general
    + Math.max(0, social - SOCIAL_INITIAL_DEDUCTION)
    + Math.max(0, connection - CONNECTION_INITIAL_DEDUCTION);
}

function applyExperienceAdjustment() {
  if (breakdown.querySelector('[data-exp-adjustment="initial"]')) return;

  const generalEntry = [...breakdown.querySelectorAll("div")]
    .find(item => item.querySelector("dt")?.textContent.trim() === "一般技能");
  const generalValue = generalEntry?.querySelector("dd");
  if (!generalValue) return;

  const previousGeneral = Number(generalValue.textContent || 0);
  const correctedGeneral = calculateGeneralCost();
  const baseTotal = Number(total.textContent || 0) - previousGeneral + correctedGeneral;
  const correctedTotal = Math.max(0, baseTotal - INITIAL_CREATION_COST);

  generalValue.textContent = String(correctedGeneral);
  total.textContent = String(correctedTotal);

  const adjustment = document.createElement("div");
  adjustment.dataset.expAdjustment = "initial";
  adjustment.innerHTML = `<dt>初期作成</dt><dd>-${INITIAL_CREATION_COST}</dd>`;
  breakdown.append(adjustment);
}
