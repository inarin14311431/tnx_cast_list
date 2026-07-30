/* Coordinate batch import, one final outfit render, progress reporting, and one final save. */
(() => {
  const apply = document.querySelector('#legacy-import-apply');
  const message = document.querySelector('#legacy-import-message');
  const outfitRoot = document.querySelector('#outfit-list');
  if (!apply || !message || !outfitRoot) return;

  let finalizing = false;
  let completionText = '';

  const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));
  const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

  function setProgress(percent, title, detail = '') {
    message.textContent = `${title}${detail ? `（${detail}）` : ''}`;
    document.dispatchEvent(new CustomEvent('tnx-import-progress', {
      detail: { percent, title, detail }
    }));
  }

  function outfitCounts() {
    const all = [...outfitRoot.querySelectorAll('[data-outfit-key]')];
    const rows = [...outfitRoot.querySelectorAll('.outfit-table-row[data-outfit-key]')];
    const cards = [...outfitRoot.querySelectorAll(':scope > .outfit-card[data-outfit-key]')];
    const unique = new Set(all.map(element => element.dataset.outfitKey).filter(Boolean));
    return { total: unique.size, rendered: rows.length, cards: cards.length };
  }

  function startBatch() {
    completionText = '';
    finalizing = false;
    window.__tnxBatchImportActive = true;
    document.documentElement.dataset.batchImport = '1';
    setProgress(1, '取込を準備しています…');
  }

  async function waitForFinalTable() {
    const started = performance.now();
    let stable = 0;
    let previous = '';

    while (performance.now() - started < 15000) {
      const counts = outfitCounts();
      const signature = `${counts.total}:${counts.rendered}:${counts.cards}`;
      const ratio = counts.total ? Math.min(1, counts.rendered / counts.total) : 1;
      const percent = Math.round(65 + ratio * 25);
      setProgress(percent, 'アウトフィットを分類別テーブルへ最終変換しています…', `${counts.rendered}/${counts.total}件`);

      if (signature === previous) stable += 1;
      else stable = 0;
      previous = signature;

      const complete = counts.total === 0 || (counts.rendered >= counts.total && counts.cards === 0);
      if (complete && stable >= 2) return counts;

      await sleep(150);
    }

    const counts = outfitCounts();
    throw new Error(`分類別テーブルへの変換が完了しませんでした（${counts.rendered}/${counts.total}件）。`);
  }

  async function finishBatch(text) {
    if (finalizing) return;
    finalizing = true;
    completionText = text;

    try {
      setProgress(65, 'アウトフィットの一括入力が完了しました。最終変換を開始します…');
      window.__tnxBatchImportActive = false;
      delete document.documentElement.dataset.batchImport;

      window.TNXOutfitRenderGate?.flush?.();
      await nextFrame();
      await nextFrame();
      await waitForFinalTable();

      setProgress(92, '経験点を再計算しています…');
      window.TNXExperience?.queue?.();
      await nextFrame();
      await nextFrame();

      setProgress(96, '最終変換が完了しました。DBへ保存しています…');
      window.TNXSaveWatchdog?.flush?.();
      await sleep(300);

      setProgress(100, '取込処理が完了しました');
      message.textContent = completionText.replace(
        /反映内容は約1\.2秒後にDBへ自動保存されます。[^。]*。?/,
        '分類別テーブルへの変換後、DBへの保存を開始しました。画面上部が「保存済み」になるまでページを閉じないでください。'
      );
    } catch (error) {
      console.error(error);
      window.__tnxBatchImportActive = false;
      delete document.documentElement.dataset.batchImport;
      window.TNXOutfitRenderGate?.flush?.();
      message.textContent = `最終変換エラー：${error.message} 画面を閉じず、再度「編集画面へ反映」を実行してください。`;
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
      window.TNXOutfitRenderGate?.flush?.();
    }
  }).observe(message, { childList: true, subtree: true, characterData: true });
})();