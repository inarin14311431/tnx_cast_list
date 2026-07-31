(() => {
  const panel = document.querySelector('.exp-panel');
  if (!panel) return;

  const ensureHelpLink = () => {
    if (!document.querySelector('link[data-sheet-help-link-style]')) {
      const style = document.createElement('link');
      style.rel = 'stylesheet';
      style.href = './css/sheet-help-link.css?v=1';
      style.setAttribute('data-sheet-help-link-style', '1');
      document.head.append(style);
    }

    if (document.querySelector('[data-sheet-help-link]')) return;
    const link = document.createElement('a');
    link.href = './manual-data-import.html';
    link.target = '_blank';
    link.rel = 'noopener';
    link.className = 'floating-help-link';
    link.setAttribute('data-sheet-help-link', '1');
    link.setAttribute('aria-label', 'データ取込マニュアルを開く');
    link.title = 'データ取込マニュアル';
    link.innerHTML = '<img src="./assets/help-cyberpunk.svg" alt="" class="floating-help-link__icon"><span class="floating-help-link__label">HELP</span>';
    document.body.append(link);
  };

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

  ensureHelpLink();
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

(() => {
  const toInteger = value => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.trunc(number) : 0;
  };

  const ensureStyle = () => {
    if (document.querySelector('style[data-cs-auto-style]')) return;
    const style = document.createElement('style');
    style.dataset.csAutoStyle = '1';
    style.textContent = `
      .ability-card--cs{grid-column:auto!important}
      .ability-matrix--cs .ability-matrix__header,
      .ability-matrix--cs .ability-matrix__row{grid-template-columns:42px minmax(0,1fr);padding-left:4px;padding-right:4px}
      .ability-matrix--cs input[readonly]{cursor:default;background:rgba(65,232,255,.04)}
      #ability-grid .ability-matrix__row input[type="number"]{padding-left:19px}
      @media(min-width:1181px){.ability-grid{grid-template-columns:repeat(4,minmax(0,1fr)) minmax(110px,.5fr)!important}}
      @media(max-width:760px){
        .ability-matrix--cs .ability-matrix__header,
        .ability-matrix--cs .ability-matrix__row{grid-template-columns:70px minmax(0,1fr)}
      }
    `;
    document.head.append(style);
  };

  const renameBaseLabels = () => {
    document.querySelectorAll('#ability-grid .ability-matrix__row > span').forEach(label => {
      if (label.textContent.trim() === '現在値') label.textContent = '基礎値';
    });
  };

  const abilityValue = key => {
    const base = toInteger(document.querySelector(`#${key}-base`)?.value);
    const modifier = toInteger(document.querySelector(`#${key}-mod`)?.value);
    return base + modifier;
  };

  const recalculateCs = () => {
    const storedBase = document.querySelector('#cs-base');
    const displayBase = document.querySelector('#cs-base-display');
    const modifierInput = document.querySelector('#cs-mod');
    const finalOutput = document.querySelector('#cs-final');
    if (!storedBase || !displayBase || !modifierInput || !finalOutput) return;

    const calculatedBase = Math.floor((
      abilityValue('reason') +
      abilityValue('passion') +
      abilityValue('life')
    ) / 2);
    const modifier = toInteger(modifierInput.value);
    const finalValue = Math.max(0, calculatedBase + modifier);

    displayBase.value = calculatedBase;
    finalOutput.textContent = finalValue;

    // sheet.js saves cs as cs_base + cs_mod. Adjust only the hidden storage value
    // so the persisted final CS also respects the minimum value of zero.
    storedBase.value = finalValue - modifier;
  };

  const patchCsCard = () => {
    const card = document.querySelector('#ability-grid .ability-card--cs');
    if (!card || card.dataset.csAutoReady === '1') return Boolean(card);

    const oldModifier = toInteger(document.querySelector('#cs-mod')?.value);
    card.dataset.csAutoReady = '1';
    card.classList.add('ability-matrix', 'ability-matrix--cs');
    card.innerHTML = `
      <h3>CS <small>COMBAT SPEED</small></h3>
      <div class="ability-matrix__header"><span></span><strong>CS</strong></div>
      <div class="ability-matrix__row"><span>基礎値</span><input id="cs-base-display" type="number" value="0" readonly tabindex="-1"></div>
      <div class="ability-matrix__row"><span>補正値</span><input id="cs-mod" type="number" step="1" value="${oldModifier}"></div>
      <div class="ability-matrix__row ability-matrix__result"><span>最終値</span><strong id="cs-final">0</strong></div>
      <input id="cs-base" type="hidden" value="0">
    `;

    const modifierInput = card.querySelector('#cs-mod');
    modifierInput.addEventListener('change', () => {
      modifierInput.value = toInteger(modifierInput.value);
      recalculateCs();
    });
    renameBaseLabels();
    recalculateCs();
    return true;
  };

  const init = () => {
    ensureStyle();
    if (!patchCsCard()) return false;
    renameBaseLabels();

    document.addEventListener('input', event => {
      if (event.target.matches('#reason-base,#reason-mod,#passion-base,#passion-mod,#life-base,#life-mod,#cs-mod')) {
        queueMicrotask(recalculateCs);
      }
    });
    document.addEventListener('change', event => {
      if (event.target.matches('#reason-base,#reason-mod,#passion-base,#passion-mod,#life-base,#life-mod,#cs-mod')) {
        queueMicrotask(recalculateCs);
      }
    });

    const abilityGrid = document.querySelector('#ability-grid');
    if (abilityGrid) {
      new MutationObserver(records => {
        renameBaseLabels();
        if (records.some(record => ['reason-final', 'passion-final', 'life-final'].includes(record.target?.id))) {
          queueMicrotask(recalculateCs);
        }
      }).observe(abilityGrid, {
        childList: true,
        subtree: true
      });
    }
    return true;
  };

  if (!init()) {
    const observer = new MutationObserver(() => {
      if (init()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
