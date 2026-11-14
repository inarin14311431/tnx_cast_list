import { buildXIntentUrl, emptyPublishedState, afterPublished, afterRestored, isRepublish, modeLabel, normalizeMode, otherMode } from "./showcase-publish-result-core.js?v=37f06130";

// The card in the publish column that replaces the one-line "published" message: a success heading, the public URL with a copy button
// and the buttons that open the page or post it to X. Published state also turns the publish buttons into "update and republish".
// It only listens to the events of the publisher (js/showcase-dynamic-publish-v3.js) and the restorer (js/showcase-edit-restore.js).

const card = document.querySelector("#publish-result");
const slugField = document.querySelector("#publish-slug");
const actNameField = document.querySelector("#act-name");
const subtitleField = document.querySelector("#act-subtitle");
const publishButtons = [...document.querySelectorAll("[data-publish-mode]")];
const COPIED_MS = 2000;

let published = emptyPublishedState();
let posterContext = null; // what the poster panel needs: the published act, its identifier and the public URL of the version on the card
let copiedTimer = 0;

for (const button of publishButtons) {
  const label = button.firstChild;
  if (label?.nodeType === Node.TEXT_NODE) button.dataset.publishLabel = label.nodeValue;
}

document.addEventListener("tnx:showcase-publish-start", hideCard);
document.addEventListener("tnx:showcase-published", event => {
  const detail = event.detail || {};
  published = afterPublished(published, detail.slug, detail.mode);
  syncButtonLabels();
  if (detail.urls?.cinematic && detail.urls?.standard) renderCard(detail);
});
document.addEventListener("tnx:showcase-restore-start", () => {
  published = emptyPublishedState();
  hideCard();
  syncButtonLabels();
});
document.addEventListener("tnx:showcase-restored", event => {
  published = afterRestored(event.detail?.slug);
  syncButtonLabels();
});
slugField?.addEventListener("input", syncButtonLabels);
slugField?.addEventListener("change", syncButtonLabels);

card?.addEventListener("click", event => {
  if (event.target.closest("[data-result-close]")) {
    hideCard();
    return;
  }
  if (event.target.closest("[data-result-copy]")) void copyUrl();
  const posterToggle = event.target.closest("[data-poster-toggle]");
  if (posterToggle) togglePoster(posterToggle);
});

function syncButtonLabels() {
  for (const button of publishButtons) {
    const original = button.dataset.publishLabel;
    const label = button.firstChild;
    if (original === undefined || label?.nodeType !== Node.TEXT_NODE) continue;
    const republish = isRepublish(published, slugField?.value, button.dataset.publishMode);
    // The version stays in the label: both buttons can read "republish" at once.
    label.nodeValue = republish ? `${modeLabel(button.dataset.publishMode)}を更新して再公開 ` : original;
    button.dataset.republish = republish ? "true" : "false";
  }
}

function hideCard() {
  if (!card) return;
  card.hidden = true;
  card.replaceChildren();
  posterContext = null;
  window.clearTimeout(copiedTimer);
}

