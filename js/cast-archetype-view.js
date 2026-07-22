/* Archetype and divine-authority presentation for the public cast view. */
(function(){
  const root=document.querySelector("#cast-content")||document.body;
  let completed=false;
  let attempts=0;

  function roleFor(mark){
    const value=String(mark||"").trim();
    if(value.includes("◎")&&value.includes("●"))return ["is-dual","PERSONA / KEY"];
    if(value.includes("◎"))return ["is-persona","PERSONA"];
    if(value.includes("●"))return ["is-key","KEY"];
    return ["is-standard","STYLE"];
  }

  function enhanceStyles(){
    const styles=document.querySelector("#cast-styles");
    const chips=[...document.querySelectorAll("#cast-styles .style-chip")];
    if(!styles||!chips.length)return false;

    styles.classList.add("cast-archetype-grid");
    if(!styles.previousElementSibling?.classList.contains("cast-archetype-heading")){
      const heading=document.createElement("header");
      heading.className="cast-archetype-heading";
      heading.innerHTML='<div><span>STYLE SIGNATURE</span><strong>アーキタイプ解析</strong></div><small>IDENTITY PATTERN // 3 SLOTS VERIFIED</small>';
      styles.before(heading);
    }

    chips.forEach((chip,index)=>{
      if(chip.dataset.archetypeEnhanced==="true")return;
      chip.dataset.archetypeEnhanced="true";
      chip.dataset.archetypeCode=`ARCHETYPE-${String(index+1).padStart(2,"0")}`;

      const mark=chip.querySelector(".style-chip__mark")?.textContent||"";
      const [state,role]=roleFor(mark);
      chip.classList.add("cast-archetype-card",state);

      const scan=document.createElement("span");
      scan.className="cast-archetype-card__scan";
      scan.textContent="PATTERN MATCHED";

      const roleBadge=document.createElement("span");
      roleBadge.className="cast-archetype-card__role";
      roleBadge.textContent=role;

      chip.prepend(scan);
      chip.append(roleBadge);
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
