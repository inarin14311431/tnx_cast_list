import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/sheet-mobile-image.js", import.meta.url), "utf8");

test("mobile image replacement generates and stores a thumbnail beside the full-size image", () => {
  assert.match(source, /async function createThumbnail\(file/);
  assert.match(source, /const thumbnailFile=await createThumbnail\(optimizedFile\)/);
  assert.match(source, /thumbnailPath=`\$\{user\.id\}\/\$\{character\.public_id\}\/\$\{timestamp\}-thumb\.webp`/);
  assert.match(source, /update\(\{image_url:next,image_thumbnail_url:publicThumbnailUrl\}\)/);
  assert.match(source, /character\.image_thumbnail_url=publicThumbnailUrl/);
});

test("mobile image replacement clears and removes the previous thumbnail", () => {
  assert.match(source, /previousThumbnail=character\.image_thumbnail_url\|\|""/);
  assert.match(source, /await removeOwned\(previousThumbnail\)/);
});

test("mobile image replacement rolls back the thumbnail before the full-size image", () => {
  const uploadStart = source.indexOf("async function upload");
  const uploadEnd = source.indexOf("\nasync function saveFocus", uploadStart);
  const body = source.slice(uploadStart, uploadEnd);
  const thumbnailIndex = body.indexOf("if(thumbnailPath)await supabase.storage.from(BUCKET).remove([thumbnailPath]);");
  const imageIndex = body.indexOf("if(path)await supabase.storage.from(BUCKET).remove([path]);");
  assert.ok(thumbnailIndex >= 0 && imageIndex >= 0 && thumbnailIndex < imageIndex);
});

test("mobile image removal clears and removes both stored image variants", () => {
  assert.match(source, /update\(\{image_url:"",image_thumbnail_url:null\}\)/);
  assert.match(source, /character\.image_url="";character\.image_thumbnail_url=null;await removeOwned\(previous\);await removeOwned\(previousThumbnail\)/);
});
