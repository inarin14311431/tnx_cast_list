const PROPER_SKILLS = {
  "製作：": "reason",
  "芸術：": "passion",
  "操縦：": "life"
};
const SUITS = ["reason", "passion", "life", "mundane"];
const FIXED_GENERAL = new Set(["医療","射撃","知覚","電脳","心理","自我","交渉","運動","回避","白兵","信用","圧力","隠密"]);
const generalArea = document.querySelector("#general-skills");
const styleArea = document.querySelector("#style-skills");
let refreshQueued = false;
let correctingExperience = false;

initialize();

function initialize(){
  bindActions();
  initializeSkillUi();
  initializeOutfitEnhancer();
  initializeExperienceCorrection();
  updateViewLink();
  const status = document.querySelector("#save-status");
  if(status) new MutationObserver(updateViewLink).observe(status,{childList:true,subtree:true});
}

function bindActions(){
  document.addEventListener("click", event => {
    const properButton = event.target.closest("[data-add-proper]");
    if(properButton){
      event.preventDefault();
      event.stopPropagation();
      createProperSkill(properButton.dataset.addProper);
      return;
    }

    const action = event.target.closest("[data-skill-ui-action]")?.dataset.skillUiAction;
    if(action){
      event.preventDefault();
      event.stopPropagation();
      if(action in PROPER_SKILLS) createProperSkill(action);
      else document.querySelector(action)?.click();
      return;
    }

    const checkbox = event.target.closest('#general-skills input[type="checkbox"][data-f]');
    if(checkbox && SUITS.includes(checkbox.dataset.f)){
      const row = checkbox.closest("tr[data-skill-key]");
      const name = row?.querySelector('input[data-f="name"]')?.value || "";
      const level = Number(row?.querySelector('input[data-f="level"]')?.value || 0);
      if(name in PROPER_SKILLS && level === 0){
        event.preventDefault();
        event.stopImmediatePropagation();
        createProperSkill(name, checkbox.dataset.f);
        return;
      }
    }

    const moveButton = event.target.closest("[data-style-move]");
    if(moveButton){
      event.preventDefault();
      moveStyleSkill(moveButton);
    }
  }, true);
}

function createProperSkill(prefix, selectedSuit = ""){
  const hiddenAdd = document.querySelector("#add-general");
  if(!hiddenAdd) return;

  const before = new Set([...document.querySelectorAll("#general-skills tr[data-skill-key]")].map(row => row.dataset.skillKey));
  hiddenAdd.click();

  const row = [...document.querySelectorAll("#general-skills tr[data-skill-key]")]
    .find(item => !before.has(item.dataset.skillKey));
  if(!row) return;

  const key = row.dataset.skillKey;
  const nameInput = row.querySelector('input[data-f="name"]');
  const kindSelect = row.querySelector('select[data-f="skill_kind"]');
  const levelInput = row.querySelector('input[data-f="level"]');
  if(!nameInput || !kindSelect || !levelInput) return;

  nameInput.value = prefix;
  nameInput.dispatchEvent(new Event("input", {bubbles:true}));
  kindSelect.value = "proper";
  kindSelect.dispatchEvent(new Event("input", {bubbles:true}));
  levelInput.value = "0";
  levelInput.dispatchEvent(new Event("input", {bubbles:true}));

  requestAnimationFrame(() => {
    let current = document.querySelector(`#general-skills tr[data-skill-key="${CSS.escape(key)}"]`);
    if(!current) current = [...document.querySelectorAll("#general-skills tr[data-skill-key]")].reverse().find(item => item.querySelector('input[data-f="name"]')?.value === prefix);
    if(!current) return;

    if(selectedSuit){
      const suit = current.querySelector(`input[data-f="${selectedSuit}"]`);
      if(suit){
        suit.checked = true;
        suit.dispatchEvent(new Event("input", {bubbles:true}));
      }
    }

    requestAnimationFrame(() => {
      arrangeSkillUi();
      const input = document.querySelector(`#general-skills tr[data-skill-key="${CSS.escape(key)}"] input[data-f="name"]`)
        || [...document.querySelectorAll('#general-skills input[data-f="name"]')].reverse().find(item => item.value === prefix);
      input?.focus();
      input?.setSelectionRange(prefix.length, prefix.length);
    });
  });
}

function initializeSkillUi(){
  [generalArea, styleArea].filter(Boolean).forEach(container => {
    new MutationObserver(queueSkillRefresh).observe(container,{childList:true,subtree:true});
  });
  arrangeSkillUi();
}

function queueSkillRefresh(){
  if(refreshQueued) return;
  refreshQueued = true;
  requestAnimationFrame(() => {
    refreshQueued = false;
    arrangeSkillUi();
    correctExperience();
  });
}

function arrangeSkillUi(){
  replaceSuitHeaders();
  placeProperRows();
  ensureGroupActions();
  markGeneralRows();
  ensureStyleSortButtons();
}

