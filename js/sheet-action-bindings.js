const initializedRoots = new WeakSet();

export function initSheetActionBindings({
  root = globalThis.document,
  onSave = () => {},
  onAddGeneral = () => {},
  onAddSocial = () => {},
  onAddConnection = () => {},
  onAddStyleSkill = () => {},
  onAddOutfit = () => {}
} = {}) {
  if (!root?.querySelector || initializedRoots.has(root)) return false;

  const bindings = [
    ["#save-button", onSave],
    ["#add-general", onAddGeneral],
    ["#add-social", onAddSocial],
    ["#add-connection", onAddConnection],
    ["#add-style-skill", onAddStyleSkill],
    ["#add-outfit", onAddOutfit]
  ];

  for (const [selector, handler] of bindings) {
    const element = root.querySelector(selector);
    if (element) element.onclick = handler;
  }

  initializedRoots.add(root);
  return true;
}
