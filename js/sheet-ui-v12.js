const properPrefixes = ["製作：", "芸術：", "操縦："];
const properSuit = {"製作：":"reason","芸術：":"passion","操縦：":"life"};

bindProperSkillButtons();
initializeSkillLayout();
initializeOutfitEnhancer();

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
    const row = [...rows].reverse().find(item => {
      const input = item.querySelector('input[data-f="name"]');
      return input && input.value === "";
    });
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
      reorderProperRows();
      nameInput?.focus();
      nameInput?.setSelectionRange(name.length, name.length);
    });
  });
}

function initializeSkillLayout(){
  let scheduled = false;
  const schedule = () => {
    if(scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      arrangeSkillLayout();
    });
  };

  [document.querySelector("#general-skills"), document.querySelector("#style-skills")]
    .filter(Boolean)
    .forEach(container => new MutationObserver(schedule).observe(container,{childList:true,subtree:true}));

  schedule();
}

function arrangeSkillLayout(){
  replaceSuitHeaders();
  reorderProperRows();
  renderSectionButtons();
}

function replaceSuitHeaders(){
  const labels = {"♠":"理性","♣":"感情","♥":"生命","♦":"外界"};
  document.querySelectorAll("#general-skills th.suit-col, #style-skills th.suit-col").forEach(cell => {
    const label = labels[cell.textContent.trim()];
    if(label) cell.textContent = label;
  });
}

function reorderProperRows(){
  const body = document.querySelector("#general-skills .skill-group tbody");
  if(!body) return;

  properPrefixes.forEach(prefix => {
    const rows = [...body.querySelectorAll("tr[data-skill-key]")];
    const exact = rows.find(row => row.querySelector('input[data-f="name"]')?.value === prefix);
    if(!exact) return;
    const extras = rows.filter(row => {
      const value = row.querySelector('input[data-f="name"]')?.value || "";
      return row !== exact && value.startsWith(prefix);
    });
    let anchor = exact;
    extras.forEach(row => {
      if(anchor.nextElementSibling !== row) anchor.insertAdjacentElement("afterend", row);
      anchor = row;
    });
  });
}

function renderSectionButtons(){
  const configs = [
    {match:"一般技能", buttons:[
      {label:"製作を追加", en:"ADD CRAFT", action:()=>addProperSkillRow("製作：")},
      {label:"芸術を追加", en:"ADD ART", action:()=>addProperSkillRow("芸術：")},
      {label:"操縦を追加", en:"ADD PILOTING", action:()=>addProperSkillRow("操縦：")}
    ]},
    {match:"社会", buttons:[{label:"社会を追加", en:"ADD SOCIAL", action:()=>document.querySelector("#add-social")?.click()}]},
    {match:"コネクション", buttons:[{label:"コネを追加", en:"ADD CONNECTION", action:()=>document.querySelector("#add-connection")?.click()}]},
    {match:"スタイル技能", buttons:[{label:"スタイル技能を追加", en:"ADD STYLE SKILL", action:()=>document.querySelector("#add-style-skill")?.click()}]}
  ];

  document.querySelectorAll("#general-skills .skill-group, #style-skills .skill-group").forEach(group => {
    const title = group.querySelector(":scope > .skill-group-title");
    if(!title) return;
    const config = configs.find(item => title.textContent.includes(item.match));
    if(!config) return;

    let actions = group.querySelector(":scope > .skill-group-actions");
    if(!actions){
      actions = document.createElement("div");
      actions.className = "skill-group-actions";
      title.insertAdjacentElement("afterend", actions);
    }
    actions.replaceChildren();
    config.buttons.forEach(item => {
      const button = document.createElement("button");
      button.type = "button";
      button.innerHTML = `${item.label} <small>${item.en}</small>`;
      button.addEventListener("click", item.action);
      actions.append(button);
    });
  });
}

function initializeOutfitEnhancer(){
  const list = document.querySelector("#outfit-list");
  if(!list) return;

  let scheduled = false;
  const schedule = () => {
    if(scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      enhanceOutfits();
    });
  };

  new MutationObserver(schedule).observe(list, {childList:true, subtree:true});
  schedule();
}

function enhanceOutfits(){
  document.querySelectorAll("#outfit-list .outfit-form").forEach(card => {
    if(card.dataset.v12Enhanced === "1") return;
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
      input.type = "number";
      input.min = "0";
      input.max = "999";
      input.step = "1";
      input.inputMode = "numeric";
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

    card.dataset.v12Enhanced = "1";
  });
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

  if(expected !== kind.value){
    kind.value = expected;
    kind.dispatchEvent(new Event("input", {bubbles:true}));
  }
});