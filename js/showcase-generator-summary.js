// What the generator's side panels say about the current input: the step navigation states, the publish checklist and the
// summary of the look settings. Pure functions over plain values (the DOM is read in showcase-generator-shell.js), so
// they can be tested without a browser. docs/SHOWCASE_GENERATOR_REDESIGN.md.

export const MAX_CASTS = 6;

// Short names of the scene frames for the composition summary ("B:タイトル・ACT READY / ほかは A").
export const SCENE_FRAME_SHORT_NAMES = Object.freeze({
  loading: "ローディング",
  title: "タイトル",
  trailer: "トレーラー",
  "handout-assign": "ハンドアウト",
  ready: "ACT READY",
  finale: "フィナーレ"
});
const FRAME_ORDER = Object.keys(SCENE_FRAME_SHORT_NAMES);

// The composition ({ frame: pattern }, only the frames that are not "a") as one line.
export function summarizeScenes(selection) {
  const byPattern = new Map();
  for (const frame of FRAME_ORDER) {
    const pattern = String(selection?.[frame] ?? "a").trim().toLowerCase();
    if (!pattern || pattern === "a") continue;
    if (!byPattern.has(pattern)) byPattern.set(pattern, []);
    byPattern.get(pattern).push(frame);
  }
  if (!byPattern.size) return "すべて A(標準)";
  const changed = [...byPattern.values()].reduce((sum, frames) => sum + frames.length, 0);
  if (byPattern.size === 1 && changed === FRAME_ORDER.length) return `すべて ${[...byPattern.keys()][0].toUpperCase()}`;
  const parts = [...byPattern.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([pattern, frames]) => `${pattern.toUpperCase()}:${frames.map(frame => SCENE_FRAME_SHORT_NAMES[frame]).join("・")}`);
  return changed === FRAME_ORDER.length ? parts.join(" / ") : `${parts.join(" / ")} / ほかは A`;
}

// The theme select shows "ネオン・グリッド / NEON GRID": the step shows the Japanese name.
export function themeShortName(optionText) {
  return String(optionText ?? "").split("/")[0].trim();
}

// How the background is set, from what the three fields hold. A preset key is looked up in `presets` ([{ key, name }]). Choosing a preset
// writes the preset's own URL into the URL field and sets the key; typing another URL or choosing a file clears the key
// (showcase-background-preset-picker.js), so a key that is set means "the preset", whatever the URL field holds.
export function summarizeBackground({ presetKey = "", url = "", hasFile = false, presets = [] } = {}) {
  const preset = presets.find(item => item.key === String(presetKey ?? "").trim());
  if (preset) return preset.name;
  if (String(url ?? "").trim()) return "自分の画像(URL)";
  if (hasFile) return "自分の画像(ファイル)";
  return "未設定";
}

// castRows: [{ isPrivate, hasHandout }]. Returns the numbers every panel needs.
export function summarizeCasts(castRows = []) {
  const rows = Array.isArray(castRows) ? castRows : [];
  const total = rows.length;
  const handouts = rows.filter(row => row?.hasHandout).length;
  const privateCount = rows.filter(row => row?.isPrivate).length;
  return { total, handouts, privateCount, publicCount: total - privateCount };
}

// What stops a publication, in the order the writer should fix it ("" = nothing). Private casts are never published; the
// act title must not be blank. The slug is filled in automatically, and the generator itself reports a missing role.
export function publishBlocker({ actName = "", casts = summarizeCasts() } = {}) {
  if (!String(actName ?? "").trim()) return "アクトタイトルを入力してください";
  if (!casts.total) return "キャストを選んでください";
  if (casts.privateCount) return "非公開キャストを含むため公開できません(HTMLの書き出しだけできます)";
  if (!casts.publicCount) return "公開キャストを1人以上選んでください";
  return "";
}

// The four step entries: the text shown under each name.
export function summarizeSteps({ actName = "", themeLabel = "", casts = summarizeCasts() } = {}) {
  const blocker = publishBlocker({ actName, casts });
  return {
    act: String(actName ?? "").trim() ? "入力済み" : "未入力",
    cast: casts.total ? `${casts.total}人・HO ${casts.handouts}/${casts.total}` : "未選択",
    look: themeShortName(themeLabel) || "未選択",
    publish: blocker ? blocker.replace(/(\(.*\))$/, "").trim() : "公開できます"
  };
}

// The publish checklist rows: [{ key, label, value, state }] with state "ok", "todo" or "optional".
export function summarizeChecklist({ actName = "", rulerName = "", casts = summarizeCasts() } = {}) {
  const act = String(actName ?? "").trim();
  const ruler = String(rulerName ?? "").trim();
  const handoutState = !casts.total ? "todo" : casts.handouts === casts.total ? "ok" : "optional";
  return [
    { key: "act", label: "アクトタイトル", value: act || "未入力", state: act ? "ok" : "todo" },
    { key: "ruler", label: "RULER名", value: ruler || "未入力(任意)", state: ruler ? "ok" : "optional" },
    { key: "casts", label: "キャスト", value: `${casts.total} / ${MAX_CASTS}人`, state: casts.total ? "ok" : "todo" },
    { key: "handouts", label: "ハンドアウト", value: `${casts.handouts} / ${casts.total}`, state: handoutState }
  ];
}
