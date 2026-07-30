/* Load the existing outfit-table implementation with batch-import suspension hooks. */
(() => {
  const SOURCE = './js/outfit-tables.js?v=101';

  function install(source) {
    let code = String(source || '');
    const queueNeedle = "  function queue(){\n    if(queued||rebuilding)return;";
    const queueReplacement = "  let deferredByBatchImport=false;\n\n  function queue(){\n    if(window.__tnxBatchImportActive){deferredByBatchImport=true;return;}\n    if(queued||rebuilding)return;";
    const enhanceNeedle = "  function enhance(){\n    const cards=[...root.querySelectorAll(':scope > .outfit-card[data-outfit-key]')];";
    const enhanceReplacement = "  function enhance(){\n    if(window.__tnxBatchImportActive){deferredByBatchImport=true;return;}\n    deferredByBatchImport=false;\n    const cards=[...root.querySelectorAll(':scope > .outfit-card[data-outfit-key]')];";
    const exposeNeedle = "  configureToolbar();\n  observer.observe(root,{childList:true,subtree:true});\n  queue();";
    const exposeReplacement = "  window.TNXOutfitTables={\n    flush(){\n      deferredByBatchImport=false;\n      queued=false;\n      enhance();\n      return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));\n    },\n    hasDeferred(){return deferredByBatchImport;}\n  };\n\n  configureToolbar();\n  observer.observe(root,{childList:true,subtree:true});\n  queue();";

    if (!code.includes(queueNeedle) || !code.includes(enhanceNeedle) || !code.includes(exposeNeedle)) {
      throw new Error('outfit-tables.js の一括取込用変換に失敗しました。');
    }
    code = code.replace(queueNeedle, queueReplacement)
      .replace(enhanceNeedle, enhanceReplacement)
      .replace(exposeNeedle, exposeReplacement);
    (0, eval)(`${code}\n//# sourceURL=outfit-tables-batch-runtime.js`);
  }

  fetch(SOURCE, { cache: 'no-cache' })
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.text();
    })
    .then(install)
    .catch(error => {
      console.error(error);
      const message = document.querySelector('#legacy-import-message');
      if (message) message.textContent = `アウトフィット表示の初期化に失敗しました：${error.message}`;
    });
})();