/* Split general skills into two fixed columns: 医療～交渉 / 芸術：～隠密. */
(function(){
  const FIRST_COLUMN_END = "交渉";

  function isGeneralGroup(group){
    const title = group?.querySelector(".skill-group-title")?.textContent || "";
    return title.includes("一般技能");
  }

  function removeGeneralOrderControls(root){
    [...root.querySelectorAll(":scope > .skill-group")]
      .filter(isGeneralGroup)
      .forEach(group => {
        group.querySelectorAll("[data-skill-move], .skill-order-button").forEach(button => button.remove());
        group.querySelectorAll(".skill-row-actions").forEach(actions => {
          const deleteButton = actions.querySelector(".row-delete");
          const cell = actions.parentElement;
          if(deleteButton && cell) cell.insertBefore(deleteButton, actions);
          actions.remove();
        });
        group.querySelectorAll("tr[data-skill-key]").forEach(row => {
          delete row.dataset.orderCategory;
        });
      });
  }

  function splitGeneralSkills(){
    const root = document.querySelector("#general-skills");
    if(!root) return;

    removeGeneralOrderControls(root);

    const groups = [...root.querySelectorAll(":scope > .skill-group")];
    const general = groups.find(group => isGeneralGroup(group) && !group.classList.contains("general-skill-column--second"));

    if(!general || general.classList.contains("general-skill-column--first")) return;

    const table = general.querySelector(".skill-table");
    const tbody = table?.querySelector("tbody");
    if(!table || !tbody) return;

    const rows = [...tbody.querySelectorAll(":scope > tr")];
    const splitIndex = rows.findIndex(row => row.querySelector('[data-f="name"]')?.value === FIRST_COLUMN_END);
    if(splitIndex < 0 || splitIndex >= rows.length - 1) return;

    general.classList.add("general-skill-column", "general-skill-column--first");

    const second = document.createElement("section");
    second.className = "skill-group general-skill-column general-skill-column--second";
    second.innerHTML = `<h3 class="skill-group-title">一般技能 <small>GENERAL SKILLS</small></h3>${table.outerHTML}`;

    const secondBody = second.querySelector("tbody");
    secondBody.replaceChildren();
    rows.slice(splitIndex + 1).forEach(row => secondBody.append(row));

    general.after(second);
    removeGeneralOrderControls(root);
  }

  function initialize(){
    const root = document.querySelector("#general-skills");
    if(!root){ setTimeout(initialize, 100); return; }

    let queued = false;
    const queue = () => {
      if(queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        splitGeneralSkills();
      });
    };

    new MutationObserver(queue).observe(root, {childList:true, subtree:true});
    queue();
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, {once:true});
  else initialize();
})();