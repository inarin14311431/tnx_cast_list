export function initSheetStyleInteractions({
  root,
  onStyleChange
} = {}) {
  if (!root || root.dataset.sheetStyleInteractions === "1") return;
  root.dataset.sheetStyleInteractions = "1";
  root.addEventListener("change", event => {
    if (!event.target?.matches?.('[id^="style-"]')) return;
    onStyleChange?.(event);
  });
}
