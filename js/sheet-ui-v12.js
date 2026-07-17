const properPrefixes = ["製作：", "芸術：", "操縦："];

bindProperSkillButtons();
initializeSkillLayout();
initializeOutfitEnhancer();

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

    arrangeSkillLayout();
    nameInput?.focus();
    nameInput?.setSelectionRange(name.length, name.length);
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
  moveSectionButtons();
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
    const matching = [...body.querySelectorAll("tr[data-skill-key]")]
      .filter(row => row.querySelector('input[data-f="name"]')?.value.startsWith(prefix));
    if(matching.length < 2) return;

    const master = matching.find(row => row.querySelector('input[data-f="level"]')?.value === "0") || matching[0];
    let anchor = master;
    matching.filter(row => row !== master).forEach(row => {
      anchor.insertAdjacentElement("afterend", row);
      anchor = row;
    });
  });
}

function moveSectionButtons(){
  const groups = [...document.querySelectorAll("#general-skills .skill-group, #style-skills .skill-group")];
  groups.forEach(group => {
    const title = group.querySelector(":scope > .skill-group-title");
    if(!title) return;

    let actions = group.querySelector(":scope > .skill-group-actions");
    if(!actions){
      actions = document.createElement("div");
      actions.className = "skill-group-actions";
      title.insertAdjacentElement("afterend", actions);
    }

    const text = title.textContent;
    const selectors = text.includes("一般技能")
      ? ["[data-add-proper]"]
      : text.includes("コネクション")
        ? ["#add-connection"]
        : text.includes("社会")
          ? ["#add-social"]
          : text.includes("スタイル技能")
            ? ["#add-style-skill"]
            : [];

    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(button => {
        if(button.parentElement !== actions) actions.append(button);
      });
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
