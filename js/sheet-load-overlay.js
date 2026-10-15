/* Hides the archive-access loading screen declared in sheet.html. UI only: no DB access, never moves focus.
 * The markup and its 15s fail-safe live in sheet.html so they work even if this module never loads. */

export function dismissSheetLoadOverlay() {
  const overlay = document.getElementById("sheet-load-overlay");
  if (overlay) {
    overlay.hidden = true;
    overlay.setAttribute("aria-busy", "false");
  }
  for (const element of document.querySelectorAll("[data-sheet-load-inert]")) {
    element.inert = false;
    element.removeAttribute("data-sheet-load-inert");
  }
}
