export const TROOP_COMBO_RULE_PREFIX = "@@TNX_COMBO_CHECK_V2@@";

export function packTroopComboRule(data = {}) {
  const expectedValue = String(data.expected_value || "").trim();
  const confrontation = String(data.confrontation || "").trim();
  return `${TROOP_COMBO_RULE_PREFIX}${JSON.stringify({ expected_value:expectedValue, confrontation })}`;
}

export function unpackTroopComboRule(value) {
  const text = String(value || "").trim();
  if (!text) return { expected_value:"", confrontation:"" };
  if (!text.startsWith(TROOP_COMBO_RULE_PREFIX)) {
    return { expected_value:numericText(text), confrontation:"" };
  }
  try {
    const parsed = JSON.parse(text.slice(TROOP_COMBO_RULE_PREFIX.length));
    return {
      expected_value:String(parsed?.expected_value || numericText(parsed?.difficulty) || "").trim(),
      confrontation:String(parsed?.confrontation || "").trim()
    };
  } catch {
    return { expected_value:"", confrontation:"" };
  }
}

function numericText(value) {
  const text = String(value || "").trim();
  return /^[-+]?\d+$/.test(text) ? text : "";
}
