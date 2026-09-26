// DOM writes only; calculations and lifecycle remain in the sheet coordinator.
export function applyStylePresentation(root, presentation) {
  presentation.divines.forEach((divine, index) => {
    const i = index + 1;
    root.querySelector(`#divine-${i}`).textContent = divine.name;
    root.querySelector(`#divine-${i}-yomi`).textContent = divine.yomi;
  });
  root.querySelector("#style-warning").textContent = presentation.warning;
}

export function applyAbilityFinals(root, abilities, finals) {
  for (const [key] of abilities) {
    root.querySelector(`#${key}-final`).textContent = finals[key];
    root.querySelector(`#${key}-control-final`).textContent = finals[`${key}-control`];
  }
  root.querySelector("#cs-final").textContent = finals.cs;
}
