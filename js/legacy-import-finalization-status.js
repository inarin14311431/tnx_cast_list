/* Compatibility shim for cached sheet.html versions. */
(() => {
  if (document.querySelector('script[data-sheet-birthplace]') || document.querySelector('#birthplace')) return;
  const script = document.createElement('script');
  script.src = './js/sheet-birthplace.js?v=1';
  script.dataset.sheetBirthplace = '1';
  document.head.append(script);
})();
