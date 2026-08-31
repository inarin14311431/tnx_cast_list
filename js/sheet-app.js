import { APP_EVENTS, emitAppEvent } from "./app-events.js?v=1";

const runtimeModules = Object.freeze([
  "./sheet.js?v=114",
  "./sheet-image.js?v=104",
  "./sheet-personal-data.js?v=101",
  "./sheet-skill-ui.js?v=1",
  "./sheet-features.js?v=103",
  "./experience.js?v=101",
  "./style-skill-separators.js?v=7",
  "./sheet-multiline-fields.js?v=1",
  "./outfit-ofc-fields.js?v=4",
  "./sheet-combos.js?v=6",
  "./sheet-snapshots.js?v=1"
]);

const composition = Object.freeze({
  page: "sheet.html",
  version: 2,
  owners: Object.freeze({
    "#style-grid": "sheet-style-editor",
    "#general-skills": "sheet-general-skill-editor",
    "#style-skills": "sheet-style-skill-editor",
    "#outfit-list": "sheet-outfit-editor",
    "#save-button": "sheet-save-coordinator",
    "#sheet-combo-dialog": "sheet-combo-editor"
  }),
  modules: Object.freeze(runtimeModules.map(path => path.replace(/^\.\//, "").replace(/\?.*$/, "")))
});

function applyOwnershipContract() {
  for (const [selector, owner] of Object.entries(composition.owners)) {
    const node = document.querySelector(selector);
    if (node) node.dataset.runtimeOwner = owner;
  }
}

async function bootstrapSheetRuntime() {
  applyOwnershipContract();
  for (const modulePath of runtimeModules) await import(modulePath);
  applyOwnershipContract();
  emitAppEvent(document, APP_EVENTS.SHEET_COMPOSITION_READY, composition);
}

globalThis.TNX_SHEET_APP = composition;
bootstrapSheetRuntime().catch(error => console.error("Failed to bootstrap sheet runtime", error));
