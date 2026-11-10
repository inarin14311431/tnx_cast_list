import {
  DEFAULT_SCENE_PATTERN,
  SCENE_FRAMES,
  SCENE_PATTERNS,
  formatSceneSelectionField,
  parseSceneSelectionField
} from "./act-showcase-scenes.js?v=ac403d62";
import { summarizeScenes } from "./showcase-generator-summary.js?v=aa6bc728";

// The scene composition choice of the generator (docs/ACT_SHOWCASE_SCENES.md section 6 #6): one row of buttons ("A 標準" / "B:<name>")
// per scene frame that can play more than one pattern. The choice lives in the hidden field #showcase-scenes (JSON, see act-showcase-scenes.js);
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

// What a pattern is called in the generator (docs/ACT_SHOWCASE_SCENES.md section 6: the name each pattern was decided under).
// "a" is always "A 標準"; a pattern without a name here is shown as "パターン C".
export const SCENE_PATTERN_NAMES = Object.freeze({
  loading: Object.freeze({ b: "起動ターミナル" }),
  title: Object.freeze({ b: "タイトルカード", c: "シネマスコープ" }),
  trailer: Object.freeze({ b: "縦組み" }),
  "handout-assign": Object.freeze({ b: "ポートレート先行" }),
  ready: Object.freeze({ b: "ポートレート中央" }),
  finale: Object.freeze({ b: "キービジュアル" })
});

export function patternLabel(frame, pattern) {
  const upper = String(pattern).toUpperCase();
  if (pattern === DEFAULT_SCENE_PATTERN) return `${upper} 標準`;
  const name = SCENE_PATTERN_NAMES[frame]?.[pattern];
  return name ? `${upper}:${name}` : `パターン ${upper}`;
}

// The field after "すべて A に戻す": every frame the selector shows (one that can play more than "a") goes back to "a". An entry the frame
// cannot play yet, or one of a frame without a choice, was stored by a newer script and stays.
export function fieldAfterReset(fieldText, patterns = SCENE_PATTERNS) {
  let text = fieldText;
  for (const { frame, patterns: playable } of selectableFrames(patterns)) {
    if (shownPattern(text, frame, playable) !== DEFAULT_SCENE_PATTERN) text = fieldAfterChoice(text, frame, DEFAULT_SCENE_PATTERN);
  }
  return text;
}

export function mountSceneSelector({ host, field, patterns = SCENE_PATTERNS, doc = host?.ownerDocument || globalThis.document } = {}) {
  if (!host || !field || !doc) return null;
  const frames = selectableFrames(patterns);
  const rows = new Map();
  host.hidden = frames.length === 0;
  // The legend, the lead and the hidden field stay; the controls go into one container so a second mount replaces the first.
  let grid = [...(host.children || [])].find(child => child.dataset?.sceneSelectorGrid === "true");
  if (!grid) {
    grid = doc.createElement("div");
    grid.dataset.sceneSelectorGrid = "true";
    grid.className = "scene-choices";
    host.append(grid);
  }
  grid.replaceChildren();

  for (const { frame, patterns: playable } of frames) {
    const row = doc.createElement("div");
    row.className = "scene-choice";
    row.dataset.sceneChoice = frame;
    const label = doc.createElement("span");
    label.className = "scene-choice__label";
    label.textContent = SCENE_FRAME_LABELS[frame] || frame;
    const group = doc.createElement("div");
    group.className = "scene-choice__buttons";
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", SCENE_FRAME_LABELS[frame] || frame);
    const buttons = [];
    for (const pattern of playable) {
      const button = doc.createElement("button");
      button.type = "button";
      button.className = "scene-choice__button";
      button.dataset.sceneFrame = frame;
      button.dataset.scenePattern = pattern;
      button.textContent = patternLabel(frame, pattern);
      button.addEventListener("click", () => {
        field.value = fieldAfterChoice(field.value, frame, pattern);
        // The hidden field has no user event of its own: tell the page (the summary, the stale-output check) that it changed.
        field.dispatchEvent(new (globalThis.Event || class { constructor(type) { this.type = type; } })("input", { bubbles: true }));
      });
      buttons.push(button);
      group.append(button);
    }
    row.append(label, group);
    grid.append(row);
    rows.set(frame, { buttons, playable });
  }

  const reset = doc.createElement("button");
  reset.type = "button";
  reset.className = "scene-reset";
  reset.dataset.sceneReset = "true";
  reset.textContent = "すべて A に戻す";
  reset.addEventListener("click", () => {
    field.value = fieldAfterReset(field.value, patterns);
    field.dispatchEvent(new (globalThis.Event || class { constructor(type) { this.type = type; } })("input", { bubbles: true }));
  });
  if (frames.length) grid.append(reset);

  const summary = host.querySelector?.("[data-scene-summary]") ?? null;
  const refresh = () => {
    for (const [frame, { buttons, playable }] of rows) {
      const shown = shownPattern(field.value, frame, playable);
      for (const button of buttons) {
        const pressed = button.dataset.scenePattern === shown;
        button.setAttribute("aria-pressed", String(pressed));
        button.className = pressed ? "scene-choice__button is-selected" : "scene-choice__button";
      }
    }
    if (summary) summary.textContent = summarizeScenes(parseSceneSelectionField(field.value));
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
