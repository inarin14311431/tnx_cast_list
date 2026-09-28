export const STYLE_CODE_NAMES = new Map([["0","カブキ"],["1","バサラ"],["2","タタラ"],["3","ミストレス"],["4","カブト"],["5","カリスマ"],["6","マネキン"],["7","カゼ"],["8","フェイト"],["9","クロマク"],["10","エグゼク"],["11","カタナ"],["12","クグツ"],["13","カゲ"],["14","チャクラ"],["15","レッガー"],["16","カブトワリ"],["17","ハイランダー"],["18","マヤカシ"],["19","トーキー"],["20","イヌ"],["21","ニューロ"],["-0","コモン"],["-1","ヒルコ"],["-2","クロガネ"],["-4","イブキ"],["-6","シキガミ"],["-7","アラシ"],["-9","カゲムシャ"],["-12","ミギウデ"],["-17","エトランゼ"],["-18","アヤカシ"],["-21","ウツワ"]]);

export function completeOutlineFromStyleCodes(data) {
  if (!data || typeof data !== "object" || Array.isArray(data) || data.outline) return data;
  const styles = data.styles;
  if (!styles || typeof styles !== "object" || Array.isArray(styles)) return data;
  const names = [styles.style1, styles.style2, styles.style3].map(value => STYLE_CODE_NAMES.get(String(value ?? "")) || "");
  if (!names.every(Boolean)) return data;
  return { ...data, outline: `STYLE:${names.join("=")}` };
}
