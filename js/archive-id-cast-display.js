(function(){
  const rawId = new URLSearchParams(location.search).get("id")?.trim() || "";
  const formatter = window.TNXArchiveId?.format;
  if (!rawId || typeof formatter !== "function") return;
  const displayId = formatter(rawId);

  const replaceRawId = element => {
    if (!element) return;
    const current = element.textContent;
    if (!current || !current.includes(rawId)) return;
    element.textContent = current.split(rawId).join(displayId);
  };

  const replaceMobileId = root => {
    const element = root?.querySelector?.(".mobile-cast-topbar > span");
    if (element?.textContent.trim() === rawId) element.textContent = displayId;
  };

  const publicId = document.querySelector("#cast-public-id");
  const status = document.querySelector("#cast-status");
  const mobileRoot = document.querySelector("#mobile-cast-view");
  replaceRawId(publicId);
  replaceRawId(status);
  replaceMobileId(mobileRoot);

  for (const element of [publicId, status].filter(Boolean)) {
    new MutationObserver(() => replaceRawId(element)).observe(element, {
      childList: true,
      characterData: true,
      subtree: true
    });
  }

  if (mobileRoot) {
    new MutationObserver(() => replaceMobileId(mobileRoot)).observe(mobileRoot, {
      childList: true,
      subtree: true
    });
  }
})();
