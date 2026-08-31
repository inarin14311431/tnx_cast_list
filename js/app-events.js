export const APP_EVENTS = Object.freeze({
  CAST_COMPOSITION_READY: "tnx:cast-composition-ready",
  SHEET_COMPOSITION_READY: "tnx:sheet-composition-ready",
  OUTFIT_TABLES_RENDERED: "tnx:outfit-tables-rendered",
  STYLE_SKILLS_CHANGED: "tnx:style-skills-changed",
  CHARACTER_SAVED: "tnx:character-saved"
});

export function emitAppEvent(target, name, detail = undefined) {
  const eventTarget = target?.dispatchEvent ? target : document;
  eventTarget.dispatchEvent(new CustomEvent(name, { bubbles: false, detail }));
}

export function onAppEvent(target, name, listener, options = undefined) {
  const eventTarget = target?.addEventListener ? target : document;
  eventTarget.addEventListener(name, listener, options);
  return () => eventTarget.removeEventListener(name, listener, options);
}
