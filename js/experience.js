import { STYLE_DATA, UTSUWA_ATTRIBUTES } from "./style-data.js";

/* Authoritative experience-point calculator for the editor. */
(function(){
  const $=selector=>document.querySelector(selector);
  const $$=selector=>[...document.querySelectorAll(selector)];
  const ABILITIES=["reason","passion","life","mundane"];
  const STYLE_COST=window.TNXStyleSkillKinds?.costs||{normal:10,secret:20,ultimate:50,direction:2};
  const INITIAL_ALLOWANCE={character:170,social:20,connection:15};
  let queued=false;

  function num(value){
    const parsed=Number(value);
    return Number.isFinite(parsed)?parsed:0;
  }

  function styleRecord(index){
    const name=$(`#style-${index}`)?.value||"";
    if(name==="ウツワ"){
      const attribute=$(`#style-${index}-attribute`)?.value||"";
      return UTSUWA_ATTRIBUTES.find(item=>item.name===attribute)||null;
    }
    return STYLE_DATA.find(item=>item.name===name)||null;
  }

  function baselines(){
    const result={};
    for(const key of ABILITIES){result[key]=0;result[`${key}-control`]=0;}
    for(let index=1;index<=3;index++){
      const record=styleRecord(index);
      if(!record)continue;
      for(const key of ABILITIES){
        result[key]+=num(record[key]?.[0]);
        result[`${key}-control`]+=num(record[key]?.[1]);
      }
    }
    return result;
  }

  function steppedCost(base,current,threshold){
    let total=0;
    const growth=Math.max(0,current-base);
    for(let step=1;step<=growth;step++)total+=base+step<=threshold?20:40;
    return total;
  }

  function skillCategory(row){
    if(row.closest("#style-skills"))return "style";
    const title=row.closest(".skill-group")?.querySelector(".skill-group-title")?.textContent||"";
    if(title.includes("社会"))return "social";
    if(title.includes("コネ"))return "connection";
    return "general";
  }

  function skillParts(){
    let general=0,style=0;
    const rows=$$("#general-skills tr[data-skill-key],#style-skills tr[data-skill-key]");
    for(const row of rows){
      const name=row.querySelector('[data-f="name"]')?.value?.trim()||"";
      if(!name||name.includes("初期取得"))continue;
      const level=Math.max(0,num(row.querySelector('[data-f="level"]')?.value));
      if(level<=0)continue;
      const kind=row.querySelector('[data-f="skill_kind"]')?.value||"general";
      if(skillCategory(row)==="style")style+=level*(STYLE_COST[kind]??10);
      else general+=level*(kind==="proper"?5:10);
    }
    return {general,style};
  }

  function outfitCost(){
    let total=0;
    const seen=new Set();
    for(const control of $$('#outfit-list [data-o="experience_cost"]')){
      const row=control.closest('[data-outfit-key]');
      const key=row?.dataset.outfitKey||control;
      if(seen.has(key))continue;
      seen.add(key);
      total+=Math.max(0,num(control.value));
    }
    return total;
  }

  function calculate(){
    queued=false;
    const base=baselines();
    let ability=0,control=0;
    for(const key of ABILITIES){
      ability+=steppedCost(base[key],num($(`#${key}-base`)?.value),10);
      control+=steppedCost(base[`${key}-control`],num($(`#${key}-control-base`)?.value),16);
    }

    const skills=skillParts();
    const outfit=outfitCost();
    const gross=ability+control+skills.general+skills.style+outfit;
    const allowance=INITIAL_ALLOWANCE.character+INITIAL_ALLOWANCE.social+INITIAL_ALLOWANCE.connection;
    const total=Math.max(0,gross-allowance);
    const parts={"能力値":ability,"制御値":control,"一般技能":skills.general,"スタイル技能":skills.style,"アウトフィット":outfit};

    const output=$("#exp-total");
    if(output)output.textContent=String(total);
    const breakdown=$("#exp-breakdown");
    if(breakdown)breakdown.innerHTML=Object.entries(parts).map(([label,value])=>`<div><dt>${label}</dt><dd>${value}</dd></div>`).join("");

    return {total,parts,gross,allowance};
  }

  function queue(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>requestAnimationFrame(calculate));
  }

  window.TNXExperience={calculate,queue};
  document.addEventListener("input",queue,true);
  document.addEventListener("change",queue,true);
  new MutationObserver(queue).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",queue,{once:true});
  else queue();
})();
