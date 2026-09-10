(() => {
  const status = document.querySelector("#generator-status");
  if (!status) return;

  const canonicalize = () => {
    for (const anchor of status.querySelectorAll('a[href*="act-showcase.html"]')) {
      try {
        const before = anchor.href;
        const url = new URL(before, location.href);
        if (!/(?:^|\/)act-showcase\.html$/i.test(url.pathname)) continue;
        url.searchParams.delete("showcaseMode");
        if (url.href !== before) anchor.href = url.href;
      } catch {
        // Leave malformed or non-URL values untouched.
      }
    }
  };

  const observer = new MutationObserver(canonicalize);
  observer.observe(status, { childList: true, subtree: true, attributes: true, attributeFilter: ["href"] });
  canonicalize();
})();
