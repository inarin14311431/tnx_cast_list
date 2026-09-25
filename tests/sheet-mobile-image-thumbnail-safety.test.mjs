import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/sheet-mobile-image.js", import.meta.url), "utf8");

test("mobile image replacement clears and removes the previous thumbnail", () => {
  assert.match(source, /previousThumbnail=character\.image_thumbnail_url\|\|""/);
  assert.match(source, /update\(\{image_url:next,image_thumbnail_url:null\}\)/);
  assert.match(source, /character\.image_thumbnail_url=null;await removeOwned\(previous\);await removeOwned\(previousThumbnail\)/);
});

test("mobile image removal clears and removes both stored image variants", () => {
  assert.match(source, /update\(\{image_url:"",image_thumbnail_url:null\}\)/);
  assert.match(source, /character\.image_url="";character\.image_thumbnail_url=null;await removeOwned\(previous\);await removeOwned\(previousThumbnail\)/);
});
