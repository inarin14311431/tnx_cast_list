const MASTER_PROPER_SKILLS = ["製作：","芸術：","操縦："];

initializeMasterRows();

function initializeMasterRows(){
  const container = document.querySelector("#general-skills");
  if(!container) return;

  let scheduled = false;
  const observer = new MutationObserver(() => {
    if(scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      injectMasterRows();
    });
  });

  observer.observe(container,{childList:true,subtree:true});
  injectMasterRows();
}

function injectMasterRows(){
  const generalTable = [...document.querySelectorAll("#general-skills .skill-group")]
    .find(group => group.querySelector(".skill-group-title")?.textContent.includes("一般技能"))
    ?.querySelector("tbody");

  if(!generalTable) return;

  for(const name of MASTER_PROPER_SKILLS){
    const existsInSkillRows = [...generalTable.querySelectorAll('input[data-f="name"]')]
      .some(input => input.value === name);
    const existsInMasterRows = [...generalTable.querySelectorAll("tr[data-master-proper]")]
      .some(row => row.dataset.masterProper === name);

    if(existsInSkillRows || existsInMasterRows) continue;

    const row = document.createElement("tr");
    row.className = "master-proper-row";
    row.dataset.masterProper = name;
    row.innerHTML = `
      <td><input value="${escapeHtml(name)}" readonly aria-label="${escapeHtml(name)}"></td>
      <td><select disabled><option>固有名詞</option></select></td>
      <td><input type="number" value="0" readonly aria-label="レベル0"></td>
      <td class="suit-cell">—</td>
      <td class="suit-cell">—</td>
      <td class="suit-cell">—</td>
      <td class="suit-cell">—</td>
      <td><button type="button" class="master-proper-acquire">取得</button></td>`;

    row.querySelector(".master-proper-acquire")
      .addEventListener("click", () => acquireMasterSkill(name));
    generalTable.append(row);
  }
}

function acquireMasterSkill(name){
  document.querySelector("#add-general")?.click();
  requestAnimationFrame(() => {
    const rows = [...document.querySelectorAll('#general-skills tr[data-skill-key]')];
    const row = rows.at(-1);
    if(!row) return;

    const nameInput = row.querySelector('input[data-f="name"]');
    const kindSelect = row.querySelector('select[data-f="skill_kind"]');
    const levelInput = row.querySelector('input[data-f="level"]');

    if(nameInput){
      nameInput.value = name;
      nameInput.dispatchEvent(new Event("input",{bubbles:true}));
    }
    if(kindSelect){
      kindSelect.value = "proper";
      kindSelect.dispatchEvent(new Event("input",{bubbles:true}));
    }
    if(levelInput){
      levelInput.value = "1";
      levelInput.dispatchEvent(new Event("input",{bubbles:true}));
    }
  });
}

function escapeHtml(value){
  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
