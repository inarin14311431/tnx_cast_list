import { supabase } from "./supabase-client.js";

const preview = document.querySelector("#showcase-preview");
const STYLE_MARKER = "showcase-style-vertical-center";

preview?.addEventListener("load", () => {
  const source = String(preview.srcdoc || "");
  if (!source) return;
  const aligned = applyStyleAlignment(source);
  if (aligned !== source) preview.srcdoc = aligned;
});

wrapShowcasePublication();

function wrapShowcasePublication() {
  const functions = supabase?.functions;
  if (!functions || typeof functions.invoke !== "function" || functions.__styleAlignmentWrapped) return;

  const originalInvoke = functions.invoke.bind(functions);
  functions.__styleAlignmentWrapped = true;
  functions.invoke = (functionName, options) => {
    if (functionName !== "publish-showcase" || !options?.body?.html) {
      return originalInvoke(functionName, options);
    }

    return originalInvoke(functionName, {
      ...options,
      body: {
        ...options.body,
        html: applyStyleAlignment(String(options.body.html))
      }
    });
  };
}

function applyStyleAlignment(source) {
  if (!source.trim()) return source;

  const documentNode = new DOMParser().parseFromString(source, "text/html");
  if (documentNode.querySelector(`style[data-${STYLE_MARKER}]`)) return source;

  const style = documentNode.createElement("style");
  style.setAttribute(`data-${STYLE_MARKER}`, "true");
  style.textContent = ".cast-card__styles{align-items:center}";
  documentNode.head.append(style);

  return `<!doctype html>\n${documentNode.documentElement.outerHTML}`;
}
