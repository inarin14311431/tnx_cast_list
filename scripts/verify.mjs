/* Runs the same steps as the old `npm run verify` chain, but keeps their output out of the
 * transcript unless something fails (or VERIFY_VERBOSE=1). AI sessions read this output on
 * every verify run, so a green run costs one line instead of ~8,300 lines. No step's pass/fail
 * logic changes here - this only controls how much of each step's own output gets echoed.
 *
 * audit:ci checks that every "audit:*" / "report:*" script in package.json is represented in
 * the STEPS list below (by name, quoted) - keep this list and package.json's script names
 * in sync or that audit will fail.
 */
import { spawnSync } from "node:child_process";

const VERBOSE = process.env.VERIFY_VERBOSE === "1";
const TAIL_LINES = 80;

const STEPS = [
  "check:js",
  "audit:js-baseline",
  "audit:cache",
  "audit:modules",
  "audit:integrity",
  "audit:css",
  "audit:showcase",
  "audit:themes",
  "audit:sheet",
  "audit:cast",
  "audit:troop",
  "audit:mobile",
  "audit:security",
  "audit:migrations",
  "audit:quality",
  "audit:js-reachability",
  "audit:e2e",
  "audit:ci",
  "report:sheet-ownership",
  "report:cast-ownership"
];

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

function splitLines(text) {
  return String(text ?? "").split(/\r?\n/);
}

function tailLines(text, count) {
  return splitLines(text).slice(-count).join("\n").trim();
}

function capLines(text, count) {
  return splitLines(text).slice(0, count).join("\n").trim();
}

function runNpm(args) {
  const result = spawnSync(npmCmd, args, { encoding: "utf8", shell: process.platform === "win32" });
  const output = `${result.stdout || ""}${result.stderr || ""}${result.error ? `\n${result.error.message}` : ""}`;
  return { output, code: result.status, crashed: Boolean(result.error) };
}

function printIfVerbose(label, output) {
  if (VERBOSE) process.stdout.write(`\n--- ${label} ---\n${output}\n`);
}

function runStep(name) {
  const { output, code, crashed } = runNpm(["run", name]);
  printIfVerbose(name, output);
  return { name, ok: !crashed && code === 0, code, output };
}

/* node --test's spec reporter ends with a summary block ("ℹ pass N" / "ℹ fail N") and, only
 * when something failed, a "failing tests:" recap that lists just the failing tests (name,
 * "test at <file>:<line>:<col>", and the error) - exactly the slice we want, already assembled
 * by node itself. */
function runTests() {
  const { output, code, crashed } = runNpm(["test"]);
  printIfVerbose("test", output);
  const passMatch = output.match(/^ℹ pass (\d+)$/m);
  const failMatch = output.match(/^ℹ fail (\d+)$/m);
  const parsed = Boolean(passMatch && failMatch);
  const pass = parsed ? Number(passMatch[1]) : null;
  const fail = parsed ? Number(failMatch[1]) : null;
  const ok = !crashed && parsed && code === 0 && fail === 0;
  return { name: "test", ok, code, output, pass, fail, parsed };
}

function summarizeTestFailure(result) {
  if (!result.parsed) {
    return [
      "could not parse a pass/fail summary (\"ℹ pass N\" / \"ℹ fail N\") from `npm test` output; treating as a failure",
      tailLines(result.output, TAIL_LINES)
    ].join("\n");
  }
  const marker = "failing tests:";
  const markerIndex = result.output.indexOf(marker);
  if (markerIndex === -1) return tailLines(result.output, TAIL_LINES);
  const sectionStart = result.output.lastIndexOf("\n", markerIndex) + 1;
  return capLines(result.output.slice(sectionStart), TAIL_LINES);
}

const failures = [];

for (const step of STEPS) {
  const result = runStep(step);
  if (!result.ok) failures.push(result);
}

const testResult = runTests();
if (!testResult.ok) failures.push(testResult);

if (failures.length === 0) {
  console.log(`VERIFY OK: ${STEPS.length}/${STEPS.length} steps, tests pass=${testResult.pass} fail=${testResult.fail}`);
  process.exit(0);
}

for (const failure of failures) {
  console.log(`VERIFY FAIL: ${failure.name} (exit ${failure.code})`);
  console.log(failure.name === "test" ? summarizeTestFailure(failure) : tailLines(failure.output, TAIL_LINES));
}
process.exit(1);
