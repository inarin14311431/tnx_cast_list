import { supabase } from "./supabase-client.js";

const GENERIC_SUBTITLE = "CAST SHOWCASE";
const restoreSlug = normalizeSlug(new URLSearchParams(location.search).get("edit"));
const actName = document.querySelector("#act-name");
const subtitle = mountSubtitleField(actName);
const preview = document.querySelector("#showcase-preview");
const generateButton = document.querySelector("#generate-button");
const publishButtons = [...document.querySelectorAll("[data-publish-mode]")];
let restoring = false;
let syncAttempts = 0;

cleanTrailerFieldWording();

if (actName && subtitle) {
  subtitle.addEventListener("input", markGeneratedOutputStale);
  generateButton?.addEventListener("click", () => {
    syncAttempts = 0;
    queueMicrotask(syncSubtitleIntoGeneratedHtml);
  });

  if (restoreSlug) void restoreSubtitle(restoreSlug);
}

function mountSubtitleField(input) {
  if (!input) return null;
  const label = input.closest("label");
  if (!label) return null;

  label.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE && String(node.textContent || "").trim()) {
      node.textContent = "アクトタイトル";
    }
  });
  input.placeholder = "例：NEON AFTERIMAGE";

  const existing = document.querySelector("#act-subtitle");
  if (existing) return existing;

  const subtitleLabel = document.createElement("label");
  subtitleLabel.className = "act-subtitle-field";
  subtitleLabel.append("サブタイトル");
  const subtitleInput = document.createElement("input");
  subtitleInput.id = "act-subtitle";
  subtitleInput.type = "text";
  subtitleInput.maxLength = 120;
  subtitleInput.placeholder = "例：ネオンの残像";
  subtitleInput.autocomplete = "off";
  subtitleLabel.append(subtitleInput);
  label.insertAdjacentElement("afterend", subtitleLabel);
  return subtitleInput;
}

function cleanTrailerFieldWording() {
  const trailer = document.querySelector("#intro-text");
  const label = trailer?.closest("label");
  const helper = label?.querySelector("small");
  if (helper && helper.textContent?.includes("プレアクトで読み上げるトレーラー")) {
    helper.textContent = "ACT TRAILER";
  }
}

function markGeneratedOutputStale() {
  if (restoring || !String(preview?.srcdoc || "").trim()) return;
  if (preview) preview.srcdoc = "";
  publishButtons.forEach(button => { button.disabled = true; });
  const status = document.querySelector("#generator-status");
  if (status) {
    status.textContent = "サブタイトルを変更しました。HTMLを再生成してください。";
    status.className = "generator-status";
  }
}

function syncSubtitleIntoGeneratedHtml() {
  if (!preview) return;
  const source = String(preview.srcdoc || "").trim();
  if (!source) {
    if (syncAttempts++ < 30) requestAnimationFrame(syncSubtitleIntoGeneratedHtml);
    return;
  }

  const doc = new DOMParser().parseFromString(source, "text/html");
  const subtitleNode = doc.querySelector(".hero h1 span");
  if (!subtitleNode) return;
  subtitleNode.textContent = String(subtitle?.value || "").trim() || GENERIC_SUBTITLE;
  preview.srcdoc = `<!doctype html>\n${doc.documentElement.outerHTML}`;
}

async function restoreSubtitle(slug) {
  try {
    const { data, error } = await supabase.rpc("get_owned_act_showcase_editor", { p_slug: slug });
    if (error) throw error;
    const saved = String(data?.showcaseData?.heroSubTitle || "").trim();
    restoring = true;
    subtitle.value = saved && saved.toUpperCase() !== GENERIC_SUBTITLE ? saved : "";
    subtitle.dispatchEvent(new Event("input", { bubbles: true }));
  } catch (error) {
    console.warn("Showcase subtitle could not be restored.", error);
  } finally {
    restoring = false;
  }
}

function normalizeSlug(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
