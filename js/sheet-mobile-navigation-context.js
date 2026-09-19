import {
  RETURN_DESTINATIONS,
  DEFAULT_RETURN_HREF,
  readTrimmedSearchParam,
  toLocalHref,
  parseReturnDestination,
  resolveParentReturnHref
} from "./sheet-navigation-core.js?v=1";

const initialReturnValue = readTrimmedSearchParam(location.search, "return");
const returnDestination = parseReturnDestination(initialReturnValue, { origin: location.origin, baseHref: location.href });
const backLink = document.querySelector(".mobile-sheet-header__back");
const viewLink = document.querySelector("#mobile-view-link");
const pcLink = document.querySelector("#mobile-pc-link");

initialize();

function parentReturnHref() {
  return resolveParentReturnHref(returnDestination);
}

function updateBackLink() {
  if (!backLink) return;
  if (!returnDestination) {
    backLink.href = DEFAULT_RETURN_HREF;
    backLink.setAttribute("aria-label", RETURN_DESTINATIONS["account.html"].ariaLabel);
    return;
  }
  backLink.href = parentReturnHref();
  backLink.setAttribute("aria-label", returnDestination.labels.ariaLabel);
}

function contextualizeForwardLink(link, { mobileView = false } = {}) {
  if (!link) return;
  try {
    const target = new URL(link.href, location.href);
    const id = target.searchParams.get("id") || readTrimmedSearchParam(location.search, "id");
    if (!id) return;
    target.searchParams.set("id", id);
    if (mobileView) target.searchParams.set("mobile", "1");
    target.searchParams.set("return", parentReturnHref());
    link.href = toLocalHref(target);
  } catch {}
}

function initialize() {
  updateBackLink();

  document.addEventListener("click", event => {
    const link = event.target.closest("#mobile-view-link, #mobile-pc-link");
    if (!link) return;
    contextualizeForwardLink(link, { mobileView: link === viewLink });
  }, true);

  window.addEventListener("pageshow", updateBackLink);
}
