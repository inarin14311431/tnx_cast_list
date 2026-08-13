(() => {
  const quickSheet = document.querySelector('#quick-sheet');
  const pagesRoot = document.querySelector('#quick-sheet-pages');
  if (!quickSheet || !pagesRoot) return;

  let detachedThirdPage = null;
  let scheduledFrame = 0;

  const pageOverflows = page => Boolean(
    page && page.clientHeight > 0 && page.scrollHeight > page.clientHeight + 1
  );

  const hasVisibleData = section => {
    if (!section || section.hidden) return false;
    const rows = [...section.querySelectorAll('tbody tr')];
    if (rows.length) {
      return rows.some(row => !row.querySelector('.quick-sheet__empty'));
    }
    return !section.querySelector('.quick-sheet__empty');
  };

  function removeUnregisteredGeneralRows() {
    const block = pagesRoot.querySelector('.quick-sheet__general-skills');
    if (!block) return;

    block.querySelectorAll('tbody tr').forEach(row => {
      const cells = [...row.cells];
      const level = Number(String(cells[1]?.textContent || '').trim());
      const hasSuit = row.querySelector('.quick-sheet__suit.is-active');
      if (!hasSuit && (!Number.isFinite(level) || level <= 0)) row.remove();
    });

    block.querySelectorAll('.quick-sheet__skill-table').forEach(table => {
      table.hidden = !table.tBodies[0]?.rows.length;
    });

    block.hidden = !block.querySelector('.quick-sheet__skill-table:not([hidden])');
  }

  function hideEmptyBlocks() {
    removeUnregisteredGeneralRows();

    pagesRoot.querySelectorAll('.quick-sheet__skill-side > .quick-sheet__block').forEach(section => {
      section.hidden = !hasVisibleData(section);
    });

    [
      '[data-quick-sheet-section="style-skills"]',
      '[data-quick-sheet-section="weapons"]',
      '[data-quick-sheet-section="armor"]',
      '[data-quick-sheet-section="other-outfits"]',
      '.quick-sheet__combos'
    ].forEach(selector => {
      pagesRoot.querySelectorAll(selector).forEach(section => {
        section.hidden = !hasVisibleData(section);
      });
    });
  }

  function ensureThirdPageConnected() {
    if (!detachedThirdPage || detachedThirdPage.isConnected) return detachedThirdPage;
    pagesRoot.append(detachedThirdPage);
    return detachedThirdPage;
  }

  function detachThirdPageIfUnused(pageThree) {
    if (!pageThree?.isConnected) return;
    detachedThirdPage = pageThree;
    pageThree.remove();
  }

  function compactPages() {
    if (quickSheet.hidden) return;

    hideEmptyBlocks();

    const pageTwo = pagesRoot.querySelector('.quick-sheet__page--two');
    let pageThree = pagesRoot.querySelector('.quick-sheet__page--three');
    if (pageThree) detachedThirdPage = pageThree;
    else pageThree = detachedThirdPage;
    if (!pageTwo || !pageThree) return;

    pageTwo.classList.remove('is-tight', 'is-tighter', 'is-densest');
    pageThree.classList.remove('is-tight', 'is-tighter', 'is-densest', 'has-core-outfits');

    const pageTwoFooter = pageTwo.querySelector('.quick-sheet__page-footer');
    const pageThreeFooter = pageThree.querySelector('.quick-sheet__page-footer');
    const otherOutfits = (pageThree.isConnected ? pageThree : pageTwo)
      .querySelector('[data-quick-sheet-section="other-outfits"]') ||
      pageTwo.querySelector('[data-quick-sheet-section="other-outfits"]') ||
      pageThree.querySelector('[data-quick-sheet-section="other-outfits"]');

    if (otherOutfits && !otherOutfits.hidden && pageTwoFooter && otherOutfits.parentElement !== pageTwo) {
      pageTwo.insertBefore(otherOutfits, pageTwoFooter);
    }

    const needsThirdPage = pageOverflows(pageTwo);
    if (!needsThirdPage) {
      detachThirdPageIfUnused(pageThree);
      return;
    }

    pageThree = ensureThirdPageConnected();
    if (otherOutfits && !otherOutfits.hidden && pageThreeFooter && otherOutfits.parentElement !== pageThree) {
      pageThree.insertBefore(otherOutfits, pageThreeFooter);
    }
  }

  function scheduleCompact() {
    cancelAnimationFrame(scheduledFrame);
    scheduledFrame = requestAnimationFrame(() => {
      scheduledFrame = 0;
      compactPages();
    });
  }

  const observer = new MutationObserver(scheduleCompact);
  observer.observe(pagesRoot, { childList: true, subtree: true });
  observer.observe(quickSheet, { attributes: true, attributeFilter: ['hidden', 'class'] });

  document.querySelector('#cast-quick-sheet-button')?.addEventListener('click', scheduleCompact);
  document.querySelector('#quick-sheet-detail-toggle')?.addEventListener('click', scheduleCompact);
  window.addEventListener('resize', scheduleCompact);
})();
