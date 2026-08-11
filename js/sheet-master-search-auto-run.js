/* Automatically re-run the existing master search when a classification filter changes.
 * This deliberately reuses the search button instead of creating a second search path. */

document.addEventListener("change", event => {
  const filter = event.target.closest?.("#master-search-filter-primary, #master-search-filter-secondary");
  if (!filter) return;

  const dialog = filter.closest("#master-search-dialog");
  if (!dialog?.open) return;

  const runButton = dialog.querySelector("#master-search-run");
  if (!runButton || runButton.disabled) return;
  runButton.click();
});
