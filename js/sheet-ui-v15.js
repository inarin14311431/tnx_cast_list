const properPrefixes = ["製作：", "芸術：", "操縦："];
const skillArea = document.querySelector("#general-skills");
const styleArea = document.querySelector("#style-skills");
let skillUiScheduled = false;

initialize();

function initialize(){
  bindProperSkillButtons();
  initializeOutfitEnhancer();
  updateViewLink();
  arrangeSkillUi();

  [skillArea, styleArea].filter(Boolean).forEach(container => {
    new MutationObserver(scheduleSkillUi).observe(container, {childList:true, subtree:true});
  });

  const status = document.querySelector("#save-status");
  if(status) new MutationObserver(updateViewLink).observe(status,{childList:true,subtree:true});
}

function bindProperSkillButtons(){
  document.querySelectorAll("[data-add-proper]").forEach(button => {
    button.addEventListener("click", () => addProperSkillRow(button.dataset.addProper));
  });
}

function addProperSkillRow(name){
  const hiddenAdd = document.querySelector("#add-general");
  if(!hiddenAdd) return;

  const existingKeys = new Set(
    [...document.querySelectorAll("#general-skills tr[data-skill-key]")]
      .map(row => row.dataset.skillKey)
  );

  hiddenAdd.click();

  requestAnimationFrame(() => {
    const row = [...document.querySelectorAll("#general-skills tr[data-skill-key]")]
      .find(item => !existingKeys.has(item.dataset.skillKey));
    if(!row) return;

    const nameInput = row.querySelector('input[data-f="name"]');
    const kind = row.querySelector('select[data-f="skill_kind"]');
    const level = row.querySelector('input[data-f="level"]');

    if(nameInput){
      nameInput.value = name;
      nameInput.dispatchEvent(new Event("input", {bubbles:true}));
    }
    if(kind){
      kind.value = "proper";
      kind.dispatchEvent(new Event("input", {bubbles:true}));
    }
    if(level){
      level.value = Math.max(1, Number(level.value || 1));
      level.dispatchEvent(new Event("input", {bubbles:true}));
    }

    arrangeSkillUi();
    nameInput?.focus();
    nameInput?.setSelectionRange(name.length, name.length);
  });
}

function scheduleSkillUi(){
  if(skillUiScheduled) return;
  skillUiScheduled = true;
  requestAnimationFrame(() => {
    skillUiScheduled = false;
    arrangeSkillUi();
  });
}

function arrangeSkillUi(){
  replaceSuitHeaders();
  placeProperRows();
  ensureGroupActions();
}

function replaceSuitHeaders(){
  const labels = {"♠":"理性", "♣":"感情", "♥":"生命", "♦":"外界"};
  document.querySelectorAll("#general-skills th.suit-col, #style-skills th.suit-col").forEach(cell => {
    const replacement = labels[cell.textContent.trim()];
    if(replacement) cell.textContent = replacement;
  });
}

function placeProperRows(){
  const tbody = document.querySelector("#general-skills .skill-group tbody");
  if(!tbody) return;

  for(const prefix of properPrefixes){
    const rows = [...tbody.querySelectorAll(":scope > tr[data-skill-key]")];
    const matches = rows.filter(row => row.querySelector('input[data-f="name"]')?.value.startsWith(prefix));
    if(matches.length < 2) continue;

    const anchor = matches.find(row => row.querySelector('input[data-f="name"]')?.value === prefix) || matches[0];
    let cursor = anchor;
    for(const row of matches){
      if(row === anchor) continue;
      if(cursor.nextElementSibling !== row) cursor.after(row);
      cursor = row;
    }
  }
}

function ensureGroupActions(){
  document.querySelectorAll(".skill-group").forEach(group => {
    const title = group.querySelector(":scope > .skill-group-title");
    if(!title || group.querySelector(":scope > .skill-group-heading")) return;

    const heading = document.createElement("div");
    heading.className = "skill-group-heading";
    title.before(heading);
    heading.append(title);

    const actions = document.createElement("div");
    actions.className = "skill-group-actions";
    heading.append(actions);

    const text = title.textContent;
    if(text.includes("一般技能")){
      addProxy(actions, "製作を追加", "ADD CRAFT", () => document.querySelector('[data-add-proper="製作："]')?.click());
      addProxy(actions, "芸術を追加", "ADD ART", () => document.querySelector('[data-add-proper="芸術："]')?.click());
      addProxy(actions, "操縦を追加", "ADD PILOTING", () => document.querySelector('[data-add-proper="操縦："]')?.click());
    } else if(text.includes("社会")){
      addProxy(actions, "社会を追加", "ADD SOCIAL", () => document.querySelector("#add-social")?.click());
    } else if(text.includes("コネクション")){
      addProxy(actions, "コネを追加", "ADD CONNECTION", () => document.querySelector("#add-connection")?.click());
    } else if(text.includes("スタイル技能")){
      addProxy(actions, "スタイル技能を追加", "ADD STYLE SKILL", () => document.querySelector("#add-style-skill")?.click());
    }
  });
}

