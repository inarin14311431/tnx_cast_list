import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const exists = async path => { try { await access(new URL(`../${path}`, import.meta.url)); return true; } catch { return false; } };

test("new showcase links expose filename-defined standard and cinematic routes without retired mode/sample queries", async () => {
  const [publisher, loader, bootstrap] = await Promise.all([
    read("js/showcase-dynamic-publish-v3.js"),
    read("js/showcase-generator-loader.js"),
    read("js/act-showcase-bootstrap.js")
  ]);
  assert.match(publisher, /act-showcase-standard\.html\?id=\$\{encodeURIComponent\(slug\)\}/);
  assert.match(publisher, /act-showcase\.html\?id=\$\{encodeURIComponent\(slug\)\}/);
  assert.doesNotMatch(publisher, /showcaseMode=cinematic/);
  assert.doesNotMatch(publisher, /bgSample=neotokyo/);
  assert.match(loader, /showcase-dynamic-publish-v3\.js\?v=1/);
  assert.equal(await exists("js/showcase-mode-compat.js"), false);
  assert.match(bootstrap, /searchParams\.delete\("showcaseMode"\)/);
  assert.doesNotMatch(bootstrap, /bgSample/);
});
