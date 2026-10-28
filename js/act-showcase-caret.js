// Shared by the scene patterns that type a text out (ACT TRAILER pattern B so far): where the caret is, and how far a
// scrolling box has to move to keep it in view. A pure rule and one DOM read; no timers or observers: the caller
// asks after every typed step (typeSplitReadout's onStep), so nothing runs when nothing is typed.
// Pattern A keeps its own height-following frame (js/act-showcase-cinematic-layout-v2.js) and does not use this.

// The rect of the last character of the already-read text, or null. `textNode` is the Text node of the read span.
export function lastCharRect(textNode) {
  const length = textNode?.length || 0;
  if (!length) return null;
  const range = document.createRange();
  range.setStart(textNode, length - 1);
  range.setEnd(textNode, length);
  const rects = [...range.getClientRects()].filter(rect => rect.width > 0 && rect.height > 0);
  return rects.at(-1) || null;
}

// How far the box must scroll (in screen pixels; negative = toward the left / top) so that `rect` sits inside `box`
// with `padding` to spare on the side the text grows toward. axis "y": horizontal text, lines grow downward.
// axis "x": vertical text (vertical-rl), columns grow leftward. Pure: rects are {left,right,top,bottom}.
export function scrollDeltaToKeepVisible(rect, box, { axis = "y", padding = 0 } = {}) {
  if (!rect || !box) return { x: 0, y: 0 };
  if (axis === "x") {
    if (rect.left < box.left + padding) return { x: rect.left - (box.left + padding), y: 0 };
    if (rect.right > box.right - padding) return { x: rect.right - (box.right - padding), y: 0 };
    return { x: 0, y: 0 };
  }
  if (rect.bottom > box.bottom - padding) return { x: 0, y: rect.bottom - (box.bottom - padding) };
  if (rect.top < box.top + padding) return { x: 0, y: rect.top - (box.top + padding) };
  return { x: 0, y: 0 };
}

export function textAxis(textNode) {
  const mode = textNode?.parentElement ? getComputedStyle(textNode.parentElement).writingMode : "";
  return /^(vertical|sideways)/.test(mode) ? "x" : "y";
}

// Scrolls `container` just enough to bring the caret into view. The direction the text grows is the text's own
// writing mode, not the scrolling box's.
export function keepCaretVisible(container, textNode, { padding = 12 } = {}) {
  const rect = lastCharRect(textNode);
  if (!rect || !container) return;
  const delta = scrollDeltaToKeepVisible(rect, container.getBoundingClientRect(), { axis: textAxis(textNode), padding });
  // "instant": the container may have scroll-behavior:smooth, which would restart on every typed step and never arrive
  if (delta.x || delta.y) container.scrollBy({ left: delta.x, top: delta.y, behavior: "instant" });
}
