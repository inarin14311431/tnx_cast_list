export function countGeneralSkillColumns(rows = []) {
  const general = Array.isArray(rows) ? rows : [];
  const splitIndex = general.findIndex(item => item?.name === "交渉") + 1;
  if (splitIndex <= 0) return { left: general.length, right: 0 };
  return { left: splitIndex, right: Math.max(0, general.length - splitIndex) };
}

export function chooseGeneralSkillColumn({ left = 0, right = 0 } = {}) {
  const leftCount = Math.max(0, Number(left || 0));
  const rightCount = Math.max(0, Number(right || 0));
  return leftCount <= rightCount ? "left" : "right";
}
