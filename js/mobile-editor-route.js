/* Adds mobile-editor routes on the two screens that own those transitions. */
(() => {
  function bind() {
    const page = document.body?.dataset.page || "";
    const id = new URLSearchParams(location.search).get("id")?.trim() || "";
    if (!id) return;

    if (page === "sheet.html") {
      const aside = document.querySelector(".exp-panel");
      if (aside && !document.querySelector("#sheet-mobile-edit-link")) {
        const link = document.createElement("a");
        link.id = "sheet-mobile-edit-link";
        link.className = "sheet-view-link";
        link.href = `./sheet-mobile.html?id=${encodeURIComponent(id)}`;
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
        link.href = `./sheet-mobile.html?id=${encodeURIComponent(id)}`;
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
