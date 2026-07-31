/* Current SKD/OFC TSV importer for the sheet editor. */
(() => {
  const $ = selector => document.querySelector(selector);
  const wait = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const text = value => String(value ?? '').trim();
  const number = value => {
    const match = String(value ?? '').match(/-?\d+/);
    return match ? Number(match[0]) : 0;
  };

  function parseTsv(source) {
    const lines = String(source || '').replace(/\r/g, '').split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return [];
    const headers = lines.shift().split('\t').map(item => item.trim());
    return lines.map(line => {
      const columns = line.split('\t');
      return Object.fromEntries(headers.map((header, index) => [header, columns[index] ?? '']));
    });
  }

  function dispatch(control) {
    control.dispatchEvent(new Event('input', { bubbles: true }));
    control.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function setControl(control, value) {
    if (!control) return;
    control.value = value ?? '';
    dispatch(control);
  }

  function skillKind(label) {
    return window.TNXStyleSkillKinds?.fromLabel(label) ||
      (/演出|方向/.test(label || '') ? 'direction' :
        /奥義/.test(label || '') ? 'ultimate' :
          /秘技/.test(label || '') ? 'secret' : 'normal');
  }

  async function addStyleSkill(row) {
    const root = $('#style-skills');
    const before = new Set([...root.querySelectorAll('tr[data-skill-key]')].map(item => item.dataset.skillKey));
    $('#add-style-skill')?.click();
    await wait();
    const target = [...root.querySelectorAll('tr[data-skill-key]')].find(item => !before.has(item.dataset.skillKey));
    if (!target) return false;

    setControl(target.querySelector('[data-f="name"]'), row['名称']);
    setControl(target.querySelector('[data-f="skill_kind"]'), skillKind(row['種別']));
    setControl(target.querySelector('[data-f="level"]'), Math.max(0, number(row['レベル'] || 1)));

    const detailMap = {
      skill: '技能',
      limit: '上限',
      timing: 'タイミング',
      target: '対象',
      range: '射程',
      difficulty: '目標値',
      confrontation: '対決',
      description: '解説',
      page: '参照P'
    };
    for (const [field, header] of Object.entries(detailMap)) {
      setControl(target.querySelector(`[data-style-field="${field}"]`), row[header]);
    }
    return true;
  }

  function categoryFromTarget(value) {
    const normalized = text(value).toLowerCase().replace(/[\s_\-・]/g, '');
    if (/weapon|weapons|武器/.test(normalized)) return 'weapon';
    if (/armou?r|armou?rs|防具|アーマー/.test(normalized)) return 'armor';
    if (/cyber|サイバー/.test(normalized)) return 'cyberware';
    if (/tron|software|hardware|トロン|ソフトウェア|ハードウェア/.test(normalized)) return 'tron';
    if (/vehicle|vehicles|ヴィークル|車両/.test(normalized)) return 'vehicle';
    if (/residence|residences|住居|住宅/.test(normalized)) return 'residence';
    return 'other';
  }

  function concealment(row) {
    const a = text(row.concealA);
    const b = text(row.concealB);
    return [a, b].filter(Boolean).join('/');
  }

  function armorDefense(row) {
    const s = text(row.protecS);
    const i = text(row.protecI);
    const p = text(row.protecP);
    return [s, i, p].some(Boolean) ? [s, i, p].join('/') : text(row.defense);
  }

  function description(row) {
    const lines = [];
    if (text(row.electrical_control)) lines.push(`電制：${text(row.electrical_control)}`);
    if (text(row.crew)) lines.push(`乗員：${text(row.crew)}`);
    if (text(row.sf)) lines.push(`SF：${text(row.sf)}`);
    if (text(row.entry)) lines.push(`登場：${text(row.entry)}`);
    if (text(row.page)) lines.push(`参照P：${text(row.page)}`);
    if (text(row.notes)) lines.push(text(row.notes));
    return lines.join('\n');
  }

  async function addOutfit(row) {
    const root = $('#outfit-list');
    const before = new Set([...root.querySelectorAll('[data-outfit-key]')].map(item => item.dataset.outfitKey));
    const category = categoryFromTarget(row.target || row['大分類'] || row['分類']);
    const categoryButton = root.querySelector(`[data-add-outfit-category="${category}"]`);
    if (categoryButton) categoryButton.click();
    else $('#add-outfit')?.click();
    await wait();

    let target = [...root.querySelectorAll('.outfit-table-row[data-outfit-key], .outfit-card[data-outfit-key]')]
      .find(item => !before.has(item.dataset.outfitKey));
    if (!target) {
      await wait();
      target = [...root.querySelectorAll('.outfit-table-row[data-outfit-key], .outfit-card[data-outfit-key]')]
        .find(item => !before.has(item.dataset.outfitKey));
    }
    if (!target) return false;

    setControl(target.querySelector('[data-o="category"]'), category);
    setControl(target.querySelector('[data-o="name"]'), row.name || row['名称']);
    setControl(target.querySelector('[data-o="purchase_value"]'), row.purchase);
    setControl(target.querySelector('[data-o="experience_cost"]'), number(row.permanent));
    setControl(target.querySelector('[data-o="concealment"]'), concealment(row));
    setControl(target.querySelector('[data-o="attack"]'), row.attack);
    setControl(target.querySelector('[data-o="range"]'), row.range);
    setControl(target.querySelector('[data-o="slot"]'), text(row.part) || text(row.slot));
    setControl(target.querySelector('[data-o="control_modifier"]'), number(row.control));
    setControl(target.querySelector('[data-o="cs_modifier"]'), number(row.cs || row.CS));
    setControl(target.querySelector('[data-o="description"]'), description(row));

    if (category === 'armor') {
      const defense = armorDefense(row).split('/');
      const controls = ['S', 'I', 'P'].map(key => target.querySelector(`[data-armor-defense="${key}"]`));
      if (controls.some(Boolean)) controls.forEach((control, index) => setControl(control, defense[index] ?? ''));
      else setControl(target.querySelector('[data-o="defense"]'), armorDefense(row));
    } else {
      setControl(target.querySelector('[data-o="defense"]'), row.defense);
    }
    return true;
  }

  async function applyCurrentImport(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const rows = parseTsv($('#tsv-text')?.value);
    const mode = ($('#tsv-title')?.textContent || '').includes('SKD') ? 'skd' : 'ofc';

    let imported = 0;
    for (const row of rows) {
      if (mode === 'skd') imported += await addStyleSkill(row) ? 1 : 0;
      else imported += await addOutfit(row) ? 1 : 0;
    }

    $('#tsv-dialog')?.close();
    window.TNXExperience?.queue?.();
    const saveButton = $('#save-button');
    if (saveButton) saveButton.click();
    console.info(`[TSV import] ${mode.toUpperCase()}: ${imported}/${rows.length}`);
  }

  function bind() {
    const button = $('#tsv-apply');
    if (!button || button.dataset.currentImportBound === '1') return;
    button.dataset.currentImportBound = '1';
    button.addEventListener('click', applyCurrentImport, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
})();
