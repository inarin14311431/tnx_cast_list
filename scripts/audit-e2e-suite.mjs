import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const e2eDir = path.join(root, "tests/e2e");
const manifestPath = path.join(e2eDir, "test-suites.json");
const workflowPath = path.join(root, ".github/workflows/playwright.yml");
const packagePath = path.join(root, "package.json");

const [manifestRaw, workflow, packageRaw, entries] = await Promise.all([
  readFile(manifestPath, "utf8"),
  readFile(workflowPath, "utf8"),
  readFile(packagePath, "utf8"),
  readdir(e2eDir)
]);

const manifest = JSON.parse(manifestRaw);
const packageJson = JSON.parse(packageRaw);
const groups = manifest.groups || {};
const failures = [];
const specs = entries.filter(name => name.endsWith(".spec.js")).map(name => `tests/e2e/${name}`).sort();
const classified = new Map();

for (const [groupName, group] of Object.entries(groups)) {
  const tests = Array.isArray(group.tests) ? group.tests : [];
  const unique = new Set(tests);
  if (tests.length !== unique.size) failures.push(`${groupName} contains duplicate test paths`);
  if (!group.project) failures.push(`${groupName} is missing project`);
  for (const testPath of tests) {
    if (!specs.includes(testPath)) failures.push(`${groupName} references missing spec ${testPath}`);
    const owners = classified.get(testPath) || [];
    owners.push(groupName);
    classified.set(testPath, owners);
  }
}

for (const spec of specs) {
  if (!classified.has(spec)) failures.push(`unclassified E2E spec: ${spec}`);
}

for (const required of ["ci-public", "ci-editor", "ci-mobile", "live-write", "manual-ui"]) {
  if (!groups[required]) failures.push(`missing required E2E group: ${required}`);
}

const ciGroups = ["ci-public", "ci-editor", "ci-mobile"];
const liveWriteTests = new Set(groups["live-write"]?.tests || []);
for (const groupName of ciGroups) {
  for (const testPath of groups[groupName]?.tests || []) {
    if (liveWriteTests.has(testPath)) failures.push(`live-write spec must not run in ${groupName}: ${testPath}`);
  }
}

if (!(groups["ci-editor"]?.tests || []).includes("tests/e2e/skd-master-search.spec.js")) {
  failures.push("SKD master-search E2E must run in ci-editor");
}
if (specs.includes("tests/e2e/audit-coverage.spec.js")) {
  failures.push("audit-coverage.spec.js must remain split by responsibility");
}

const expectedScripts = {
  "e2e:ci-public": "ci-public",
  "e2e:ci-editor": "ci-editor",
  "e2e:ci-mobile": "ci-mobile",
  "e2e:live-write": "live-write",
  "e2e:manual-ui": "manual-ui"
};
for (const [scriptName, groupName] of Object.entries(expectedScripts)) {
  const script = String(packageJson.scripts?.[scriptName] || "");
  if (!script.includes(`run-e2e-suite.mjs ${groupName}`)) failures.push(`package.json ${scriptName} must use manifest group ${groupName}`);
}

for (const scriptName of ["e2e:ci-public", "e2e:ci-editor", "e2e:ci-mobile"]) {
  if (!workflow.includes(`npm run ${scriptName}`)) failures.push(`playwright workflow is missing ${scriptName}`);
}
if (/tests\/e2e\/.+\.spec\.js/.test(workflow)) {
  failures.push("playwright workflow must not hard-code individual spec paths; use manifest-backed npm scripts");
}

if (failures.length) {
  console.error("E2E suite audit failed:\n" + failures.map(item => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log(`E2E suite audit passed: ${specs.length} specs classified across ${Object.keys(groups).length} groups.`);
