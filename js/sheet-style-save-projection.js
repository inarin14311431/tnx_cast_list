export function buildStyleSaveRows({
  slots = [],
  styleData = [],
  count = 3
} = {}) {
  return Array.from({ length: Math.max(0, Number(count || 0)) }, (_, index) => {
    const slot = slots[index] || {};
    const name = slot?.name || "";
    const style = styleData.find(item => item?.name === name);
    return {
      name,
      mark: slot?.mark || "",
      attribute: slot?.attribute || "",
      divine: style?.divine || "",
      divineYomi: style?.divineYomi || style?.divine || ""
    };
  });
}
