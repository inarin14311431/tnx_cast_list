function numberValue(value) {
  return Number(value || 0);
}

export function buildAbilitySaveSnapshot({ abilities = [], values = {}, baselines = {} } = {}) {
  return Object.fromEntries(abilities.map(([key]) => {
    const controlKey = `${key}-control`;
    const current = values[key] || {};
    return [key, {
      current: numberValue(current.current),
      baseline: numberValue(baselines[key]),
      modifier: numberValue(current.modifier),
      controlCurrent: numberValue(current.controlCurrent),
      controlBaseline: numberValue(baselines[controlKey]),
      controlModifier: numberValue(current.controlModifier)
    }];
  }));
}

export function buildCsSaveSnapshot({ current = 0, modifier = 0 } = {}) {
  return {
    base: numberValue(current),
    modifier: numberValue(modifier)
  };
}
