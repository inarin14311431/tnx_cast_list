// The poster panel of the publish result card (js/showcase-publish-result.js): two inputs (date, catch line), a preview of the announcement
// poster, "save" / "copy" / "share" and the alt text. It is the screen side only: the DOM, the state of the buttons, the debounce and what is
// remembered for the tab. The poster itself is drawn by js/act-poster-render.js (layout: js/act-poster-layout.js), the words come from
// js/act-poster-text.js. Nothing is saved or sent anywhere: the picture stays in the browser until the person saves, copies or shares it.
import { buildPosterModel, layoutPoster, defaultCatchCopy } from "./act-poster-layout.js?v=b09b7150";
import {
  renderPoster, exportPosterBlob, loadPosterFonts, loadPosterImages, createPosterMeasurer, posterTexts, resolvePosterTheme
} from "./act-poster-render.js?v=c34bc35d";
import {
  buildPosterAltText, buildPosterPostText, clampPosterInput, loadPosterInputs, savePosterInputs, posterFileName, POSTER_INPUT_LIMITS
} from "./act-poster-text.js?v=5f44ca89";
import { getThemeSwatchColors } from "./showcase-output-css.js?v=6c2c74a1";

const DEBOUNCE_MS = 250;
const STATUS_RESET_MS = 4000;

const text = value => document.createTextNode(value);
function element(tag, className, children = [], attributes = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  node.append(...children);
  return node;
}
const labelled = (label, english) => [text(`${label} `), element("small", "", [text(english)])];
// the label of an input: the Japanese label with its small English one, as one element (a grid label would put them on two lines)
const labelText = (label, english) => element("span", "publish-poster__label", [...labelled(label, english)]);

function sessionStorageOrNull() {
  try {
    return window.sessionStorage ?? null;
  } catch {
    return null;
  }
}

// The colours the poster takes from the theme: the primary, secondary and accent of the act's own theme (the palette the generator's theme cards show).
function themeColorsOf(showcase) {
  const [, primary, secondary, accent] = getThemeSwatchColors(showcase?.theme);
  return resolvePosterTheme({ primary, secondary, accent });
}

/**
 * @param {HTMLElement} container - where the panel goes
 * @param {{showcase: object, slug: string, url: string}} context - the published act (showcase_data), its identifier and the public URL of the version shown on the card
 */
