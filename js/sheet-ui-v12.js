const properPrefixes = ["製作：", "芸術：", "操縦："];

bindProperSkillButtons();
initializeOutfitEnhancer();
initializeSkillHeaderLabels();

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
    nameInput?.focus();
    nameInput?.setSelectionRange(name.length, name.length);
  });
}

function initializeSkillHeaderLabels(){
  const labels = {"♠":"理性","♣":"感情","♥":"生命","♦":"外界"};
  let scheduled = false;
  const apply = () => {
    scheduled = false;
    document.querySelectorAll("#general-skills th.suit-col, #style-skills th.suit-col").forEach(cell => {
      const label = labels[cell.textContent.trim()];
      if(label) cell.textContent = label;
    });
  };
  const schedule = () => {
    if(scheduled) return;
    scheduled = true;
    requestAnimationFrame(apply);
  };
  [document.querySelector("#general-skills"), document.querySelector("#style-skills")].filter(Boolean).forEach(container => {
    new MutationObserver(schedule).observe(container,{childList:true,subtree:true});
  });
  schedule();
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