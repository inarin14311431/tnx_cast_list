let attempts = 0;

function splitSkillPanels(){
  const originalPanel = document.querySelector("#tab-session .panel-skills");
  const styleSection = document.querySelector("#skills-container .skill-section.is-style");
  if(!originalPanel || !styleSection){
    if(attempts++ < 40) setTimeout(splitSkillPanels,100);
    return;
  }
  if(document.querySelector("#style-skill-panel")) return;

  const panel = document.createElement("section");
  panel.id = "style-skill-panel";
  panel.className = "data-panel data-panel--wide panel-style-skills";
  panel.innerHTML = '<header class="data-panel__header"><h2>スタイル技能 <small>STYLE SKILLS</small></h2></header><div class="style-skill-panel__body"></div>';
  panel.querySelector(".style-skill-panel__body").append(styleSection);
  originalPanel.insertAdjacentElement("afterend",panel);

  const originalHeading = styleSection.querySelector("h3");
  if(originalHeading) originalHeading.hidden = true;
}

splitSkillPanels();