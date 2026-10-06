// Pure rule for how the ACT TRAILER frame's visible height follows the caret's line. Kept apart from the DOM code
// (js/act-showcase-cinematic-layout-v2.js) so it can be run and measured on its own.

// Exponential smoothing: a one-line step settles to within 5% in about 3 x TAU (~210ms), well inside the 150-250ms a
// line should take, and the first frame after a step moves only a small part of it.
export const TRAILER_SETTLE_TAU_MS = 70;
// A long frame (dropped frames, background tab) must not turn into one big jump.
export const TRAILER_SETTLE_MAX_FRAME_MS = 64;
// Closer than this to the target counts as arrived (sub-pixel).
export const TRAILER_SETTLE_EPSILON_PX = 0.5;

// maxStep caps how far one frame may move the frame (a blank line between paragraphs is a two-line jump, and a slow
// device has long frames); the caller passes a bit less than half a line.
// maxLag is the other rule and it wins: whatever maxStep says, the frame never falls more than maxLag (one line)
// behind the target, so the line being read is always inside the frame. A long text typed fast (a phone's narrow
// lines, a slow device) therefore moves the frame faster than maxStep instead of hiding the reading line under its
// bottom edge; maxStep only shapes the movement while the frame is within a line of the target.
export function settleHeight(current, target, elapsedMs, { reduced = false, tau = TRAILER_SETTLE_TAU_MS, maxStep = Infinity, maxLag = Infinity } = {}) {
  if (!Number.isFinite(target)) return current;
  // first value, or prefers-reduced-motion: no smoothing, the frame switches line by line
  if (!Number.isFinite(current) || reduced) return target;
  const elapsed = Math.min(TRAILER_SETTLE_MAX_FRAME_MS, Math.max(0, elapsedMs));
  const wanted = (target - current) * (1 - Math.exp(-elapsed / tau));
  const step = Math.sign(wanted) * Math.min(Math.abs(wanted), maxStep);
  let next = current + step;
  // growing: never end the frame more than maxLag short of the target
  if (target > next + maxLag) next = target - maxLag;
  return Math.abs(target - next) < TRAILER_SETTLE_EPSILON_PX ? target : next;
}