function replaceSuitHeaders(){
  const labels = {"♠":"理性","♣":"感情","♥":"生命","♦":"外界"};
  document.querySelectorAll("#general-skills th.suit-col, #style-skills th.suit-col").forEach(cell => {
    const label = labels[cell.textContent.trim()];
    if(label) cell.textContent = label;
  });
}

function placeProperRows(){
  const tbody = document.querySelector("#general-skills .skill-group tbody");
  if(!tbody) return;
  Object.keys(PROPER_SKILLS).forEach(prefix => {
    const rows = [...tbody.querySelectorAll(":scope > tr[data-skill-key]")];
    const anchor = rows.find(row => row.querySelector('input[data-f="name"]')?.value === prefix && Number(row.querySelector('input[data-f="level"]')?.value || 0) === 0);
    const extras = rows.filter(row => row !== anchor && row.querySelector('input[data-f="name"]')?.value === prefix);
    let cursor = anchor || extras.shift();
    if(!cursor) return;
    extras.forEach(row => { if(cursor.nextElementSibling !== row) cursor.after(row); cursor = row; });
  });
}

function markGeneralRows(){
  document.querySelectorAll("#general-skills .skill-group:first-child tr[data-skill-key]").forEach(row => {
    const kind = row.querySelector('select[data-f="skill_kind"]')?.value;
    row.classList.toggle("is-fixed-general", kind === "general");
  });
}

function ensureGroupActions(){
  document.querySelectorAll(".skill-group").forEach(group => {
    const title = group.querySelector(":scope > .skill-group-title") || group.querySelector(":scope > .skill-group-heading > .skill-group-title");
    if(!title) return;
    let heading = group.querySelector(":scope > .skill-group-heading");
    if(!heading){
      heading = document.createElement("div");
      heading.className = "skill-group-heading";
      title.before(heading);
      heading.append(title);
    }
    if(heading.querySelector(":scope > .skill-group-actions[data-v23]")) return;

    const actions = document.createElement("div");
    actions.className = "skill-group-actions";
    actions.dataset.v23 = "1";
    heading.append(actions);
    const text = title.textContent;
    if(text.includes("一般技能")){
      addAction(actions,"製作を追加","ADD CRAFT","製作：");
      addAction(actions,"芸術を追加","ADD ART","芸術：");
      addAction(actions,"操縦を追加","ADD PILOTING","操縦：");
    }else if(text.includes("社会")) addAction(actions,"社会を追加","ADD SOCIAL","#add-social");
    else if(text.includes("コネクション")) addAction(actions,"コネを追加","ADD CONNECTION","#add-connection");
    else if(text.includes("スタイル技能")) addAction(actions,"スタイル技能を追加","ADD STYLE SKILL","#add-style-skill");
  });
}

function addAction(container,jp,en,action){
  const button = document.createElement("button");
  button.type = "button";
  button.className = "skill-inline-add";
  button.dataset.skillUiAction = action;
  button.innerHTML = `${jp}<small>${en}</small>`;
  container.append(button);
}

function ensureStyleSortButtons(){
  const rows = [...document.querySelectorAll("#style-skills tr[data-skill-key]")];
  rows.forEach((row,index) => {
    const cell = row.lastElementChild;
    if(!cell) return;
    let controls = cell.querySelector(".style-sort-controls");
    if(!controls){
      controls = document.createElement("span");
      controls.className = "style-sort-controls";
      controls.innerHTML = '<button type="button" data-style-move="up" title="上へ移動">↑</button><button type="button" data-style-move="down" title="下へ移動">↓</button>';
      cell.prepend(controls);
    }
    controls.querySelector('[data-style-move="up"]').disabled = index === 0;
    controls.querySelector('[data-style-move="down"]').disabled = index === rows.length - 1;
  });
}

function moveStyleSkill(button){
  const row = button.closest("tr[data-skill-key]");
  const rows = [...row?.parentElement?.querySelectorAll(":scope > tr[data-skill-key]") || []];
  const index = rows.indexOf(row);
  const target = button.dataset.styleMove === "up" ? rows[index - 1] : rows[index + 1];
  if(!row || !target) return;
  const a = snapshot(row), b = snapshot(target);
  applySnapshot(row, b);
  applySnapshot(target, a);
}

function snapshot(row){
  const data = {};
  row.querySelectorAll("[data-f]").forEach(element => data[element.dataset.f] = element.type === "checkbox" ? element.checked : element.value);
  return data;
}

function applySnapshot(row,data){
  row.querySelectorAll("[data-f]").forEach(element => {
    const value = data[element.dataset.f];
    if(value === undefined) return;
    if(element.type === "checkbox") element.checked = Boolean(value); else element.value = value;
    element.dispatchEvent(new Event("input",{bubbles:true}));
  });
}

