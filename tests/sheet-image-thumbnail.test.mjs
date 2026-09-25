import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/sheet-image.js", import.meta.url), "utf8");

// createThumbnail() draws through the browser's Canvas/createImageBitmap APIs, which are not
// available in the plain Node test runner this project uses (no jsdom/canvas polyfill; every
// other image-processing test in this repo is source-text-only for the same reason - see
// tests/showcase-cinematic-layout-v2.test.mjs's throttle test for the established technique).
// To verify the actual resize/quality decision logic - not just that the text mentions it - this
// extracts the real function body (not a hand-copied duplicate) and runs it against fake
// renderToCanvas/canvasToBlob/decodeImage stand-ins whose output size is a controllable function
// of width/height/quality, so the loop's real branching can be exercised deterministically.
function loadCreateThumbnail() {
  const start = source.indexOf("async function createThumbnail");
  assert.notEqual(start, -1, "createThumbnail not found in js/sheet-image.js");
  const end = source.indexOf("\nasync function decodeImage", start);
  assert.notEqual(end, -1, "expected decodeImage to follow createThumbnail");
  const body = source.slice(start, end);

  return (sizeModel, { originalWidth = 4000, originalHeight = 3000 } = {}) => {
    const renderToCanvas = (_source, width, height) => ({ width, height });
    const canvasToBlob = (canvas, _type, quality) => Promise.resolve({
      size: sizeModel(canvas.width, canvas.height, quality)
    });
    const decodeImage = () => Promise.resolve({
      source: {},
      width: originalWidth,
      height: originalHeight,
      close() {}
    });
    const safeFileBase = name => String(name || "cast-image").replace(/\.[^.]+$/, "");

    const factory = new Function(
      "renderToCanvas", "canvasToBlob", "decodeImage", "safeFileBase",
      "OUTPUT_TYPE", "THUMBNAIL_MIN_LONG_EDGE", "THUMBNAIL_MAX_OUTPUT_FILE_SIZE", "THUMBNAIL_QUALITY_STEPS",
      `${body}\nreturn createThumbnail;`
    );
    return factory(
      renderToCanvas, canvasToBlob, decodeImage, safeFileBase,
      "image/webp", 120, 200 * 1024, [.82, .74, .66, .58, .5, .42]
    );
  };
}

test("createThumbnail shrinks a large photo down to the maxLongEdge/targetSize bounds", async () => {
  const build = loadCreateThumbnail();
  // Sized so 420x315 (the default maxLongEdge=420 scaled from a 4:3 original) never reaches
  // 40KB even at the lowest quality step, forcing at least one dimension-shrink pass.
  const createThumbnail = build((width, height, quality) => Math.round(width * height * quality * 0.6));

  const result = await createThumbnail({ name: "cast.jpg" });
  assert.ok(Math.max(result.width, result.height) <= 420, `long edge should be <=420, got ${Math.max(result.width, result.height)}`);
  assert.ok(result.file.size <= 40 * 1024, `output should be <=40KB, got ${result.file.size}`);
  assert.equal(result.file.type, "image/webp");
  assert.match(result.file.name, /-thumb\.webp$/);
});

test("createThumbnail does not upscale a photo already smaller than maxLongEdge", async () => {
  const build = loadCreateThumbnail();
  const createThumbnail = build((width, height, quality) => Math.round(width * height * quality * 0.01), {
    originalWidth: 300,
    originalHeight: 200
  });

  const result = await createThumbnail({ name: "small.jpg" });
  assert.equal(result.width, 300);
  assert.equal(result.height, 200);
});

test("createThumbnail respects custom maxLongEdge/targetSize overrides", async () => {
  const build = loadCreateThumbnail();
  const createThumbnail = build((width, height, quality) => Math.round(width * height * quality * 0.6));

  const result = await createThumbnail({ name: "cast.jpg" }, { maxLongEdge: 160, targetSize: 8 * 1024 });
  assert.ok(Math.max(result.width, result.height) <= 160, `long edge should be <=160, got ${Math.max(result.width, result.height)}`);
  assert.ok(result.file.size <= 8 * 1024, `output should be <=8KB, got ${result.file.size}`);
});

test("createThumbnail throws rather than upload an oversized thumbnail when it cannot compress enough", async () => {
  const build = loadCreateThumbnail();
  // A pathological model that never drops below the hard ceiling regardless of dimensions or
  // quality - the floor at THUMBNAIL_MIN_LONG_EDGE must stop the shrink loop and the function
  // must reject instead of silently uploading something far larger than intended.
  const createThumbnail = build(() => 500 * 1024);

  await assert.rejects(() => createThumbnail({ name: "cast.jpg" }), /圧縮できません/);
});
