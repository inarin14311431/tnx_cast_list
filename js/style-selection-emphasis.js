(() => {
  function updateCard(card) {
    const select = card.querySelector('.style-fields>label:first-child select');
    if (!select) return;
    const selected = Boolean(String(select.value || '').trim());
    card.classList.toggle('is-style-selected', selected);
  }

  function updateAll() {
    document.querySelectorAll('#style-grid .style-card').forEach(updateCard);
  }

  function initialize() {
    const grid = document.querySelector('#style-grid');
    if (!grid) {
      window.setTimeout(initialize, 80);
      return;
    }

    grid.addEventListener('change', event => {
      const select = event.target.closest?.('.style-fields>label:first-child select');
      if (select) updateCard(select.closest('.style-card'));
    });

    new MutationObserver(updateAll).observe(grid, { childList: true, subtree: true });
    updateAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
