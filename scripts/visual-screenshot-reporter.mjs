// Playwright reporter: writes the screenshots a visual run compared to $VISUAL_COMPARE_LOG (JSON).
// A toHaveScreenshot call shows up as a step titled  Expect "toHaveScreenshot(<file name>.png)";  the name is the baseline file name.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

export default class VisualScreenshotReporter {
  constructor() {
    this.tests = new Map();
  }

  entry(test) {
    let entry = this.tests.get(test.id);
    if (!entry) {
      entry = { project: test.parent.project()?.name ?? "", file: path.basename(test.location.file), title: test.title, status: "", screenshots: [] };
      this.tests.set(test.id, entry);
    }
    return entry;
  }

  onStepEnd(test, _result, step) {
    if (step.category !== "expect" || !/toHaveScreenshot/.test(step.title)) return;
    const match = step.title.match(/toHaveScreenshot\((.*)\)"?$/);
    this.entry(test).screenshots.push({ name: match ? match[1] : null, ok: !step.error });
  }

  onTestEnd(test, result) {
    this.entry(test).status = result.status;
  }

  onEnd() {
    const target = process.env.VISUAL_COMPARE_LOG;
    if (!target) return;
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, JSON.stringify({ tests: [...this.tests.values()] }, null, 2));
  }

  printsToStdio() {
    return false;
  }
}
