import { STYLE_DATA, UTSUWA_ATTRIBUTES } from "./style-data.js";

/* Single authoritative experience-point calculator. */
(function(){
  const $=selector=>document.querySelector(selector);
  const $$=selector=>[...document.querySelectorAll(selector)];
  const ABILITIES=["reason","passion","life","mundane"];
  const STYLE_COST=window.TNXStyleSkillKinds?.costs||{normal:10,secret:20,ultimate:50,direction:2};
  const INITIAL_SKILL_COST=165;
  const CREATION_ALLOWANCE=170;
  const PART_ORDER=["一般技能","能力値","制御値","スタイル技能","アウトフィット"];
  let queued=false;
  let writing=false;

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
    for(const key of ABILITIES){
      result[key]=0;
      result[`${key}-control`]=0;
    }
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
    for(let step=1;step<=growth;step++){
      total+=base+step<=threshold?20:40;
    }
    return total;
  }

  function skillCategory(row){
    if(row.closest("#style-skills"))return "style";
    return "general";
  }

  function skillParts(){
    let general=0;
    let style=0;
    const seen=new Set();
    const rows=$$("#general-skills tr[data-skill-key],#style-skills tr[data-skill-key]");
    for(const row of rows){
      const key=row.dataset.skillKey;
      if(key&&seen.has(key))continue;
      if(key)seen.add(key);
      const name=row.querySelector('[data-f="name"]')?.value?.trim()||"";
      if(!name)continue;
      const level=Math.max(0,num(row.querySelector('[data-f="level"]')?.value));
      if(level<=0)continue;
      const kind=row.querySelector('[data-f="skill_kind"]')?.value||"general";
      if(skillCategory(row)==="style"){
        style+=level*(STYLE_COST[kind]??10);
      }else{
        general+=level*(kind==="proper"?5:10);
      }
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

  function applyAllowance(parts){
    let remaining=CREATION_ALLOWANCE;
    const net={};
    for(const label of PART_ORDER){
      const value=Math.max(0,num(parts[label]));
      const covered=Math.min(value,remaining);
      net[label]=value-covered;
      remaining-=covered;
    }
    return net;
  }

  function calculate(){
    queued=false;
    const base=baselines();
    let ability=0;
    let control=0;
    for(const key of ABILITIES){
      ability+=steppedCost(base[key],num($(`#${key}-base`)?.value),10);
      control+=steppedCost(base[`${key}-control`],num($(`#${key}-control-base`)?.value),16);
    }

    const skills=skillParts();
    const grossParts={
      "能力値":ability,
      "制御値":control,
      "一般技能":skills.general,
      "スタイル技能":skills.style,
      "アウトフィット":outfitCost()
    };
    const gross=Object.values(grossParts).reduce((sum,value)=>sum+value,0);
    const total=Math.max(0,gross-CREATION_ALLOWANCE);
    const parts=applyAllowance(grossParts);

    writing=true;
    const output=$("#exp-total");
    if(output&&output.textContent!==String(total)){
      output.textContent=String(total);
      output.classList.remove("flash");
      void output.offsetWidth;
      output.classList.add("flash");
    }
    const breakdown=$("#exp-breakdown");
    const html=["能力値","制御値","一般技能","スタイル技能","アウトフィット"]
      .map(label=>`<div><dt>${label}</dt><dd>${parts[label]||0}</dd></div>`)
      .join("");
    if(breakdown&&breakdown.innerHTML!==html)breakdown.innerHTML=html;
    writing=false;

    return {
      total,
      parts,
      grossParts,
      gross,
      initialSkillCost:INITIAL_SKILL_COST,
      allowance:CREATION_ALLOWANCE
    };
  }

  function queue(){
    if(writing||queued)return;
    queued=true;
    requestAnimationFrame(calculate);
  }

  window.TNXExperience={calculate,queue};
  document.addEventListener("input",queue,true);
  document.addEventListener("change",queue,true);
  new MutationObserver(mutations=>{
    if(writing)return;
    if(mutations.every(item=>item.target.closest?.("#exp-total,#exp-breakdown")))return;
    queue();
  }).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",queue,{once:true});
  else queue();
})();
