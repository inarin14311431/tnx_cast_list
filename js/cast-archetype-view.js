/* Public-view presentation for cast styles, divine works and style skills. */
(function(){
  const root=document.querySelector("#cast-content")||document.body;
  const scriptUrl=document.currentScript?.src||location.href;
  const styleDataUrl=new URL("./style-data.js",scriptUrl).href;
  const divineYomiByStyle=new Map();
  let completed=false;
  let attempts=0;

  import(styleDataUrl).then(module=>{
    for(const item of module.STYLE_DATA||[]){
      divineYomiByStyle.set(item.name,item.divineYomi||"");
    }
    enhanceDivines();
  }).catch(error=>console.warn("Divine work readings could not be loaded.",error));

  function stateFor(mark){
    const value=String(mark||"").trim();
    if(value.includes("◎")&&value.includes("●"))return "is-dual";
    if(value.includes("◎"))return "is-persona";
    if(value.includes("●"))return "is-key";
    return "is-standard";
  }

  function roleFor(mark){
    const value=String(mark||"").trim();
    if(value.includes("◎")&&value.includes("●"))return "PERSONA=KEY";
    if(value.includes("◎"))return "PERSONA";
    if(value.includes("●"))return "KEY";
    return "SHADOW";
  }

  function enhanceStyles(){
    const styles=document.querySelector("#cast-styles");
    const chips=[...document.querySelectorAll("#cast-styles .style-chip")];
    if(!styles||!chips.length)return false;

    styles.classList.remove("cast-archetype-grid");
    styles.classList.add("cast-style-grid-simple");

    let heading=styles.previousElementSibling;
    if(!heading?.classList.contains("cast-style-heading-simple")){
      if(heading?.classList.contains("cast-archetype-heading"))heading.remove();
      heading=document.createElement("header");
      heading.className="cast-style-heading-simple";
      heading.innerHTML='<strong>スタイル <small>STYLE</small></strong>';
      styles.before(heading);
    }
    heading.classList.add("cast-unified-heading");

    chips.forEach((chip,index)=>{
      chip.querySelectorAll(".cast-archetype-card__scan,.cast-archetype-card__role").forEach(element=>element.remove());
      chip.classList.remove("cast-archetype-card","is-persona","is-key","is-dual","is-standard");
      const mark=chip.querySelector(".style-chip__mark")?.textContent||"";
      chip.classList.add("cast-style-card-simple",stateFor(mark));
      chip.dataset.styleRole=roleFor(mark);
      chip.dataset.castStyleSlot=String(index+1).padStart(2,"0");
      delete chip.dataset.archetypeCode;
      delete chip.dataset.archetypeEnhanced;
    });
    return true;
  }

  function enhanceDivines(){
    const panel=document.querySelector(".hero-divine-panel");
    const cards=[...document.querySelectorAll("#divine-list .divine-card")];
    if(!panel||!cards.length)return false;

    panel.classList.add("cast-divine-authority");
    const panelHeader=panel.querySelector(":scope > header");
    panelHeader?.classList.add("cast-unified-heading");
    const heading=panel.querySelector("header h2");
    if(heading&&!heading.dataset.enhanced){
      heading.dataset.enhanced="true";
      heading.innerHTML='神業 <small>DIVINE WORK</small>';
      const status=document.createElement("span");
      status.className="cast-divine-authority__status";
      status.textContent="AUTHORITY CHANNEL // ONLINE";
      panelHeader?.append(status);
    }

    cards.forEach((card,index)=>{
      card.dataset.divineEnhanced="true";
      card.dataset.divineCode=`MIRACLE-${String(index+1).padStart(2,"0")}`;
      card.classList.add("cast-divine-card",`cast-divine-card--${index+1}`);
      card.querySelectorAll(".cast-divine-card__seal,.cast-divine-card__channel").forEach(element=>element.remove());

      let code=card.querySelector(".cast-divine-card__code");
      if(!code){
        code=document.createElement("span");
        code.className="cast-divine-card__code";
        card.prepend(code);
      }
      code.textContent=card.dataset.divineCode;

      const styleName=card.querySelector(".divine-card__style")?.textContent.trim()||"";
      const name=card.querySelector(".divine-card__name");
      let yomi=card.querySelector(".divine-card__yomi");
      if(!yomi){
        yomi=document.createElement("span");
        yomi.className="divine-card__yomi";
        name?.insertAdjacentElement("afterend",yomi);
      }
      yomi.textContent=divineYomiByStyle.get(styleName)||"";
      yomi.hidden=!yomi.textContent;
    });
    return true;
  }

  function enhanceStyleSkillPanel(){
    const panel=document.querySelector("#style-skill-panel");
    const table=document.querySelector(".style-skill-view-table");
    if(!panel||!table)return false;
    panel.classList.add("cast-style-skill-analysis");
    const heading=panel.querySelector(".data-panel__header h2");
    if(heading&&!heading.dataset.enhanced){
      heading.dataset.enhanced="true";
      heading.innerHTML='スタイル技能解析 <small>STYLE SKILL ANALYSIS</small>';
    }
    return true;
  }

  function attempt(){
    const styles=enhanceStyles();
    const divines=enhanceDivines();
    const skills=enhanceStyleSkillPanel();
    if(styles&&divines&&skills){
      completed=true;
      observer.disconnect();
      return;
    }
    if(++attempts>=80)observer.disconnect();
  }

  const observer=new MutationObserver(attempt);
  observer.observe(root,{attributes:true,childList:true,subtree:true});
  attempt();
  const timer=setInterval(()=>{
    attempt();
    if(completed||attempts>=80)clearInterval(timer);
  },120);
})();
