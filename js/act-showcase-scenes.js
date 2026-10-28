// The ACT SHOWCASE (deluxe) plays six scene frames in a fixed order, and each frame is drawn by one pattern.
// Pure definitions and the reading of a showcase's composition; no DOM. See docs/ACT_SHOWCASE_SCENES.md §6.1.
//
//   loading         the ACCESS screen once the data has arrived (the static loading screen before it has no pattern)
//   title           TITLE & CREDITS
//   trailer         ACT TRAILER
//   handout-assign  the handout and the cast assignment, one pattern for the pair, repeated for every PC
//   ready           ACT READY (the summary; existing code calls it "finale": .neotokyo-finale__*)
//   finale          the page itself after the sequence: the hero and the cast board

export const SCENE_FRAMES = Object.freeze(["loading", "title", "trailer", "handout-assign", "ready", "finale"]);

export const DEFAULT_SCENE_PATTERN = "a";

// The patterns each frame can actually play, in order; "a" (the presentation every showcase had before compositions) first.
// A frame gains "b" / "c" here when its pattern is added, and until then a composition that names them plays "a".
//   trailer  b = the vertical-text trailer (js/act-showcase-trailer-b.js, css-next/pages/act-showcase-patterns.css)
const PLAYABLE_PATTERNS = {
  loading: [DEFAULT_SCENE_PATTERN],
  title: [DEFAULT_SCENE_PATTERN],
  trailer: [DEFAULT_SCENE_PATTERN, "b"],
  "handout-assign": [DEFAULT_SCENE_PATTERN],
  ready: [DEFAULT_SCENE_PATTERN],
  finale: [DEFAULT_SCENE_PATTERN]
};
export const SCENE_PATTERNS = Object.freeze(Object.fromEntries(
  SCENE_FRAMES.map(frame => [frame, Object.freeze([...PLAYABLE_PATTERNS[frame]])])
));

// Plays one frame with the pattern the composition asks for, and falls back to "a" when that pattern cannot be played:
// the frame has no such pattern, or drawing it throws (a pattern B/C that fails must not leave the visitor on a blank
// screen). `patterns` maps a pattern name to what draws it, `run(draw)` calls it. The fallback runs only for a pattern
// other than "a" that threw; "a" failing is the old behaviour and is not hidden. onFallback(error, pattern) reports it.
export async function playWithFallback(patterns, wanted, run, onFallback) {
  const requested = typeof wanted === "string" && Object.prototype.hasOwnProperty.call(patterns || {}, wanted) ? wanted : DEFAULT_SCENE_PATTERN;
  try {
    return await run(patterns[requested]);
  } catch (error) {
    if (requested === DEFAULT_SCENE_PATTERN || !patterns[DEFAULT_SCENE_PATTERN]) throw error;
    onFallback?.(error, requested);
    return run(patterns[DEFAULT_SCENE_PATTERN]);
  }
}

// Reads the composition stored with a showcase (showcase_data.scenes, e.g. { "title": "b" }) and returns the pattern
// of every frame, in SCENE_FRAMES order. Anything missing or not understood falls back to "a", frame by frame:
// no data, no scenes key, scenes that is not a plain object, a frame left out, a value that is not a string, or a
// pattern the frame cannot play. Pattern names ignore case and surrounding spaces; unknown frame keys are ignored.
// Showcases published before compositions existed have no scenes key, so they play every frame as "a".
export function resolveSceneComposition(data, { patterns = SCENE_PATTERNS } = {}) {
  const scenes = isPlainObject(data) && isPlainObject(data.scenes) ? data.scenes : {};
  const composition = {};
  for (const frame of SCENE_FRAMES) {
    const own = Object.prototype.hasOwnProperty.call(scenes, frame) ? scenes[frame] : undefined;
    const requested = typeof own === "string" ? own.trim().toLowerCase() : "";
    const playable = patterns[frame] || [];
    composition[frame] = playable.includes(requested) ? requested : DEFAULT_SCENE_PATTERN;
  }
  return Object.freeze(composition);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

// ---- Saving and restoring the composition (the generator side). The page that reads it is resolveSceneComposition above.
//
// What is stored is the selection: { frame: pattern } for the frames that are NOT "a". All frames "a" is stored as no
// `scenes` key at all, which is exactly what every showcase published before compositions looks like. A pattern the frame
// cannot play yet is kept as it was written, so a showcase edited with an older script does not lose it; the reader
// plays "a" for it until the pattern exists.
const PATTERN_NAME = /^[a-z0-9-]{1,16}$/;

export function normalizeSceneSelection(value) {
  const selection = {};
  if (!isPlainObject(value)) return selection;
  for (const frame of SCENE_FRAMES) {
    if (!Object.prototype.hasOwnProperty.call(value, frame)) continue;
    const raw = value[frame];
    const pattern = typeof raw === "string" ? raw.trim().toLowerCase() : "";
    if (PATTERN_NAME.test(pattern) && pattern !== DEFAULT_SCENE_PATTERN) selection[frame] = pattern;
  }
  return selection;
}

// The generator keeps the selection in one hidden field (#showcase-scenes) as JSON; "" means every frame is "a".
export function formatSceneSelectionField(selection) {
  const normalized = normalizeSceneSelection(selection);
  return Object.keys(normalized).length ? JSON.stringify(normalized) : "";
}

export function parseSceneSelectionField(text) {
  const source = String(text ?? "").trim();
  if (!source) return {};
  try {
    return normalizeSceneSelection(JSON.parse(source));
  } catch {
    return {};
  }
}

