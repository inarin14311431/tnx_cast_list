/* Shared presentation rules for skills in editor, viewer and quick sheet. */
(() => {
  if (window.TNXSkillDisplayEnhancementsLoaded) return;
  window.TNXSkillDisplayEnhancementsLoaded = true;

  const STYLE_SEPARATOR = "[[STYLE_SEPARATOR]]";
  const BASE_SKILLS = new Set(["射撃", "心理", "自我", "回避", "白兵", "圧力", "信用"]);
  const BASE_SKILL_PREFIXES = ["操縦："];
  const cleanName = value => String(value || "").trim().replace(/^★\s*/, "").replace(/[;；]/g, "：");
  const isBase = value => {
    const name = cleanName(value);
    return BASE_SKILLS.has(name) || BASE_SKILL_PREFIXES.some(prefix => name.startsWith(prefix));
  };

  const style = document.createElement("style");
  style.textContent = `
    .tnx-base-skill-name{display:flex;align-items:center;gap:2px;min-width:0}
    .tnx-base-skill-star{flex:0 0 auto;color:var(--color-accent);font-weight:900;line-height:1}
    .tnx-base-skill-name>input{min-width:0;flex:1 1 auto}
    tr.tnx-style-separator-row>td{padding:7px 10px!important;border-top:1px solid var(--color-accent)!important;border-bottom:1px solid color-mix(in srgb,var(--color-accent) 38%,transparent)!important;background:color-mix(in srgb,var(--color-accent) 7%,transparent)!important;color:var(--color-accent);font-weight:800;letter-spacing:.04em}
    .tnx-style-separator-content{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%}
    .tnx-style-separator-content small{font-size:9px;letter-spacing:.12em;opacity:.58}
    .tnx-style-separator-actions{margin-left:auto;display:flex;gap:3px}
    .quick-sheet tr.tnx-style-separator-row>td{padding:4px 7px!important;font-size:10px}
  `;
  document.head.append(style);

  function editorStars() {
    document.querySelectorAll('#general-skills tr[data-skill-key]').forEach(row => {
      const input = row.querySelector('[data-f="name"]');
      if (!input) return;
      const cell = input.closest('td');
      if (!cell) return;
      const existing = cell.querySelector('.tnx-base-skill-star');
      if (!isBase(input.value)) {
        existing?.remove();
        const wrap = input.closest('.tnx-base-skill-name');
        if (wrap) wrap.replaceWith(input);
        return;
      }
      if (existing) return;
      const wrap = document.createElement('span');
      wrap.className = 'tnx-base-skill-name';
      const star = document.createElement('span');
      star.className = 'tnx-base-skill-star';
      star.textContent = '★';
      input.before(wrap); wrap.append(star, input);
    });
  }

  function editorSeparators() {
    document.querySelectorAll('#style-skills tr[data-skill-key]').forEach(row => {
      if (row.classList.contains('tnx-style-separator-row')) return;
      const description = row.querySelector('[data-f="description"]')?.value || '';
      if (!description.includes(STYLE_SEPARATOR)) return;
      const name = cleanName(row.querySelector('[data-f="name"]')?.value) || 'スタイル技能';
      const actions = row.querySelector('.skill-row-actions')?.cloneNode(true);
      const colspan = Math.max(1, row.children.length);
      row.classList.add('tnx-style-separator-row');
      row.innerHTML = `<td colspan="${colspan}"><div class="tnx-style-separator-content"><span>${name.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}</span><small>STYLE SECTION</small><span class="tnx-style-separator-actions"></span></div></td>`;
      if (actions) row.querySelector('.tnx-style-separator-actions').append(...actions.children);
    });
  }

  function syncStaticStars(selector) {
    document.querySelectorAll(selector).forEach(row => {
      const cell = row.cells[0];
      if (!cell) return;
      const existing = cell.querySelector('.tnx-base-skill-star');
      if (!isBase(cell.textContent)) {
        existing?.remove();
        return;
      }
      if (!existing) cell.insertAdjacentHTML('afterbegin','<span class="tnx-base-skill-star" aria-hidden="true">★</span>');
    });
  }

  function viewerStars() {
    syncStaticStars('.skill-section--general tbody tr');
  }

  function quickStars() {
    syncStaticStars('.quick-sheet__general-skills tbody tr');
  }

  function quickSeparators() {
    document.querySelectorAll('.quick-sheet__style-skills tbody tr').forEach(row => {
      if (row.classList.contains('tnx-style-separator-row')) return;
      if (!row.textContent.includes(STYLE_SEPARATOR)) return;
      const label = cleanName(row.cells[0]?.textContent) || 'スタイル技能';
      const colspan = Math.max(1, row.children.length);
      row.classList.add('tnx-style-separator-row');
      row.innerHTML = `<td colspan="${colspan}"><div class="tnx-style-separator-content"><span>${label.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}</span><small>STYLE SECTION</small></div></td>`;
    });
  }

  function apply() { editorStars(); editorSeparators(); viewerStars(); quickStars(); quickSeparators(); }
  let queued = false;
  const queue = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; apply(); }); };
  new MutationObserver(queue).observe(document.body, { childList:true, subtree:true });
  document.addEventListener('change', queue, true);
  apply();
})();
