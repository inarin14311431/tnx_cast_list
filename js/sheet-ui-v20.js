const PROPER_SKILLS = {
  "製作：": "reason",
  "芸術：": "passion",
  "操縦：": "life"
};
const SUITS = ["reason", "passion", "life", "mundane"];
const generalArea = document.querySelector("#general-skills");
const styleArea = document.querySelector("#style-skills");
let refreshQueued = false;

initialize();

function initialize(){
  bindTopButtons();
  bindTemplateSuitActivation();
  bindStyleSortControls();
  initializeSkillUi();
  initializeOutfitEnhancer();
  updateViewLink();
  const status = document.querySelector("#save-status");
  if(status) new MutationObserver(updateViewLink).observe(status,{childList:true,subtree:true});
}

function bindTopButtons(){
  document.querySelectorAll("[data-add-proper]").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      createProperSkill(button.dataset.addProper);
    });
  });
}

function bindTemplateSuitActivation(){
  document.addEventListener("click", event => {
    const checkbox = event.target.closest('#general-skills input[type="checkbox"][data-f]');
    if(!checkbox || !SUITS.includes(checkbox.dataset.f)) return;
    const row = checkbox.closest("tr[data-skill-key]");
    const name = row?.querySelector('input[data-f="name"]')?.value || "";
    const level = Number(row?.querySelector('input[data-f="level"]')?.value || 0);
    if(!(name in PROPER_SKILLS) || level !== 0) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    createProperSkill(name, checkbox.dataset.f);
  }, true);
}

function blankActualRows(){
  return [...document.querySelectorAll("#general-skills tr[data-skill-key]")].filter(row => {
    const name = row.querySelector('input[data-f="name"]')?.value || "";
    const level = Number(row.querySelector('input[data-f="level"]')?.value || 0);
    return name === "" && level > 0;
  });
}