function addProxy(container, jp, en, handler){
  const button = document.createElement("button");
  button.type = "button";
  button.className = "skill-inline-add";
  button.innerHTML = `${jp}<small>${en}</small>`;
  button.addEventListener("click", handler);
  container.append(button);
}

function initializeOutfitEnhancer(){
  const list = document.querySelector("#outfit-list");
  if(!list) return;
  let scheduled = false;
  const schedule = () => {
    if(scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; enhanceOutfits(); });
  };
  new MutationObserver(schedule).observe(list, {childList:true, subtree:true});
  schedule();
}

function enhanceOutfits(){
  document.querySelectorAll("#outfit-list .outfit-form").forEach(card => {
    if(card.dataset.v15Enhanced === "1") return;
    const fields = card.querySelector(".outfit-fields");
    const header = card.querySelector(":scope > header");
    if(!fields || !header) return;

    const categoryLabel = header.querySelector("label");
    const deleteButton = header.querySelector("[data-delete-outfit]");
    if(categoryLabel) fields.prepend(categoryLabel);

    [...fields.querySelectorAll("label")].forEach(label => {
      const caption = [...label.childNodes].find(node => node.nodeType === Node.TEXT_NODE)?.textContent.trim() || "";
      if(caption.startsWith("外界")) label.remove();
    });

    fields.querySelectorAll('input[data-o="purchase_value"], input[data-o="experience_cost"]').forEach(input => {
      input.type = "number"; input.min = "0"; input.max = "999"; input.step = "1"; input.inputMode = "numeric";
    });

    const originalDescription = fields.querySelector('input[data-o="description"]');
    if(originalDescription && !fields.querySelector("textarea[data-description-proxy]")){
      const textarea = document.createElement("textarea");
      textarea.rows = 2;
      textarea.value = originalDescription.value;
      textarea.dataset.descriptionProxy = "1";
      textarea.setAttribute("aria-label", "解説");
      textarea.addEventListener("input", () => {
        originalDescription.value = textarea.value;
        originalDescription.dispatchEvent(new Event("input", {bubbles:true}));
      });
      originalDescription.hidden = true;
      originalDescription.insertAdjacentElement("afterend", textarea);
      originalDescription.closest("label")?.classList.add("outfit-description");
    }

    if(deleteButton){
      const wrapper = document.createElement("div");
      wrapper.className = "outfit-delete-cell";
      wrapper.append(deleteButton);
      fields.append(wrapper);
    }
    card.dataset.v15Enhanced = "1";
  });
}

function updateViewLink(){
  const viewLink = document.querySelector("#cast-view-button");
  if(!viewLink) return;
  const id = new URLSearchParams(location.search).get("id")?.trim();
  if(!id){ viewLink.classList.remove("is-visible"); viewLink.removeAttribute("href"); return; }
  viewLink.href = `./cast.html?id=${encodeURIComponent(id)}`;
  viewLink.classList.add("is-visible");
}

document.addEventListener("input", event => {
  const nameInput = event.target.closest('input[data-f="name"]');
  if(!nameInput) return;
  const row = nameInput.closest("tr[data-skill-key]");
  const kind = row?.querySelector('select[data-f="skill_kind"]');
  if(!row || !kind) return;
  const groupTitle = row.closest(".skill-group")?.querySelector(".skill-group-title")?.textContent || "";
  let expected = kind.value;
  if(groupTitle.includes("一般技能")) expected = properPrefixes.some(prefix => nameInput.value.startsWith(prefix)) ? "proper" : "general";
  else if(groupTitle.includes("社会") || groupTitle.includes("コネクション")) expected = "proper";
  if(expected !== kind.value){ kind.value = expected; kind.dispatchEvent(new Event("input", {bubbles:true})); }
});
