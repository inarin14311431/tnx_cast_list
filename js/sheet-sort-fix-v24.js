const SORT_SUITS = ["reason","passion","life","mundane"];

document.addEventListener("click", event => {
  const button = event.target.closest("[data-skill-move]");
  if(!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();

  const kind = button.dataset.kind;
  const selector = kind === "general"
    ? "#general-skills .skill-group:first-child tr.is-custom-general[data-skill-key]"
    : "#style-skills tr[data-skill-key]";
  const rows = [...document.querySelectorAll(selector)];
  const row = button.closest("tr[data-skill-key]");
  const index = rows.indexOf(row);
  const target = button.dataset.skillMove === "up" ? rows[index - 1] : rows[index + 1];
  if(!row || !target) return;

  const firstKey = row.dataset.skillKey;
  const secondKey = target.dataset.skillKey;
  const firstData = snapshot(row);
  const secondData = snapshot(target);
  applyData(firstKey, secondData);
  applyData(secondKey, firstData);
}, true);

function snapshot(row){
  const data = {};
  row.querySelectorAll("[data-f]").forEach(element => {
    data[element.dataset.f] = element.type === "checkbox" ? element.checked : element.value;
  });
  return data;
}

function findRow(key){
  return document.querySelector(`tr[data-skill-key="${CSS.escape(key)}"]`);
}

function applyData(key,data){
  let row = findRow(key);
  if(!row) return;

  for(const field of ["name","skill_kind","description"]){
    const element = row.querySelector(`[data-f="${field}"]`);
    if(!element || data[field] === undefined) continue;
    element.value = data[field];
    element.dispatchEvent(new Event("input",{bubbles:true}));
    row = findRow(key) || row;
  }

  row = findRow(key);
  const level = row?.querySelector('[data-f="level"]');
  if(level){
    level.value = "0";
    level.dispatchEvent(new Event("input",{bubbles:true}));
  }

  for(const suit of SORT_SUITS){
    if(!data[suit]) continue;
    row = findRow(key);
    const checkbox = row?.querySelector(`[data-f="${suit}"]`);
    if(!checkbox) continue;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event("input",{bubbles:true}));
  }
}
