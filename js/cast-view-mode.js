(() => {
  const MOBILE_MAX_WIDTH = 600;
  const params = new URLSearchParams(location.search);
  const requestedMode = params.get("mobile");
  const autoMobile = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`).matches;
  const useMobile = requestedMode === "1" || (requestedMode !== "0" && autoMobile);

  function modeUrl(mode) {
    const url = new URL(location.href);
    url.searchParams.set("mobile", mode);
    return url.href;
  }

  if (useMobile && requestedMode !== "1") {
    history.replaceState(null, "", modeUrl("1"));
  }

  if (useMobile) document.documentElement.classList.add("mobile-cast-requested");
  else document.documentElement.classList.remove("mobile-cast-requested");

  function addDesktopToggle() {
    if (useMobile || document.querySelector("[data-cast-mobile-toggle]")) return;
    const host = document.querySelector(".cast-header__primary-actions");
    if (!host) return;
    const link = document.createElement("a");
    link.className = "cast-edit-link cast-view-mode-link";
    link.dataset.castMobileToggle = "1";
    link.href = modeUrl("1");
    link.innerHTML = "<span>モバイル表示</span><small>MOBILE VIEW</small>";
    host.append(link);
  }

  function fixMobileDesktopToggle() {
    const link = document.querySelector(".mobile-cast-topbar__desktop");
    if (!link) return false;
    link.href = modeUrl("0");
    link.textContent = "PC表示";
    link.title = "この端末でPC表示を固定";
    return true;
  }

  function bind() {
    addDesktopToggle();
    if (useMobile && !fixMobileDesktopToggle()) {
      const observer = new MutationObserver(() => {
        if (fixMobileDesktopToggle()) observer.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind, { once: true });
  else bind();
})();
