const initializedRoots = new WeakSet();
const initializedWindows = new WeakSet();

export function initSheetEditorInteractions({
  root = document,
  windowRef = window,
  isLoading = () => false,
  hasUnsavedChanges = () => false,
  onEdit = () => {}
} = {}) {
  if (!initializedRoots.has(root)) {
    initializedRoots.add(root);
    const handleEdit = event => {
      if (isLoading() || !event.target?.matches?.("input,select,textarea")) return;
      onEdit(event);
    };
    root.addEventListener("input", handleEdit);
    root.addEventListener("change", handleEdit);
    root.addEventListener("click", event => {
      const toggle = event.target?.closest?.(".section-toggle");
      if (toggle) toggle.closest(".sheet-section")?.classList.toggle("is-open");
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
