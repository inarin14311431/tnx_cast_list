/* Bad-status tooltips for SKD / OFC master-search results only. */
(() => {
  const RESULT_SELECTOR = "#master-search-results";
  const DIALOG_SELECTOR = "#master-search-dialog";
  const TERM_CLASS = "master-bs-term";
  const TOOLTIP_ID = "master-bs-tooltip";
  const STYLE_ID = "master-bs-tooltip-style";

  const DEFINITIONS = {
    "恐慌": {
      title: "BS：恐慌",
      text: "精神的な不安や動揺で、とっさの反応ができない状態。リアクションを行えない。メインプロセスを行う直前に自動的に回復する。"
    },
    "邪毒": {
      title: "BS：邪毒",
      text: "毒物や特技による中毒状態。クリンナッププロセスごとに山札を1枚引き、そのカードの数字へ邪毒の強度を加えた肉体ダメージを受ける。アウトフィットやスタイル技能、または次のメインプロセスにマイナーアクションとメジャーアクションを両方放棄することで回復できる。"
    },
    "重圧": {
      title: "BS：重圧",
      text: "圧力や物理的な拘束によって行動が制限された状態。指定された能力値を使用した判定を行えない（制御判定は可能）。能力値の指定がない場合は山札を1枚引き、そのスートに対応する能力値が対象になる。マイナーアクションで、受けている重圧をすべて回復できる。"
    },
    "衰弱": {
      title: "BS：衰弱",
      text: "疲労や混乱で肉体・精神の判断力が低下した状態。通常は受けた際に山札を1枚引き、そのスートに対応する制御値をカードの数字分だけ低下させる（最低0）。「衰弱（－数字）」はすべての制御値を指定値だけ低下させる。複数の衰弱は累積し、シーン終了時に回復する。"
    },
    "捕縛": {
      title: "BS：捕縛",
      text: "特技や装備によって、所持する武器ひとつを締め取られた状態。回復するまで、その武器による攻撃を行えない。複数の武器を使用していた場合、捕縛される武器は受けた側が決定する。自分のメインプロセスでメジャーアクションを1回放棄すると、受けている捕縛をすべて回復できる。"
    },
    "酩酊": {
      title: "BS：酩酊",
      text: "ドラッグ、電子麻薬、電脳バグなどによる感覚混乱。酩酊（小）はあらゆる判定の達成値とすべての制御値に－2、酩酊（大）は－5。両者は別のBSとして重複する。クリンナッププロセスで、小は回復し、大は小へ変化する。"
    },
    "狼狽": {
      title: "BS：狼狽",
      text: "体勢を崩している状態。ムーブアクションを行えず、メジャーアクションの達成値に－10。マイナーアクションを使用すると回復する。"
    },
    "萎縮": {
      title: "BS：萎縮",
      text: "特定の相手へ強い恐怖や畏怖を感じている状態。受けた際に対象となるキャラクターを指定する。その対象を含む攻撃判定の達成値に－5。自分が行うメインプロセスの終了時に自動的に回復する。"
    },
    "憎悪": {
      title: "BS：憎悪",
      text: "特定の相手へ強い怒りや憎しみを感じている状態。受けた際に対象となるキャラクターを指定する。攻撃時にその対象を攻撃対象に含めていない場合、判定の達成値に－5。自分が行うメインプロセスの終了時に自動的に回復する。"
    },
    "電子妨害": {
      title: "BS：電子妨害",
      text: "電脳障害やハッキングで、電制を持つ装備が使用困難になった状態。強度以下の電制を持つ準備中の装備数や種類に応じ、判定へ－n、－1、または－10の修正を受ける。強度が異なっても電子妨害はひとつだけ適用され、クリンナッププロセスに回復する。"
    }
  };

  const ALIASES = {
    "委縮": "萎縮"
  };

  const STATUS_NAMES = [...Object.keys(DEFINITIONS), ...Object.keys(ALIASES)]
    .sort((a, b) => b.length - a.length)
    .join("|");

  const TERM_PATTERN = new RegExp(
    `(?:【|\\[|［)?\\s*(?:ＢＳ|BS)\\s*[：:]\\s*(?:${STATUS_NAMES})(?:\\s*(?:[（(][^）)】\\]］\\n]{1,16}[）)]|[-－]?\\d+|[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+))?\\s*(?:】|\\]|］)?`,
    "gi"
  );
  const NAME_PATTERN = new RegExp(STATUS_NAMES);

  let root = null;
  let tooltip = null;
  let activeTerm = null;
  let processQueued = false;

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .${TERM_CLASS}{display:inline;padding:0 .12em;border-bottom:1px dotted #ffd166;color:#ffe7a3;background:rgba(255,209,102,.07);cursor:help;font-weight:800;text-underline-offset:2px}
      .${TERM_CLASS}:hover,.${TERM_CLASS}:focus-visible{outline:none;color:#fff4c9;background:rgba(255,209,102,.18);box-shadow:0 0 0 1px rgba(255,209,102,.22)}
      #${TOOLTIP_ID}{position:fixed;z-index:100000;width:min(380px,calc(100vw - 24px));padding:12px 14px;border:1px solid #ffd166;color:#eefcff;background:rgba(2,10,14,.98);box-shadow:0 12px 34px rgba(0,0,0,.58),0 0 18px rgba(255,209,102,.12);pointer-events:none}
      #${TOOLTIP_ID}[hidden]{display:none}
      #${TOOLTIP_ID} strong{display:block;margin-bottom:6px;color:#ffd166;font-size:.82rem;letter-spacing:.04em}
      #${TOOLTIP_ID} p{margin:0;color:#d5e9ed;font-size:.74rem;line-height:1.65;white-space:normal}
      @media(max-width:520px){#${TOOLTIP_ID}{padding:10px 12px}#${TOOLTIP_ID} p{font-size:.72rem}}
    `;
    document.head.append(style);
  }

  function tooltipHost() {
    return document.querySelector(DIALOG_SELECTOR) || document.body;
  }

  function ensureTooltip() {
    const host = tooltipHost();
    tooltip = tooltip?.isConnected ? tooltip : document.getElementById(TOOLTIP_ID);

    if (!tooltip) {
      tooltip = document.createElement("aside");
      tooltip.id = TOOLTIP_ID;
      tooltip.hidden = true;
      tooltip.setAttribute("role", "tooltip");
      tooltip.innerHTML = "<strong></strong><p></p>";
    }

    if (tooltip.parentElement !== host) host.append(tooltip);
    return tooltip;
  }

  function definitionFor(text) {
    const match = String(text || "").match(NAME_PATTERN);
    if (!match) return null;
    const key = ALIASES[match[0]] || match[0];
    return { key, ...DEFINITIONS[key] };
  }

  function shouldSkip(node) {
    const parent = node.parentElement;
    return !parent || parent.closest(`.${TERM_CLASS},script,style,textarea,input,select,option`);
  }

  function decorateTextNode(node) {
    if (shouldSkip(node)) return;
    const text = node.nodeValue || "";
    TERM_PATTERN.lastIndex = 0;
    if (!TERM_PATTERN.test(text)) return;
    TERM_PATTERN.lastIndex = 0;

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let match;

    while ((match = TERM_PATTERN.exec(text))) {
      if (match.index > lastIndex) fragment.append(document.createTextNode(text.slice(lastIndex, match.index)));
      const definition = definitionFor(match[0]);
      if (!definition) {
        fragment.append(document.createTextNode(match[0]));
      } else {
        const span = document.createElement("span");
        span.className = TERM_CLASS;
        span.tabIndex = 0;
        span.dataset.bsKey = definition.key;
        span.setAttribute("aria-describedby", TOOLTIP_ID);
        span.setAttribute("aria-label", `${match[0]}。${definition.text}`);
        span.textContent = match[0];
        fragment.append(span);
      }
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) fragment.append(document.createTextNode(text.slice(lastIndex)));
    node.replaceWith(fragment);
  }

  function decorateResults() {
    processQueued = false;
    if (!root?.isConnected) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(decorateTextNode);
  }

  function queueDecoration() {
    if (processQueued) return;
    processQueued = true;
    requestAnimationFrame(decorateResults);
  }

  function positionTooltip(term) {
    if (!tooltip || tooltip.hidden) return;
    const rect = term.getBoundingClientRect();
    const tipRect = tooltip.getBoundingClientRect();
    const margin = 10;
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;

    let left = rect.left + rect.width / 2 - tipRect.width / 2;
    left = Math.max(12, Math.min(left, viewportWidth - tipRect.width - 12));

    let top = rect.bottom + margin;
    if (top + tipRect.height > viewportHeight - 12) top = rect.top - tipRect.height - margin;
    top = Math.max(12, Math.min(top, viewportHeight - tipRect.height - 12));

    tooltip.style.left = `${Math.round(left)}px`;
    tooltip.style.top = `${Math.round(top)}px`;
  }

  function showTooltip(term) {
    const definition = DEFINITIONS[term.dataset.bsKey];
    if (!definition) return;
    activeTerm = term;
    const tip = ensureTooltip();
    tip.querySelector("strong").textContent = definition.title;
    tip.querySelector("p").textContent = definition.text;
    tip.hidden = false;
    requestAnimationFrame(() => positionTooltip(term));
  }

  function hideTooltip(term = null) {
    if (term && activeTerm && term !== activeTerm) return;
    if (tooltip) tooltip.hidden = true;
    activeTerm = null;
  }

  function bindEvents() {
    root.addEventListener("pointerover", event => {
      const term = event.target.closest?.(`.${TERM_CLASS}`);
      if (term) showTooltip(term);
    });
    root.addEventListener("pointerout", event => {
      const term = event.target.closest?.(`.${TERM_CLASS}`);
      if (term && !term.contains(event.relatedTarget)) hideTooltip(term);
    });
    root.addEventListener("focusin", event => {
      const term = event.target.closest?.(`.${TERM_CLASS}`);
      if (term) showTooltip(term);
    });
    root.addEventListener("focusout", event => {
      const term = event.target.closest?.(`.${TERM_CLASS}`);
      if (term) hideTooltip(term);
    });
    root.addEventListener("click", event => {
      const term = event.target.closest?.(`.${TERM_CLASS}`);
      if (!term) return;
      if (activeTerm === term && tooltip && !tooltip.hidden) hideTooltip(term);
      else showTooltip(term);
    });
    root.addEventListener("scroll", () => hideTooltip(), { passive: true });
    window.addEventListener("resize", () => activeTerm && positionTooltip(activeTerm), { passive: true });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") hideTooltip();
    });
  }

  function install() {
    const nextRoot = document.querySelector(RESULT_SELECTOR);
    if (!nextRoot || nextRoot.dataset.bsTooltipReady === "1") return false;
    root = nextRoot;
    root.dataset.bsTooltipReady = "1";
    installStyles();
    ensureTooltip();
    bindEvents();
    new MutationObserver(queueDecoration).observe(root, { childList: true, subtree: true });
    queueDecoration();
    return true;
  }

  if (!install()) {
    const observer = new MutationObserver(() => {
      if (!install()) return;
      observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();