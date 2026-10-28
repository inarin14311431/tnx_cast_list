import {
  DEFAULT_SCENE_PATTERN,
  SCENE_FRAMES,
  SCENE_PATTERNS,
  formatSceneSelectionField,
  parseSceneSelectionField
} from "./act-showcase-scenes.js?v=3bf295e5";

// The scene composition choice of the generator (docs/ACT_SHOWCASE_SCENES.md section 6 #6): one <select> per scene frame that
// can play more than one pattern. The choice lives in the hidden field #showcase-scenes (JSON, see act-showcase-scenes.js);
// publishing and restoring read and write that field only, so this module is the only place that knows about the selects.
//
// The controls are built from SCENE_PATTERNS, so a frame gets its select the moment a second pattern is added there. While every
// frame can play only "a" there is nothing to choose and the whole fieldset stays hidden.

export const SCENE_FRAME_LABELS = Object.freeze({
  loading: "ローディング / ACCESS",
  title: "タイトル / TITLE",
  trailer: "アクトトレーラー / TRAILER",
  "handout-assign": "ハンドアウト・キャストアサイン / HANDOUT & ASSIGN",
  ready: "ACT READY",
  finale: "フィナーレ / FINALE"
});

// The frames that have a real choice: those that can play at least two patterns, in frame order.
export function selectableFrames(patterns = SCENE_PATTERNS) {
  return SCENE_FRAMES
    .map(frame => ({ frame, patterns: [...(patterns?.[frame] || [])] }))
    .filter(item => item.patterns.length > 1);
}

// What a frame's select shows for the current field: the stored pattern if the frame can play it, otherwise "a".
export function shownPattern(fieldText, frame, playable) {
  const stored = parseSceneSelectionField(fieldText)[frame];
  return playable.includes(stored) ? stored : DEFAULT_SCENE_PATTERN;
}

// The field after the user picked `pattern` for `frame`. Only that frame changes: the other entries stay as they are, also the
// ones a frame cannot play yet (they were stored by a newer script and must survive an edit). Choosing "a" removes the entry.
export function fieldAfterChoice(fieldText, frame, pattern) {
  const selection = { ...parseSceneSelectionField(fieldText) };
  if (pattern === DEFAULT_SCENE_PATTERN) delete selection[frame];
  else selection[frame] = pattern;
  return formatSceneSelectionField(selection);
}

export function mountSceneSelector({ host, field, patterns = SCENE_PATTERNS, doc = host?.ownerDocument || globalThis.document } = {}) {
  if (!host || !field || !doc) return null;
  const frames = selectableFrames(patterns);
  const selects = new Map();
  host.hidden = frames.length === 0;
  // The legend and the hidden field stay; the controls go into one container so a second mount replaces the first.
  let grid = [...(host.children || [])].find(child => child.dataset?.sceneSelectorGrid === "true");
  if (!grid) {
    grid = doc.createElement("div");
    grid.dataset.sceneSelectorGrid = "true";
    grid.className = "form-grid";
    host.append(grid);
  }
  grid.replaceChildren();

  for (const { frame, patterns: playable } of frames) {
    const label = doc.createElement("label");
    label.append(SCENE_FRAME_LABELS[frame] || frame);
    const select = doc.createElement("select");
    select.dataset.sceneFrame = frame;
    for (const pattern of playable) {
      const option = doc.createElement("option");
      option.value = pattern;
      option.textContent = `パターン ${pattern.toUpperCase()}`;
      select.append(option);
    }
    select.addEventListener("change", () => {
      field.value = fieldAfterChoice(field.value, frame, select.value);
    });
    label.append(select);
    grid.append(label);
    selects.set(frame, { select, playable });
  }

  const refresh = () => {
    for (const [frame, { select, playable }] of selects) select.value = shownPattern(field.value, frame, playable);
  };
  // Restoring an act writes the field and fires "input" on it
  field.addEventListener("input", refresh);
  field.addEventListener("change", refresh);
  refresh();
  return { refresh, frames: frames.map(item => item.frame) };
}

mountSceneSelector({
  host: globalThis.document?.querySelector("#showcase-scene-composition"),
  field: globalThis.document?.querySelector("#showcase-scenes")
});
