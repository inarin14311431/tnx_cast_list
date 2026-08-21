export function buildStylePresentation({
  slots = [],
  styleData = [],
  requiredCount = 3,
  unselectedLabel = "未選択",
  warningMessage = "3枠すべてのスタイルを選択してください。"
} = {}) {
  const activeSlots = Array.from({ length: requiredCount }, (_, index) => slots[index] || {});
  const divines = activeSlots.map(slot => {
    const name = slot?.name || "";
    const style = styleData.find(item => item?.name === name) || null;
    return {
      name: style?.divine || unselectedLabel,
      yomi: style?.divineYomi || style?.divine || ""
    };
  });

  const selectedCount = activeSlots.filter(slot => Boolean(slot?.name)).length;
  return {
    divines,
    warning: selectedCount === requiredCount ? "" : warningMessage
  };
}
