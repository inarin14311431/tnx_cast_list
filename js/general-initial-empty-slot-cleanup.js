/* Remove legacy startup-only blank General-skill rows once.
 * User-created rows added after initialization are not affected. */
(() => {
  let finished = false;
  let attempts = 0;

  function removeOne() {
    if (finished) return;
    const root = document.querySelector('#general-skills');
    if (!root) {
      if (attempts++ < 80) setTimeout(removeOne, 80);
      return;
    }

    const row = root.querySelector('tr[data-general-slot-column]');
    if (row) {
      const button = row.querySelector('[data-delete-skill]');
      if (button) button.click();
      else row.remove();
      requestAnimationFrame(removeOne);
      return;
    }

    if (!root.querySelector('tr[data-skill-key]') && attempts++ < 80) {
      setTimeout(removeOne, 80);
      return;
    }

    finished = true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', removeOne, { once: true });
  } else {
    removeOne();
  }
})();
