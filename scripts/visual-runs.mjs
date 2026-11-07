// The two Playwright invocations of the visual regression compare, shared by the runner and the CI summary.
// playwright.visual.config.js is overwritten from the visual-regression-baseline branch on every CI run, so what differs per
// project (output folders, the grep that leaves one test out) lives here.
export const VISUAL_RUNS = [
  {
    label: "visual-desktop",
    outputDir: "test-results/visual-desktop",
    reportDir: "playwright-report-visual-desktop",
    grepInvert: "キャスト閲覧 spectrum-neon",
    // Baseline images that this run leaves out on purpose (the grep above). The CI summary does not call them missing.
    leftOut: ["core-pages.visual.spec.js/cast-spectrum-neon-visual-desktop.png"]
  },
  {
    label: "visual-mobile",
    outputDir: "test-results/visual-mobile",
    reportDir: "playwright-report-visual-mobile",
    grepInvert: null,
    leftOut: []
  }
];

export function playwrightArgs(run) {
  return [
    "playwright",
    "test",
    "--config=playwright.visual.config.js",
    `--project=${run.label}`,
    `--output=${run.outputDir}`,
    ...(run.grepInvert ? ["--grep-invert", run.grepInvert] : [])
  ];
}
