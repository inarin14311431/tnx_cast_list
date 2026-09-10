const section = document.querySelector("#owned-showcase-restore");
const heading = document.querySelector("#owned-showcase-restore-heading");
const lead = section?.querySelector(".private-history-selector__lead");
const select = document.querySelector("#owned-showcase-select");
const status = document.querySelector("#owned-showcase-status");

if (section && heading && lead && select) {
  heading.innerHTML = `公開済みアクト紹介 <small>PUBLISHED SHOWCASE MANAGEMENT</small>`;
  lead.textContent = "自分が公開したアクト紹介を一覧で管理できます。編集では保存済み内容をフォームへ復元し、削除では公開用データだけを削除します。アクト履歴と参加履歴は残ります。";
  section.dataset.managementMode = "selector";

  const emptyState = document.createElement("div");
  emptyState.id = "owned-showcase-empty-state";
  emptyState.className = "owned-showcase-list";
  emptyState.setAttribute("aria-live", "polite");
  status?.insertAdjacentElement("beforebegin", emptyState);

  const syncEmptyState = () => {
    const hasPublishedShowcase = [...select.options].some(option => String(option.value || "").trim());
    emptyState.hidden = hasPublishedShowcase;
    emptyState.innerHTML = hasPublishedShowcase ? "" : `
      <div class="owned-showcase-empty">
        <strong>公開済みのアクト紹介はありません</strong>
        <small>NO PUBLISHED SHOWCASE</small>
      </div>`;
  };

  const observer = new MutationObserver(syncEmptyState);
  observer.observe(select, { childList: true, subtree: true });
  syncEmptyState();
}