export function mountPosterPanel(container, { showcase, slug, url }) {
  const storage = sessionStorageOrNull();
  const remembered = loadPosterInputs(storage, slug);
  const inputs = {
    date: remembered?.date ?? "",
    catchCopy: remembered ? remembered.catchCopy : clampPosterInput(defaultCatchCopy(showcase), POSTER_INPUT_LIMITS.catchCopy)
  };

  const dateInput = element("input", "", [], { id: "poster-date", type: "text", maxlength: String(POSTER_INPUT_LIMITS.date), placeholder: "例：11.23 SUN 21:00〜", autocomplete: "off", value: inputs.date });
  const catchInput = element("input", "", [], { id: "poster-catch", type: "text", maxlength: String(POSTER_INPUT_LIMITS.catchCopy), placeholder: "例：運命の扉は、いつだって突然開く。", autocomplete: "off", value: inputs.catchCopy });
  const canvas = element("canvas", "publish-poster__canvas", [], { id: "poster-preview", role: "img", "aria-label": "予告ポスターのプレビュー" });
  const status = element("p", "publish-poster__status", [text("画像を生成します…")], { role: "status", "aria-live": "polite", "data-poster-status": "" });
  const saveButton = element("button", "", [...labelled("画像を保存", "SAVE IMAGE")], { type: "button", "data-poster-save": "", disabled: "" });
  const copyButton = element("button", "", [...labelled("画像をコピー", "COPY IMAGE")], { type: "button", "data-poster-copy": "", disabled: "" });
  const shareButton = element("button", "", [...labelled("共有", "SHARE")], { type: "button", "data-poster-share": "", hidden: "" });
  const copyHint = element("p", "publish-poster__hint", [text("このブラウザでは画像のコピーに対応していません。「画像を保存」を使ってください。")], { hidden: "", "data-poster-copy-hint": "" });
  const altField = element("textarea", "publish-poster__alt-text", [], { id: "poster-alt", readonly: "", rows: "5", "aria-label": "画像のALT文" });
  const altCopy = element("button", "", [...labelled("ALT文をコピー", "COPY ALT")], { type: "button", "data-poster-alt-copy": "" });

  container.replaceChildren(
    element("div", "publish-poster__fields", [
      element("label", "", [labelText("日付", "DATE"), dateInput, element("span", "publish-poster__note", [text(`最大${POSTER_INPUT_LIMITS.date}文字。空なら「近日開演」`)])]),
      element("label", "", [labelText("キャッチコピー", "CATCH COPY"), catchInput, element("span", "publish-poster__note", [text(`最大${POSTER_INPUT_LIMITS.catchCopy}文字。空なら出しません`)])])
    ]),
    element("div", "publish-poster__preview", [canvas, status]),
    element("div", "publish-poster__actions", [saveButton, copyButton, shareButton]),
    copyHint,
    element("div", "publish-poster__alt", [
      element("label", "", [labelText("ALT文", "ALT TEXT"), altField]),
      altCopy
    ]),
    element("p", "publish-poster__note", [text("入力は、この画面を開いている間だけ覚えます(保存はしません)。画像はあなたのブラウザの中で作ります。")])
  );

  let statusTimer = 0;
  function setStatus(message, state = "") {
    window.clearTimeout(statusTimer);
    status.textContent = message;
    status.dataset.state = state;
  }
  function flash(message, state = "ok") {
    setStatus(message, state);
    statusTimer = window.setTimeout(() => setStatus("画像を生成しました", "ok"), STATUS_RESET_MS);
  }

  // ---- drawing: one render at a time, the newest request wins ------------------------------------------------------------------------------
  let imagesPromise = null;
  let latestModel = null;
  let requested = 0;
  let drawn = 0;
  let queue = Promise.resolve();

  async function draw(token) {
    if (token !== requested) return;
    setStatus("画像を生成しています…", "busy");
    canvas.dataset.state = "loading";
    try {
      const model = buildPosterModel(showcase, { date: inputs.date, catchCopy: inputs.catchCopy });
      await loadPosterFonts(posterTexts(model));
      const theme = themeColorsOf(showcase);
      const layout = layoutPoster(model, createPosterMeasurer(), { theme });
      imagesPromise ??= loadPosterImages(layout);
      const images = await imagesPromise;
      if (token !== requested) return;
      await renderPoster(canvas, layout, { images, theme, texts: posterTexts(model) });
      latestModel = model;
      drawn = token;
      altField.value = buildPosterAltText(model);
      canvas.dataset.state = "ready";
      canvas.setAttribute("aria-label", `予告ポスターのプレビュー: ${model.actName}`);
      for (const button of [saveButton, copyButton]) button.disabled = false;
      refreshCapabilities();
      setStatus("画像を生成しました", "ok");
    } catch (error) {
      console.error("The announcement poster could not be drawn.", error);
      canvas.dataset.state = "error";
      for (const button of [saveButton, copyButton]) button.disabled = true;
      setStatus("画像を生成できませんでした。入力を変えるか、少し待ってからもう一度お試しください。", "error");
    }
  }

  const schedule = (delay = DEBOUNCE_MS) => {
    const token = ++requested;
    window.clearTimeout(schedule.timer);
    schedule.timer = window.setTimeout(() => { queue = queue.then(() => draw(token)); }, delay);
    return token;
  };
  schedule.timer = 0;

  for (const [input, key] of [[dateInput, "date"], [catchInput, "catchCopy"]]) {
    input.addEventListener("input", () => {
      inputs[key] = clampPosterInput(input.value, POSTER_INPUT_LIMITS[key]);
      savePosterInputs(storage, slug, inputs);
      schedule();
    });
  }

  // the picture of the newest request (waits for a drawing that is running or about to start)
  async function currentBlob(options) {
    schedule.timer && window.clearTimeout(schedule.timer);
    if (drawn !== requested) {
      const token = requested;
      queue = queue.then(() => draw(token));
    }
    await queue;
    if (canvas.dataset.state !== "ready") throw new Error("poster is not ready");
    return exportPosterBlob(canvas, options);
  }

  // ---- save / copy / share -------------------------------------------------------------------------------------------------------------------
  saveButton.addEventListener("click", async () => {
    try {
      const blob = await currentBlob();
      const link = element("a", "", [], { href: URL.createObjectURL(blob), download: posterFileName(slug, blob.type) });
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
      flash("画像を保存しました");
    } catch (error) {
      console.error(error);
      setStatus("画像を保存できませんでした。", "error");
    }
  });

  const canCopyImage = typeof ClipboardItem === "function" && typeof navigator.clipboard?.write === "function";
  if (!canCopyImage) {
    copyButton.disabled = true;
    copyButton.title = "このブラウザでは画像のコピーに対応していません";
    copyHint.hidden = false;
  }
  copyButton.addEventListener("click", async () => {
    if (!canCopyImage) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": currentBlob({ png: true }) })]);
      flash("画像をコピーしました");
    } catch (error) {
      console.error(error);
      setStatus("画像をコピーできませんでした。「画像を保存」を使ってください。", "error");
    }
  });

  // "share" is offered only where the browser can share a file (the phones)
  function refreshCapabilities() {
    if (!canCopyImage) copyButton.disabled = true;
    let canShare = false;
    try {
      canShare = typeof navigator.share === "function" && typeof File === "function" && typeof navigator.canShare === "function"
        && navigator.canShare({ files: [new File(["poster"], posterFileName(slug), { type: "image/png" })] });
    } catch {
      canShare = false;
    }
    shareButton.hidden = !canShare;
  }
  shareButton.addEventListener("click", async () => {
    try {
      const blob = await currentBlob();
      const file = new File([blob], posterFileName(slug, blob.type), { type: blob.type });
      await navigator.share({ files: [file], text: buildPosterPostText(latestModel), url });
      flash("共有しました");
    } catch (error) {
      if (error?.name === "AbortError") return; // the person closed the share sheet
      console.error(error);
      setStatus("共有できませんでした。「画像を保存」を使ってください。", "error");
    }
  });

  altCopy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(altField.value);
    } catch {
      altField.select();
      try { document.execCommand("copy"); } catch { /* the text stays selected for a manual copy */ }
    }
    flash("ALT文をコピーしました");
  });

  refreshCapabilities();
  schedule(0);
  return { ready: () => queue };
}
