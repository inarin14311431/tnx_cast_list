const waitFrame = () => new Promise(resolve => requestAnimationFrame(resolve));

const editor = await waitForEditor();
if (editor) {
  installImportControls(editor);

  await import("./tsv-import-guide.js?v=5");
  await import("./sheet-master-search.js?v=3");
  await Promise.all([
    import("./sheet-master-search-filters.js?v=2"),
    import("./sheet-master-search-enhancements.js?v=2"),
    import("./outfit-ofc-save.js?v=20260819-3"),
    import("./outfit-ofc-tsv.js?v=20260819-1"),
    import("./outfit-ofc-master-apply.js?v=20260819-3"),
    import("./outfit-ofc-tsv-category-normalize.js?v=1"),
    import("./sheet-master-autofill.js?v=9")
  ]);
}

async function waitForEditor() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (window.TNXSheetEditor?.openTsvImport) return window.TNXSheetEditor;
    await waitFrame();
  }
  return null;
}

function installImportControls(sheetEditor) {
  const styleAdd = document.querySelector("#add-style-skill");
  const outfitAdd = document.querySelector("#add-outfit");
  if (!styleAdd || !outfitAdd) return;

  const styleButton = createImportButton("import-skd", "SKD TSV取込", "style", sheetEditor);
  const outfitButton = createImportButton("import-ofc", "OFC TSV取込", "outfit", sheetEditor);

  styleAdd.insertAdjacentElement("afterend", styleButton);
  outfitAdd.insertAdjacentElement("afterend", outfitButton);
  styleAdd.closest(".skill-toolbar")?.classList.add("skill-toolbar--two");
}

function createImportButton(id, label, mode, sheetEditor) {
  const button = document.createElement("button");
  button.id = id;
  button.type = "button";
  button.innerHTML = `${label} <small>IMPORT</small>`;
  button.addEventListener("click", () => sheetEditor.openTsvImport(mode, label));
  return button;
}
