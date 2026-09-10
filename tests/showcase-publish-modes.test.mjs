import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

test("generator exposes separate standard and cinematic publication actions", async () => {
  const html = await read("showcase-generator.html");
  assert.match(html, /data-publish-mode="standard"/);
  assert.match(html, /従来版で公開/);
  assert.match(html, /data-publish-mode="cinematic"/);
  assert.match(html, /豪華版で公開/);
  assert.match(html, /id="publish-button"[^>]*hidden/);
});

test("dynamic publisher emits current publication URLs without retired mode/sample queries", async () => {
  const [loader, publisher] = await Promise.all([
    read("js/showcase-generator-loader.js"),
    read("js/showcase-dynamic-publish-v3.js")
  ]);
  assert.match(loader, /showcase-dynamic-publish-v3\.js\?v=1/);
  assert.doesNotMatch(loader, /showcase-dynamic-publish-v2\.js/);
  assert.match(publisher, /act-showcase-standard\.html\?id=/);
  assert.match(publisher, /act-showcase\.html\?id=/);
  assert.doesNotMatch(publisher, /showcaseMode=cinematic/);
  assert.doesNotMatch(publisher, /bgSample=neotokyo/);
});

test("standard public view shares the public service and accepts the current trailer payload shape", async () => {
  const [html, source, service] = await Promise.all([
    read("act-showcase-standard.html"),
    read("js/act-showcase-standard.js"),
    read("js/public-showcase-service.js")
  ]);
  assert.match(html, /act-showcase-standard\.js\?v=2/);
  assert.match(source, /public-showcase-service\.js/);
  assert.match(source, /loadPublicShowcase\(slug\)/);
  assert.match(source, /data\.trailer\.body/);
  assert.match(source, /data\.intro/);
  assert.match(service, /get_public_act_showcase/);
});

test("cinematic mode is selected by route identity while legacy showcaseMode is only canonicalized away", async () => {
  const [deluxe, bootstrap] = await Promise.all([
    read("js/act-showcase-page.js"),
    read("js/act-showcase-bootstrap.js")
  ]);
  assert.match(deluxe, /document\.body\?\.id === "act-showcase-page"/);
  assert.doesNotMatch(deluxe, /bgSample|showcaseMode/);
  assert.match(bootstrap, /searchParams\.get\("showcaseMode"\)/);
  assert.match(bootstrap, /searchParams\.delete\("showcaseMode"\)/);
  assert.doesNotMatch(bootstrap, /bgSample/);
});
