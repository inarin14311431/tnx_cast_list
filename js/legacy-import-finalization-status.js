/* Coordinate batch import, one final outfit-table render, and one final save. */
(() => {
  const apply = document.querySelector('#legacy-import-apply');
  const message = document.querySelector('#legacy-import-message');
  const outfitRoot = document.querySelector('#outfit-list');
  if (!apply || !message || !outfitRoot) return;

  let finalizing = false;
  let completionText = '';
  let nativeReplaceChildren = null;

  const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));

  function suspendOutfitRendering() {
    if (nativeReplaceChildren) return;
    nativeReplaceChildren = outfitRoot.replaceChildren.bind(outfitRoot);
    outfitRoot.replaceChildren = (...nodes) => {
      if (window.__tnxBatchImportActive) return;
      nativeReplaceChildren(...nodes);
    };
  }

  function resumeOutfitRendering() {
    if (!nativeReplaceChildren) return;
    outfitRoot.replaceChildren = nativeReplaceChildren;
    nativeReplaceChildren = null;

    // The outfit-table observer listens for child-list changes. A temporary marker
    // requests exactly one rebuild after all imported cards have been populated.
    const marker = document.createComment('batch-import-finished');
    outfitRoot.append(marker);
    marker.remove();
  }

  function startBatch() {
    completionText = '';
    finalizing = false;
    window.__tnxBatchImportActive = true;
    document.documentElement.dataset.batchImport = '1';
    suspendOutfitRendering();
  }

  async function finishBatch(text) {
    if (finalizing) return;
    finalizing = true;
    completionText = text;
    message.textContent = 'アウトフィットを分類別テーブルへ最終変換しています…';

    try {
      window.__tnxBatchImportActive = false;
      delete document.documentElement.dataset.batchImport;
      resumeOutfitRendering();

      await nextFrame();
      await nextFrame();
      await nextFrame();
      window.TNXExperience?.queue?.();

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
      resumeOutfitRendering();
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
      resumeOutfitRendering();
    }
  }).observe(message, { childList: true, subtree: true, characterData: true });
})();