(() => {
  const panel = document.querySelector('.exp-panel');
  if (!panel) return;

  const ensureHelpLink = () => {
    if (!document.querySelector('link[data-sheet-help-link-style]')) {
      const style = document.createElement('link');
      style.rel = 'stylesheet';
      style.href = './css/sheet-help-link.css?v=1';
      style.setAttribute('data-sheet-help-link-style', '1');
      document.head.append(style);
    }

    if (document.querySelector('[data-sheet-help-link]')) return;
    const link = document.createElement('a');
    link.href = './manual-data-import.html';
    link.target = '_blank';
    link.rel = 'noopener';
    link.className = 'floating-help-link';
    link.setAttribute('data-sheet-help-link', '1');
    link.setAttribute('aria-label', 'データ取込マニュアルを開く');
    link.title = 'データ取込マニュアル';
    link.innerHTML = '<img src="./assets/help-cyberpunk.svg" alt="" class="floating-help-link__icon"><span class="floating-help-link__label">HELP</span>';
    document.body.append(link);
  };

  const GROUP_COLORS = {
    a: '#70efa9',
    b: '#35d7ff',
    c: '#ff1493',
    d: '#ffd000'
  };

  const classify = () => {
    panel.querySelectorAll(':scope > button, :scope > a.sheet-view-link').forEach(element => {
      const label = String(element.textContent || '').replace(/\s+/g, ' ').trim();
      let group = '';

      if (element.id === 'save-button' || /保存済み|未保存|保存中|保存失敗/.test(label)) {
        group = 'a';
      } else if (/キャストを閲覧|データ取込|SKD・OFC補完/.test(label)) {
        group = 'b';
      } else if (/ココフォリア|ユドナリウム/.test(label)) {
        group = 'c';
      } else if (/転記TSV|転記BM/.test(label)) {
        group = 'd';
      }

      if (!group) {
        delete element.dataset.actionGroup;
        element.style.removeProperty('--action-rail');
        element.style.removeProperty('border-left-color');
        return;
      }

      const color = GROUP_COLORS[group];
      element.dataset.actionGroup = group;
      element.style.setProperty('--action-rail', color);
      element.style.setProperty('border-left-color', color, 'important');
    });
  };

  ensureHelpLink();
  classify();
  requestAnimationFrame(classify);
  window.addEventListener('load', classify, { once: true });

  new MutationObserver(classify).observe(panel, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['hidden', 'class', 'id']
  });
})();
