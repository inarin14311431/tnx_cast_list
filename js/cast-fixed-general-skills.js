/* Ensure fixed proper General skills remain visible on the cast view. */
(() => {
  const container = document.querySelector('#skills-container');
  if (!container) return;

  const DEFAULT_ORDER = [
    '医療', '射撃', '知覚', '電脳', '製作：', '心理', '自我', '交渉',
    '芸術：', '運動', '回避', '白兵', '操縦：', '信用', '圧力', '隠密'
  ];
  const REQUIRED_ZERO_LEVEL = new Set(['製作：', '芸術：', '操縦：']);
  let queued = false;
  let applying = false;

  const normalizeName = value => String(value || '')
    .trim()
    .replace(/[;；]/g, '：')
    .replace(/:+$/g, '：');

  function createGeneralSection() {
    const section = document.createElement('section');
    section.className = 'skill-section skill-section--general';
    section.innerHTML = `
      <h3>GENERAL SKILLS</h3>
      <div class="data-table-wrapper">
        <table class="data-table skill-data-table skill-data-table--general">
          <colgroup>
            <col class="skill-col-name">
            <col class="skill-col-level">
            <col class="skill-col-suit">
            <col class="skill-col-suit">
            <col class="skill-col-suit">
            <col class="skill-col-suit">
            <col class="skill-col-detail">
          </colgroup>
          <thead><tr><th>NAME</th><th>LV</th><th>♠</th><th>♣</th><th>♥</th><th>♦</th><th>DETAIL</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>`;
    container.querySelector('.empty-data')?.remove();
    container.prepend(section);
    return section;
  }

  function createZeroLevelRow(name) {
    const row = document.createElement('tr');
    row.dataset.fixedGeneralSkill = name;
    row.innerHTML = `<td>${name}</td><td>0</td><td></td><td></td><td></td><td></td><td></td>`;
    return row;
  }

  function enhance() {
    if (applying) return;
    applying = true;
    try {
      let section = container.querySelector('.skill-section--general');
      if (!section) section = createGeneralSection();

      const tbody = section.querySelector('tbody');
      if (!tbody) return;

      const rows = [...tbody.querySelectorAll(':scope > tr')];
      const existing = new Map();
      rows.forEach((row, index) => {
        row.dataset.originalGeneralOrder ??= String(index);
        const name = normalizeName(row.cells?.[0]?.textContent);
        if (name && !existing.has(name)) existing.set(name, row);
      });

      for (const name of REQUIRED_ZERO_LEVEL) {
        if (!existing.has(name)) {
          const row = createZeroLevelRow(name);
          row.dataset.originalGeneralOrder = String(rows.length + existing.size);
          existing.set(name, row);
          tbody.append(row);
        }
      }

      const orderIndex = new Map(DEFAULT_ORDER.map((name, index) => [name, index]));
      const sorted = [...tbody.querySelectorAll(':scope > tr')].sort((a, b) => {
        const aName = normalizeName(a.cells?.[0]?.textContent);
        const bName = normalizeName(b.cells?.[0]?.textContent);
        const aIndex = orderIndex.has(aName) ? orderIndex.get(aName) : Number.MAX_SAFE_INTEGER;
        const bIndex = orderIndex.has(bName) ? orderIndex.get(bName) : Number.MAX_SAFE_INTEGER;
        if (aIndex !== bIndex) return aIndex - bIndex;
        return Number(a.dataset.originalGeneralOrder || 0) - Number(b.dataset.originalGeneralOrder || 0);
      });

      sorted.forEach(row => tbody.append(row));
    } finally {
      applying = false;
    }
  }

  function queue() {
    if (queued || applying) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      enhance();
    });
  }

  new MutationObserver(queue).observe(container, { childList: true, subtree: true });
  queue();
  window.addEventListener('load', queue, { once: true });
})();
