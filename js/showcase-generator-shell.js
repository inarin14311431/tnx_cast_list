import { getThemeSwatchColors } from "./showcase-output-css.js?v=6c2c74a1";
import { SHOWCASE_BACKGROUND_PRESETS } from "./showcase-background-presets.js?v=7068197c";
import { parseSceneSelectionField } from "./act-showcase-scenes.js?v=2647c951";
import { hasGeneratedOutput } from "./showcase-generation-settle.js?v=cdbb78a8";
import {
  publishBlocker,
  summarizeBackground,
  summarizeCasts,
  summarizeChecklist,
  summarizeScenes,
  summarizeSteps,
  themeShortName
} from "./showcase-generator-summary.js?v=aa6bc728";

// The generator's frame (docs/SHOWCASE_GENERATOR_REDESIGN.md): the step navigation (the "published" band opens in showcase-owned-band.js),
// the publish checklist and settings summary, and the HTML export dialog. Nothing here changes what is saved or published:
// it only reads the same fields the other modules read and shows what they hold.

const $ = selector => document.querySelector(selector);
const preview = $("#showcase-preview");
const generatorStatus = $("#generator-status");

mountSteps();
mountCastSourceTabs();
mountThemeCards();
mountSummary();
mountExportDialog();

// ---- step navigation ---------------------------------------------------------------------------------------------------
function mountSteps() {
  const nav = $("#generator-steps");
  if (!nav) return;
  const links = [...nav.querySelectorAll("a[data-step-target]")];
  const reduceMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  for (const link of links) {
    link.addEventListener("click", event => {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" });
      history.replaceState(null, "", location.pathname + location.search);
    });
  }
  if (!("IntersectionObserver" in window)) return;
  const sections = links.map(link => document.querySelector(link.getAttribute("href"))).filter(Boolean);
  const visible = new Map();
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) visible.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
    const active = sections.map(section => [section.id, visible.get(section.id) || 0]).sort((a, b) => b[1] - a[1])[0];
    if (!active || active[1] === 0) return;
    for (const link of links) {
      const current = link.getAttribute("href") === `#${active[0]}`;
      if (current) link.setAttribute("aria-current", "step");
      else link.removeAttribute("aria-current");
    }
  }, { rootMargin: "-20% 0px -45% 0px", threshold: [0, 0.1, 0.4, 0.8] });
  sections.forEach(section => observer.observe(section));
}

// ---- public / private candidate tabs -----------------------------------------------------------------------------------
function mountCastSourceTabs() {
  const tabs = [...document.querySelectorAll("[data-cast-source]")].filter(tab => tab.getAttribute("role") === "tab");
  if (!tabs.length) return;
  const select = source => {
    for (const tab of tabs) {
      const active = tab.dataset.castSource === source;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
      const panel = document.getElementById(tab.getAttribute("aria-controls"));
      if (panel) panel.hidden = !active;
    }
  };
  for (const tab of tabs) {
    tab.addEventListener("click", () => select(tab.dataset.castSource));
    tab.addEventListener("keydown", event => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      const next = tabs[(tabs.indexOf(tab) + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
      select(next.dataset.castSource);
      next.focus();
    });
  }
  select("public");
}

// ---- theme cards -------------------------------------------------------------------------------------------------------
// The four cards are the visible control of the (hidden) #showcase-theme select, which stays the value other modules read and write:
// choosing a card sets the select and fires "change" (the stale-output check), and a restore that sets the select moves the mark.
function mountThemeCards() {
  const select = $("#showcase-theme");
  const cards = [...document.querySelectorAll(".theme-card[data-theme-value]")];
  if (!select || !cards.length) return;
  for (const card of cards) {
    const [ground, first, second, third] = getThemeSwatchColors(card.dataset.themeValue);
    [...card.querySelectorAll(".theme-card__swatch i")].forEach((swatch, index) => swatch.style.setProperty("--swatch", [ground, first, second, third][index]));
  }
  const mark = () => {
    for (const card of cards) {
      const checked = card.dataset.themeValue === select.value;
      card.setAttribute("aria-checked", String(checked));
      card.tabIndex = checked ? 0 : -1;
    }
  };
  const choose = card => {
    if (select.value === card.dataset.themeValue) return;
    select.value = card.dataset.themeValue;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    mark();
  };
  for (const card of cards) {
    card.addEventListener("click", () => choose(card));
    card.addEventListener("keydown", event => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
      event.preventDefault();
      const step = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
      const next = cards[(cards.indexOf(card) + step + cards.length) % cards.length];
      choose(next);
      next.focus();
    });
  }
  select.addEventListener("change", mark);
  select.addEventListener("input", mark);
  mark();
}

