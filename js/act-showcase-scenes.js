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

// The patterns each frame can actually play. Only "a" (the current presentation) exists so far; a frame gains "b" / "c"
// here when its pattern is added, and until then a composition that names them plays "a".
export const SCENE_PATTERNS = Object.freeze(Object.fromEntries(
  SCENE_FRAMES.map(frame => [frame, Object.freeze([DEFAULT_SCENE_PATTERN])])
));

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
