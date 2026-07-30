/* Ensure fixed proper General skills remain visible on the cast view.
 * Runs once after cast.js has rendered, then disconnects to avoid render loops. */
(() => {
  const container = document.querySelector('#skills-container');
  if (!container) return;

  const DEFAULT_ORDER = [
    '医療', '射撃', '知覚', '電脳', '製作：', '心理', '自我', '交渉',
    '芸術：', '運動', '回避', '白兵', '操縦：', '信用', '圧力', '隠密'
  ];
  const REQUIRED_FAMILIES = ['製作：', '芸術：', '操縦：'];
  let observer = null;
  let completed = false;

  const normalizeName = value => String(value || '')
    .trim()
    .replace(/[;；]/g, '：');

  const familyName = value => {
    const name = normalizeName(value);
    return REQUIRED_FAMILIES.find(prefix => name.startsWith(prefix)) || name;
  };

  function createGeneralSection() {
    const section = document.createElement('section');
    section.className = 'skill-section skill-section--general';
    section.innerHTML = `
      <h3>GENERAL SKILLS</h3>
      <div class="data-table-wrapper">
        <table class="data-table skill-data-table skill-data-table--general">
          <colgroup>
            <col class="skill-col-name"><col class="skill-col-level">
            <col class="skill-col-suit"><col class="skill-col-suit">
            <col class="skill-col-suit"><col class="skill-col-suit">
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
    if (completed) return true;

    let section = container.querySelector('.skill-section--general');
    const rendered = section || container.querySelector('.empty-data') || document.querySelector('#cast-content:not([hidden])');
    if (!rendered) return false;
    if (!section) section = createGeneralSection();

    const tbody = section.querySelector('tbody');
    if (!tbody) return false;

    const rows = [...tbody.querySelectorAll(':scope > tr')];
    const presentFamilies = new Set(rows.map(row => familyName(row.cells?.[0]?.textContent)).filter(Boolean));

    for (const prefix of REQUIRED_FAMILIES) {
      if (!presentFamilies.has(prefix)) tbody.append(createZeroLevelRow(prefix));
    }

    const orderIndex = new Map(DEFAULT_ORDER.map((name, index) => [name, index]));
    const sorted = [...tbody.querySelectorAll(':scope > tr')]
      .map((row, index) => ({ row, index, family: familyName(row.cells?.[0]?.textContent) }))
      .sort((a, b) => {
        const ai = orderIndex.has(a.family) ? orderIndex.get(a.family) : Number.MAX_SAFE_INTEGER;
        const bi = orderIndex.has(b.family) ? orderIndex.get(b.family) : Number.MAX_SAFE_INTEGER;
        return ai - bi || a.index - b.index;
      })
      .map(item => item.row);

    sorted.forEach((row, index) => {
      if (tbody.rows[index] !== row) tbody.insertBefore(row, tbody.rows[index] || null);
    });

    completed = true;
    observer?.disconnect();
    return true;
  }

  function tryEnhance() {
    if (!enhance()) return;
    observer?.disconnect();
  }

  observer = new MutationObserver(tryEnhance);
  observer.observe(container, { childList: true, subtree: true });
  tryEnhance();
  window.addEventListener('load', tryEnhance, { once: true });
})();
