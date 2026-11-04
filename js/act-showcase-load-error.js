// The page could not be shown: the message goes into the page's own status box (#act-showcase-status, red with .is-error) with a link
// that reloads the page, and the intro that covers the page is taken away. Used by the bootstrap (a module that did not load) and by
// act-showcase-page.js (data that failed or timed out), so a visitor never stays on the loading screen for good.
export function showLoadError(message) {
  const intro = document.querySelector("#cinematic-intro");
  if (intro) {
    intro.classList.add("is-hidden");
    intro.setAttribute("aria-hidden", "true");
    window.setTimeout(() => intro.remove(), 850);
  }
  const status = document.querySelector("#act-showcase-status");
  if (!status) return;
  const link = document.createElement("a");
  link.className = "showcase-loading__reload";
  link.href = location.href;
  link.textContent = "再読み込み";
  link.style.color = "inherit";
  link.style.textDecoration = "underline";
  status.hidden = false;
  status.classList.add("is-error");
  // one block: the status box is a grid that would put the message and the link in rows far apart
  const block = document.createElement("div");
  block.append(document.createTextNode(message), document.createElement("br"), link);
  status.replaceChildren(block);
}
