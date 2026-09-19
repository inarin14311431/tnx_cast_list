import {
  readTrimmedSearchParam,
  toLocalHref,
  parseReturnDestination,
  resolveParentReturnHref
} from "./sheet-navigation-core.js?v=1";

const initialReturnValue = readTrimmedSearchParam(location.search, "return");
const returnDestination = parseReturnDestination(initialReturnValue, { origin: location.origin, baseHref: location.href });
const backLink = document.querySelector(".sheet-header .app-back-link");
const viewLink = document.querySelector("#cast-view-button");

initializeSheetNavigationContext();

function parentReturnHref() {
  return resolveParentReturnHref(returnDestination);
}

function updateBackLink() {
  if (!backLink || !returnDestination) return;
  backLink.href = parentReturnHref();
  const span = backLink.querySelector("span");
  const small = backLink.querySelector("small");
  if (span) span.textContent = `< ${returnDestination.labels.label}`;
  if (small) small.textContent = returnDestination.labels.enLabel;
}

function updateViewLink(publicId = "") {
  if (!viewLink) return;
  const id = String(publicId || readTrimmedSearchParam(location.search, "id")).trim();
  if (!id) return;
  const url = new URL("./cast.html", location.href);
  url.searchParams.set("id", id);
  url.searchParams.set("return", parentReturnHref());
  const href = toLocalHref(url);
  if (viewLink.getAttribute("href") !== href) viewLink.href = href;
}

function restoreNavigationContextAfterSave(publicId) {
  if (returnDestination) {
    const url = new URL(location.href);
    if (publicId) url.searchParams.set("id", publicId);
    url.searchParams.set("return", initialReturnValue);
    history.replaceState(history.state, "", toLocalHref(url));
  }
  updateBackLink();
  updateViewLink(publicId);
}

function initializeSheetNavigationContext() {
  updateBackLink();
  updateViewLink();

  window.addEventListener("tnx:character-saved", event => {
    restoreNavigationContextAfterSave(event.detail?.publicId || "");
  });

  if (viewLink) {
    new MutationObserver(() => updateViewLink()).observe(viewLink, {
      attributes: true,
      attributeFilter: ["href"]
    });
  }

  window.addEventListener("load", () => updateViewLink(), { once: true });
}
