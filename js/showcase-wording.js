(() => {
  const replacements = [
    ["GitHub Pagesへ公開", "アクト紹介を公開"],
    ["GitHub Pages公開", "アクト紹介の公開"],
    ["GitHub Pagesへは公開", "アクト紹介としては公開"],
    ["公開ファイル名", "アクト識別名"]
  ];

  function normalize(root = document.body) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      let value = node.nodeValue || "";
      for (const [before, after] of replacements) value = value.replaceAll(before, after);
      if (value !== node.nodeValue) node.nodeValue = value;
    }
  }

  function ensureActTitleGuide() {
    const input = document.querySelector("#act-name");
    if (!input) return;
    input.maxLength = 40;

    let guide = document.querySelector("#act-name-length-guide");
    if (!guide) {
      guide = document.createElement("small");
      guide.id = "act-name-length-guide";
      guide.className = "showcase-title-length-guide";
      input.insertAdjacentElement("afterend", guide);
      input.addEventListener("input", updateActTitleGuide);
    }
    updateActTitleGuide();
  }

  function updateActTitleGuide() {
    const input = document.querySelector("#act-name");
    const guide = document.querySelector("#act-name-length-guide");
    if (!input || !guide) return;
    const length = [...input.value].length;
    const nextText = `公開画面は1行表示。推奨24文字程度 / 最大40文字 / 現在 ${length}文字`;
    const nextState = length <= 24 ? "safe" : length <= 32 ? "compact" : "tight";
    if (guide.textContent !== nextText) guide.textContent = nextText;
    if (guide.dataset.state !== nextState) guide.dataset.state = nextState;
  }

  let queued = false;
  const queue = () => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      normalize();
      ensureActTitleGuide();
    });
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", queue, { once: true });
  else queue();
  new MutationObserver(queue).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
})();
