import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await readFile(path.join(root, "tests/e2e/test-suites.json"), "utf8"));
const [groupName, projectOverride] = process.argv.slice(2);
const group = manifest.groups?.[groupName];

if (!groupName || !group) {
  console.error(`Unknown E2E suite: ${groupName || "<missing>"}`);
  console.error(`Available suites: ${Object.keys(manifest.groups || {}).join(", ")}`);
  process.exit(2);
}

const project = projectOverride || group.project;
const tests = Array.isArray(group.tests) ? group.tests : [];
if (!project || tests.length === 0) {
  console.error(`Invalid E2E suite configuration: ${groupName}`);
  process.exit(2);
}

const executable = process.platform === "win32" ? "npx.cmd" : "npx";
const args = ["playwright", "test", ...tests, `--project=${project}`];
const child = spawn(executable, args, {
  cwd: root,
  env: process.env,
  stdio: "inherit"
});

child.on("error", error => {
  console.error(error);
  process.exit(1);
});
child.on("exit", code => process.exit(code ?? 1));