function renderCard(detail) {
  if (!card) return;
  const mode = normalizeMode(detail.mode);
  const other = otherMode(mode);
  const url = detail.urls[mode];
  const shareUrl = buildXIntentUrl({ actName: detail.actName || actNameField?.value, subtitle: subtitleField?.value, url });
  posterContext = detail.showcase ? { showcase: detail.showcase, slug: detail.slug, url } : null;
  const note = detail.historyOk === false ? "公開しました。参加アクト履歴のCAST No.は更新できませんでした。" : "参加アクト履歴にも反映しました。";

  card.replaceChildren(
    element("div", "publish-result__head", [
      element("h3", "publish-result__title", [text("✓ 公開しました "), element("small", "", [text("PUBLISHED")])]),
      element("span", "publish-result__mode", [text(`${modeLabel(mode)}で公開`)]),
      element("button", "publish-result__close", [text("×")], { type: "button", "data-result-close": "", "aria-label": "公開結果を閉じる" })
    ]),
    element("div", "publish-result__url", [
      element("input", "", [], { id: "publish-result-url", type: "text", readonly: "", value: url, "aria-label": "公開ページのURL" }),
      element("button", "publish-result__copy", [text("コピー")], { type: "button", "data-result-copy": "" })
    ]),
    element("div", "publish-result__links", [
      element("a", "is-primary", [text("公開ページを開く")], { href: url, target: "_blank", rel: "noopener", "data-result-open": mode }),
      element("a", "", [text("X に投稿")], { href: shareUrl, target: "_blank", rel: "noopener", "data-result-share": "" }),
      element("a", "is-quiet", [text(`${modeLabel(other)}を開く`)], { href: detail.urls[other], target: "_blank", rel: "noopener", "data-result-open": other })
    ]),
    ...(posterContext ? [element("div", "publish-poster", [
      element("button", "publish-poster__toggle", [text("投稿用画像を作る "), element("small", "", [text("POSTER IMAGE")])], { type: "button", "data-poster-toggle": "", "aria-expanded": "false", "aria-controls": "publish-poster-panel" }),
      element("div", "publish-poster__panel", [], { id: "publish-poster-panel", "data-poster-panel": "", hidden: "" })
    ])] : []),
    element("p", "publish-result__note", [text(note)])
  );
  card.hidden = false;
  if (posterContext) void upgradeShareLink(card.querySelector("[data-result-share]"), detail, url, posterContext);
}

// The "X に投稿" link first carries the short post (the act and the hashtag); once the poster's words are loaded it says who runs the act and who plays.
async function upgradeShareLink(link, detail, url, context) {
  try {
    const [{ buildPosterModel }, { buildPosterPostUrl }] = await Promise.all([import("./act-poster-layout.js?v=683febc8"), import("./act-poster-text.js?v=eb12af79")]);
    if (link && link.isConnected && posterContext === context) link.href = buildPosterPostUrl(buildPosterModel(detail.showcase), url);
  } catch (error) {
    console.error("The post text could not be extended.", error);
  }
}

// The poster panel (js/showcase-poster-panel.js) is loaded the first time it is opened, so the generator page does not fetch the poster modules.
function togglePoster(button) {
  const panel = card?.querySelector("[data-poster-panel]");
  if (!panel) return;
  const opening = panel.hidden;
  panel.hidden = !opening;
  button.setAttribute("aria-expanded", String(opening));
  if (!opening || panel.dataset.mounted || !posterContext) return;
  panel.dataset.mounted = "loading";
  panel.textContent = "読み込み中…";
  import("./showcase-poster-panel.js?v=7420e2c2").then(module => {
    if (posterContext) module.mountPosterPanel(panel, posterContext);
    panel.dataset.mounted = "true";
  }).catch(error => {
    console.error("The poster panel could not be loaded.", error);
    panel.textContent = "投稿用画像の画面を読み込めませんでした。ページを再読み込みしてください。";
    delete panel.dataset.mounted;
  });
}

async function copyUrl() {
  const input = card?.querySelector("#publish-result-url");
  const button = card?.querySelector("[data-result-copy]");
  if (!input || !button) return;
  let copied = false;
  try {
    await navigator.clipboard.writeText(input.value);
    copied = true;
  } catch {
    // Clipboard API refused (no permission, or not a secure context): fall back to selecting the text and copying it.
    input.select();
    try { copied = document.execCommand("copy"); } catch { copied = false; }
  }
  button.textContent = copied ? "コピーしました" : "コピーできませんでした";
  button.dataset.copied = copied ? "true" : "false";
  window.clearTimeout(copiedTimer);
  copiedTimer = window.setTimeout(() => {
    button.textContent = "コピー";
    delete button.dataset.copied;
  }, COPIED_MS);
}

function text(value) {
  return document.createTextNode(value);
}

function element(tag, className, children = [], attributes = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  node.append(...children);
  return node;
}

syncButtonLabels();

