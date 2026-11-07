// Pure reading of a cast's handout for the HANDOUT / ASSIGN pattern B (js/act-showcase-assign-b.js): the subject of the title,
// the fields written into the text ("推奨スタイル：… コネ：… 推奨スート：…"), and the handle / name of the cast. No DOM, no timers.
// Pattern A reads the same text inside js/act-showcase-writing-patterns.js (an IIFE that cannot be imported); the field names are
// kept the same on purpose. See docs/ACT_SHOWCASE_SCENES.md section 6 #7 (4th pattern: handout-assign).

const clean = value => String(value ?? "").trim();
const squash = value => clean(value).replace(/[\s　]+/g, " ");

export const FIELD_DEFS = Object.freeze([
  { key: "style", label: "STYLE", names: ["推奨スタイル", "スタイル", "推奨ペルソナ"] },
  { key: "setting", label: "SETTING", names: ["推奨設定", "設定"] },
  { key: "connection", label: "CONNECTION", names: ["コネ", "コネクション"] },
  { key: "suit", label: "SUIT", names: ["推奨スート", "スート"] },
  { key: "quick", label: "QUICK START", names: ["クイックスタート", "QS", "ＱＳ"] },
  { key: "condition", label: "CONDITION", names: ["条件", "必須条件"] },
  { key: "castConnection", label: "CAST LINK", names: ["キャスト間コネクション", "キャスト間コネ", "キャストコネ"] },
  { key: "relation", label: "RELATION", names: ["関係"] },
  { key: "ps", label: "PS", names: ["PS", "ＰＳ", "目的", "使命"] }
]);

const SEPARATORS = "\\s　・●○■□▼▽◆◇※／/|";
const namePattern = FIELD_DEFS.flatMap(item => item.names)
  .sort((a, b) => b.length - a.length)
  .map(value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");

function defFor(name) {
  const wanted = clean(name).toLocaleLowerCase("ja-JP");
  return FIELD_DEFS.find(item => item.names.some(value => value.toLocaleLowerCase("ja-JP") === wanted));
}

// "コネ：千早雅之　推奨スート：情熱" -> [{key:"connection", label:"CONNECTION", value:"千早雅之"}, {key:"suit", ..., value:"情熱"}]
export function parsePackedFields(line) {
  const source = clean(line);
  if (!source) return [];
  const matcher = new RegExp(`(?:^|[${SEPARATORS}]+)(${namePattern})\\s*[:：]\\s*`, "giu");
  const matches = Array.from(source.matchAll(matcher));
  const edge = new RegExp(`^[${SEPARATORS}]+|[${SEPARATORS}]+$`, "gu");
  const fields = [];
  matches.forEach((match, index) => {
    const def = defFor(match[1]);
    if (!def) return;
    const start = (match.index || 0) + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : source.length;
    const value = clean(source.slice(start, end).replace(edge, ""));
    if (value) fields.push({ key: def.key, label: def.label, value });
  });
  return fields;
}

// The facts shown beside the handout text: the first value of each field in the order below, at most `limit`, each shortened.
// The style is not one of them (it is the subject of the title), and nothing is invented for a field the text does not have.
const FACT_ORDER = ["connection", "suit", "relation", "setting", "condition", "ps", "castConnection", "quick"];
export function handoutFacts(body, { limit = 3, length = 40 } = {}) {
  const found = new Map();
  for (const line of String(body ?? "").replace(/\r\n?/g, "\n").split("\n")) {
    for (const field of parsePackedFields(line)) if (!found.has(field.key)) found.set(field.key, field);
  }
  const shorten = value => {
    const chars = Array.from(squash(value));
    return chars.length > length ? `${chars.slice(0, length).join("")}…` : chars.join("");
  };
  return FACT_ORDER.filter(key => found.has(key)).slice(0, limit).map(key => ({ ...found.get(key), value: shorten(found.get(key).value) }));
}

// "『カブキ』用ハンドアウト" -> {subject: "カブキ", caption: "用ハンドアウト"}; any other title is all subject.
export function splitHandoutTitle(title) {
  const text = squash(title);
  const match = text.match(/^(.*?)用ハンドアウト$/u);
  if (match && squash(match[1])) return { subject: squash(match[1]).replace(/^[『「](.*)[』」]$/u, "$1"), caption: "用ハンドアウト" };
  return { subject: text, caption: "" };
}

// The displayed name is the handle in quotes and the name: “ブルー・モーメント” 夜明けのランナー -> {handle, name}.
// Without a quoted handle the whole text is the name. The screens set the two parts side by side and break between them only
// when the pair does not fit (ASSIGN B, READY B).
export function splitCastName(fullName) {
  const text = squash(fullName);
  const match = text.match(/^([“"「『][^”"」』]+[”"」』])\s*(.*)$/u);
  if (!match) return { handle: "", name: text };
  return { handle: match[1], name: squash(match[2]) };
}
