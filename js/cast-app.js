import { APP_EVENTS, emitAppEvent } from "./app-events.js?v=1";

const runtimeModules = Object.freeze([
  "./cast.js?v=95",
  "./cast-compact-skills.js?v=3",
  "./cast-ui.js?v=77",
  "./cast-style-skills.js?v=6",
  "./cast-outfits.js?v=5",
  "./cast-mobile.js?v=5",
  "./cast-troops-link.js?v=6"
]);

const composition = Object.freeze({
  page: "cast.html",
  version: 2,
  owners: Object.freeze({
    "#cast-content": "cast-core",
    "#skills-container": "cast-skill-presentation",
    "#style-skill-panel": "cast-style-skill-presentation",
    "#outfit-container": "cast-outfit-presentation",
    "#quick-sheet-pages": "cast-quick-sheet",
    "#mobile-cast-view": "cast-mobile-presentation"
  }),
  modules: Object.freeze(runtimeModules.map(path => path.replace(/^\.\//, "").replace(/\?.*$/, "")))
});

function applyOwnershipContract() {
  for (const [selector, owner] of Object.entries(composition.owners)) {
    const node = document.querySelector(selector);
    if (node) node.dataset.runtimeOwner = owner;
  }
}

async function bootstrapCastRuntime() {
  applyOwnershipContract();
  for (const modulePath of runtimeModules) await import(modulePath);
  applyOwnershipContract();
  emitAppEvent(document, APP_EVENTS.CAST_COMPOSITION_READY, composition);
}

globalThis.TNX_CAST_APP = composition;
bootstrapCastRuntime().catch(error => console.error("Failed to bootstrap cast runtime", error));
