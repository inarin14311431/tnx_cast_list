const publicId = new URLSearchParams(location.search).get("id")?.trim() || "";
const editLink = document.querySelector("#cast-edit-button");

if(editLink && publicId){
  editLink.href = `./sheet.html?id=${encodeURIComponent(publicId)}`;
  editLink.hidden = false;
}

let attempts = 0;
localizeCastView();

function localizeCastView(){
  const content = document.querySelector("#cast-content");

  if(!content || content.hidden){
    localizeStatus();
    if(attempts++ < 40) window.setTimeout(localizeCastView, 100);
    return;
  }

  localizeStatus();
  localizeAbilityLabels();
  localizeSkillTables();
  localizeOutfitTables();
  localizeProfileLabels();
  localizeSkillHeadings();
  localizeOutfitHeadings();
}

function setBilingual(element, jp, en){
  if(!element) return;
  element.replaceChildren(document.createTextNode(jp));
  if(en){
    const small = document.createElement("small");
    small.textContent = en;
    element.append(document.createTextNode(" "), small);
  }
}

function localizeStatus(){
  const status = document.querySelector("#cast-status");
  if(!status) return;
  const text = status.textContent.trim();
  if(/^SCANNING IDENTIFICATION CODE:/i.test(text)){
    const code = text.split(":").slice(1).join(":").trim();
    status.textContent = `キャストデータを読み込み中：${code}`;
  }else if(text === "ACCESS GRANTED"){
    status.textContent = "キャストデータを表示しています。";
  }else if(text === "ACCESS DENIED"){
    status.textContent = "キャストデータへアクセスできません。";
  }
}

function localizeAbilityLabels(){
  const labels = {
    VALUE:["能力値","VALUE"],
    CONTROL:["制御値","CONTROL"],
    CURRENT:["現在値","CURRENT"]
  };
  document.querySelectorAll(".ability-card__label").forEach(element => {
    const hit = labels[element.textContent.trim().toUpperCase()];
    if(hit) setBilingual(element, hit[0], hit[1]);
  });

  const abilityNames = {
    REASON:["理性","REASON"],
    PASSION:["感情","PASSION"],
    LIFE:["生命","LIFE"],
    MUNDANE:["外界","MUNDANE"]
  };
  document.querySelectorAll(".ability-card:not(.ability-card--cs) header span:last-child").forEach(element => {
    const hit = abilityNames[element.textContent.trim().toUpperCase()];
    if(hit) setBilingual(element, hit[0], hit[1]);
  });
}

function localizeSkillHeadings(){
  const labels = {
    "GENERAL SKILLS":["一般技能","GENERAL SKILLS"],
    "SOCIAL":["社会","SOCIAL"],
    "CONNECTIONS":["コネクション","CONNECTIONS"],
    "STYLE SKILLS":["スタイル技能","STYLE SKILLS"]
  };
  document.querySelectorAll("#skills-container .skill-section h3").forEach(element => {
    const key = element.textContent.trim().toUpperCase();
    const hit = labels[key];
    if(hit) setBilingual(element, hit[0], hit[1]);
  });
}

function localizeSkillTables(){
  const headers = [
    ["名称","NAME"],
    ["LV", "LEVEL"],
    ["理性","REASON"],
    ["感情","PASSION"],
    ["生命","LIFE"],
    ["外界","MUNDANE"],
    ["詳細","DETAIL"]
  ];
  document.querySelectorAll("#skills-container .data-table thead tr").forEach(row => {
    [...row.children].forEach((cell,index) => {
      const label = headers[index];
      if(label) setBilingual(cell,label[0],label[1]);
    });
  });
}

function localizeOutfitTables(){
  const labels = {
    NAME:["名称","NAME"],
    PURCHASE:["購入","PURCHASE"],
    EXP:["常備化","EXP"],
    SLOT:["部位","SLOT"],
    RANGE:["射程","RANGE"],
    ATTACK:["攻撃","ATTACK"],
    DEFENSE:["防御","DEFENSE"],
    DESCRIPTION:["解説","DESCRIPTION"]
  };
  document.querySelectorAll("#outfit-container th").forEach(cell => {
    const hit = labels[cell.textContent.trim().toUpperCase()];
    if(hit) setBilingual(cell,hit[0],hit[1]);
  });
}

function localizeOutfitHeadings(){
  const labels = {
    WEAPON:["武器","WEAPON"],
    ARMOR:["防具","ARMOR"],
    CYBERWARE:["サイバーウェア","CYBERWARE"],
    TRON:["トロン","TRON"],
    VEHICLE:["ヴィークル","VEHICLE"],
    RESIDENCE:["住居","RESIDENCE"],
    OTHER:["その他","OTHER"]
  };
  document.querySelectorAll("#outfit-container .outfit-section h2").forEach(element => {
    const hit = labels[element.textContent.trim().toUpperCase()];
    if(hit) setBilingual(element,hit[0],hit[1]);
  });
}

function localizeProfileLabels(){
  const labels = {
    AGE:["年齢","AGE"],
    GENDER:["性別","GENDER"],
    HEIGHT:["身長","HEIGHT"],
    WEIGHT:["体重","WEIGHT"],
    EYES:["瞳","EYES"],
    HAIR:["髪","HAIR"],
    SKIN:["肌","SKIN"],
    ORIGIN:["出自","ORIGIN"],
    EXPERIENCE:["経験","EXPERIENCE"],
    ENCOUNTER:["邂逅","ENCOUNTER"]
  };
  document.querySelectorAll("#personal-data dt, #life-path dt").forEach(element => {
    const hit = labels[element.textContent.trim().toUpperCase()];
    if(hit) setBilingual(element,hit[0],hit[1]);
  });
}