function initializeOutfitEnhancer(){
  const list = document.querySelector("#outfit-list");
  if(!list) return;
  let queued = false;
  const refresh = () => { if(queued) return; queued = true; requestAnimationFrame(() => {queued=false; enhanceOutfits();}); };
  new MutationObserver(refresh).observe(list,{childList:true,subtree:true});
  refresh();
}

function enhanceOutfits(){
  document.querySelectorAll("#outfit-list .outfit-form").forEach(card => {
    if(card.dataset.v23Enhanced === "1") return;
    const fields = card.querySelector(".outfit-fields");
    const header = card.querySelector(":scope > header");
    if(!fields || !header) return;
    const category = header.querySelector("label");
    const remove = header.querySelector("[data-delete-outfit]");
    if(category) fields.prepend(category);
    [...fields.querySelectorAll("label")].forEach(label => {
      const caption = [...label.childNodes].find(node => node.nodeType === Node.TEXT_NODE)?.textContent.trim() || "";
      if(caption.startsWith("外界")) label.remove();
    });
    fields.querySelectorAll('input[data-o="purchase_value"],input[data-o="experience_cost"]').forEach(input => {
      input.type="number"; input.min="0"; input.max="999"; input.step="1"; input.inputMode="numeric";
    });
    const original = fields.querySelector('input[data-o="description"]');
    if(original && !fields.querySelector("textarea[data-description-proxy]")){
      const textarea = document.createElement("textarea");
      textarea.rows=3; textarea.value=original.value; textarea.dataset.descriptionProxy="1"; textarea.setAttribute("aria-label","解説");
      textarea.addEventListener("input",()=>{original.value=textarea.value;original.dispatchEvent(new Event("input",{bubbles:true}));});
      original.hidden=true; original.after(textarea); original.closest("label")?.classList.add("outfit-description");
    }
    if(remove){const wrap=document.createElement("div");wrap.className="outfit-delete-cell";wrap.append(remove);fields.append(wrap);}
    card.dataset.v23Enhanced="1";
  });
}

function initializeExperienceCorrection(){
  const total = document.querySelector("#exp-total");
  const breakdown = document.querySelector("#exp-breakdown");
  if(total) new MutationObserver(correctExperience).observe(total,{childList:true,subtree:true,characterData:true});
  if(breakdown) new MutationObserver(correctExperience).observe(breakdown,{childList:true,subtree:true,characterData:true});
  document.addEventListener("input", () => requestAnimationFrame(correctExperience));
  requestAnimationFrame(correctExperience);
}

function correctExperience(){
  if(correctingExperience) return;
  const total = document.querySelector("#exp-total");
  const breakdown = document.querySelector("#exp-breakdown");
  if(!total || !breakdown) return;
  const generalEntry = [...breakdown.querySelectorAll("div")].find(item => item.querySelector("dt")?.textContent.trim() === "一般技能");
  const generalValue = generalEntry?.querySelector("dd");
  if(!generalValue) return;

  const oldGeneral = Number(generalValue.textContent || 0);
  const correctedGeneral = calculateGeneralExperienceFromDom();
  if(oldGeneral === correctedGeneral) return;

  correctingExperience = true;
  const oldTotal = Number(total.textContent || 0);
  generalValue.textContent = String(correctedGeneral);
  total.textContent = String(Math.max(0, oldTotal - oldGeneral + correctedGeneral));
  correctingExperience = false;
}

function calculateGeneralExperienceFromDom(){
  let cost = 0;
  let socialInitialFree = 0;
  let connectionInitialFree = 0;
  document.querySelectorAll("#general-skills .skill-group").forEach(group => {
    const title = group.querySelector(".skill-group-title")?.textContent || "";
    group.querySelectorAll("tr[data-skill-key]").forEach(row => {
      const name = row.querySelector('input[data-f="name"]')?.value.trim() || "";
      const level = Number(row.querySelector('input[data-f="level"]')?.value || 0);
      const kind = row.querySelector('select[data-f="skill_kind"]')?.value || "proper";
      if(!name || level <= 0) return;

      let free = 0;
      if(title.includes("一般技能") && kind === "general" && FIXED_GENERAL.has(name)) free = 1;
      else if(title.includes("社会") && (name === "社会：N◎VA" || name === "社会：初期取得") && socialInitialFree < 2){ free = 1; socialInitialFree++; }
      else if(title.includes("コネクション") && name === "コネ：初期取得" && connectionInitialFree < 2){ free = 1; connectionInitialFree++; }

      cost += Math.max(0, level - free) * (kind === "proper" ? 5 : 10);
    });
  });
  return cost;
}

function updateViewLink(){
  const link=document.querySelector("#cast-view-button");
  if(!link) return;
  const id=new URLSearchParams(location.search).get("id")?.trim();
  if(!id){link.classList.remove("is-visible");link.removeAttribute("href");return;}
  link.href=`./cast.html?id=${encodeURIComponent(id)}`;link.classList.add("is-visible");
}
