import { test, expect } from "@playwright/test";

const pages = ["/index.html", "/login.html", "/statistics.html", "/404.html"];

for (const path of pages) {
  test(`accessibility baseline ${path}`, async ({ page }) => {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    const issues = await page.evaluate(() => {
      const failures = [];
      if (!document.documentElement.lang) failures.push("html element has no lang attribute");
      if (!document.title.trim()) failures.push("document title is empty");
      const ids = [...document.querySelectorAll("[id]")].map(el => el.id).filter(Boolean);
      [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))].forEach(id => failures.push(`duplicate id: ${id}`));
      document.querySelectorAll("img").forEach((img, index) => {
        if (!img.hasAttribute("alt")) failures.push(`image ${index + 1} has no alt attribute`);
      });
      const hasName = el => Boolean(
        (el.getAttribute("aria-label") || "").trim() ||
        (el.getAttribute("aria-labelledby") || "").trim() ||
        (el.getAttribute("title") || "").trim() ||
        (el.textContent || "").trim() ||
        (el.querySelector?.("img[alt]")?.getAttribute("alt") || "").trim()
      );
      document.querySelectorAll("button, a[href]").forEach((el, index) => {
        if (!hasName(el)) failures.push(`${el.tagName.toLowerCase()} ${index + 1} has no accessible name`);
      });
      document.querySelectorAll("input:not([type=hidden]), select, textarea").forEach(el => {
        const id = el.id;
        const labelled = Boolean(
          (el.getAttribute("aria-label") || "").trim() ||
          (el.getAttribute("aria-labelledby") || "").trim() ||
          (el.getAttribute("title") || "").trim() ||
          el.closest("label") ||
          (id && document.querySelector(`label[for="${CSS.escape(id)}"]`))
        );
        if (!labelled) failures.push(`${el.tagName.toLowerCase()}#${id || "(no-id)"} has no label`);
      });
      return failures;
    });
    expect(issues, issues.join("\n")).toEqual([]);
  });
}
