/* Drag-and-drop sorting for style skills only. */
(() => {
  const root = document.querySelector('#style-skills');
  const addButton = document.querySelector('#add-style-skill');
  if (!root || !addButton) return;

  const waitFrame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  let rebuilding = false;
  let drag = null;

  const rows = () => [...root.querySelectorAll('tbody tr[data-skill-key]')];

  function readRow(row) {
    const value = selector => row.querySelector(selector)?.value ?? '';
    const checked = selector => Boolean(row.querySelector(selector)?.checked);
    const detail = {};
    row.querySelectorAll('[data-style-field]').forEach(control => {
      detail[control.dataset.styleField] = control.value;
    });
    return {
      name: value('[data-f="name"]'),
      kind: value('[data-f="skill_kind"]'),
      level: value('[data-f="level"]'),
      reason: checked('[data-f="reason"]'),
      passion: checked('[data-f="passion"]'),
      life: checked('[data-f="life"]'),
      mundane: checked('[data-f="mundane"]'),
      detail,
      description: value('[data-f="description"]')
    };
  }

  function setControl(control, value) {
    if (!control) return;
    if (control.type === 'checkbox') control.checked = Boolean(value);
    else control.value = value ?? '';
    control.dispatchEvent(new Event('input', { bubbles: true }));
  }

  async function populate(row, data) {
    setControl(row.querySelector('[data-f="name"]'), data.name);
    setControl(row.querySelector('[data-f="skill_kind"]'), data.kind);
    setControl(row.querySelector('[data-f="level"]'), data.level);
    setControl(row.querySelector('[data-f="reason"]'), data.reason);
    setControl(row.querySelector('[data-f="passion"]'), data.passion);
    setControl(row.querySelector('[data-f="life"]'), data.life);
    setControl(row.querySelector('[data-f="mundane"]'), data.mundane);
    await waitFrame();
    Object.entries(data.detail || {}).forEach(([key, value]) => {
      setControl(row.querySelector(`[data-style-field="${CSS.escape(key)}"]`), value);
    });
    if (!Object.keys(data.detail || {}).length) {
      setControl(row.querySelector('[data-f="description"]'), data.description);
    }
  }

  function makeVisualCover() {
    const rect = root.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    const cover = root.cloneNode(true);
    cover.removeAttribute('id');
    cover.setAttribute('aria-hidden', 'true');
    cover.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
    cover.querySelectorAll('button,input,select,textarea').forEach(element => {
      element.tabIndex = -1;
      element.style.pointerEvents = 'none';
    });
    Object.assign(cover.style, {
      position: 'absolute',
      left: `${rect.left + window.scrollX}px`,
      top: `${rect.top + window.scrollY}px`,
      width: `${rect.width}px`,
      minHeight: `${rect.height}px`,
      margin: '0',
      zIndex: '10000',
      pointerEvents: 'none',
      background: getComputedStyle(root).backgroundColor || 'var(--panel)'
    });
    document.body.append(cover);
    root.style.visibility = 'hidden';
    return cover;
  }

  function removeVisualCover(cover) {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      root.style.removeProperty('visibility');
      cover?.remove();
    }));
  }

  async function rebuildInOrder(items) {
    if (rebuilding) return;
    rebuilding = true;
    const cover = makeVisualCover();
    root.classList.add('style-skill-sort-rebuilding');
    try {
      let guard = 0;
      while (rows().length && guard++ < 300) {
        rows()[0].querySelector('[data-delete-skill]')?.click();
        await waitFrame();
      }

      for (const item of items) {
        const before = new Set(rows().map(row => row.dataset.skillKey));
        addButton.click();
        await waitFrame();
        let row = rows().find(candidate => !before.has(candidate.dataset.skillKey));
        for (let attempt = 0; !row && attempt < 8; attempt++) {
          await waitFrame();
          row = rows().find(candidate => !before.has(candidate.dataset.skillKey));
        }
        if (row) await populate(row, item);
      }
      document.querySelector('#save-status')?.classList.add('unsaved');
    } finally {
      root.classList.remove('style-skill-sort-rebuilding');
      rebuilding = false;
      enhance();
      removeVisualCover(cover);
    }
  }

  function insertionTarget(clientY, movingRow) {
    const candidates = rows().filter(row => row !== movingRow);
    let closest = { offset: Number.NEGATIVE_INFINITY, row: null };
    for (const row of candidates) {
      const box = row.getBoundingClientRect();
      const offset = clientY - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) closest = { offset, row };
    }
    return closest.row;
  }

  function clearIndicators() {
    root.querySelectorAll('.style-skill-drop-before,.style-skill-drop-after').forEach(row => {
      row.classList.remove('style-skill-drop-before', 'style-skill-drop-after');
    });
  }

  async function finishDrop() {
    if (!drag) return;
    const { row, pointerId, handle } = drag;
    clearIndicators();
    row.classList.remove('style-skill-dragging');
    try { handle.releasePointerCapture(pointerId); } catch {}
    const order = rows().map(readRow);
    drag = null;
    await rebuildInOrder(order);
  }

  function onPointerMove(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    event.preventDefault();
    const target = insertionTarget(event.clientY, drag.row);
    const body = drag.row.closest('tbody');
    clearIndicators();
    if (target) {
      target.classList.add('style-skill-drop-before');
      body.insertBefore(drag.row, target);
    } else {
      const last = rows().filter(row => row !== drag.row).at(-1);
      if (last) last.classList.add('style-skill-drop-after');
      body.append(drag.row);
    }
  }

  function bindHandle(handle, row) {
    if (handle.dataset.styleDragBound === '1') return;
    handle.dataset.styleDragBound = '1';
    handle.addEventListener('pointerdown', event => {
      if (rebuilding || event.button !== 0) return;
      event.preventDefault();
      handle.setPointerCapture(event.pointerId);
      drag = { row, handle, pointerId: event.pointerId };
      row.classList.add('style-skill-dragging');
    });
    handle.addEventListener('pointermove', onPointerMove);
    handle.addEventListener('pointerup', event => {
      if (drag?.pointerId === event.pointerId) finishDrop();
    });
    handle.addEventListener('pointercancel', event => {
      if (drag?.pointerId === event.pointerId) finishDrop();
    });
  }

  function enhance() {
    if (rebuilding) return;
    rows().forEach(row => {
      let handle = row.querySelector('.style-skill-drag-handle');
      if (!handle) {
        const cell = row.firstElementChild;
        if (!cell) return;
        handle = document.createElement('button');
        handle.type = 'button';
        handle.className = 'style-skill-drag-handle';
        handle.textContent = '≡';
        handle.title = 'ドラッグして並べ替え';
        handle.setAttribute('aria-label', 'スタイル技能をドラッグして並べ替え');
        cell.prepend(handle);
      }
      bindHandle(handle, row);
    });
  }

  let queued = false;
  new MutationObserver(() => {
    if (queued || rebuilding) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      enhance();
    });
  }).observe(root, { childList: true, subtree: true });

  enhance();
})();
