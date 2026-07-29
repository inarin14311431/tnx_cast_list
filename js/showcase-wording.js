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

  let queued = false;
  const queue = () => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      normalize();
    });
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", queue, { once: true });
  else queue();
  new MutationObserver(queue).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
})();