function createProperSkill(prefix, selectedSuit = ""){
  const hiddenAdd = document.querySelector("#add-general");
  if(!hiddenAdd) return;

  const before = new Set(blankActualRows().map(row => row.dataset.skillKey));
  hiddenAdd.click();

  requestAnimationFrame(() => {
    let row = blankActualRows().find(item => !before.has(item.dataset.skillKey));
    if(!row) row = blankActualRows().at(-1);
    if(!row) return;

    const key = row.dataset.skillKey;
    let nameInput = row.querySelector('input[data-f="name"]');
    let kindSelect = row.querySelector('select[data-f="skill_kind"]');
    let levelInput = row.querySelector('input[data-f="level"]');
    if(!nameInput || !kindSelect || !levelInput) return;

    nameInput.value = prefix;
    nameInput.dispatchEvent(new Event("input", {bubbles:true}));
    kindSelect.value = "proper";
    kindSelect.dispatchEvent(new Event("input", {bubbles:true}));

    levelInput.value = "0";
    levelInput.dispatchEvent(new Event("input", {bubbles:true}));

    requestAnimationFrame(() => {
      row = document.querySelector(`#general-skills tr[data-skill-key="${CSS.escape(key)}"]`)
        || [...document.querySelectorAll("#general-skills tr[data-skill-key]")].find(item => item.querySelector('input[data-f="name"]')?.value === prefix && Number(item.querySelector('input[data-f="level"]')?.value || 0) === 0);
      if(!row) return;

      if(selectedSuit){
        const suit = row.querySelector(`input[data-f="${selectedSuit}"]`);
        if(suit && !suit.checked){
          suit.checked = true;
          suit.dispatchEvent(new Event("input", {bubbles:true}));
        }
      }

      requestAnimationFrame(() => {
        arrangeSkillUi();
        const current = document.querySelector(`#general-skills tr[data-skill-key="${CSS.escape(key)}"]`)
          || [...document.querySelectorAll("#general-skills tr[data-skill-key]")].reverse().find(item => item.querySelector('input[data-f="name"]')?.value === prefix);
        const input = current?.querySelector('input[data-f="name"]');
        input?.focus();
        input?.setSelectionRange(prefix.length, prefix.length);
      });
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
    const matching = rows.filter(row => (row.querySelector('input[data-f="name"]')?.value || "") === prefix && row !== anchor);
    let cursor = anchor || matching.shift();
    if(!cursor) return;
    matching.forEach(row => {
      if(cursor.nextElementSibling !== row) cursor.after(row);
      cursor = row;
    });
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
    let actions = heading.querySelector(":scope > .skill-group-actions");
    if(!actions){
      actions = document.createElement("div");
      actions.className = "skill-group-actions";
      heading.append(actions);
    }
    actions.replaceChildren();
    const text = title.textContent;
    if(text.includes("一般技能")){
      addProxy(actions,"製作を追加","ADD CRAFT",()=>createProperSkill("製作："));
      addProxy(actions,"芸術を追加","ADD ART",()=>createProperSkill("芸術："));
      addProxy(actions,"操縦を追加","ADD PILOTING",()=>createProperSkill("操縦："));
    }else if(text.includes("社会")){
      addProxy(actions,"社会を追加","ADD SOCIAL",()=>document.querySelector("#add-social")?.click());
    }else if(text.includes("コネクション")){
      addProxy(actions,"コネを追加","ADD CONNECTION",()=>document.querySelector("#add-connection")?.click());
    }else if(text.includes("スタイル技能")){
      addProxy(actions,"スタイル技能を追加","ADD STYLE SKILL",()=>document.querySelector("#add-style-skill")?.click());
    }
  });
}

function addProxy(container,jp,en,handler){
  const button = document.createElement("button");
  button.type = "button";
  button.className = "skill-inline-add";
  button.innerHTML = `${jp}<small>${en}</small>`;
  button.addEventListener("click",handler);
  container.append(button);
}

function bindStyleSortControls(){
  document.addEventListener("click", event => {
    const button = event.target.closest("[data-style-move]");
    if(!button) return;
    const row = button.closest("tr[data-skill-key]");
    const tbody = row?.parentElement;
    if(!row || !tbody) return;
    const rows = [...tbody.querySelectorAll(":scope > tr[data-skill-key]")];
    const index = rows.indexOf(row);
    const targetIndex = button.dataset.styleMove === "up" ? index - 1 : index + 1;
    if(targetIndex < 0 || targetIndex >= rows.length) return;
    swapStyleRows(row, rows[targetIndex]);
  });
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

function snapshotRow(row){
  const data = {};
  row.querySelectorAll("[data-f]").forEach(element => {
    data[element.dataset.f] = element.type === "checkbox" ? element.checked : element.value;
  });
  return data;
}

function applySnapshot(key, data){
  let row = document.querySelector(`#style-skills tr[data-skill-key="${CSS.escape(key)}"]`);
  if(!row) return;

  for(const field of ["name","skill_kind","description"]){
    const element = row.querySelector(`[data-f="${field}"]`);
    if(!element || data[field] === undefined) continue;
    element.value = data[field];
    element.dispatchEvent(new Event("input",{bubbles:true}));
  }

  row = document.querySelector(`#style-skills tr[data-skill-key="${CSS.escape(key)}"]`);
  const level = row?.querySelector('[data-f="level"]');
  if(level){
    level.value = "0";
    level.dispatchEvent(new Event("input",{bubbles:true}));
  }

  SUITS.forEach(suitName => {
    row = document.querySelector(`#style-skills tr[data-skill-key="${CSS.escape(key)}"]`);
    const checkbox = row?.querySelector(`[data-f="${suitName}"]`);
    if(checkbox && data[suitName]){
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event("input",{bubbles:true}));
    }
  });
}

function swapStyleRows(first, second){
  const firstKey = first.dataset.skillKey;
  const secondKey = second.dataset.skillKey;
  const firstData = snapshotRow(first);
  const secondData = snapshotRow(second);
  applySnapshot(firstKey, secondData);
  applySnapshot(secondKey, firstData);
  requestAnimationFrame(arrangeSkillUi);
}

function initializeOutfitEnhancer(){
  const list = document.querySelector("#outfit-list");
  if(!list) return;
  let queued = false;
  const refresh = () => {
    if(queued) return;
    queued = true;
    requestAnimationFrame(() => {queued=false; enhanceOutfits();});
  };
  new MutationObserver(refresh).observe(list,{childList:true,subtree:true});
  refresh();
}

function enhanceOutfits(){
  document.querySelectorAll("#outfit-list .outfit-form").forEach(card => {
    if(card.dataset.v21Enhanced === "1") return;
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
    card.dataset.v21Enhanced="1";
  });
}

function updateViewLink(){
  const link=document.querySelector("#cast-view-button");
  if(!link) return;
  const id=new URLSearchParams(location.search).get("id")?.trim();
  if(!id){link.classList.remove("is-visible");link.removeAttribute("href");return;}
  link.href=`./cast.html?id=${encodeURIComponent(id)}`;link.classList.add("is-visible");
}
