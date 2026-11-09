// The "公開済みを編集" button opens the band under the header that holds the published-showcase controls
// (docs/SHOWCASE_GENERATOR_REDESIGN.md). Kept as its own tiny module that the loader imports statically, so the button works as
// soon as the page is interactive, before the larger generator modules have loaded.

const toggle = document.querySelector("#owned-showcase-toggle");
const band = document.querySelector("#owned-showcase-restore");

if (toggle && band) {
  const setOpen = open => {
    band.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.classList.toggle("is-open", open);
  };
  toggle.addEventListener("click", () => setOpen(band.hidden));
  // A restore started from a link (?edit=) reports its progress inside the band, so the band starts open.
  if (new URLSearchParams(location.search).has("edit")) setOpen(true);
}
