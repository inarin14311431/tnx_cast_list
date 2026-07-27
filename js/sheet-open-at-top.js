/* Always open the sheet editor at the top and keep its image guidance current. */
(()=>{
  const scrollTop=()=>{
    window.scrollTo(0,0);
    requestAnimationFrame(()=>window.scrollTo(0,0));
  };

  if("scrollRestoration" in history)history.scrollRestoration="manual";

  const updateImageGuidance=()=>{
    const lines=[...document.querySelectorAll(".sheet-image-editor .image-guidance p")];
    const cropLine=lines.find(line=>line.textContent.includes("トリミング"));
    if(cropLine)cropLine.textContent="一覧・閲覧・アクト紹介では上部基準でトリミングされます。";
  };

  scrollTop();
  window.addEventListener("pageshow",scrollTop);
  window.addEventListener("load",()=>{
    updateImageGuidance();
    scrollTop();
    setTimeout(scrollTop,80);
  },{once:true});

  if(document.readyState!=="loading"){
    updateImageGuidance();
    scrollTop();
  }else{
    document.addEventListener("DOMContentLoaded",()=>{
      updateImageGuidance();
      scrollTop();
    },{once:true});
  }
})();
