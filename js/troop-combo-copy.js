const COMBO_SELECTOR = ".cast-troop-combos article, #troop-combos-view article";
const COMBO_ROOT_SELECTOR = ".cast-troop-combos, #troop-combos-view";

function decorate(root = document) {
  root.querySelectorAll(COMBO_SELECTOR).forEach(article => {
    if (article.querySelector("[data-troop-combo-copy]")) return;
    article.classList.add("troop-combo-copyable");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "troop-combo-copy";
    button.dataset.troopComboCopy = "1";
    button.innerHTML = "<span>コピー</span><small>CLIPBOARD</small>";
    button.addEventListener("click", () => copyArticle(article, button));
    article.append(button);
  });
}

async function copyArticle(article, button) {
  const clone = article.cloneNode(true);
  clone.querySelectorAll("[data-troop-combo-copy]").forEach(node => node.remove());
  const lines = [...clone.children]
    .map(node => node.innerText?.trim())
    .filter(Boolean);
  const text = lines.join("\n").replace(/\n{3,}/g, "\n\n");
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
  const original = button.innerHTML;
  button.classList.add("is-copied");
  button.innerHTML = "<span>コピー済み</span><small>COPIED</small>";
  window.setTimeout(() => {
    button.classList.remove("is-copied");
    button.innerHTML = original;
  }, 1400);
}

decorate();
document.querySelectorAll(COMBO_ROOT_SELECTOR).forEach(root => {
  new MutationObserver(records => {
    if (records.some(record => record.addedNodes.length)) decorate(root);
  }).observe(root, { childList: true, subtree: true });
});
