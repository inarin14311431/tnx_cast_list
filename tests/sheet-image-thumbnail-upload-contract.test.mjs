import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/sheet-image.js", import.meta.url), "utf8");

// uploadImage()/clearImageReference() are wired to real DOM elements at module load
// (`if(form&&fileInput&&...)initialize()`), so exercising them end-to-end needs a full DOM +
// Supabase double disproportionate to what the rest of this file's tests do (all source-text
// contracts - see tests/sheet-image-save-state-boundary.test.mjs). createThumbnail()'s own
// resize/quality logic is covered behaviorally in tests/sheet-image-thumbnail.test.mjs; this
// file locks down the surrounding upload/rollback/clear wiring as a source contract instead.
function functionBody(name, nextName) {
  const start = source.indexOf(`async function ${name}`);
  assert.notEqual(start, -1, `${name} not found`);
  const end = source.indexOf(`async function ${nextName}`, start);
  assert.notEqual(end, -1, `${nextName} not found after ${name}`);
  return source.slice(start, end);
}

test("uploadImage generates and uploads a thumbnail into the same folder alongside the full-size image", () => {
  const body = functionBody("uploadImage", "clearImageReference");
  assert.match(body, /const timestamp=Date\.now\(\);/);
  assert.match(body, /uploadedPath=`\$\{currentUser\.id\}\/\$\{target\.public_id\}\/\$\{timestamp\}\.\$\{extension\}`/);
  assert.match(body, /const thumbnail=await createThumbnail\(uploadFile\);/);
  assert.match(body, /uploadedThumbnailPath=`\$\{currentUser\.id\}\/\$\{target\.public_id\}\/\$\{timestamp\}-thumb\.\$\{thumbnailExtension\}`/);
});

test("uploadImage writes image_thumbnail_url together with image_url and cleans up the previous thumbnail", () => {
  const body = functionBody("uploadImage", "clearImageReference");
  assert.match(body, /\.update\(\{image_url:imageUrl,image_thumbnail_url:publicThumbnailUrl\}\)/);
  assert.match(body, /const previousThumbnailUrl=target\.image_thumbnail_url\|\|"";/);
  assert.match(body, /await removeOwnedStorageObject\(previousThumbnailUrl\);/);
});

test("uploadImage rolls back both the thumbnail and the main image if anything fails, thumbnail first", () => {
  const body = functionBody("uploadImage", "clearImageReference");
  const catchBlock = body.slice(body.indexOf("}catch(error){"));
  const thumbIndex = catchBlock.indexOf("if(uploadedThumbnailPath)await removeStoragePath(uploadedThumbnailPath);");
  const mainIndex = catchBlock.indexOf("if(uploadedPath)await removeStoragePath(uploadedPath);");
  assert.notEqual(thumbIndex, -1, "thumbnail rollback not found");
  assert.notEqual(mainIndex, -1, "main image rollback not found");
  assert.ok(thumbIndex < mainIndex, "thumbnail should be rolled back before the main image (it was uploaded after it)");
});

test("clearImageReference clears and deletes both image_url and image_thumbnail_url", () => {
  const start = source.indexOf("async function clearImageReference");
  const end = source.indexOf("async function removeOwnedStorageObject", start);
  const body = source.slice(start, end);
  assert.match(body, /const previousThumbnailUrl=character\.image_thumbnail_url\|\|"";/);
  assert.match(body, /\.update\(\{image_url:"",image_thumbnail_url:""\}\)/);
  assert.match(body, /character\.image_thumbnail_url="";/);
  assert.match(body, /await removeOwnedStorageObject\(previousThumbnailUrl\);/);
});
