const VISIBILITY_LABELS = {
  draft: "下書き / DRAFT",
  public: "公開 / PUBLIC",
  private: "非公開 / PRIVATE",
  archived: "引退 / ARCHIVED",
  unlisted: "限定公開 / UNLISTED"
};

const container = document.querySelector("#owned-casts");

if (container) {
  const observer = new MutationObserver(applyVisibilityLabels);
  observer.observe(container, { childList: true, subtree: true });
  applyVisibilityLabels();
}

function applyVisibilityLabels() {
  document.querySelectorAll(".owned-cast__meta > span").forEach(span => {
    const raw = span.textContent.trim().toLowerCase();
    if (VISIBILITY_LABELS[raw]) {
      span.textContent = VISIBILITY_LABELS[raw];
    }
  });
}
