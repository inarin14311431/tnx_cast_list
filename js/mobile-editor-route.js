/* Adds mobile-editor routes on the two screens that own those transitions. */
(() => {
  const corePromise = import("./sheet-navigation-core.js?v=1");

  function parentReturnHref(core) {
    const returnValue = core.readTrimmedSearchParam(location.search, "return");
    const destination = core.parseReturnDestination(returnValue, { origin: location.origin, baseHref: location.href });
    const fallback = document.body?.dataset.page === "cast.html" ? "./index.html" : "./account.html";
    return core.resolveParentReturnHref(destination, { fallback });
  }

  function mobileEditorHref(id, core) {
    const url = new URL("./sheet-mobile.html", location.href);
    url.searchParams.set("id", id);
    url.searchParams.set("return", parentReturnHref(core));
    return core.toLocalHref(url);
  }

  async function bind() {
    const core = await corePromise;
    const page = document.body?.dataset.page || "";
    const id = core.readTrimmedSearchParam(location.search, "id");
    if (!id) return;

    if (page === "sheet.html") {
      const aside = document.querySelector(".exp-panel");
      if (aside && !document.querySelector("#sheet-mobile-edit-link")) {
        const link = document.createElement("a");
        link.id = "sheet-mobile-edit-link";
        link.className = "sheet-view-link";
        link.href = mobileEditorHref(id, core);
        link.innerHTML = "モバイル編集 <small>MOBILE EDITOR</small>";
        const view = document.querySelector("#cast-view-button");
        if (view) view.after(link);
        else aside.append(link);
      }
    }

    if (page === "cast.html" && new URLSearchParams(location.search).get("mobile") === "1") {
      const desktopEdit = document.querySelector("#cast-edit-button");
      const mobileView = document.querySelector("#mobile-cast-view");
      const sync = () => {
        if (!desktopEdit || desktopEdit.hidden) return;
        const bar = mobileView?.querySelector(".mobile-cast-topbar");
        if (!bar || bar.querySelector("[data-mobile-editor-route]")) return;
        const link = document.createElement("a");
        link.href = mobileEditorHref(id, core);
        link.dataset.mobileEditorRoute = "1";
        link.textContent = "編集";
        bar.append(link);
        globalThis.TNX_THEME_SCOPE?.normalize(link);
      };
      sync();
      if (desktopEdit) new MutationObserver(sync).observe(desktopEdit, { attributes: true, attributeFilter: ["hidden", "href"] });
      if (mobileView) new MutationObserver(sync).observe(mobileView, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind, { once: true });
  else bind();
})();