// ---- checklist, step states, settings summary -------------------------------------------------------------------------
function readCastRows() {
  return [...document.querySelectorAll("#selected-casts [data-selected-index]")].map(row => ({
    isPrivate: row.dataset.visibility === "private",
    hasHandout: Boolean(row.querySelector('[data-field="description"]')?.value?.trim())
  }));
}

function readState() {
  const themeSelect = $("#showcase-theme");
  return {
    actName: $("#act-name")?.value ?? "",
    rulerName: $("#ruler-name")?.value ?? "",
    themeLabel: themeSelect?.selectedOptions?.[0]?.textContent ?? "",
    casts: summarizeCasts(readCastRows()),
    background: {
      presetKey: $("#background-preset")?.value ?? "",
      url: $("#background-url")?.value ?? "",
      hasFile: Boolean($("#background-file")?.files?.length),
      presets: SHOWCASE_BACKGROUND_PRESETS
    },
    scenes: parseSceneSelectionField($("#showcase-scenes")?.value)
  };
}

function renderSummary() {
  const state = readState();
  const steps = summarizeSteps(state);
  for (const [key, text] of Object.entries(steps)) {
    const node = document.querySelector(`[data-step-status="${key}"]`);
    if (node && node.textContent !== text) node.textContent = text;
  }
  const blocker = publishBlocker(state);
  const publishStep = document.querySelector('[data-step-target="publish"]');
  if (publishStep) publishStep.dataset.state = blocker ? "blocked" : "ready";

  const checklist = $("#publish-checklist");
  if (checklist) {
    const items = summarizeChecklist(state);
    const signature = JSON.stringify(items);
    if (checklist.dataset.signature !== signature) {
      checklist.dataset.signature = signature;
      checklist.replaceChildren(...items.map(item => {
        const li = document.createElement("li");
        li.dataset.state = item.state;
        const label = document.createElement("span");
        label.textContent = item.label;
        const value = document.createElement("b");
        value.textContent = item.value;
        li.append(label, value);
        return li;
      }));
    }
  }
  const blockerNode = $("#publish-blocker");
  if (blockerNode) {
    blockerNode.hidden = !blocker;
    blockerNode.textContent = blocker;
  }
  const settings = {
    theme: themeShortName(state.themeLabel) || "—",
    background: summarizeBackground(state.background),
    scenes: summarizeScenes(state.scenes)
  };
  for (const [key, text] of Object.entries(settings)) {
    const node = document.querySelector(`[data-setting="${key}"]`);
    if (node && node.textContent !== text) node.textContent = text;
  }
  const sceneSummary = $("[data-scene-summary]");
  if (sceneSummary && sceneSummary.textContent !== settings.scenes) sceneSummary.textContent = settings.scenes;
}

function mountSummary() {
  let scheduled = 0;
  const schedule = () => {
    if (scheduled) return;
    scheduled = requestAnimationFrame(() => { scheduled = 0; renderSummary(); });
  };
  document.addEventListener("input", schedule, true);
  document.addEventListener("change", schedule, true);
  document.addEventListener("click", event => {
    // Cards and buttons that change the input without an input event (background presets, scene buttons, removing a cast).
    if (event.target.closest?.("#background-preset-grid, #selected-casts, #public-cast-grid, #owned-private-cast-grid")) schedule();
  }, true);
  const casts = $("#selected-casts");
  if (casts) new MutationObserver(schedule).observe(casts, { childList: true, subtree: true });
  const scenes = $("#showcase-scene-composition");
  if (scenes) new MutationObserver(schedule).observe(scenes, { childList: true, subtree: true });
  renderSummary();
  // The fields that other modules fill after load (restore, saved settings) settle shortly after the first paint.
  window.setTimeout(schedule, 400);
}

// ---- HTML export dialog ------------------------------------------------------------------------------------------------
function mountExportDialog() {
  const dialog = $("#html-export-dialog");
  const open = $("#open-html-export");
  if (!dialog || !open) return;
  const generateButton = $("#generate-button");
  const mirror = $("#html-export-status");

  const syncStatus = () => {
    if (!mirror || !generatorStatus) return;
    mirror.textContent = generatorStatus.textContent;
    mirror.className = generatorStatus.className;
  };
  if (generatorStatus) new MutationObserver(syncStatus).observe(generatorStatus, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["class"] });

  open.addEventListener("click", () => {
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    syncStatus();
    // Opening the dialog writes the HTML out of the current input: generate when nothing has been generated yet.
    if (!hasGeneratedOutput(preview)) generateButton?.click();
  });
  $("#close-html-export")?.addEventListener("click", () => dialog.close?.());
  dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close?.(); });
}
