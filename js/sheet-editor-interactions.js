const initializedRoots = new WeakSet();
const initializedWindows = new WeakSet();

function prepareSectionToggle(toggle) {
  const section = toggle.closest?.(".sheet-section");
  if (!section) return;

  if (!toggle.classList.contains("section-toggle")) {
    toggle.classList.add("section-toggle");
  }

  if (toggle.matches(".sheet-combo-entry__header")) {
    toggle.style.paddingRight = "58px";
    toggle.style.cursor = "pointer";
    const tag = toggle.querySelector(".sheet-combo-entry__tag");
    if (tag) {
      tag.style.marginLeft = "auto";
      tag.style.marginRight = "10px";
    }
  }

  if (toggle.tagName !== "BUTTON") {
    toggle.setAttribute("role", "button");
    toggle.setAttribute("tabindex", "0");
  }

  const body = section.querySelector(":scope > .section-body");
  if (body) {
    if (!body.id && section.id) body.id = `${section.id}-body`;
    if (body.id) toggle.setAttribute("aria-controls", body.id);
  }

  toggle.setAttribute("aria-expanded", String(section.classList.contains("is-open")));
}

function toggleSection(toggle) {
  const section = toggle.closest?.(".sheet-section");
  if (!section) return;

  const isOpen = section.classList.toggle("is-open");
  toggle.setAttribute("aria-expanded", String(isOpen));
}

function isInternalNormalization(event) {
  return Boolean(event?.detail?.tnxInternalNormalization);
}

export function initSheetEditorInteractions({
  root = document,
  windowRef = window,
  isLoading = () => false,
  hasUnsavedChanges = () => false,
  onEdit = () => {}
} = {}) {
  if (!initializedRoots.has(root)) {
    initializedRoots.add(root);

    root.querySelectorAll(".section-toggle, .sheet-combo-entry__header").forEach(prepareSectionToggle);

    const handleEdit = event => {
      if (isLoading() || isInternalNormalization(event) || !event.target?.matches?.("input,select,textarea")) return;
      onEdit(event);
    };

    root.addEventListener("input", handleEdit);
    root.addEventListener("change", handleEdit);

    root.addEventListener("click", event => {
      const toggle = event.target?.closest?.(".section-toggle");
      if (toggle) toggleSection(toggle);
    });

    root.addEventListener("keydown", event => {
      const toggle = event.target?.closest?.(".section-toggle");
      if (!toggle || toggle.tagName === "BUTTON") return;
      if (event.key !== "Enter" && event.key !== " ") return;

      event.preventDefault();
      toggleSection(toggle);
    });
  }

  if (!initializedWindows.has(windowRef)) {
    initializedWindows.add(windowRef);
    windowRef.addEventListener("beforeunload", event => {
      if (!hasUnsavedChanges()) return;
      event.preventDefault();
      event.returnValue = "";
    });
  }
}
