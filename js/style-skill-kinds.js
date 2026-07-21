/* Shared style-skill kind definitions for UI, import and EXP calculation. */
(function(){
  const definitions=[
    {value:"normal",label:"通常",cost:10},
    {value:"secret",label:"秘技",cost:20},
    {value:"ultimate",label:"奥義",cost:50},
    {value:"direction",label:"演出",cost:2}
  ];

  window.TNXStyleSkillKinds={
    definitions,
    values:definitions.map(item=>item.value),
    labels:Object.fromEntries(definitions.map(item=>[item.value,item.label])),
    costs:Object.fromEntries(definitions.map(item=>[item.value,item.cost])),
    fromLabel(label){
      const text=String(label||"").trim();
      return definitions.find(item=>item.label===text)?.value||"normal";
    }
  };
})();
