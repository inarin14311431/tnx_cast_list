export function collectAbilityInputSnapshot({
  root = document,
  abilities = []
} = {}) {
  const number = selector => Number(root.querySelector(selector)?.value || 0);

  return {
    values: Object.fromEntries(
      abilities.map(([key]) => {
        const controlKey = `${key}-control`;
        return [key, {
          current: number(`#${key}-base`),
          modifier: number(`#${key}-mod`),
          controlCurrent: number(`#${controlKey}-base`),
          controlModifier: number(`#${controlKey}-mod`)
        }];
      })
    ),
    cs: {
      current: number("#cs-base"),
      modifier: number("#cs-mod")
    }
  };
}

export function applyAbilityInputSnapshot({
  root = document,
  abilities = [],
  data = {},
  baselines = {}
} = {}) {
  const set = (selector, value) => {
    const control = root.querySelector(selector);
    if (control) control.value = String(value);
  };

  // A current value can never sit below the style baseline (the mobile editor already raises it on load). Stored
  // data can, e.g. after a style change on an older build, so raise it here and let the experience total recompute.
  const atLeastBaseline = (value, baseline) => Math.max(Number(value), Number(baseline || 0));

  for (const [key] of abilities) {
    const controlKey = `${key}-control`;
    set(`#${key}-base`, atLeastBaseline(data[`${key}_base`] ?? data[`${key}_value`] ?? baselines[key] ?? 0, baselines[key]));
    set(`#${key}-mod`, Number(data[`${key}_gear`] || 0) + Number(data[`${key}_manual`] || 0));
    set(`#${controlKey}-base`, atLeastBaseline(data[`${key}_control_base`] ?? data[`${key}_control`] ?? baselines[controlKey] ?? 0, baselines[controlKey]));
    set(`#${controlKey}-mod`, Number(data[`${key}_control_gear`] || 0) + Number(data[`${key}_control_manual`] || 0));
  }
  set("#cs-base", data.cs_base ?? data.cs ?? 0);
  set("#cs-mod", Number(data.cs_gear || 0) + Number(data.cs_manual || 0));
}
