(()=>{
  const load=src=>new Promise((resolve,reject)=>{
    const script=document.createElement("script");
    script.src=src;
    script.onload=()=>{script.remove();resolve()};
    script.onerror=()=>{script.remove();reject(new Error(`転記スクリプトを読み込めませんでした: ${src}`))};
    document.documentElement.append(script);
  });

  load("https://cdn.jsdelivr.net/gh/inarin14311431/tnx_cast_list@893d5243ca5dedd2f525f23d6a4536f96d9fd772/js/tnx-transfer-bookmarklet.js")
    .then(()=>load(`https://inarin14311431.github.io/tnx_cast_list/js/tnx-transfer-bookmarklet-fixes.js?t=${Date.now()}`))
    .catch(error=>{
      console.error("TNX transfer loader failed",error);
      alert(`転記スクリプトの読込に失敗しました。\n${error.message}`);
    });
})();
