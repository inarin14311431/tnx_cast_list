import "./help-ui.js?v=4";
import "./combo-multi-suit.js?v=1";
import "./sheet-save-state.js?v=2";
import "./direct-transfer-button.js?v=6";
import "./sheet-import-specialized-repair.js?v=1";

/* Sheet editor helper features.
 * Keeps only presentation helpers. DB persistence is handled by sheet.js,
 * save-state presentation is handled by sheet-save-state.js,
 * experience calculation is handled by experience.js, and outfit layout is
 * owned by outfit-display-rules-v5.js.
 */

initialize();

function initialize(){
  initializeComboStyleSkillCompletion();
  ensureGlobalHelpAvailable();
}

function ensureGlobalHelpAvailable(){
  if(document.body?.dataset.page!=="sheet.html")return;
  window.setTimeout(()=>{
    if(document.querySelector("#sheet-global-help"))return;
    import("./help-ui.js?v=4&retry=1").catch(error=>console.error("Help UI bootstrap failed",error));
  },250);
}

function initializeComboStyleSkillCompletion(){
  const styleRoot=document.querySelector("#style-skills");
  const optionRoot=document.querySelector("#sheet-combo-skill-options");
  const counterSelect=document.querySelector("#sheet-counter-skill");
  if(!styleRoot||!optionRoot||!counterSelect)return;

  let queued=false;

  const getStyleSkills=()=>[...styleRoot.querySelectorAll('tr[data-skill-key]')]
    .map(row=>({
      name:String(row.querySelector('[data-f="name"]')?.value||"").trim(),
      level:Number(row.querySelector('[data-f="level"]')?.value||0)
    }))
    .filter(item=>item.name&&item.level>0);

  const sync=()=>{
    queued=false;
    const skills=getStyleSkills();
    if(!skills.length)return;

    let group=[...optionRoot.querySelectorAll('.sheet-combo-skill-group')]
      .find(item=>item.querySelector(':scope > span')?.textContent.trim()==="スタイル技能");

    if(!group){
      group=document.createElement("div");
      group.className="sheet-combo-skill-group";
      const heading=document.createElement("span");
      heading.textContent="スタイル技能";
      const choices=document.createElement("div");
      group.append(heading,choices);
      optionRoot.append(group);
    }

    const choices=group.querySelector(':scope > div');
    const existingChecks=new Set([...choices.querySelectorAll('input[data-skill-name]')].map(input=>input.dataset.skillName));
    for(const skill of skills){
      if(existingChecks.has(skill.name))continue;
      const label=document.createElement("label");
      const input=document.createElement("input");
      input.type="checkbox";
      input.dataset.skillName=skill.name;
      const text=document.createElement("span");
      text.textContent=skill.name;
      label.append(input,text);
      choices.append(label);
      existingChecks.add(skill.name);
    }

    const existingOptions=new Set([...counterSelect.options].map(option=>option.value));
    for(const skill of skills){
      if(existingOptions.has(skill.name))continue;
      counterSelect.add(new Option(`${skill.name} / LV${skill.level}`,skill.name));
      existingOptions.add(skill.name);
    }
  };

  const queue=()=>{
    if(queued)return;
    queued=true;
    requestAnimationFrame(sync);
  };

  new MutationObserver(queue).observe(optionRoot,{childList:true,subtree:true});
  new MutationObserver(queue).observe(counterSelect,{childList:true});
  styleRoot.addEventListener("tnx:style-skills-changed",queue);
  queue();
}
