/* Public-view presentation for cast styles, divine works and style skills. */
(function(){
  const root=document.querySelector("#cast-content")||document.body;
  let completed=false;
  let attempts=0;

  function stateFor(mark){
    const value=String(mark||"").trim();
    if(value.includes("◎")&&value.includes("●"))return "is-dual";
    if(value.includes("◎"))return "is-persona";
    if(value.includes("●"))return "is-key";
    return "is-standard";
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
      heading.innerHTML="<strong>キャスト　スタイル</strong>";
      styles.before(heading);
    }

    chips.forEach((chip,index)=>{
      chip.querySelectorAll(".cast-archetype-card__scan,.cast-archetype-card__role").forEach(element=>element.remove());
      chip.classList.remove("cast-archetype-card","is-persona","is-key","is-dual","is-standard");
      chip.classList.add("cast-style-card-simple",stateFor(chip.querySelector(".style-chip__mark")?.textContent));
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
    const heading=panel.querySelector("header h2");
    if(heading&&!heading.dataset.enhanced){
      heading.dataset.enhanced="true";
      heading.innerHTML='神業認証 <small>DIVINE AUTHORITY</small>';
      const status=document.createElement("span");
      status.className="cast-divine-authority__status";
      status.textContent="AUTHORITY CHANNEL // ONLINE";
      panel.querySelector("header")?.append(status);
    }

    cards.forEach((card,index)=>{
      if(card.dataset.divineEnhanced==="true")return;
      card.dataset.divineEnhanced="true";
      card.dataset.divineCode=`MIRACLE-${String(index+1).padStart(2,"0")}`;
      card.classList.add("cast-divine-card",`cast-divine-card--${index+1}`);

      const seal=document.createElement("span");
      seal.className="cast-divine-card__seal";
      seal.textContent="AUTHORIZED";

      const channel=document.createElement("span");
      channel.className="cast-divine-card__channel";
      channel.textContent="EXECUTION PRIVILEGE // VERIFIED";

      card.append(seal,channel);
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
