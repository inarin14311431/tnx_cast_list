function ensureStyleSkillActions() {
  const dialog = document.querySelector("#style-skill-dialog");
  const header = dialog?.querySelector(".mobile-editor-dialog__header");
  if (!dialog || !header) return;

  header.classList.remove("mobile-editor-dialog__header--close-only");
  header.classList.add("mobile-editor-dialog__header--actions");

  const cancel = document.querySelector("#style-skill-dialog-cancel");
  if (cancel) cancel.textContent = "キャンセル";

  if (!document.querySelector("#style-skill-dialog-apply")) {
    const apply = document.createElement("button");
    apply.type = "button";
    apply.id = "style-skill-dialog-apply";
    apply.textContent = "反映";
    header.append(apply);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", ensureStyleSkillActions, { once: true });
} else {
  ensureStyleSkillActions();
}
