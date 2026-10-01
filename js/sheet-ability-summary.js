(() => {
  const grid = document.querySelector('#ability-grid');
  if (!grid) return;
  const abilities = [
    ['reason', '♠', '理性'], ['passion', '♣', '感情'],
    ['life', '♥', '生命'], ['mundane', '♦', '外界']
  ];
  const summaries = [];
  for (const id of ['sheet-skills', 'sheet-style-skills']) {
    const toggle = document.querySelector(`#${id} > .section-toggle`);
    if (!toggle || toggle.querySelector('.sheet-ability-summary')) continue;
    const summary = document.createElement('span');
    summary.className = 'sheet-ability-summary';
    const label = document.createElement('small');
    label.textContent = 'ABILITIES';
    summary.append(label);
    const values = abilities.map(([, suit]) => {
      const item = document.createElement('span');
      item.className = 'sheet-ability-summary__item';
      const symbol = document.createElement('span');
      symbol.className = 'sheet-ability-summary__suit';
      symbol.textContent = suit;
      symbol.setAttribute('aria-hidden', 'true');
      const value = document.createElement('span');
      item.append(symbol, value);
      summary.append(item);
      return value;
    });
    toggle.append(summary);
    summaries.push({ toggle, summary, values });
  }
  const fit = () => {
    for (const { toggle, summary } of summaries) {
      summary.hidden = false;
      const style = getComputedStyle(toggle);
      const required = [...toggle.children].reduce((total, child) => total + child.getBoundingClientRect().width, 0)
        + parseFloat(style.columnGap) * (toggle.children.length - 1)
        + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      summary.hidden = required > toggle.clientWidth;
    }
  };
  const update = () => {
    const current = abilities.map(([key]) => document.querySelector(`#${key}-final`)?.textContent.trim() || '—');
    for (const { summary, values } of summaries) {
      values.forEach((value, index) => {
        if (value.textContent !== current[index]) value.textContent = current[index];
      });
      summary.setAttribute('aria-label', abilities.map(([, , name], index) => `${name} ${current[index]}`).join('、'));
    }
    fit();
  };
  update();
  new MutationObserver(update).observe(grid, { childList: true, characterData: true, subtree: true });
  const resize = new ResizeObserver(fit);
  summaries.forEach(({ toggle }) => resize.observe(toggle));
  document.fonts?.ready.then(fit);
})();
