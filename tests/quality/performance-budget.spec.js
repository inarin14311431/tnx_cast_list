import { test, expect } from "@playwright/test";

const pages = ["/index.html", "/login.html", "/statistics.html", "/404.html"];
const budgets = { domNodes: 6000, resources: 180, scripts: 40, stylesheets: 16, transferBytes: 8 * 1024 * 1024 };

for (const path of pages) {
  test(`performance budget ${path}`, async ({ page }) => {
    await page.goto(path, { waitUntil: "load" });
    const metrics = await page.evaluate(() => {
      const resources = performance.getEntriesByType("resource");
      return {
        domNodes: document.querySelectorAll("*").length,
        resources: resources.length,
        scripts: document.scripts.length,
        stylesheets: document.querySelectorAll('link[rel="stylesheet"]').length,
        transferBytes: resources.reduce((sum, item) => sum + (item.transferSize || 0), 0)
      };
    });
    expect(metrics.domNodes).toBeLessThanOrEqual(budgets.domNodes);
    expect(metrics.resources).toBeLessThanOrEqual(budgets.resources);
    expect(metrics.scripts).toBeLessThanOrEqual(budgets.scripts);
    expect(metrics.stylesheets).toBeLessThanOrEqual(budgets.stylesheets);
    expect(metrics.transferBytes).toBeLessThanOrEqual(budgets.transferBytes);
  });
}
