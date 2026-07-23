const fields = [
  document.querySelector("#page-title"),
  document.querySelector("#session-name"),
  document.querySelector("#ruler-name"),
  document.querySelector("#intro-text"),
  document.querySelector("#background-url")
];
const backgroundFile = document.querySelector("#background-file");
const downloadButton = document.querySelector("#download-button");
const copyButton = document.querySelector("#copy-button");
const publishButton = document.querySelector("#publish-button");
const preview = document.querySelector("#showcase-preview");
const status = document.querySelector("#generator-status");

function invalidateGeneratedOutput() {
  const generated = !downloadButton?.disabled || !copyButton?.disabled || !publishButton?.disabled;
  if (!generated) return;
  if (downloadButton) downloadButton.disabled = true;
  if (copyButton) copyButton.disabled = true;
  if (publishButton) publishButton.disabled = true;
  preview?.removeAttribute("srcdoc");
  if (status) {
    status.textContent = "セッション情報が変更されました。HTMLを再生成してください。";
    status.className = "generator-status";
  }
}

for (const field of fields) field?.addEventListener("input", invalidateGeneratedOutput);
backgroundFile?.addEventListener("change", invalidateGeneratedOutput);
