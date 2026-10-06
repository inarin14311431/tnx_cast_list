import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { matchesAny } from "./e2e-changed-groups.mjs";

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

for (const required of ["ci-public", "ci-act-showcase", "ci-editor", "ci-mobile", "live-write", "manual-ui"]) {
  if (!groups[required]) failures.push(`missing required E2E group: ${required}`);
}

const ciGroups = ["ci-public", "ci-act-showcase", "ci-editor", "ci-mobile"];
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
  "e2e:ci-act-showcase": "ci-act-showcase",
  "e2e:ci-editor": "ci-editor",
  "e2e:ci-mobile": "ci-mobile",
  "e2e:live-write": "live-write",
  "e2e:manual-ui": "manual-ui"
};
for (const [scriptName, groupName] of Object.entries(expectedScripts)) {
  const script = String(packageJson.scripts?.[scriptName] || "");
  if (!script.includes(`run-e2e-suite.mjs ${groupName}`)) failures.push(`package.json ${scriptName} must use manifest group ${groupName}`);
}

for (const scriptName of ["e2e:ci-public", "e2e:ci-act-showcase", "e2e:ci-editor", "e2e:ci-mobile"]) {
  if (!workflow.includes(`npm run ${scriptName}`)) failures.push(`playwright workflow is missing ${scriptName}`);
}
if (/tests\/e2e\/.+\.spec\.js/.test(workflow)) {
  failures.push("playwright workflow must not hard-code individual spec paths; use manifest-backed npm scripts");
}

// ci-act-showcase runs only for pull requests that touch its triggerPaths (and on manual dispatch). The decision is
// made per job: filtering the whole workflow with on.pull_request.paths would leave the other required jobs pending.
const actShowcase = groups["ci-act-showcase"];
const triggerPaths = Array.isArray(actShowcase?.triggerPaths) ? actShowcase.triggerPaths : [];
if (!triggerPaths.length) failures.push("ci-act-showcase must define triggerPaths");
for (const testPath of actShowcase?.tests || []) {
  if (!matchesAny(triggerPaths, testPath)) failures.push(`ci-act-showcase triggerPaths do not cover its own spec ${testPath}`);
}
for (const required of [".github/workflows/playwright.yml", "tests/e2e/test-suites.json", "scripts/e2e-changed-groups.mjs"]) {
  if (!matchesAny(triggerPaths, required)) failures.push(`ci-act-showcase triggerPaths must include ${required}`);
}
if (/pull_request:\s*\n\s+(?:paths|paths-ignore):/.test(workflow)) {
  failures.push("playwright workflow must not filter the whole workflow with on.pull_request.paths; decide per job (scripts/e2e-changed-groups.mjs)");
}
if (!workflow.includes("scripts/e2e-changed-groups.mjs ci-act-showcase")) failures.push("playwright workflow must decide ci-act-showcase with scripts/e2e-changed-groups.mjs");
if (!/act-showcase:[\s\S]*?if:\s*needs\.act-showcase-changes\.outputs\.run == 'true'/.test(workflow)) {
  failures.push("playwright workflow's act-showcase job must be gated by needs.act-showcase-changes.outputs.run");
}
if (!/workflow_dispatch:/.test(workflow)) failures.push("playwright workflow must keep workflow_dispatch (the on-demand group always runs there)");

if (failures.length) {
  console.error("E2E suite audit failed:\n" + failures.map(item => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log(`E2E suite audit passed: ${specs.length} specs classified across ${Object.keys(groups).length} groups.`);
