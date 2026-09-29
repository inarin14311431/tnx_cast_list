import { spawnSync } from "node:child_process";

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
const runs = [
  {
    label: "visual-desktop",
    outputDir: "test-results/visual-desktop",
    reportDir: "playwright-report-visual-desktop",
    args: [
      "playwright",
      "test",
      "--config=playwright.visual.config.js",
      "--project=visual-desktop",
      "--output=test-results/visual-desktop",
      "--grep-invert",
      "キャスト閲覧 spectrum-neon"
    ]
  },
  {
    label: "visual-mobile",
    outputDir: "test-results/visual-mobile",
    reportDir: "playwright-report-visual-mobile",
    args: [
      "playwright",
      "test",
      "--config=playwright.visual.config.js",
      "--project=visual-mobile",
      "--output=test-results/visual-mobile"
    ]
  }
];

let exitCode = 0;

for (const run of runs) {
  const result = spawnSync(executable, [...prefixArgs, ...run.args], {
    stdio: "inherit",
    env: { ...process.env, PLAYWRIGHT_HTML_REPORT: run.reportDir }
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
