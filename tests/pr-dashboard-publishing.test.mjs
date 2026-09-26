import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workflow = await readFile(new URL("../.github/workflows/pr-dashboard.yml", import.meta.url), "utf8");
const dashboard = await readFile(new URL("../dashboard/dashboard.js", import.meta.url), "utf8");
const html = await readFile(new URL("../dashboard/index.html", import.meta.url), "utf8");

test("dashboard publisher writes generated data to its unprotected data branch", () => {
  assert.match(workflow, /git switch --force-create dashboard-data origin\/dashboard-data/);
  assert.match(workflow, /git push origin HEAD:dashboard-data/);
  assert.doesNotMatch(workflow, /git push(?:\s+origin)?(?:\s+HEAD)?:?main/);
  assert.doesNotMatch(workflow, /^\s*git push\s*$/m);
});

test("deployed dashboard reads the generated branch while local previews use the fixture", () => {
  assert.match(dashboard, /raw\.githubusercontent\.com\/\$\{PROD_SLUG\}\/dashboard-data\/dashboard\/data\.json/);
  assert.match(dashboard, /location\.protocol === "file:"/);
  assert.match(dashboard, /localHosts\.has\(location\.hostname\)/);
  assert.match(dashboard, /if \(!res\.ok\) throw new Error/);
  assert.match(html, /dashboard\.js\?v=2/);
});
