/* Keep legacy-import completion text in sync with the outfit table final conversion. */
(() => {
  const message = document.querySelector('#legacy-import-message');
  if (!message) return;

  let deferredCompletion = '';
  let stableTimer = 0;
  let lastSignature = '';

  function visible(element) {
    if (!(element instanceof HTMLElement)) return false;
    const style = getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
  }

  function finalizationPanel() {
    return [...document.querySelectorAll('body *')].find(element => {
      if (element === message || !visible(element)) return false;
      const own = [...element.childNodes]
        .filter(node => node.nodeType === Node.TEXT_NODE)
        .map(node => node.textContent || '')
        .join(' ');
      return own.includes('アウトフィットを最終変換中');
    }) || null;
  }

  function outfitSignature() {
    const rows = [...document.querySelectorAll('#outfit-list [data-outfit-key]')];
    return rows.map(row => {
      const key = row.dataset.outfitKey || '';
      const category = row.querySelector('[data-o="category"]')?.value || '';
      const name = row.querySelector('[data-o="name"]')?.value || '';
      return `${key}:${category}:${name}`;
    }).join('|');
  }

  function waitForStableCompletion() {
    clearTimeout(stableTimer);
    const check = () => {
      const panel = finalizationPanel();
      const signature = outfitSignature();
      if (panel || signature !== lastSignature) {
        lastSignature = signature;
        stableTimer = setTimeout(check, 250);
        return;
      }
      if (deferredCompletion) {
        message.textContent = deferredCompletion;
        deferredCompletion = '';
      }
    };
    lastSignature = outfitSignature();
    stableTimer = setTimeout(check, 250);
  }

  const observer = new MutationObserver(() => {
    const text = message.textContent || '';
    const panel = finalizationPanel();

    if (text.startsWith('反映しました') && panel) {
      deferredCompletion = text;
      message.textContent = 'アウトフィットの最終変換が完了するまでお待ちください。';
      waitForStableCompletion();
      return;
    }

    if (deferredCompletion) {
      const progress = panel?.textContent?.trim();
      if (progress) message.textContent = progress;
      waitForStableCompletion();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
})();