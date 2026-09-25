import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

const projectRoot = new URL("../", import.meta.url);
const retiredHelperName = ["to", "Thumbnail", "Url"].join("");
const retiredRenderPath = ["/storage/v1", "render", "image"].join("/") + "/";

async function collectRuntimeFiles(directory, files = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === "vendor") continue;
    const url = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directory);
    if (entry.isDirectory()) await collectRuntimeFiles(url, files);
    else if (/\.(?:js|html)$/.test(entry.name)) files.push(url);
  }
  return files;
}

test("runtime has no Supabase image transformation endpoint or retired URL helper", async () => {
  const rootHtmlFiles = (await readdir(projectRoot, { withFileTypes: true }))
    .filter(entry => entry.isFile() && entry.name.endsWith(".html"))
    .map(entry => new URL(entry.name, projectRoot));
  const runtimeFiles = [
    ...await collectRuntimeFiles(new URL("js/", projectRoot)),
    ...await collectRuntimeFiles(new URL("tests/e2e/", projectRoot)),
    ...rootHtmlFiles
  ];

  const violations = [];
  for (const file of runtimeFiles) {
    const source = await readFile(file, "utf8");
    if (source.includes(retiredRenderPath) || source.includes(retiredHelperName)) {
      violations.push(file.pathname.replace(projectRoot.pathname, ""));
    }
  }

  assert.deepEqual(violations, []);
});
