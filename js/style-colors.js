export const STYLE_COLORS = new Map([
  ["カブキ", "#ff3b6b"], ["バサラ", "#7d3bff"], ["タタラ", "#3b6cff"],
  ["ミストレス", "#ff5cc8"], ["カブト", "#3dffa1"], ["カリスマ", "#ffd23b"],
  ["マネキン", "#ffb93b"], ["カゼ", "#29c7ff"], ["フェイト", "#ffe66b"],
  ["クロマク", "#8a6cff"], ["エグゼク", "#ff8a3b"], ["カタナ", "#3bffa4"],
  ["クグツ", "#c83bff"], ["カゲ", "#6f7cff"], ["チャクラ", "#3bff8a"],
  ["レッガー", "#ffb13b"], ["カブトワリ", "#ff3b9b"], ["ハイランダー", "#9aff3b"],
  ["マヤカシ", "#3bffd5"], ["トーキー", "#ff6f3b"], ["イヌ", "#ff4f3b"],
  ["ニューロ", "#3bffe1"], ["コモン", "#b8ff3b"], ["ヒルコ", "#ff3bd5"],
  ["クロガネ", "#a1a8ff"], ["イブキ", "#45ffcc"], ["シキガミ", "#ff5cc8"],
  ["アラシ", "#ff7a3b"], ["カゲムシャ", "#9b3bff"], ["ミギウデ", "#ffcf3b"],
  ["エトランゼ", "#9aff3b"], ["アヤカシ", "#3bffd5"], ["ウツワ", "#ffffff"]
]);

export function getStyleColor(name) {
  return STYLE_COLORS.get(String(name || "").trim()) || "#83a8b3";
}
