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
      createProperSkill(button.dataset.addProper, true);
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
    createProperSkill(name, false, checkbox.dataset.f);
  }, true);
}

function createProperSkill(prefix, preserveTemplate, selectedSuit = ""){
  const hiddenAdd = document.querySelector("#add-general");
  if(!hiddenAdd) return;

  const before = new Set(
    [...document.querySelectorAll("#general-skills tr[data-skill-key]")]
      .map(row => row.dataset.skillKey)
  );

  hiddenAdd.click();

  requestAnimationFrame(() => {
    const row = [...document.querySelectorAll("#general-skills tr[data-skill-key]")]
      .find(item => !before.has(item.dataset.skillKey));
    if(!row) return;

    const nameInput = row.querySelector('input[data-f="name"]');
    const kindSelect = row.querySelector('select[data-f="skill_kind"]');
    if(!nameInput || !kindSelect) return;

    // The invisible suffix keeps the permanent input template visible while
    // presenting the same initial text to the user.
    nameInput.value = preserveTemplate ? `${prefix}\u200B` : prefix;
    kindSelect.value = "proper";
    nameInput.dispatchEvent(new Event("input", {bubbles:true}));
    kindSelect.dispatchEvent(new Event("input", {bubbles:true}));

    const suitName = selectedSuit || PROPER_SKILLS[prefix];
    const suit = row.querySelector(`input[data-f="${suitName}"]`);
    if(suit){
      suit.checked = true;
      suit.dispatchEvent(new Event("input", {bubbles:true}));
    }

    requestAnimationFrame(() => {
      arrangeSkillUi();
      const matching = [...document.querySelectorAll("#general-skills tr[data-skill-key]")]
        .filter(item => (item.querySelector('input[data-f="name"]')?.value || "").startsWith(prefix));
      const added = matching.find(item => item.dataset.skillKey === row.dataset.skillKey) || matching.at(-1);
      const input = added?.querySelector('input[data-f="name"]');
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
  });
}

function arrangeSkillUi(){
  replaceSuitHeaders();
  placeProperRows();
  ensureGroupActions();
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
    if(!anchor) return;
    const extras = rows.filter(row => row !== anchor && (row.querySelector('input[data-f="name"]')?.value || "").startsWith(prefix));
    let cursor = anchor;
    extras.forEach(row => {
      if(cursor.nextElementSibling !== row) cursor.after(row);
      cursor = row;
    });
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
      addProxy(actions,"製作を追加","ADD CRAFT",()=>createProperSkill("製作：",true));
      addProxy(actions,"芸術を追加","ADD ART",()=>createProperSkill("芸術：",true));
      addProxy(actions,"操縦を追加","ADD PILOTING",()=>createProperSkill("操縦：",true));
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
    if(card.dataset.v20Enhanced === "1") return;
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
      textarea.rows=2; textarea.value=original.value; textarea.dataset.descriptionProxy="1"; textarea.setAttribute("aria-label","解説");
      textarea.addEventListener("input",()=>{original.value=textarea.value;original.dispatchEvent(new Event("input",{bubbles:true}));});
      original.hidden=true; original.after(textarea); original.closest("label")?.classList.add("outfit-description");
    }
    if(remove){const wrap=document.createElement("div");wrap.className="outfit-delete-cell";wrap.append(remove);fields.append(wrap);}
    card.dataset.v20Enhanced="1";
  });
}

function updateViewLink(){
  const link=document.querySelector("#cast-view-button");
  if(!link) return;
  const id=new URLSearchParams(location.search).get("id")?.trim();
  if(!id){link.classList.remove("is-visible");link.removeAttribute("href");return;}
  link.href=`./cast.html?id=${encodeURIComponent(id)}`;link.classList.add("is-visible");
}
