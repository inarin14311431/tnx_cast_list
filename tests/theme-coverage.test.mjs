import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const indexCss = await readFile(new URL("../css-next/index.css", import.meta.url), "utf8");
const uiTheme = await readFile(new URL("../css-next/tokens/theme-ui-overrides.css", import.meta.url), "utf8");
const themeContrast = await readFile(new URL("../css-next/components/theme-contrast.css", import.meta.url), "utf8");
const mobileTheme = await readFile(new URL("../css-next/pages/cast-mobile-theme.css", import.meta.url), "utf8");

function rgb(hex) {
  const value = hex.replace("#", "");
  return [0, 2, 4].map(index => Number.parseInt(value.slice(index, index + 2), 16) / 255);
}

function luminance(hex) {
  const [r, g, b] = rgb(hex).map(value => (
    value <= 0.03928
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4
  ));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

test("theme compatibility and contrast layers are loaded", () => {
  assert.match(indexCss, /tokens\/theme-ui-overrides\.css\?v=2/);
  assert.match(indexCss, /components\/theme-contrast\.css\?v=1/);
  assert.match(indexCss, /pages\/cast-mobile-theme\.css\?v=1/);
  assert.ok(indexCss.indexOf("theme-contrast.css") > indexCss.indexOf("pages/account.css"));
});

test("mobile cast theme bridge uses canonical theme surfaces", () => {
  assert.match(uiTheme, /--color-panel:\s*var\(--color-surface\)/);
  assert.match(mobileTheme, /--mobile-cast-soft:\s*color-mix\(in srgb, var\(--color-text\) 4%, transparent\)/);
  assert.match(mobileTheme, /\.mobile-cast-meta > div/);
  assert.match(mobileTheme, /\.mobile-outfit-card/);
  assert.match(mobileTheme, /\.mobile-cast-profile-text/);
});

test("semantic UI colors follow theme accents without changing fixed section colors", () => {
  assert.match(uiTheme, /--color-success:/);
  assert.match(uiTheme, /--color-warning:/);
  assert.match(uiTheme, /--color-feature:/);
  assert.doesNotMatch(uiTheme, /--color-section-/);
  assert.match(uiTheme, /:not\(\[data-theme="japanese-army"\]\)/);
});

test("every theme receives readable secondary, placeholder, and filled-control foreground tokens", () => {
  assert.match(uiTheme, /--color-text-muted:\s*color-mix\(in srgb, var\(--color-muted\) 82%, var\(--color-text\)\)/);
  assert.match(uiTheme, /--color-placeholder:\s*color-mix\(in srgb, var\(--color-muted\) 86%, var\(--color-text\)\)/);
  assert.match(uiTheme, /--color-on-accent:\s*var\(--color-bg\)/);
  assert.match(uiTheme, /data-theme="intron"[\s\S]*data-theme="orbital"[\s\S]*--color-on-accent:\s*var\(--color-surface\)/);
});

test("interactive secondary labels follow the readable foreground during hover and focus", () => {
  assert.match(themeContrast, /\.action-label__en[\s\S]*color:\s*var\(--color-text-muted\)/);
  assert.match(themeContrast, /\.owned-cast[\s\S]*:is\(:hover, :focus-visible\)[\s\S]*\.action-label__en[\s\S]*color:\s*inherit/);
  assert.match(themeContrast, /button:is\(:hover, :focus-visible\)[\s\S]*color:\s*var\(--color-on-accent\)/);
  assert.match(themeContrast, /button:is\(:hover, :focus-visible\) small[\s\S]*color:\s*inherit/);
});

test("editor secondary labels do not depend on opacity for contrast", () => {
  assert.match(themeContrast, /\.section-toggle small/);
  assert.match(themeContrast, /\.exp-panel small/);
  assert.match(themeContrast, /\.sheet-section-nav small/);
  assert.match(themeContrast, /\.sheet-section-nav > p/);
  assert.match(themeContrast, /color:\s*var\(--color-text-muted\);[\s\S]*opacity:\s*1/);
});

test("light themes explicitly disable opacity-based secondary text fading", () => {
  assert.match(themeContrast, /data-theme="intron"/);
  assert.match(themeContrast, /data-theme="orbital"/);
  assert.match(themeContrast, /\.auth-header small/);
  assert.match(themeContrast, /\.account-panel small/);
});

test("mobile cast secondary labels use semantic muted text without transparency", () => {
  assert.match(mobileTheme, /\.mobile-cast-meta dt/);
  assert.match(mobileTheme, /\.mobile-cast-divines span/);
  assert.match(mobileTheme, /\.mobile-cast-profile-grid dt/);
  assert.match(mobileTheme, /\.mobile-combo-card dt/);
  assert.match(mobileTheme, /color:\s*var\(--color-text-muted\);[\s\S]*opacity:\s*1/);
});

test("low contrast theme accents meet normal-text contrast target", () => {
  assert.ok(contrast("#ff4d62", "#0c0708") >= 4.5, "vlad accent contrast");
  assert.ok(contrast("#6ea1ff", "#0d1c31") >= 4.5, "lutetia accent contrast");
  assert.ok(contrast("#f07868", "#21140f") >= 4.5, "buena accent contrast");
});
