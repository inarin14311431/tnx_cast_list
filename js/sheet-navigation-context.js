const RETURN_DESTINATIONS = {
  "account.html": ["アカウントへ", "RETURN TO ACCOUNT"],
  "cast.html": ["キャスト閲覧へ", "RETURN TO CAST"]
};

const initialParams = new URLSearchParams(location.search);
const initialReturnValue = initialParams.get("return")?.trim() || "";
const returnDestination = parseReturnDestination(initialReturnValue);
const backLink = document.querySelector(".sheet-header .app-back-link");
const viewLink = document.querySelector("#cast-view-button");

initializeSheetNavigationContext();

function parseReturnDestination(value) {
  if (!value) return null;
  try {
    const url = new URL(value, location.href);
    if (url.origin !== location.origin) return null;
    const page = url.pathname.split("/").pop() || "";
    const labels = RETURN_DESTINATIONS[page];
    if (!labels) return null;
    return { url, labels };
  } catch {
    return null;
  }
}

function toLocalHref(url) {
  return `${url.pathname}${url.search}${url.hash}`;
}

function currentSheetHref(publicId = "") {
  const url = new URL(location.href);
  if (publicId) url.searchParams.set("id", publicId);
  if (returnDestination) url.searchParams.set("return", initialReturnValue);
  else url.searchParams.delete("return");
  return toLocalHref(url);
}

function updateBackLink() {
  if (!backLink || !returnDestination) return;
  backLink.href = toLocalHref(returnDestination.url);
  const span = backLink.querySelector("span");
  const small = backLink.querySelector("small");
  if (span) span.textContent = `< ${returnDestination.labels[0]}`;
  if (small) small.textContent = returnDestination.labels[1];
}

function updateViewLink(publicId = "") {
  if (!viewLink) return;
  const id = String(publicId || new URLSearchParams(location.search).get("id") || "").trim();
  if (!id) return;
  const url = new URL("./cast.html", location.href);
  url.searchParams.set("id", id);
  url.searchParams.set("return", currentSheetHref(id));
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
