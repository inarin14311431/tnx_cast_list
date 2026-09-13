import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js?v=4";

const field = mountScenarioWriterField();
const preview = document.querySelector("#showcase-preview");
const pageTitle = document.querySelector("#page-title");
const slugField = document.querySelector("#publish-slug");
const copyButton = document.querySelector("#copy-button");
const downloadButton = document.querySelector("#download-button");
const status = document.querySelector("#generator-status");

if (field) {
  field.addEventListener("input", () => {
    pageTitle?.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

preview?.addEventListener("load", syncPreviewSource);
copyButton?.addEventListener("click", copyPatchedShowcase, true);
downloadButton?.addEventListener("click", downloadPatchedShowcase, true);
void restoreScenarioWriter();

function mountScenarioWriterField() {
  const existing = document.querySelector("#scenario-writer-name");
  if (existing) return existing;

  const ruler = document.querySelector("#ruler-name");
  const rulerLabel = ruler?.closest("label");
  if (!rulerLabel) return null;

  const pair = document.createElement("div");
  pair.className = "showcase-credit-fields";
  pair.dataset.showcaseCreditFields = "true";
  pair.style.display = "grid";
  pair.style.gridTemplateColumns = "repeat(2, minmax(0, 1fr))";
  pair.style.gap = "12px";
  pair.style.minWidth = "0";
  rulerLabel.before(pair);
  pair.append(rulerLabel);

  const label = document.createElement("label");
  label.dataset.scenarioWriterField = "true";
  label.append(document.createTextNode("SCENARIO WRITER名"));

  const input = document.createElement("input");
  input.id = "scenario-writer-name";
  input.type = "text";
  input.maxLength = 120;
  input.placeholder = "例：稲荷秋";
  input.autocomplete = "off";
  label.append(input);
  pair.append(label);
  return input;
}

async function restoreScenarioWriter() {
  if (!field) return;
  const slug = normalizeSlug(new URLSearchParams(location.search).get("edit"));
  if (!slug) return;

  try {
    const user = await requireAuth();
    if (!user) return;
    const { data, error } = await supabase.rpc("get_owned_act_showcase_editor", { p_slug: slug });
    if (error) throw error;
    field.value = String(data?.showcaseData?.scenarioWriterName || "").trim();
  } catch (error) {
    console.warn("Scenario writer could not be restored.", error);
  }
}

function syncPreviewSource() {
  if (!preview) return;
  const source = String(preview.srcdoc || "");
  if (!source) return;
  const patched = patchGeneratedHtml(source);
  if (patched !== source) preview.srcdoc = patched;
}

function patchGeneratedHtml(source) {
  const cleaned = String(source || "").replace(
    /<p class="hero__ruler hero__scenario-writer">[\s\S]*?<\/p>/i,
    ""
  );
  const name = String(field?.value || "").trim();
  if (!name) return cleaned;

  const credit = `<p class="hero__ruler hero__scenario-writer">SCENARIO WRITER：${escapeHtml(name)}</p>`;
  const introMarker = '<p class="hero__intro"';
  if (cleaned.includes(introMarker)) return cleaned.replace(introMarker, `${credit}${introMarker}`);
  return cleaned.replace("</div></header>", `${credit}</div></header>`);
}

async function copyPatchedShowcase(event) {
  if (copyButton?.disabled) return;
  const source = patchGeneratedHtml(preview?.srcdoc || "");
  if (!source) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  try {
    await navigator.clipboard.writeText(source);
    setStatus("HTMLをクリップボードへコピーしました。", "success");
  } catch (error) {
    console.error(error);
    setStatus("HTMLをクリップボードへコピーできませんでした。", "error");
  }
}

function downloadPatchedShowcase(event) {
  if (downloadButton?.disabled) return;
  const source = patchGeneratedHtml(preview?.srcdoc || "");
  if (!source) return;
  event.preventDefault();
  event.stopImmediatePropagation();

  const slug = normalizeSlug(slugField?.value) || "act-showcase";
  const blob = new Blob([source], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${slug}.html`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function setStatus(message, state = "") {
  if (!status) return;
  status.textContent = message;
  status.className = `generator-status${state ? ` is-${state}` : ""}`;
}

function normalizeSlug(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[character]));
}
