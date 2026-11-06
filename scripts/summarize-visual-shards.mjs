/* Checks that the visual regression compare, split into one job per project, compared everything.
 *
 *   node scripts/summarize-visual-shards.mjs <dir-with-the-compare-logs>
 *
 * Needs playwright.visual.config.js and tests/visual (with its __screenshots__) from the visual-regression-baseline branch in the
 * working directory, as in the compare job. For each project:
 *   - the tests that ran are the tests `playwright test --list` finds (the same grep as the run), none failed (skips by design are counted);
 *   - the screenshots that were compared (scripts/visual-screenshot-reporter.mjs) are the baseline images of that project,
 *     except the ones the run leaves out on purpose (scripts/visual-runs.mjs), none twice.
 * Writes a table to $GITHUB_STEP_SUMMARY. Exits 1 on any difference.
 */
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { VISUAL_RUNS } from "./visual-runs.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function compareVisualRun({ run, listIds, baselineFiles, log }) {
  const problems = [];
  const tests = log?.tests ?? [];
  const ran = tests.map(test => `${test.file} :: ${test.title}`);
  const listed = new Set(listIds);
  const missingTests = [...listed].filter(id => !ran.includes(id));
  const extraTests = ran.filter(id => !listed.has(id));
  // A spec may skip a test on purpose (a PC-only screen on the mobile project): it has no screenshot. Whether a skip hides a
  // comparison is decided below by the baseline images, which all have to be compared. Failed, timed-out and interrupted tests are NG.
  const skipped = tests.filter(test => test.status === "skipped");
  const notPassed = tests.filter(test => test.status !== "passed" && test.status !== "skipped");
  if (!log) problems.push("no compare log was found");
  if (missingTests.length) problems.push(`tests not run (${missingTests.length}): ${missingTests.slice(0, 5).join(" | ")}`);
  if (extraTests.length) problems.push(`tests run but not listed (${extraTests.length}): ${extraTests.slice(0, 5).join(" | ")}`);
  if (new Set(ran).size !== ran.length) problems.push("a test ran more than once");
  if (notPassed.length) problems.push(`not passed (${notPassed.length}): ${notPassed.slice(0, 5).map(test => `${test.title} = ${test.status}`).join(" | ")}`);

  const compared = [];
  for (const test of tests) {
    for (const shot of test.screenshots) {
      if (!shot.name) problems.push(`a screenshot assertion without a name in "${test.title}"`);
      else compared.push(`${test.file}/${shot.name}`);
      if (!shot.ok) problems.push(`screenshot did not match: ${test.file}/${shot.name}`);
    }
  }
  const comparedSet = new Set(compared);
  const baseline = new Set(baselineFiles);
  const leftOut = new Set(run.leftOut);
  const notCompared = [...baseline].filter(file => !comparedSet.has(file) && !leftOut.has(file));
  const withoutBaseline = [...comparedSet].filter(file => !baseline.has(file));
  const left = [...baseline].filter(file => leftOut.has(file) && !comparedSet.has(file));
  if (notCompared.length) problems.push(`baseline images not compared (${notCompared.length}): ${notCompared.slice(0, 5).join(" | ")}`);
  if (withoutBaseline.length) problems.push(`compared without a baseline image (${withoutBaseline.length}): ${withoutBaseline.slice(0, 5).join(" | ")}`);
  if (comparedSet.size !== compared.length) problems.push("a screenshot was compared more than once");
  return { problems, tests: tests.length, skipped: skipped.length, listed: listed.size, compared: comparedSet.size, baseline: baseline.size, leftOut: left };
}

function listTests(run) {
  const args = ["playwright", "test", "--list", "--reporter=json", "--config=playwright.visual.config.js", `--project=${run.label}`, ...(run.grepInvert ? ["--grep-invert", run.grepInvert] : [])];
  const output = execFileSync("npx", args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: "" } });
  const ids = [];
  const walk = suite => {
    for (const spec of suite.specs || []) for (const test of spec.tests || []) if (test.projectName === run.label) ids.push(`${spec.file} :: ${spec.title}`);
    for (const child of suite.suites || []) walk(child);
  };
  for (const suite of JSON.parse(output).suites || []) walk(suite);
  return ids;
}

function baselineImages(label) {
  const dir = path.join(root, "tests/visual/__screenshots__", label);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true, withFileTypes: true }).filter(entry => entry.isFile() && entry.name.endsWith(".png"))
    .map(entry => path.relative(dir, path.join(entry.parentPath ?? entry.path, entry.name)).split(path.sep).join("/"));
}

function main() {
  const dir = process.argv[2];
  if (!dir) { console.error("usage: summarize-visual-shards.mjs <dir>"); process.exit(2); }
  const logs = readdirSync(dir, { recursive: true }).map(String).filter(name => name.endsWith(".json"));
  const results = VISUAL_RUNS.map(run => {
    const file = logs.find(name => path.basename(name) === `${run.label}.json`);
    const log = file ? JSON.parse(readFileSync(path.join(dir, file), "utf8")) : null;
    return { run, ...compareVisualRun({ run, listIds: listTests(run), baselineFiles: baselineImages(run.label), log }) };
  });
  const lines = [
    "### Visual regression compare, one job per project",
    "",
    "| project | tests run / listed (skipped by design) | images compared / baseline images | left out on purpose |",
    "|---|---|---|---|",
    ...results.map(r => `| ${r.run.label} | ${r.tests} / ${r.listed} (${r.skipped}) | ${r.compared} / ${r.baseline} | ${r.leftOut.join(", ") || "-"} |`),
    "",
    ...results.flatMap(r => r.problems.map(problem => `- **NG** ${r.run.label}: ${problem}`))
  ];
  const bad = results.some(r => r.problems.length);
  if (!bad) lines.push("- every listed test ran once and none failed, and every baseline image (except the ones left out on purpose) was compared once");
  const text = lines.join("\n");
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`);
  if (bad) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
