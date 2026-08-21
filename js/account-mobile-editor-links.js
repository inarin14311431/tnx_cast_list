const createLink = document.querySelector('a[href="./sheet-mobile-new.html"],a[href$="/sheet-mobile-new.html"]');
const createLabel = createLink?.querySelector("span");
if (createLabel) createLabel.textContent = "Mobile版 新規作成";
