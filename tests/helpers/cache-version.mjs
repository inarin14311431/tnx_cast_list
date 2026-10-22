import assert from "node:assert/strict";

/* ?v= values are content hashes written by `npm run version:update`; whether they are current is checked
 * only by audit:cache. Tests assert which file is loaded and how, so they compare against text whose
 * ?v= values are replaced by VERSION: write the expected reference as /cast-entry\.css\?v=VERSION/. */

export const VERSION = "VERSION";

export function maskCacheVersions(text) {
  return String(text).replace(/([?&]v=)[0-9A-Za-z._-]*/g, `$1${VERSION}`);
}

export function assertVersionedMatch(actual, pattern, message) {
  assert.match(maskCacheVersions(actual), pattern, message);
}

export function assertVersionedNoMatch(actual, pattern, message) {
  assert.doesNotMatch(maskCacheVersions(actual), pattern, message);
}
