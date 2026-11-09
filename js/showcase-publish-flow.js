import { generateAndSettle, hasGeneratedOutput } from "./showcase-generation-settle.js?v=cdbb78a8";

// A publish click generates the HTML first when there is none (docs/SHOWCASE_GENERATOR_REDESIGN.md section 6-1).
// Any edit empties the generated output (invalidateGeneratedHtml in showcase-generator-v3.js), so a click always publishes what
// is on screen: with output present the click passes straight through to the guest bridge and the dynamic publisher; without
// it the click is held, the HTML is generated, and the same click is replayed once the output has settled.
//
// This module must be loaded before showcase-guest-publish-bridge.js and showcase-dynamic-publish-v3.js: all three listen on
// document in the capture phase and run in registration order.

const preview = document.querySelector("#showcase-preview");
const status = document.querySelector("#generator-status");
const generateButton = document.querySelector("#generate-button");
let generating = false;

export const GENERATING_ATTRIBUTE = "data-showcase-generating";

document.addEventListener("click", event => {
  const button = event.target.closest?.("[data-publish-mode]");
  if (!button) return;
  if (hasGeneratedOutput(preview)) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  if (generating) return;
  void generateThenReplay(button);
}, true);

async function generateThenReplay(button) {
  generating = true;
  document.documentElement.setAttribute(GENERATING_ATTRIBUTE, "true");
  let result = { ok: false, reason: "error" };
  try {
    result = await generateAndSettle({ preview, status, generateButton });
  } catch (error) {
    console.error(error);
  } finally {
    generating = false;
    document.documentElement.removeAttribute(GENERATING_ATTRIBUTE);
  }
  if (result.ok) {
    // The buttons are re-enabled from a MutationObserver on the "generating" attribute; a click on a disabled button is ignored.
    await new Promise(resolve => setTimeout(resolve, 0));
    button.click();
  } else if (result.reason === "timeout" && status) {
    status.textContent = "HTMLの生成が完了しませんでした。もう一度公開を押してください。";
    status.className = "generator-status is-error";
  }
  // On "error" the generator has already written the reason (a missing role, a duplicate CAST No, no cast...) into the status.
}
