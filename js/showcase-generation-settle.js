// Generates the showcase HTML on behalf of a publish click and waits until the output has stopped changing.
//
// Publishing reads the generated HTML (#showcase-preview srcdoc): showcase-dynamic-publish-v3.js parses it into showcase_data.
// After #generate-button is clicked, several modules rewrite that srcdoc one after another, each from the "load" event of the
// previous one (subtitle, scenario writer, tagline and handout-role marks, guests, name normalization). The output is ready
// when srcdoc is set, the last srcdoc change has been followed by its load event, and nothing has moved for a short while.

export const SETTLE_QUIET_MS = 120;
export const SETTLE_TIMEOUT_MS = 20_000;
const POLL_MS = 40;

export function hasGeneratedOutput(preview) {
  return Boolean(String(preview?.srcdoc ?? "").trim());
}

// The generator reports failures by giving #generator-status the class "is-error" (showcase-generator-v3.js setGeneratorStatus).
// A new run starts by resetting that class ("HTMLを生成中…") or, when validation fails, by setting it again in the same tick.
export function generationFailed(status) {
  return Boolean(status?.classList?.contains("is-error"));
}

// Resolves { ok: true } when the output is ready, { ok: false, reason } when generation failed ("error", the generator already
// wrote the message into the status) or did not finish in time ("timeout").
export async function generateAndSettle({
  preview,
  status,
  generateButton,
  quietMs = SETTLE_QUIET_MS,
  timeoutMs = SETTLE_TIMEOUT_MS,
  now = () => performance.now(),
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
}) {
  if (!preview || !generateButton) return { ok: false, reason: "error" };

  let awaitingLoad = false;
  let lastActivity = now();
  const touch = () => { lastActivity = now(); };
  const onLoad = () => { awaitingLoad = false; touch(); };
  const observer = new MutationObserver(records => {
    if (records.some(record => record.attributeName === "srcdoc")) {
      awaitingLoad = true;
      touch();
    }
  });
  observer.observe(preview, { attributes: true, attributeFilter: ["srcdoc"] });
  preview.addEventListener("load", onLoad);

  try {
    const started = now();
    generateButton.click();
    while (true) {
      if (generationFailed(status)) return { ok: false, reason: "error" };
      if (hasGeneratedOutput(preview) && !awaitingLoad && now() - lastActivity >= quietMs) return { ok: true };
      if (now() - started >= timeoutMs) return { ok: false, reason: "timeout" };
      await sleep(POLL_MS);
    }
  } finally {
    observer.disconnect();
    preview.removeEventListener("load", onLoad);
  }
}
