const BASE_FIELD_SELECTORS = {
  character_name: "#character-name",
  character_kana: "#character-kana",
  handle: "#handle",
  player_name: "#player-name",
  affiliation: "#affiliation",
  citizen_rank: "#citizen-rank",
  summary: "#summary",
  profile: "#profile"
};

export function collectCharacterInputSnapshot({
  root = document,
  structuredFields = [],
  experienceTotal = 0
} = {}) {
  const value = selector => root.querySelector(selector)?.value ?? "";
  const text = selector => root.querySelector(selector)?.textContent ?? "";

  return {
    base: {
      ...Object.fromEntries(
        Object.entries(BASE_FIELD_SELECTORS).map(([name, selector]) => [name, value(selector)])
      ),
      visibility: value("#visibility"),
      experience_points: Number(experienceTotal ?? text("#exp-total") ?? 0)
    },
    structured: Object.fromEntries(
      structuredFields.map(([name, selector]) => [name, value(selector)])
    )
  };
}

export function applyCharacterInputSnapshot({
  root = document,
  data = {},
  structuredFields = []
} = {}) {
  const setValue = (selector, value) => {
    const element = root.querySelector(selector);
    if (element) element.value = value ?? "";
  };

  for (const [name, selector] of Object.entries(BASE_FIELD_SELECTORS)) {
    setValue(selector, data[name] ?? "");
  }
  for (const [name, selector] of structuredFields) {
    setValue(selector, data[name] ?? "");
  }
  setValue("#visibility", data.visibility === "public" ? "public" : "private");
}
