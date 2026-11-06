import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { VISUAL_RUNS, playwrightArgs } from "./visual-runs.mjs";

// Tests substitute a fake runner script (invoked via node) so CI's real
// desktop/mobile Playwright projects never have to actually run.
const testRunner = process.env.VISUAL_REGRESSION_TEST_RUNNER;
const executable = testRunner ? process.execPath : process.platform === "win32" ? "npx.cmd" : "npx";
const prefixArgs = testRunner ? [testRunner] : [];

// playwright.visual.config.js (overwritten from the visual-regression-baseline
// branch on every CI run, so it cannot be edited here) points outputDir and the
// html reporter's outputFolder at shared, project-agnostic paths. Running both
// projects back to back against those shared paths means the second project's
// startup wipes the first project's actual/diff screenshots before the workflow's
// upload-artifact step can pick them up. Pass distinct destinations per project
// on the command line (--output) and via the html reporter's env var override
// (PLAYWRIGHT_HTML_REPORT) instead, so both projects' failure evidence survives.
const runs = VISUAL_RUNS.map(run => ({ ...run, args: playwrightArgs(run) }));

// VISUAL_PROJECT=visual-desktop: run only that project (the CI runs the two as separate jobs, in parallel).
// VISUAL_COMPARE_LOG_DIR: also write, per project, the list of screenshots that were compared (scripts/visual-screenshot-reporter.mjs),
// which scripts/summarize-visual-shards.mjs checks against the baseline images.
const only = process.env.VISUAL_PROJECT;
if (only && !runs.some(run => run.label === only)) {
  console.error(`[run-visual-regression] VISUAL_PROJECT must be one of ${runs.map(run => run.label).join(", ")}, got "${only}"`);
  process.exit(2);
}
const logDir = process.env.VISUAL_COMPARE_LOG_DIR;
const reporterPath = fileURLToPath(new URL("./visual-screenshot-reporter.mjs", import.meta.url));

let exitCode = 0;

for (const run of runs) {
  if (only && run.label !== only) continue;
  // --reporter replaces the config's reporters; the html one keeps its folder through PLAYWRIGHT_HTML_REPORT
  const logArgs = logDir ? [`--reporter=line,html,${reporterPath}`] : [];
  const result = spawnSync(executable, [...prefixArgs, ...run.args, ...logArgs], {
    stdio: "inherit",
    env: { ...process.env, PLAYWRIGHT_HTML_REPORT: run.reportDir, ...(logDir ? { VISUAL_COMPARE_LOG: `${logDir}/${run.label}.json` } : {}) }
  });
  if (result.error) {
    console.error(`[run-visual-regression] failed to start ${run.label}:`, result.error);
    exitCode = exitCode || 1;
    continue;
  }
  const code = result.status ?? 1;
  if (code !== 0) {
    console.error(`[run-visual-regression] ${run.label} exited with code ${code}`);
    exitCode = exitCode || code;
  }
}

process.exit(exitCode);
