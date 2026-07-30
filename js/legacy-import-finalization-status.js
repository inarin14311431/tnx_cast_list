/* Coordinate batch import, one final outfit-table render, and one final save. */
(() => {
  const apply = document.querySelector('#legacy-import-apply');
  const message = document.querySelector('#legacy-import-message');
  if (!apply || !message) return;

  let finalizing = false;
  let completionText = '';

  const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));
  const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

  async function waitForOutfitTables(timeout = 5000) {
    const started = performance.now();
    while (!window.TNXOutfitTables?.flush) {
      if (performance.now() - started > timeout) return false;
      await wait(50);
    }
    return true;
  }

  function startBatch() {
    completionText = '';
    finalizing = false;
    window.__tnxBatchImportActive = true;
    document.documentElement.dataset.batchImport = '1';
  }

  async function finishBatch(text) {
    if (finalizing) return;
    finalizing = true;
    completionText = text;
    message.textContent = 'アウトフィットを分類別テーブルへ最終変換しています…';

    try {
      await waitForOutfitTables();
      window.__tnxBatchImportActive = false;
      delete document.documentElement.dataset.batchImport;

      await window.TNXOutfitTables?.flush?.();
      window.TNXExperience?.queue?.();
      await nextFrame();
      await nextFrame();

      message.textContent = '最終変換が完了しました。DBへ保存しています…';
      window.TNXSaveWatchdog?.flush?.();

      message.textContent = completionText.replace(
        /反映内容は約1\.2秒後にDBへ自動保存されます。[^。]*。?/, 
        '最終変換後の内容をDBへ保存しています。画面上部が「保存済み」になるまでページを閉じないでください。'
      );
    } catch (error) {
      console.error(error);
      window.__tnxBatchImportActive = false;
      delete document.documentElement.dataset.batchImport;
      message.textContent = `最終変換エラー：${error.message}`;
    } finally {
      finalizing = false;
    }
  }

  apply.addEventListener('click', startBatch, true);

  document.addEventListener('click', event => {
    if (!window.__tnxBatchImportActive) return;
    if (!event.target.closest('#save-button')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  new MutationObserver(() => {
    const text = message.textContent || '';
    if (text.startsWith('反映しました')) {
      finishBatch(text);
      return;
    }
    if (text.includes('取込エラー')) {
      window.__tnxBatchImportActive = false;
      delete document.documentElement.dataset.batchImport;
    }
  }).observe(message, { childList: true, subtree: true, characterData: true });
})();