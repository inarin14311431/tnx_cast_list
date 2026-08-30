const RETURN_LABELS = {
  "index.html": "キャスト一覧へ戻る",
  "account.html": "アカウントへ戻る",
  "acts.html": "参加アクト一覧へ戻る",
  "showcase-generator.html": "アクト紹介生成へ戻る",
  "troops.html": "トループ一覧へ戻る",
  "troop.html": "トループへ戻る"
};
const DEFAULT_RETURN = "./account.html";

const initialReturnValue = new URLSearchParams(location.search).get("return")?.trim() || "";
const returnDestination = parseReturnDestination(initialReturnValue);
const backLink = document.querySelector(".mobile-sheet-header__back");
const viewLink = document.querySelector("#mobile-view-link");
const pcLink = document.querySelector("#mobile-pc-link");

initialize();

function parseReturnDestination(value) {
  if (!value) return null;
  try {
    const url = new URL(value, location.href);
    if (url.origin !== location.origin) return null;
    const page = url.pathname.split("/").pop() || "";
    if (!RETURN_LABELS[page]) return null;
    return { url, page };
  } catch {
    return null;
  }
}

function toLocalHref(url) {
  return `${url.pathname}${url.search}${url.hash}`;
}

function parentReturnHref() {
  return returnDestination ? toLocalHref(returnDestination.url) : DEFAULT_RETURN;
}

function updateBackLink() {
  if (!backLink) return;
  if (!returnDestination) {
    backLink.href = DEFAULT_RETURN;
    backLink.setAttribute("aria-label", "アカウントへ戻る");
    return;
  }
  backLink.href = parentReturnHref();
  backLink.setAttribute("aria-label", RETURN_LABELS[returnDestination.page]);
}

function contextualizeForwardLink(link, { mobileView = false } = {}) {
  if (!link) return;
  try {
    const target = new URL(link.href, location.href);
    const id = target.searchParams.get("id") || new URLSearchParams(location.search).get("id")?.trim() || "";
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
