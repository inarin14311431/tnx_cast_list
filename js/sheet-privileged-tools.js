const waitFrame = () => new Promise(resolve => requestAnimationFrame(resolve));

const editor = await waitForEditor();
if (editor) {
  const anchors = installSearchAnchors();
  try {
    await import("./sheet-master-search.js?v=4f7cef18");
    await Promise.all([
      import("./sheet-master-search-filters.js?v=92a6213f"),
      import("./sheet-master-search-enhancements.js?v=c8b2fed1"),
      import("./outfit-ofc-save.js?v=b16482f2"),
      import("./outfit-ofc-master-apply.js?v=dad65b0d"),
      import("./sheet-master-autofill.js?v=f503c5a4")
    ]);
    await import("./sheet-tsv-import.js?v=84876214");
  } finally {
    anchors.forEach(anchor => anchor.remove());
  }
}

async function waitForEditor() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (window.TNXSheetEditor?.addOutfitForImport) return window.TNXSheetEditor;
    await waitFrame();
  }
  return null;
}

function installSearchAnchors() {
  const styleAdd = document.querySelector("#add-style-skill");
  const outfitAdd = document.querySelector("#add-outfit");
  if (!styleAdd || !outfitAdd) return [];

  const styleAnchor = createSearchAnchor("import-skd");
  const outfitAnchor = createSearchAnchor("import-ofc");
  styleAdd.insertAdjacentElement("afterend", styleAnchor);
  outfitAdd.insertAdjacentElement("afterend", outfitAnchor);
  return [styleAnchor, outfitAnchor];
}

function createSearchAnchor(id) {
  const anchor = document.createElement("span");
  anchor.id = id;
  anchor.hidden = true;
  anchor.setAttribute("aria-hidden", "true");
  return anchor;
}
