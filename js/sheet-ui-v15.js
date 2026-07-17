const properPrefixes = ["製作：", "芸術：", "操縦："];
const properSuit = {"製作：":"reason","芸術：":"passion","操縦：":"life"};
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
    if(button.dataset.bound === "1") return;
    button.dataset.bound = "1";
    button.addEventListener("click", () => addProperSkillRow(button.dataset.addProper));
  });
}

function addProperSkillRow(name){
  const hiddenAdd = document.querySelector("#add-general");
  if(!hiddenAdd) return;
  hiddenAdd.click();

  requestAnimationFrame(() => {
    const rows = [...document.querySelectorAll("#general-skills tr[data-skill-key]")];
    const row = [...rows].reverse().find(item => item.querySelector('input[data-f="name"]')?.value === "");
    if(!row) return;

    const nameInput = row.querySelector('input[data-f="name"]');
    const kind = row.querySelector('select[data-f="skill_kind"]');
    const suit = row.querySelector(`input[data-f="${properSuit[name]}"]`);

    nameInput.value = name;
    kind.value = "proper";
    nameInput.dispatchEvent(new Event("input", {bubbles:true}));
    kind.dispatchEvent(new Event("input", {bubbles:true}));
    if(suit && !suit.checked){
      suit.checked = true;
      suit.dispatchEvent(new Event("input", {bubbles:true}));
    }

    requestAnimationFrame(() => {
      arrangeSkillUi();
      const current = [...document.querySelectorAll("#general-skills tr[data-skill-key]")]
        .find(item => item.querySelector('input[data-f="name"]')?.value === name && item.querySelector('input[data-f="level"]')?.value !== "0");
      const input = current?.querySelector('input[data-f="name"]');
      input?.focus();
      input?.setSelectionRange(name.length, name.length);
    });
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
    const anchor = rows.find(row => row.querySelector('input[data-f="name"]')?.value === prefix);
    if(!anchor) continue;
    const extras = rows.filter(row => {
      const value = row.querySelector('input[data-f="name"]')?.value || "";
      return row !== anchor && value.startsWith(prefix);
    });
    let cursor = anchor;
    for(const row of extras){
      if(cursor.nextElementSibling !== row) cursor.after(row);
      cursor = row;
    }
  }
}

function ensureGroupActions(){
  document.querySelectorAll(".skill-group").forEach(group => {
    const title = group.querySelector(":scope > .skill-group-title");
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
      addProxy(actions, "製作を追加", "ADD CRAFT", () => addProperSkillRow("製作："));
      addProxy(actions, "芸術を追加", "ADD ART", () => addProperSkillRow("芸術："));
      addProxy(actions, "操縦を追加", "ADD PILOTING", () => addProperSkillRow("操縦："));
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