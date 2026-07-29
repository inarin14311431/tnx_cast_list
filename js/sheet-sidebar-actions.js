(() => {
  const panel = document.querySelector('.exp-panel');
  if (!panel) return;

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
