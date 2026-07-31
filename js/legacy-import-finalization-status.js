/* Legacy import finalization overlay disabled.
 * The original importer now owns progress reporting, including the outfit name
 * currently being converted, and performs the normal per-outfit redraw cycle. */
(() => {
  if (document.querySelector('script[data-current-tsv-import]')) return;
  const script = document.createElement('script');
  script.src = './js/tsv-import-current.js?v=1';
  script.dataset.currentTsvImport = '1';
  document.head.append(script);
})();
