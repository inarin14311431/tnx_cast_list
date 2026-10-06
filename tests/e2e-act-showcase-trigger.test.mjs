import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { changedFilesTriggerGroup, globToRegExp, matchesAny } from "../scripts/e2e-changed-groups.mjs";

const root = path.resolve(import.meta.dirname, "..");
const manifest = JSON.parse(await readFile(path.join(root, "tests/e2e/test-suites.json"), "utf8"));
const group = manifest.groups["ci-act-showcase"];
const workflow = await readFile(path.join(root, ".github/workflows/playwright.yml"), "utf8");

test("glob: * stays inside one path segment, ** crosses segments, everything else is literal", () => {
  assert.ok(globToRegExp("js/act-showcase*.js").test("js/act-showcase-page.js"));
  assert.ok(!globToRegExp("js/act-showcase*.js").test("js/act-showcase/page.js"));
  assert.ok(globToRegExp("assets/showcase/**").test("assets/showcase/backgrounds/green-area.avif"));
  assert.ok(!globToRegExp("assets/showcase/**").test("assets/showcase-other/a.png"));
  assert.ok(!globToRegExp("package.json").test("packageXjson"));
});

test("ci-act-showcase: runs for ACT SHOWCASE files and not for unrelated ones", () => {
  const hit = file => changedFilesTriggerGroup(group, [file]).length === 1;
  for (const file of [
    "act-showcase.html", "act-showcase-standard.html", "showcase-generator.html",
    "js/act-showcase-page.js", "js/showcase-background-presets.js", "js/public-showcase-service.js", "js/image-focus.js",
    "css-next/pages/act-showcase-core.css", "css-next/pages/showcase-generator.css",
    "assets/showcase/backgrounds/cyberspace.avif", "assets/placeholders/scan-failed.webp",
    "tests/e2e/act-showcase-contrast.spec.js", "tests/e2e/fixtures/act-showcase-data.js", "tests/e2e/test-suites.json",
    ".github/workflows/playwright.yml", "playwright.config.js", "scripts/e2e-changed-groups.mjs"
  ]) assert.ok(hit(file), `${file} must trigger ci-act-showcase`);
  for (const file of [
    "sheet.html", "cast.html", "js/supabase-client.js", "js/cast-ui.js", "css-next/pages/sheet.css",
    "docs/TESTING_STRATEGY.md", "tests/e2e/smoke.spec.js", "supabase/migrations/20260930_character_share_links.sql"
  ]) assert.ok(!hit(file), `${file} must not trigger ci-act-showcase`);
});

// Everything the ACT SHOWCASE pages load (html -> script / stylesheet / @import / url() / import / quoted asset
// paths), found statically, has to be covered by triggerPaths, so a change to any of it runs the E2E.
const PAGES = ["act-showcase.html", "act-showcase-standard.html"];
async function exists(file) {
  try { await access(path.join(root, file)); return true; } catch { return false; }
}
function resolveRef(from, raw, pageRelative) {
  const ref = String(raw).split("#")[0].split("?")[0].trim();
  if (!ref || /^(?:https?:|data:|javascript:|mailto:|blob:|\/\/)/i.test(ref)) return null;
  if (ref.startsWith("/")) return ref.slice(1);
  return path.posix.normalize(path.posix.join(pageRelative ? "" : path.posix.dirname(from), ref));
}
async function reachableFrom(entries) {
  const seen = new Set(entries);
  const queue = [...entries];
  while (queue.length) {
    const file = queue.shift();
    if (!/\.(?:html|js|css)$/.test(file) || !(await exists(file))) continue;
    const source = await readFile(path.join(root, file), "utf8");
    const refs = [];
    if (file.endsWith(".html")) {
      for (const match of source.matchAll(/(?:src|href)=["']([^"']+)["']/gi)) refs.push([match[1], false]);
    } else if (file.endsWith(".css")) {
      for (const match of source.matchAll(/@import\s+(?:url\()?["']?([^"')]+)["']?\)?/g)) refs.push([match[1], false]);
      for (const match of source.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) refs.push([match[1], false]);
    } else {
      for (const match of source.matchAll(/(?:import|export)\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["']/g)) refs.push([match[1], false]);
      for (const match of source.matchAll(/import\s*\(\s*["']([^"']+)["']\s*\)/g)) refs.push([match[1], false]);
      // quoted runtime URLs are relative to the page, not to the script
      for (const match of source.matchAll(/["']((?:\.\.?\/|\/)?(?:assets|css-next|js)\/[^"'\s]+\.(?:js|css|svg|webp|png|avif|jpg|json))(?:[?#][^"']*)?["']/g)) refs.push([match[1], true]);
    }
    for (const [raw, pageRelative] of refs) {
      const target = resolveRef(file, raw, pageRelative);
      if (target && !seen.has(target) && await exists(target)) { seen.add(target); queue.push(target); }
    }
  }
  return [...seen].sort();
}

test("ci-act-showcase triggerPaths cover every local file the ACT SHOWCASE pages load", async () => {
  const files = await reachableFrom(PAGES);
  assert.ok(files.length > 30, `expected the dependency walk to find the page assets, found ${files.length}`);
  const uncovered = files.filter(file => !matchesAny(group.triggerPaths, file));
  assert.deepEqual(uncovered, [], `files loaded by the ACT SHOWCASE pages but not in triggerPaths:\n${uncovered.join("\n")}`);
});

test("playwright workflow runs ci-act-showcase as its own job and keeps the manual run", () => {
  assert.match(workflow, /npm run e2e:ci-act-showcase/);
  assert.match(workflow, /name: Act showcase E2E/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /pull_request:\s*\n\s+paths/);
});
