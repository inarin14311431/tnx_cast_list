const initializedRoots = new WeakSet();

function readInputValue(element) {
  if (element.type === "checkbox") return Boolean(element.checked);
  if (element.type === "number") return Number(element.value);
  return element.value;
}

export function initSheetRowInteractions({
  root = globalThis.document,
  onSkillInput = () => {},
  onOutfitInput = () => {},
  onDeleteSkill = () => {},
  onMoveSkill = () => {},
  onDeleteOutfit = () => {}
} = {}) {
  if (!root?.addEventListener || initializedRoots.has(root)) return false;

  root.addEventListener("input", event => {
    const element = event.target;
    if (!element?.matches || !element?.closest) return;

    if (element.matches("[data-f]")) {
      const row = element.closest("[data-skill-key]");
      if (!row) return;
      onSkillInput({
        key: row.dataset.skillKey,
        field: element.dataset.f,
        value: readInputValue(element),
        element,
        row
      });
      return;
    }

    if (element.matches("[data-o]")) {
      const card = element.closest("[data-outfit-key]");
      if (!card) return;
      onOutfitInput({
        key: card.dataset.outfitKey,
        field: element.dataset.o,
        value: readInputValue(element),
        element,
        card
      });
    }
  });

  root.addEventListener("click", event => {
    const target = event.target;
    if (!target?.closest) return;

    const deleteSkill = target.closest("[data-delete-skill]");
    if (deleteSkill) {
      onDeleteSkill(deleteSkill.dataset.deleteSkill);
      return;
    }

    const moveSkill = target.closest("[data-skill-move]");
    if (moveSkill) {
      onMoveSkill(moveSkill.dataset.skillKey, moveSkill.dataset.skillMove);
      return;
    }

    const deleteOutfit = target.closest("[data-delete-outfit]");
    if (deleteOutfit) onDeleteOutfit(deleteOutfit.dataset.deleteOutfit);
  });

  initializedRoots.add(root);
  return true;
}
